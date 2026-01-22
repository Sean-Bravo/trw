"""
Tests for Duplicate Detector
"""

import pytest

from services.bank_statement.duplicate_detector import DuplicateDetector


class TestExactDuplicateDetection:
    """Test exact duplicate finding."""

    @pytest.fixture
    def detector(self):
        return DuplicateDetector()

    def test_find_exact_duplicates(self, detector):
        """Should find exact duplicate transactions."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},
            {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99},
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},  # Duplicate
        ]

        duplicates = detector.find_duplicates(transactions)

        assert len(duplicates) == 1
        # Should have indices [0, 2]
        fingerprint = list(duplicates.keys())[0]
        assert set(duplicates[fingerprint]) == {0, 2}

    def test_no_duplicates(self, detector):
        """Should return empty dict when no duplicates."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},
            {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99},
            {"date": "2024-01-17", "description": "AMAZON", "amount": -25.00},
        ]

        duplicates = detector.find_duplicates(transactions)
        assert duplicates == {}

    def test_multiple_duplicate_groups(self, detector):
        """Should find multiple groups of duplicates."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},  # Group 1
            {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99},  # Group 2
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},  # Group 1
            {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99},  # Group 2
        ]

        duplicates = detector.find_duplicates(transactions)
        assert len(duplicates) == 2


class TestFuzzyDuplicateDetection:
    """Test fuzzy duplicate detection."""

    @pytest.fixture
    def detector(self):
        return DuplicateDetector()

    def test_description_normalization(self, detector):
        """Should match transactions with minor description differences."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX, INC.", "amount": -15.99},
            {"date": "2024-01-15", "description": "NETFLIX INC", "amount": -15.99},
        ]

        duplicates = detector.find_duplicates(transactions)

        # These should be considered duplicates after normalization
        assert len(duplicates) == 1

    def test_description_truncation(self, detector):
        """Should use first 50 chars for fingerprint."""
        long_desc = "A" * 100
        transactions = [
            {"date": "2024-01-15", "description": long_desc, "amount": -100.00},
            {"date": "2024-01-15", "description": long_desc + "extra", "amount": -100.00},
        ]

        duplicates = detector.find_duplicates(transactions)

        # Should be duplicates (same first 50 chars)
        assert len(duplicates) == 1


