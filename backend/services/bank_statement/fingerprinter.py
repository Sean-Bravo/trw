"""
Bank Fingerprinter - Detect bank from PDF text content.
"""

import os
import logging
from typing import Dict, List, Optional

import yaml

logger = logging.getLogger(__name__)


class BankFingerprinter:
    """Detect which bank a PDF statement belongs to."""

    def __init__(self, config_dir: Optional[str] = None):
        """
        Initialize fingerprinter with bank configs.

        Args:
            config_dir: Path to bank config directory. Searches multiple paths.
        """
        if config_dir is None:
            # Try multiple paths (Lambda flat structure vs local dev)
            possible_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", "configs", "banks"),  # Local dev
                os.path.join(os.path.dirname(__file__), "..", "configs", "banks"),  # Lambda
                os.path.join(os.path.dirname(__file__), "configs", "banks"),  # Lambda flat
                "/var/task/configs/banks",  # Lambda absolute
            ]
            for path in possible_paths:
                if os.path.exists(path):
                    config_dir = path
                    break
            else:
                config_dir = possible_paths[0]  # Default to first path
        self.config_dir = config_dir
        self.configs: Dict[str, dict] = {}
        self._load_configs()

    def _load_configs(self) -> None:
        """Load all bank YAML configs."""
        if not os.path.exists(self.config_dir):
            logger.warning(f"Config directory not found: {self.config_dir}")
            return

        for filename in os.listdir(self.config_dir):
            if filename.endswith(".yaml") and not filename.startswith("_"):
                filepath = os.path.join(self.config_dir, filename)
                try:
                    with open(filepath) as f:
                        config = yaml.safe_load(f)
                        bank_name = config["bank"]["name"].lower().replace(" ", "_")
                        self.configs[bank_name] = config
                        logger.debug(f"Loaded config for {bank_name}")
                except Exception as e:
                    logger.error(f"Failed to load config {filename}: {e}")

        logger.info(f"Loaded {len(self.configs)} bank configs")

    def detect_bank(self, text: str) -> Dict:
        """
        Detect bank from PDF text content.

        Args:
            text: Extracted text from PDF (usually first page)

        Returns:
            Bank config dict if matched, generic config if unknown
        """
        text_lower = text.lower()

        # Score each bank config
        scores: Dict[str, int] = {}

        for bank_name, config in self.configs.items():
            score = 0
            fingerprint = config.get("fingerprint", {})

            # Check logo patterns (high weight)
            for pattern in fingerprint.get("logo_patterns", []):
                if pattern.lower() in text_lower:
                    score += 10

            # Check header patterns (medium weight)
            header_patterns = fingerprint.get("header_patterns", [])
            matched_headers = sum(
                1 for p in header_patterns if p.lower() in text_lower
            )
            score += matched_headers * 5

            # Check unique markers (highest weight)
            for marker in fingerprint.get("unique_markers", []):
                if marker.lower() in text_lower:
                    score += 20

            if score > 0:
                scores[bank_name] = score

        # Return highest scoring bank
        if scores:
            best_match = max(scores, key=scores.get)
            logger.info(f"Detected bank: {best_match} (score: {scores[best_match]})")
            return self.configs[best_match]

        # Return generic fallback
        logger.info("No bank matched, using generic config")
        return self._get_generic_config()

    def _get_generic_config(self) -> Dict:
        """Load the generic fallback config."""
        generic_path = os.path.join(self.config_dir, "_generic.yaml")

        if os.path.exists(generic_path):
            with open(generic_path) as f:
                return yaml.safe_load(f)

        # Hardcoded fallback if file missing
        return {
            "bank": {"name": "Unknown Bank", "is_generic": True, "version": "1.0.0"},
            "table_detection": {
                "header_row_keywords": ["Date", "Description", "Amount", "Balance"],
                "skip_rows_containing": ["Total", "Balance", "Page"],
            },
            "columns": {
                "date": {"names": ["Date"], "format": "MM/DD/YYYY"},
                "description": {"names": ["Description"], "max_length": 255},
                "amount": {"names": ["Amount"], "debit_credit_mode": False},
            },
            "normalization": {
                "date_output": "YYYY-MM-DD",
                "amount_sign": "negative_for_debits",
            },
        }

    def get_supported_banks(self) -> List[Dict]:
        """Get list of supported banks with metadata."""
        banks = []
        for bank_name, config in self.configs.items():
            bank_info = config.get("bank", {})
            banks.append(
                {
                    "id": bank_name,
                    "name": bank_info.get("name", bank_name),
                    "aliases": bank_info.get("aliases", []),
                    "version": bank_info.get("version", "1.0.0"),
                }
            )
        return sorted(banks, key=lambda x: x["name"])

    def get_config_version(self, bank_name: str) -> str:
        """Get version string for a bank config."""
        config = self.configs.get(bank_name.lower().replace(" ", "_"))
        if config:
            return f"{bank_name}:{config['bank'].get('version', '1.0.0')}"
        return "generic:1.0.0"
