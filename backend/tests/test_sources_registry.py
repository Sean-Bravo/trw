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


def test_output_formats_still_present(body):
    assert body["output_formats"]["crypto"] == ["koinly", "turbotax", "coinledger", "zenledger"]
    assert body["output_formats"]["bank"] == ["csv"]


# -----------------------------------------------------------------------------
# Exchanges: configs/exchanges.yaml is the registry, ParserRegistry is the
# capability. /v1/sources must serve exactly their intersection, with a
# status on every row, and "verified" must be backed by a fixture-tested
# parser — never by editing the YAML alone.
# -----------------------------------------------------------------------------

from services.exchange_registry import load_exchange_registry, VALID_STATUSES  # noqa: E402
from tests.test_parsing import EXCHANGE_FIXTURES  # noqa: E402

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures", "valid")


@pytest.fixture(scope="module")
def registry():
    reg = load_exchange_registry()
    assert reg, "configs/exchanges.yaml did not load"
    return reg


@pytest.fixture(scope="module")
def parser_ids():
    from services.engine import ParserRegistry

    return set(ParserRegistry().list_supported_exchanges())


def test_every_exchange_carries_id_name_status(body):
    assert body["crypto_exchanges"], "no exchanges served"
    for ex in body["crypto_exchanges"]:
        assert ex["id"] and ex["name"], ex
        assert ex["status"] in ("verified", "beta", "experimental"), ex


def test_generic_fallback_is_not_a_public_source(body):
    assert "generic" not in {e["id"] for e in body["crypto_exchanges"]}


def test_served_exchanges_are_exactly_the_parsers(body, parser_ids):
    served = {e["id"] for e in body["crypto_exchanges"]}
    assert served == parser_ids - {"generic"}, served ^ (parser_ids - {"generic"})


def test_registry_and_parsers_are_one_to_one(registry, parser_ids):
    """A parser without a YAML row would be served as beta with a raw id;
    a YAML row without a parser would be a support claim with nothing
    behind it. Both are drift — fail loudly."""
    assert set(registry) == parser_ids - {"generic"}, set(registry) ^ (parser_ids - {"generic"})


def test_served_status_matches_registry(body, registry):
    for ex in body["crypto_exchanges"]:
        assert ex["status"] == registry[ex["id"]]["status"], ex
        assert ex["name"] == registry[ex["id"]]["name"], ex


def test_registry_statuses_are_valid(registry):
    for row in registry.values():
        assert row["status"] in VALID_STATUSES, row


def test_verified_exchanges_have_a_fixture_and_a_parse_test(registry):
    """verified = fixture file exists AND test_parsing.py parses it."""
    tested = {(fixture, exchange) for fixture, exchange, _ in EXCHANGE_FIXTURES}
    for row in registry.values():
        if row["status"] != "verified":
            continue
        assert row["fixture"], f"{row['id']} is verified without a fixture"
        assert os.path.exists(os.path.join(FIXTURES_DIR, row["fixture"])), row
        assert (row["fixture"], row["id"]) in tested, f"{row['id']}: {row['fixture']} is not in test_parsing.EXCHANGE_FIXTURES"


def test_exchange_without_registry_row_is_served_as_beta_never_verified():
    from services.exchange_registry import public_exchange_sources

    rows = {r["id"]: r for r in public_exchange_sources(["binance", "not_a_real_parser", "generic"])}
    assert rows["binance"]["status"] == "verified"
    assert rows["not_a_real_parser"]["status"] == "beta"
    assert "generic" not in rows
