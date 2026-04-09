"""Tests for backend.services.csv_safety (M-10)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))
from csv_safety import (
    sanitize_csv_cell,
    sanitize_csv_row,
    sanitize_csv_record,
    sanitize_csv_records,
)


def test_neutralizes_equals_formula():
    assert sanitize_csv_cell("=SUM(A1:A5)") == "'=SUM(A1:A5)"


def test_neutralizes_dde_command():
    # Classic Excel DDE RCE vector
    assert sanitize_csv_cell("=cmd|'/c calc'!A1") == "'=cmd|'/c calc'!A1"


def test_neutralizes_plus_minus_at_tab_cr():
    assert sanitize_csv_cell("+1+1").startswith("'")
    assert sanitize_csv_cell("-1+1").startswith("'")
    assert sanitize_csv_cell("@SUM(A1)").startswith("'")
    assert sanitize_csv_cell("\tinjected").startswith("'")
    assert sanitize_csv_cell("\rinjected").startswith("'")


def test_leaves_safe_strings_alone():
    assert sanitize_csv_cell("Coffee Shop NYC") == "Coffee Shop NYC"
    assert sanitize_csv_cell("123.45") == "123.45"
    assert sanitize_csv_cell("") == ""


def test_passes_through_non_strings():
    assert sanitize_csv_cell(42) == 42
    assert sanitize_csv_cell(3.14) == 3.14
    assert sanitize_csv_cell(None) is None


def test_sanitize_row_handles_mixed_cells():
    row = ["2024-01-01", "=evil()", 42.5, "safe"]
    out = sanitize_csv_row(row)
    assert out[0] == "2024-01-01"
    assert out[1] == "'=evil()"
    assert out[2] == 42.5
    assert out[3] == "safe"


def test_sanitize_record_handles_dict():
    record = {"date": "2024-01-01", "description": "=BAD()", "amount": 100}
    out = sanitize_csv_record(record)
    assert out["date"] == "2024-01-01"
    assert out["description"] == "'=BAD()"
    assert out["amount"] == 100


def test_sanitize_records_handles_list_of_dicts():
    records = [
        {"a": "=x", "b": "ok"},
        {"a": "+y", "b": "ok"},
    ]
    out = sanitize_csv_records(records)
    assert out[0]["a"] == "'=x"
    assert out[1]["a"] == "'+y"
