"""
ReDoS guards from the 2026-10-17 security report (WS6).

#5:  bank-statement text amounts (services/bank_statement/extractor.py)
#12: Binance unit cells (BinanceParser.split_unit in services/engine.py)

Each regex gets an adversarial timing test, plus a differential check
against the pattern it replaced so parsing results stay identical.
"""

import csv
import random
import re
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.bank_statement import extractor as extractor_mod  # noqa: E402
from services.bank_statement.extractor import TransactionExtractor  # noqa: E402
from services.engine import BinanceParser, process_file  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"

# The patterns before the fix, kept only to prove the new ones agree.
OLD_TWO_AMOUNTS = re.compile(r"(-?[\d,]+\.?\d*)\s*-?\s+(-?[\d,]+\.?\d*)$")
OLD_ONE_AMOUNT = re.compile(r"(-?[\d,$]+\.?\d*)\s*-?$")
OLD_UNIT_CELL = re.compile(
    r"^\s*([-+]?[0-9][0-9,]*\.?[0-9]*(?:[eE][-+]?[0-9]+)?)\s*([A-Za-z]{2,10})?\s*$"
)

TIME_BUDGET_S = 1.0

CONFIG = {
    "columns": {"date": {"format": "MM/DD/YYYY"}},
    "table_detection": {"skip_rows_containing": []},
}


def _spans(m):
    if m is None:
        return None
    return [m.span(i) for i in range(m.re.groups + 1)]


def _old_parse_remainder(extractor, remainder):
    """The pre-fix body of _parse_text_line, minus the date handling."""
    m = OLD_TWO_AMOUNTS.search(remainder)
    if m:
        amount_str = m.group(1)
        if remainder[: m.end(1)].rstrip().endswith("-") or remainder[m.end(1):m.start(2)].strip() == "-":
            amount_str = "-" + amount_str
        return extractor._clean_amount(amount_str), remainder[: m.start()].strip()
    m = OLD_ONE_AMOUNT.search(remainder)
    if m:
        amount_str = m.group(1)
        if remainder[m.end(1):].strip() == "-":
            amount_str = "-" + amount_str
        return extractor._clean_amount(amount_str), remainder[: m.start()].strip()
    return 0.0, remainder


class TestBankStatementAmountRegex:
    @pytest.fixture
    def extractor(self):
        return TransactionExtractor(CONFIG)

    def _parse(self, extractor, line):
        return extractor._parse_text_line(line, extractor.date_pattern.match(line), 1, 1)

    @pytest.mark.parametrize(
        "line, amount, description",
        [
            ("01/15/2024 Card Purchase STORE -52.79 554.99", -52.79, "Card Purchase STORE"),
            ("01/15/2024 Wire Fee 20.00 - 55,231.59", -20.0, "Wire Fee"),
            ("01/15/2024 Withdrawal 55,000.00- 231.59", -55000.0, "Withdrawal"),
            ("01/15/2024 ACH DEBIT NETFLIX 15.99", 15.99, "ACH DEBIT NETFLIX"),
            ("01/15/2024 Refund $1,234.56-", -1234.56, "Refund"),
            ("01/15/2024 DEPOSIT", 0.0, "DEPOSIT"),
        ],
    )
    def test_documented_formats(self, extractor, line, amount, description):
        tx = self._parse(extractor, line)
        assert tx["amount"] == amount
        assert tx["description"] == description

    def test_long_description_keeps_offsets(self, extractor):
        # Description pushes the amounts well past the bounded tail start.
        desc = "POS PURCHASE " + "X" * 300
        tx = self._parse(extractor, f"01/15/2024 {desc} 1,234.50 - 9,999.00")
        assert tx["amount"] == -1234.5
        assert tx["description"] == desc

    def test_patterns_match_old_patterns(self):
        rnd = random.Random(20261017)
        alphabet = "0123456789,.- $aE\t"
        for _ in range(50_000):
            s = "".join(rnd.choice(alphabet) for _ in range(rnd.randint(0, 30)))
            assert _spans(extractor_mod._TWO_AMOUNTS_RE.search(s)) == _spans(OLD_TWO_AMOUNTS.search(s)), repr(s)
            assert _spans(extractor_mod._ONE_AMOUNT_RE.search(s)) == _spans(OLD_ONE_AMOUNT.search(s)), repr(s)

    def test_parse_text_line_matches_old_behaviour(self, extractor):
        rnd = random.Random(1017)
        for _ in range(20_000):
            desc = "".join(rnd.choice("ABC xyz#*") for _ in range(rnd.randint(0, 60)))
            end = "".join(rnd.choice("0123456789,.- $") for _ in range(rnd.randint(0, 25)))
            line = f"01/02/2024 {desc}{end}"
            tx = self._parse(extractor, line)
            remainder = line[extractor.date_pattern.match(line).end():].strip()
            assert (tx["amount"], tx["description"]) == _old_parse_remainder(extractor, remainder), repr(line)

    def test_adversarial_digit_runs_are_fast(self, extractor):
        # The old two-amount regex was roughly O(n^4) here: 200 chars took
        # 0.3s, a full statement line would take hours.
        n = 25_000
        line = "01/02/2024 " + "1" * n + " " + "1" * n + "x"
        start = time.perf_counter()
        self._parse(extractor, line)
        extractor._process_text(line, page_num=1)
        assert time.perf_counter() - start < TIME_BUDGET_S

    def test_adversarial_line_at_cap_is_fast(self, extractor):
        half = (extractor_mod.MAX_TEXT_LINE_LEN - 13) // 2
        line = "01/02/2024 " + "1" * half + " " + "1" * half + "x"
        assert len(line) <= extractor_mod.MAX_TEXT_LINE_LEN
        start = time.perf_counter()
        extractor._process_text(line, page_num=1)
        assert time.perf_counter() - start < TIME_BUDGET_S

    def test_overlong_lines_are_skipped(self, extractor):
        text = "\n".join([
            "01/02/2024 " + "A" * extractor_mod.MAX_TEXT_LINE_LEN + " 5.00",
            "01/03/2024 Coffee 4.50",
        ])
        txs = extractor._process_text(text, page_num=1)
        assert [(t["date"], t["amount"]) for t in txs] == [("01/03/2024", 4.5)]


