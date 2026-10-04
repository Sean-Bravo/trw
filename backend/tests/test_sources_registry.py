"""
GET /v1/sources must reflect the real bank config registry.

Regression: handle_v1_sources iterated the fingerprinter's config *dict*
directly, got string keys, raised inside a try/except, and shipped
`"banks": []` to production while the homepage listed seven banks.
This test calls the handler for real against configs/banks/*.yaml.
"""

import json
import os
import sys
from unittest.mock import MagicMock

import pytest

# Same minimal external-dep patching as test_api_handler.py: the handler
# module imports boto3/psycopg2 at import time; everything else is real.
for _mod in ("boto3", "psycopg2", "psycopg2.extras", "psycopg2.pool"):
    sys.modules.setdefault(_mod, MagicMock())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from handlers.api import handle_v1_sources  # noqa: E402

CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "configs", "banks")

VERIFIED = {"chase", "mercury", "navy_federal"}
BETA = {"bank_of_america", "citi", "wells_fargo"}


@pytest.fixture(scope="module")
def body():
    resp = handle_v1_sources({})
    assert resp["statusCode"] == 200
    return json.loads(resp["body"])


def test_banks_are_listed_from_real_configs(body):
    ids = {b["id"] for b in body["banks"]}
    assert ids == VERIFIED | BETA, ids
    assert "unknown_bank" not in ids  # _generic.yaml is never a public source


def test_every_bank_carries_name_status_version(body):
    for bank in body["banks"]:
        assert bank["name"], bank
        assert bank["status"] in ("verified", "beta", "experimental"), bank
        assert bank["version"], bank


def test_statuses_match_the_registry(body):
    by_id = {b["id"]: b["status"] for b in body["banks"]}
    for bank_id in VERIFIED:
        assert by_id[bank_id] == "verified", (bank_id, by_id[bank_id])
    for bank_id in BETA:
        assert by_id[bank_id] == "beta", (bank_id, by_id[bank_id])


def test_no_bank_is_promoted_without_an_explicit_status():
    """A YAML without `status` must surface as beta, never verified."""
    import yaml

    for filename in os.listdir(CONFIG_DIR):
        if not filename.endswith(".yaml") or filename.startswith("_"):
            continue
        with open(os.path.join(CONFIG_DIR, filename)) as f:
            cfg = yaml.safe_load(f)
        status = cfg["bank"].get("status", "beta")
        if status == "verified":
            assert cfg["bank"]["name"].lower().replace(" ", "_") in VERIFIED, filename


def test_exchanges_and_output_formats_still_present(body):
    exchange_ids = {e["id"] for e in body["crypto_exchanges"]}
    assert {"coinbase", "binance", "kraken", "generic"} <= exchange_ids
    assert body["output_formats"]["crypto"] == ["koinly", "turbotax", "coinledger", "zenledger"]
    assert body["output_formats"]["bank"] == ["csv"]
