"""
Duplicate Detector - Find and handle duplicate transactions.

Useful when users upload overlapping statement periods.
"""

import hashlib
import logging
from typing import Any, Dict, List, Set

logger = logging.getLogger(__name__)


class DuplicateDetector:
    """Detect and handle duplicate transactions."""

    def __init__(self, tolerance: float = 0.01):
        """
        Initialize detector.

        Args:
            tolerance: Amount tolerance for floating point comparison (default $0.01)
        """
        self.tolerance = tolerance

    def find_duplicates(
        self, transactions: List[Dict[str, Any]]
    ) -> Dict[str, List[int]]:
        """
        Find duplicate transactions based on date + amount + description.

        Args:
            transactions: List of normalized transactions

        Returns:
            Dict mapping fingerprint to list of duplicate indices
        """
        fingerprints: Dict[str, List[int]] = {}

        for i, tx in enumerate(transactions):
            fp = self._fingerprint(tx)
            if fp not in fingerprints:
                fingerprints[fp] = []
            fingerprints[fp].append(i)

        # Return only actual duplicates (more than one occurrence)
        duplicates = {
            fp: indices for fp, indices in fingerprints.items() if len(indices) > 1
        }

        if duplicates:
            total_dupes = sum(len(indices) - 1 for indices in duplicates.values())
            logger.info(f"Found {total_dupes} duplicate transactions")

        return duplicates

    def _fingerprint(self, tx: Dict[str, Any]) -> str:
        """
        Generate fingerprint for a transaction.

        Uses date + rounded amount + first 50 chars of description.
        """
        date = str(tx.get("date", "")).strip()
        amount = round(float(tx.get("amount", 0) or 0), 2)

        # Normalize description for comparison
        description = str(tx.get("description", "")).lower().strip()
        # Remove common variable parts
        description = description.replace(",", "").replace(".", "")
        # Take first 50 chars for fingerprint
        description = description[:50]

        # Create hash
        key = f"{date}|{amount:.2f}|{description}"
        return hashlib.md5(key.encode()).hexdigest()[:16]

    def deduplicate(
        self, transactions: List[Dict[str, Any]], strategy: str = "keep_first"
    ) -> List[Dict[str, Any]]:
        """
        Remove duplicate transactions.

        Args:
            transactions: List of transactions
            strategy: How to handle duplicates
                - 'keep_first': Keep first occurrence (default)
                - 'keep_last': Keep last occurrence
                - 'mark_only': Don't remove, just mark duplicates

        Returns:
            Deduplicated transaction list
        """
        duplicates = self.find_duplicates(transactions)

        if not duplicates:
            return transactions

        indices_to_remove: Set[int] = set()

        for fp, indices in duplicates.items():
            if strategy == "keep_first":
                # Remove all but first occurrence
                indices_to_remove.update(indices[1:])
            elif strategy == "keep_last":
                # Remove all but last occurrence
                indices_to_remove.update(indices[:-1])
            elif strategy == "mark_only":
                # Mark duplicates but don't remove
                for idx in indices:
                    transactions[idx]["is_duplicate"] = True
                    transactions[idx]["duplicate_count"] = len(indices)

        if strategy == "mark_only":
            return transactions

        # Return filtered list
        result = [tx for i, tx in enumerate(transactions) if i not in indices_to_remove]

        logger.info(
            f"Removed {len(indices_to_remove)} duplicates, "
            f"{len(result)} transactions remaining"
        )

        return result

    def find_similar(
        self, transactions: List[Dict[str, Any]], threshold: float = 0.8
    ) -> List[Dict[str, List[int]]]:
        """
        Find potentially similar transactions (not exact duplicates).

        Useful for flagging transactions that might need review.

        Args:
            transactions: List of transactions
            threshold: Similarity threshold (0-1)

        Returns:
            List of similar transaction groups
        """
        # Group by date first for efficiency
        by_date: Dict[str, List[int]] = {}
        for i, tx in enumerate(transactions):
            date = tx.get("date", "")
            if date not in by_date:
                by_date[date] = []
            by_date[date].append(i)

        similar_groups = []

        for date, indices in by_date.items():
            if len(indices) < 2:
                continue

            # Check for similar amounts on same date
            for i in range(len(indices)):
                for j in range(i + 1, len(indices)):
                    idx_i, idx_j = indices[i], indices[j]
                    tx_i, tx_j = transactions[idx_i], transactions[idx_j]

                    amount_i = abs(float(tx_i.get("amount", 0) or 0))
                    amount_j = abs(float(tx_j.get("amount", 0) or 0))

                    # Check if amounts are within tolerance
                    if amount_i > 0 and amount_j > 0:
                        ratio = min(amount_i, amount_j) / max(amount_i, amount_j)
                        if ratio >= threshold:
                            similar_groups.append(
                                {
                                    "indices": [idx_i, idx_j],
                                    "similarity": ratio,
                                    "reason": "similar_amount_same_date",
                                }
                            )

        return similar_groups

    def get_duplicate_stats(
        self, transactions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Get statistics about duplicates in transaction list.

        Returns:
            Dict with duplicate statistics
        """
        duplicates = self.find_duplicates(transactions)

        total_transactions = len(transactions)
        duplicate_groups = len(duplicates)
        duplicate_count = sum(len(indices) - 1 for indices in duplicates.values())

        return {
            "total_transactions": total_transactions,
            "duplicate_groups": duplicate_groups,
            "duplicate_count": duplicate_count,
            "unique_transactions": total_transactions - duplicate_count,
            "duplicate_rate": (
                duplicate_count / total_transactions if total_transactions > 0 else 0
            ),
        }