class TestDeduplicationStrategies:
    """Test different deduplication strategies."""

    @pytest.fixture
    def detector(self):
        return DuplicateDetector()

    def test_keep_first_strategy(self, detector):
        """Should keep first occurrence of duplicates."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99, "id": 1},
            {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99, "id": 2},
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99, "id": 3},
        ]

        result = detector.deduplicate(transactions, strategy="keep_first")

        assert len(result) == 2
        ids = [tx.get("id") for tx in result]
        assert 1 in ids  # First NETFLIX kept
        assert 3 not in ids  # Second NETFLIX removed

    def test_keep_last_strategy(self, detector):
        """Should keep last occurrence of duplicates."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99, "id": 1},
            {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99, "id": 2},
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99, "id": 3},
        ]

        result = detector.deduplicate(transactions, strategy="keep_last")

        assert len(result) == 2
        ids = [tx.get("id") for tx in result]
        assert 3 in ids  # Last NETFLIX kept
        assert 1 not in ids  # First NETFLIX removed

    def test_mark_only_strategy(self, detector):
        """Should mark but not remove duplicates."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},
        ]

        result = detector.deduplicate(transactions, strategy="mark_only")

        assert len(result) == 2  # Both kept
        assert result[0]["is_duplicate"] is True
        assert result[0]["duplicate_count"] == 2


class TestSimilarTransactions:
    """Test similar (not exact) transaction detection."""

    @pytest.fixture
    def detector(self):
        return DuplicateDetector()

    def test_find_similar_same_date_similar_amount(self, detector):
        """Should find transactions with same date and similar amounts."""
        transactions = [
            {"date": "2024-01-15", "description": "Purchase A", "amount": -100.00},
            {"date": "2024-01-15", "description": "Purchase B", "amount": -100.50},
            {"date": "2024-01-16", "description": "Other", "amount": -50.00},
        ]

        similar = detector.find_similar(transactions, threshold=0.99)

        assert len(similar) == 1
        assert similar[0]["reason"] == "similar_amount_same_date"

    def test_no_similar_different_dates(self, detector):
        """Should not flag transactions on different dates."""
        transactions = [
            {"date": "2024-01-15", "description": "Purchase", "amount": -100.00},
            {"date": "2024-01-20", "description": "Purchase", "amount": -100.00},
        ]

        similar = detector.find_similar(transactions)

        # Different dates, should not be flagged as similar
        assert len(similar) == 0


class TestDuplicateStats:
    """Test duplicate statistics reporting."""

    @pytest.fixture
    def detector(self):
        return DuplicateDetector()

    def test_get_duplicate_stats(self, detector):
        """Should return accurate duplicate statistics."""
        transactions = [
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},
            {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99},
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},
            {"date": "2024-01-17", "description": "AMAZON", "amount": -25.00},
            {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99},
        ]

        stats = detector.get_duplicate_stats(transactions)

        assert stats["total_transactions"] == 5
        assert stats["duplicate_count"] == 2  # 2 duplicates (3 total - 1 unique = 2)
        assert stats["duplicate_groups"] == 1
        assert stats["unique_transactions"] == 3

    def test_stats_empty_list(self, detector):
        """Should handle empty transaction list."""
        stats = detector.get_duplicate_stats([])

        assert stats["total_transactions"] == 0
        assert stats["duplicate_count"] == 0
        assert stats["duplicate_rate"] == 0

    def test_stats_no_duplicates(self, detector):
        """Should report zero duplicates when none exist."""
        transactions = [
            {"date": "2024-01-15", "description": "A", "amount": -10.00},
            {"date": "2024-01-16", "description": "B", "amount": -20.00},
        ]

        stats = detector.get_duplicate_stats(transactions)

        assert stats["duplicate_count"] == 0
        assert stats["duplicate_rate"] == 0


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.fixture
    def detector(self):
        return DuplicateDetector()

    def test_missing_fields(self, detector):
        """Should handle missing fields gracefully."""
        transactions = [
            {"description": "NETFLIX", "amount": -15.99},  # Missing date
            {"date": "2024-01-15", "amount": -15.99},  # Missing description
            {"date": "2024-01-15", "description": "NETFLIX"},  # Missing amount
        ]

        # Should not crash
        duplicates = detector.find_duplicates(transactions)
        assert isinstance(duplicates, dict)

    def test_none_values(self, detector):
        """Should handle None values."""
        transactions = [
            {"date": None, "description": None, "amount": None},
            {"date": "2024-01-15", "description": "Test", "amount": 100},
        ]

        # Should not crash
        duplicates = detector.find_duplicates(transactions)
        assert isinstance(duplicates, dict)

    def test_empty_transactions(self, detector):
        """Should handle empty transaction list."""
        result = detector.deduplicate([])
        assert result == []

    def test_single_transaction(self, detector):
        """Should handle single transaction."""
        transactions = [{"date": "2024-01-15", "description": "Test", "amount": 100}]

        result = detector.deduplicate(transactions)
        assert len(result) == 1


class TestFingerprinting:
    """Test fingerprint generation."""

    @pytest.fixture
    def detector(self):
        return DuplicateDetector()

    def test_fingerprint_deterministic(self, detector):
        """Same transaction should always produce same fingerprint."""
        tx = {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99}

        fp1 = detector._fingerprint(tx)
        fp2 = detector._fingerprint(tx)

        assert fp1 == fp2

    def test_fingerprint_different_for_different_tx(self, detector):
        """Different transactions should have different fingerprints."""
        tx1 = {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99}
        tx2 = {"date": "2024-01-16", "description": "SPOTIFY", "amount": -9.99}

        fp1 = detector._fingerprint(tx1)
        fp2 = detector._fingerprint(tx2)

        assert fp1 != fp2

    def test_fingerprint_length(self, detector):
        """Fingerprint should be 16 characters (MD5 truncated)."""
        tx = {"date": "2024-01-15", "description": "NETFLIX", "amount": -15.99}
        fp = detector._fingerprint(tx)

        assert len(fp) == 16
