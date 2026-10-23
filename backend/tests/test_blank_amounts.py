"""
Unknown amounts are blank (None in records, an empty CSV cell, null in JSON),
never 0.0. Found by the 2026-10-23 shadow eval: PayPal buys came out as
"received 0.0 BTC", which tax software imports as a real zero, and the empty
side of every transfer was 0.0, which the insights model flagged as missing data.
"""

import csv
import json
import math
import sys
from io import StringIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.engine import blank_unknown_amounts, process_file  # noqa: E402
from services.format_converter import convert_records  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures" / "valid"


def _records(name: str):
    result = process_file((FIXTURES / name).read_bytes())
    assert result["success"], result.get("errors")
    return result["records"]


class TestBlankUnknownAmounts:

    def test_nan_and_none_become_none(self):
        # Dedup runs through pandas, which turns None into NaN.
        records = blank_unknown_amounts([
            {"Sent Amount": math.nan, "Sent Currency": "BTC", "Received Amount": None, "Received Currency": "USD"},
        ])
        assert records[0]["Sent Amount"] is None and records[0]["Received Amount"] is None

    def test_zero_on_the_side_with_no_currency_becomes_none(self):
        records = blank_unknown_amounts([
            {"Sent Amount": 0.05, "Sent Currency": "BTC", "Received Amount": 0.0, "Received Currency": ""},
        ])
        assert records[0]["Received Amount"] is None
        assert records[0]["Sent Amount"] == 0.05

    def test_known_amounts_are_untouched(self):
        records = blank_unknown_amounts([
            {"Sent Amount": 4000.0, "Sent Currency": "USD", "Received Amount": 0.1, "Received Currency": "BTC"},
        ])
        assert records[0]["Sent Amount"] == 4000.0 and records[0]["Received Amount"] == 0.1


class TestEndToEnd:

    def test_coinbase_send_has_a_blank_received_side(self):
        send = [r for r in _records("coinbase_legacy_valid.csv") if r["Label"] == "transfer"][0]
        assert send["Sent Amount"] == 0.05 and send["Sent Currency"] == "BTC"
        assert send["Received Amount"] is None and send["Received Currency"] == ""

    def test_paypal_quantities_are_blank_in_the_csv(self):
        records = _records("paypal_valid.csv")
        out = StringIO()
        writer = csv.DictWriter(out, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)
        rows = list(csv.DictReader(StringIO(out.getvalue())))
        assert rows[0]["Received Currency"] == "BTC" and rows[0]["Received Amount"] == ""
        assert "0.0" not in (rows[0]["Received Amount"], rows[1]["Sent Amount"])

    def test_records_serialize_as_strict_json(self):
        # The API returns records as JSON; NaN would break every client's parser.
        for name in ("paypal_valid.csv", "coinbase_legacy_valid.csv"):
            text = json.dumps(_records(name), allow_nan=False)
            assert "null" in text

    def test_every_output_format_converts_blank_amounts(self):
        records = _records("coinbase_legacy_valid.csv") + _records("paypal_valid.csv")
        for fmt in ("koinly", "coinledger", "zenledger"):
            converted, _ = convert_records(records, fmt)
            assert len(converted) == len(records), fmt
            json.dumps(converted, allow_nan=False)

    def test_turbotax_never_writes_a_made_up_zero_quantity(self):
        # TurboTax lists sales only (Form 8949). The PayPal sale's BTC quantity
        # is unknown: the row names the currency alone for the user to complete.
        converted, _ = convert_records(_records("paypal_valid.csv"), "turbotax")
        assert [r["Currency Name"] for r in converted] == ["BTC"]
        assert converted[0]["Proceeds"] == "$490.00"

    def test_turbotax_keeps_known_quantities(self):
        converted, _ = convert_records(_records("coinbase_legacy_valid.csv"), "turbotax")
        assert [r["Currency Name"] for r in converted] == ["1.5 ETH"]
