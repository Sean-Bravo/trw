#!/usr/bin/env python3
"""
Local Engine Smoke Test

Bypasses AWS Lambda/S3 and runs the engine directly against test fixtures.
Use this to verify detection and parsing before deploying.

Usage:
    python3 scripts/test_local_engine.py
    python3 scripts/test_local_engine.py coinbase_valid.csv
"""

import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from services.engine import process_file


def run_smoke_test(filename: str, fixtures_dir: str = "backend/tests/fixtures/valid"):
    """Run a smoke test on a single file."""
    print(f"\n{'='*60}")
    print(f"Testing: {filename}")
    print('='*60)

    filepath = os.path.join(fixtures_dir, filename)

    if not os.path.exists(filepath):
        print(f"  File not found: {filepath}")
        return False

    # Read the file (simulating S3 download)
    with open(filepath, 'rb') as f:
        file_content = f.read()

    # Run the engine with auto-detection (exchange_name=None)
    result = process_file(file_content, exchange_name=None)

    # Analyze results
    if result.get('success'):
        print(f"  Status:   SUCCESS")
        print(f"  Exchange: {result.get('exchange', 'UNKNOWN')}")
        print(f"  Records:  {len(result.get('records', []))}")

        # Show sample record
        records = result.get('records', [])
        if records:
            print(f"\n  Sample Record (first row):")
            for key, value in records[0].items():
                print(f"    {key}: {value}")

        # Show warnings if any
        warnings = result.get('warnings', [])
        if warnings:
            print(f"\n  Warnings ({len(warnings)}):")
            for w in warnings[:5]:  # Show first 5
                print(f"    - {w}")

        return True
    else:
        print(f"  Status: FAILED")
        print(f"  Error:  {result.get('error', 'Unknown error')}")

        # Show detailed errors if available
        errors = result.get('errors', [])
        if errors:
            print(f"\n  Detailed Errors:")
            for e in errors[:10]:
                print(f"    - {e}")

        return False


def run_all_fixtures():
    """Run smoke tests on all valid fixtures."""
    fixtures_dir = "backend/tests/fixtures/valid"

    if not os.path.exists(fixtures_dir):
        print(f"Fixtures directory not found: {fixtures_dir}")
        print("Run from project root: python3 scripts/test_local_engine.py")
        return

    files = [f for f in os.listdir(fixtures_dir) if f.endswith('.csv')]
    files.sort()

    print(f"\nRunning smoke tests on {len(files)} fixtures...")

    passed = 0
    failed = 0

    for filename in files:
        if run_smoke_test(filename, fixtures_dir):
            passed += 1
        else:
            failed += 1

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print('='*60)
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Total:  {len(files)}")

    if failed == 0:
        print("\n  All tests passed!")
    else:
        print(f"\n  {failed} test(s) failed - review output above")


if __name__ == "__main__":
    # Change to project root if running from scripts dir
    if os.path.basename(os.getcwd()) == 'scripts':
        os.chdir('..')

    if len(sys.argv) > 1:
        # Test specific file(s)
        for filename in sys.argv[1:]:
            run_smoke_test(filename)
    else:
        # Test all fixtures
        run_all_fixtures()
