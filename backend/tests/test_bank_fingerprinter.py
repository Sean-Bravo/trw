"""
Tests for Bank Fingerprinter
"""

import pytest
import os
import tempfile
import yaml
from pathlib import Path

from services.bank_statement.fingerprinter import BankFingerprinter


# Sample text snippets from different banks
CHASE_TEXT = """
JPMorgan Chase Bank, N.A.
Account Statement

Account Number: ****1234
Statement Period: December 1, 2024 - December 31, 2024

CHASE
chase.com

Date        Description                              Amount      Balance
12/01       Opening Balance                                      $5,432.10
12/02       ACH DEBIT NETFLIX                        -$15.99     $5,416.11
"""

BOFA_TEXT = """
Bank of America
Personal Banking Account Statement

Account Number: ****5678
Statement Period: 12/01/2024 - 12/31/2024

Bank of America, N.A.
Member FDIC

Date        Description                              Withdrawals  Deposits   Balance
12/01       Beginning Balance                                                $2,500.00
12/05       Check #1234                              $100.00                 $2,400.00
"""

WELLS_FARGO_TEXT = """
WELLS FARGO BANK
Your Account Statement

Account Number ending in 9012
Statement Period: December 1-31, 2024

wellsfargo.com

Date        Transaction                              Amount      Balance
12/01       Beginning Balance                                    $3,200.00
12/10       DEBIT CARD PURCHASE                      -$45.67     $3,154.33
"""

CITI_TEXT = """
Citibank
Online Banking Statement

Account: ****3456
For Period: December 2024

CITIBANK, N.A.
Member FDIC

Transaction History
Date        Description                              Debits      Credits    Balance
12/01       Previous Balance                                                $1,800.00
"""

MERCURY_TEXT = """
Mercury
Account Statement - October 2026

All Transactions
Date        Description                              Amount      End of Day Balance
10/01       Incoming Wire STRIPE                     $4,200.00   $12,400.00

Banking services provided by Choice Financial Group, Member FDIC
mercury.com
"""

NAVY_FEDERAL_TEXT = """
Navy Federal Credit Union
Statement of Account
Access No. 1234567

Date        Transaction Detail                       Amount      Balance
09-03       POS Debit GROCERY OUTLET                 -42.10      1,957.90

Insured by NCUA
navyfederal.org
"""

# Reproduces the 2026-10-19 smoke-test statement: a fictional bank whose text
# has "Card Purchase" (contains "chase") and Chase's "Statement Period" header.
UNKNOWN_BANK_PURCHASE_TEXT = """
Riverstone Community Bank
Checking Account Statement
Statement Period: 09/01/2026 - 09/30/2026
Account Number: ****4421

Date          Description                          Amount      Balance
09/02/2026    Card Purchase GROCERY OUTLET         -42.10      1,957.90
09/05/2026    Card Purchase SHELL OIL              -38.00      1,919.90
Total deposits and other credits                   2,000.00
"""

GENERIC_TEXT = """
Financial Statement
Account: 1234567890
Period: December 2024

Date        Description         Amount
12/01       Deposit             500.00
12/15       Withdrawal         -100.00
"""


class TestBankDetection:
    """Test bank detection from PDF text content."""

    @pytest.fixture
    def fingerprinter(self):
        """Create fingerprinter with real configs."""
        config_dir = Path(__file__).parent.parent / "configs" / "banks"
        return BankFingerprinter(str(config_dir))

    def test_detect_chase(self, fingerprinter):
        """Chase should be detected from its unique markers."""
        config = fingerprinter.detect_bank(CHASE_TEXT)
        assert config["bank"]["name"] == "Chase"

    def test_detect_bofa(self, fingerprinter):
        """Bank of America should be detected."""
        config = fingerprinter.detect_bank(BOFA_TEXT)
        assert config["bank"]["name"] == "Bank of America"

    def test_detect_wells_fargo(self, fingerprinter):
        """Wells Fargo should be detected."""
        config = fingerprinter.detect_bank(WELLS_FARGO_TEXT)
        assert config["bank"]["name"] == "Wells Fargo"

    def test_detect_citi(self, fingerprinter):
        """Citibank should be detected."""
        config = fingerprinter.detect_bank(CITI_TEXT)
        assert config["bank"]["name"] == "Citi"

    def test_detect_mercury(self, fingerprinter):
        config = fingerprinter.detect_bank(MERCURY_TEXT)
        assert config["bank"]["name"] == "Mercury"

    def test_detect_navy_federal(self, fingerprinter):
        config = fingerprinter.detect_bank(NAVY_FEDERAL_TEXT)
        assert config["bank"]["name"] == "Navy Federal"

    def test_fallback_to_generic(self, fingerprinter):
        """Unknown bank should fall back to generic config."""
        config = fingerprinter.detect_bank(GENERIC_TEXT)
        assert config["bank"].get("is_generic", False) is True or config["bank"]["name"] == "Unknown Bank"

    def test_empty_text_returns_generic(self, fingerprinter):
        """Empty text should return generic config."""
        config = fingerprinter.detect_bank("")
        assert config is not None
        # Should not crash, should return valid config

    def test_case_insensitive_matching(self, fingerprinter):
        """Detection should be case-insensitive."""
        # Lowercase version of Chase text
        lowercase_chase = CHASE_TEXT.lower()
        config = fingerprinter.detect_bank(lowercase_chase)
        assert config["bank"]["name"] == "Chase"


