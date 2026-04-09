"""Tests for backend.services.safe_errors (H-9)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))
from safe_errors import safe_error_message


def test_strips_html():
    assert "<script>" not in safe_error_message(Exception("oh no <script>alert(1)</script>"))


def test_strips_quotes_and_brackets():
    out = safe_error_message(Exception('error: "boom" [trace=abc]'))
    assert '"' not in out
    assert "[" not in out
    assert "]" not in out


def test_keeps_basic_punctuation():
    out = safe_error_message(Exception("File not found: report.csv (line 12)"))
    assert "report.csv" in out
    assert "(" in out
    assert ")" in out


def test_caps_length():
    long_msg = "x" * 5000
    out = safe_error_message(Exception(long_msg))
    assert len(out) <= 200


def test_empty_after_strip_returns_generic():
    out = safe_error_message(Exception("@@@@<<<>>>"))
    assert out == "An internal error occurred."


def test_none_returns_generic():
    assert safe_error_message(None) == "An internal error occurred."