class TestBinanceUnitCell:
    def test_existing_cells_unchanged(self):
        assert BinanceParser.split_unit("0.5BTC") == (0.5, "BTC")
        assert BinanceParser.split_unit(" 0.5 btc ") == (0.5, "BTC")
        assert BinanceParser.split_unit("22,500.00USDT") == (22500.0, "USDT")
        assert BinanceParser.split_unit("1e-5ETH") == (1e-5, "ETH")
        assert BinanceParser.split_unit("1EUR") == (1.0, "EUR")
        assert BinanceParser.split_unit("0.0005") == (0.0005, "")

    def test_pattern_matches_old_pattern(self):
        rnd = random.Random(653)
        alphabet = "0123456789,.-+ eEBTCusdt\t"
        for _ in range(50_000):
            s = "".join(rnd.choice(alphabet) for _ in range(rnd.randint(0, 20)))
            assert _spans(BinanceParser._UNIT_CELL.match(s)) == _spans(OLD_UNIT_CELL.match(s)), repr(s)

    def test_every_fixture_cell_unchanged(self):
        """split_unit agrees with the old regex on every cell of every CSV fixture."""
        cells = 0
        for path in sorted(FIXTURES.rglob("*.csv")):
            with open(path, newline="", encoding="utf-8-sig", errors="replace") as f:
                for row in csv.reader(f):
                    for cell in row:
                        cells += 1
                        old = OLD_UNIT_CELL.match(cell)
                        assert _spans(BinanceParser._UNIT_CELL.match(cell)) == _spans(old), (path.name, cell)
        assert cells > 1000

    def test_binance_fixture_records(self):
        result = process_file((FIXTURES / "valid" / "binance_valid.csv").read_bytes())
        assert result["success"], result.get("errors")
        assert result["exchange"] == "binance"
        got = [
            (r["Sent Amount"], r["Sent Currency"], r["Received Amount"],
             r["Received Currency"], r["Fee Amount"], r["Fee Currency"])
            for r in result["records"]
        ]
        assert got == [
            (22500.0, "USDT", 0.5, "BTC", 10.0, "BTC"),
            (10.0, "ETH", 25000.0, "USDT", 5.0, "USDT"),
            (9850.0, "USDT", 100.0, "SOL", 4.0, "SOL"),
        ]

    def test_overlong_cell_skips_regex(self):
        assert BinanceParser.split_unit("1" * 65) == (float("1" * 65), "")
        assert BinanceParser.split_unit("1" * 60 + "BTC") == (float("1" * 60), "BTC")

    def test_adversarial_cell_is_fast(self):
        # The old pattern was O(n^2) here: 8k digits took over 3 seconds.
        start = time.perf_counter()
        BinanceParser.split_unit("1" * 50_000 + "!")
        BinanceParser.split_unit("1" * 63 + "!")
        assert time.perf_counter() - start < TIME_BUDGET_S
