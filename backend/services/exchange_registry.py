"""
Exchange source registry — reads configs/exchanges.yaml.

The YAML is the single source of truth for which exchanges are supported
and at what status (verified / beta / experimental / unsupported). The
parsers in engine.py decide what *can* be parsed; this file decides what
we *claim*. GET /v1/sources joins the two.
"""

import logging
import os
from typing import Dict, List

import yaml

logger = logging.getLogger(__name__)

VALID_STATUSES = ("verified", "beta", "experimental", "unsupported")

# Same probing order as bank_statement/fingerprinter.py: local dev, Lambda,
# Lambda flat, Lambda absolute.
_CANDIDATE_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "configs", "exchanges.yaml"),
    os.path.join(os.path.dirname(__file__), "configs", "exchanges.yaml"),
    "/var/task/configs/exchanges.yaml",
]


def registry_path() -> str:
    for path in _CANDIDATE_PATHS:
        if os.path.exists(path):
            return path
    return _CANDIDATE_PATHS[0]


def load_exchange_registry() -> Dict[str, dict]:
    """
    Return {exchange_id: {"id", "name", "status", "fixture"?}} from the YAML.

    A missing or unreadable file returns {} and logs — callers must then
    treat every parser as "beta", never "verified".
    """
    path = registry_path()
    if not os.path.exists(path):
        logger.warning(f"Exchange registry not found: {path}")
        return {}

    try:
        with open(path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Failed to load exchange registry {path}: {e}")
        return {}

    registry: Dict[str, dict] = {}
    for row in data.get("exchanges") or []:
        exchange_id = str(row.get("id", "")).strip().lower()
        if not exchange_id:
            logger.error(f"Exchange registry row without id skipped: {row}")
            continue
        status = row.get("status", "beta")
        if status not in VALID_STATUSES:
            logger.error(f"Exchange {exchange_id} has unknown status {status!r}; reporting beta")
            status = "beta"
        registry[exchange_id] = {
            "id": exchange_id,
            "name": row.get("name", exchange_id),
            "status": status,
            "fixture": row.get("fixture"),
        }
    return registry


def public_exchange_sources(parser_ids: List[str]) -> List[dict]:
    """
    Build the `crypto_exchanges` list for GET /v1/sources.

    Only exchanges that have a real parser are listed. The registry supplies
    name and status; a parser with no registry row is served as "beta" so a
    forgotten YAML entry can never read as verified. `generic` is the
    fallback parser, not a source, and is never listed — same rule as
    `_generic.yaml` on the bank side. Rows marked unsupported are dropped.
    """
    registry = load_exchange_registry()
    sources = []
    for exchange_id in parser_ids:
        if exchange_id == "generic":
            continue
        row = registry.get(exchange_id)
        if row is None:
            logger.warning(f"Parser {exchange_id!r} has no row in configs/exchanges.yaml; serving as beta")
            row = {"id": exchange_id, "name": exchange_id, "status": "beta"}
        if row["status"] == "unsupported":
            continue
        sources.append({"id": exchange_id, "name": row["name"], "status": row["status"]})
    return sources