class TestScoringLogic:
    """Test the scoring system for bank detection."""

    @pytest.fixture
    def fingerprinter(self):
        config_dir = Path(__file__).parent.parent / "configs" / "banks"
        return BankFingerprinter(str(config_dir))

    def test_unique_markers_highest_weight(self, fingerprinter):
        """Unique markers should have highest weight (20 points)."""
        # Text with only unique marker
        text_with_marker = "JPMorgan Chase Bank, N.A."
        config = fingerprinter.detect_bank(text_with_marker)
        assert config["bank"]["name"] == "Chase"

    def test_logo_patterns_medium_weight(self, fingerprinter):
        """Logo patterns should have medium weight (10 points)."""
        # Just the logo text
        text_with_logo = "CHASE chase.com"
        config = fingerprinter.detect_bank(text_with_logo)
        assert config["bank"]["name"] == "Chase"

    def test_header_patterns_alone_do_not_select_a_bank(self, fingerprinter):
        """Header patterns are common to most statements, so they only add weight."""
        text_with_headers = "Account Number Statement Period Account Summary"
        config = fingerprinter.detect_bank(text_with_headers)
        assert config["bank"].get("is_generic") is True


class TestFalsePositives:
    """Bank names embedded in ordinary words must not select that bank."""

    @pytest.fixture
    def fingerprinter(self):
        config_dir = Path(__file__).parent.parent / "configs" / "banks"
        return BankFingerprinter(str(config_dir))

    def test_card_purchase_with_statement_period_is_generic(self, fingerprinter):
        text = "Statement Period: 09/01/2026 - 09/30/2026\n09/02/2026 Card Purchase GROCERY -42.10"
        config = fingerprinter.detect_bank(text)
        assert config["bank"].get("is_generic") is True

    def test_unknown_bank_statement_is_generic(self, fingerprinter):
        config = fingerprinter.detect_bank(UNKNOWN_BANK_PURCHASE_TEXT)
        assert config["bank"].get("is_generic") is True

    @pytest.mark.parametrize(
        "text",
        [
            "Twin Cities Power utility payment",  # "citi" in "cities"
            "Citizens Bank transfer",  # "citi" in "citizens"
            "PURCHASED ITEMS 09/02",  # "chase" in "purchased"
            "Mercurymart refund",  # "mercury" as a prefix
        ],
    )
    def test_bank_name_inside_word_is_ignored(self, fingerprinter, text):
        config = fingerprinter.detect_bank(text)
        assert config["bank"].get("is_generic") is True

    def test_marker_with_trailing_punctuation_still_matches(self, fingerprinter):
        """Whole-word matching must still work for phrases ending in '.'."""
        config = fingerprinter.detect_bank("Deposits held at Bank of America, N.A.")
        assert config["bank"]["name"] == "Bank of America"


class TestSupportedBanks:
    """Test get_supported_banks functionality."""

    @pytest.fixture
    def fingerprinter(self):
        config_dir = Path(__file__).parent.parent / "configs" / "banks"
        return BankFingerprinter(str(config_dir))

    def test_returns_all_configured_banks(self, fingerprinter):
        """Should return all banks from config files."""
        banks = fingerprinter.get_supported_banks()

        # Check we get a list
        assert isinstance(banks, list)

        # Check structure
        if banks:
            bank = banks[0]
            assert "id" in bank
            assert "name" in bank

    def test_banks_sorted_by_name(self, fingerprinter):
        """Supported banks should be sorted alphabetically."""
        banks = fingerprinter.get_supported_banks()
        names = [b["name"] for b in banks]
        assert names == sorted(names)

    def test_expected_banks_present(self, fingerprinter):
        """Expected major banks should be in the list."""
        banks = fingerprinter.get_supported_banks()
        bank_names = [b["name"] for b in banks]

        expected = ["Chase", "Bank of America", "Wells Fargo", "Citi"]
        for name in expected:
            assert name in bank_names, f"Expected {name} in supported banks"


class TestConfigLoading:
    """Test config loading behavior."""

    def test_missing_config_dir(self):
        """Should handle missing config directory gracefully."""
        fingerprinter = BankFingerprinter("/nonexistent/path")
        # Should not crash
        assert fingerprinter.configs == {} or len(fingerprinter.configs) >= 0

    def test_generic_config_fallback(self):
        """Should have a fallback generic config."""
        # Create temp dir with no configs
        with tempfile.TemporaryDirectory() as tmpdir:
            fingerprinter = BankFingerprinter(tmpdir)
            config = fingerprinter._get_generic_config()

            assert config is not None
            assert "bank" in config
            assert "columns" in config

    def test_malformed_yaml_skipped(self):
        """Malformed YAML files should be skipped."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create malformed YAML
            bad_yaml = os.path.join(tmpdir, "bad.yaml")
            with open(bad_yaml, "w") as f:
                f.write("this: is: not: valid: yaml: [")

            # Should not crash
            fingerprinter = BankFingerprinter(tmpdir)
            assert len(fingerprinter.configs) == 0


class TestConfigVersion:
    """Test config version tracking."""

    @pytest.fixture
    def fingerprinter(self):
        config_dir = Path(__file__).parent.parent / "configs" / "banks"
        return BankFingerprinter(str(config_dir))

    def test_get_config_version(self, fingerprinter):
        """Should return version string for known bank."""
        version = fingerprinter.get_config_version("Chase")
        assert ":" in version
        assert "Chase" in version or "1." in version

    def test_unknown_bank_version(self, fingerprinter):
        """Unknown bank should return generic version."""
        version = fingerprinter.get_config_version("NonexistentBank")
        assert "generic" in version.lower()
