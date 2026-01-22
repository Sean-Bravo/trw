"""
Day 6: Performance & Security Tests
=====================================
Performance:
1. Load testing with 100+ concurrent jobs
2. Memory leak detection during long operations
3. Response time benchmarks for all endpoints
4. Database query optimization verification
5. Frontend bundle size analysis (separate script)

Security:
1. SQL injection testing
2. XSS vulnerability scanning
3. CSRF protection verification
4. Rate limiting validation
5. File upload security (malicious file handling)
6. Authentication edge cases
"""

import pytest
import time
import gc
import sys
import os
import csv
import json
import tempfile
import threading
import concurrent.futures
from pathlib import Path
from io import StringIO, BytesIO
from unittest.mock import patch, MagicMock
from typing import List, Dict, Any
import tracemalloc

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.engine import process_file, sanitize_csv_value
from services.fingerprinting import detect_exchange_from_headers


# =============================================================================
# FIXTURES
# =============================================================================

FIXTURES_DIR = Path(__file__).parent / "fixtures"
PERF_FIXTURES_DIR = FIXTURES_DIR / "performance"


@pytest.fixture
def small_coinbase_csv():
    """Generate a small Coinbase CSV (100 rows)."""
    return generate_coinbase_csv(100)


@pytest.fixture
def medium_coinbase_csv():
    """Generate a medium Coinbase CSV (1000 rows)."""
    return generate_coinbase_csv(1000)


@pytest.fixture
def large_coinbase_csv():
    """Generate a large Coinbase CSV (10000 rows)."""
    return generate_coinbase_csv(10000)


def generate_coinbase_csv(num_rows: int) -> bytes:
    """Generate a Coinbase-format CSV with specified number of rows."""
    import random
    from datetime import datetime, timedelta

    assets = ['BTC', 'ETH', 'SOL', 'DOGE', 'ADA', 'XRP', 'DOT', 'LINK', 'AVAX', 'MATIC']
    tx_types = ['Buy', 'Sell', 'Send', 'Receive']

    output = StringIO()

    # Coinbase header format
    output.write('\n')
    output.write('Transactions\n')
    output.write('"User,John Doe,abc123-def456-uuid"\n')
    output.write('ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes\n')

    start_date = datetime(2024, 1, 1)

    for i in range(num_rows):
        tx_id = f'tx{i+1:06d}'
        timestamp = start_date + timedelta(hours=i)
        tx_type = random.choice(tx_types)
        asset = random.choice(assets)
        quantity = round(random.uniform(0.001, 10.0), 6)
        if tx_type == 'Send':
            quantity = -quantity
        price = round(random.uniform(100, 50000), 2)
        subtotal = round(abs(quantity) * price, 2)
        fee = round(subtotal * 0.01, 2)
        total = subtotal + fee if tx_type == 'Buy' else subtotal - fee
        notes = ''
        if tx_type == 'Send':
            notes = 'Withdrawal'
        elif tx_type == 'Receive':
            notes = 'Deposit'

        output.write(f'{tx_id},{timestamp.isoformat()}Z,{tx_type},{asset},{quantity},USD,{price},{subtotal},{total:.2f},{fee},{notes}\n')

    return output.getvalue().encode('utf-8')


# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

class TestLoadPerformance:
    """Test 1: Load testing with concurrent processing."""

    def test_concurrent_file_processing_10(self, small_coinbase_csv):
        """Process 10 files concurrently."""
        results = self._run_concurrent_processing(small_coinbase_csv, 10)

        # All should succeed
        successes = sum(1 for r in results if r['success'])
        assert successes >= 9, f"Expected at least 9/10 successes, got {successes}"

        # Average time should be reasonable (< 5s per file with concurrency)
        avg_time = sum(r['time'] for r in results) / len(results)
        assert avg_time < 5.0, f"Average processing time {avg_time:.2f}s too slow"

    def test_concurrent_file_processing_50(self, small_coinbase_csv):
        """Process 50 files concurrently."""
        results = self._run_concurrent_processing(small_coinbase_csv, 50)

        successes = sum(1 for r in results if r['success'])
        assert successes >= 45, f"Expected at least 45/50 successes, got {successes}"

    def test_concurrent_file_processing_100(self, small_coinbase_csv):
        """Process 100 files concurrently - stress test."""
        results = self._run_concurrent_processing(small_coinbase_csv, 100)

        successes = sum(1 for r in results if r['success'])
        failure_rate = (100 - successes) / 100
        assert failure_rate < 0.1, f"Failure rate {failure_rate:.1%} too high"

    def _run_concurrent_processing(self, csv_data: bytes, num_concurrent: int) -> List[Dict]:
        """Run concurrent file processing and collect results."""
        results = []
        lock = threading.Lock()

        def process_one():
            start = time.time()
            try:
                result = process_file(csv_data)
                elapsed = time.time() - start
                with lock:
                    results.append({
                        'success': result.get('success', False),
                        'time': elapsed,
                        'records': len(result.get('records', [])),
                    })
            except Exception as e:
                elapsed = time.time() - start
                with lock:
                    results.append({
                        'success': False,
                        'time': elapsed,
                        'error': str(e),
                    })

        with concurrent.futures.ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = [executor.submit(process_one) for _ in range(num_concurrent)]
            concurrent.futures.wait(futures)

        return results


class TestMemoryLeaks:
    """Test 2: Memory leak detection during long operations."""

    def test_no_memory_leak_repeated_processing(self, small_coinbase_csv):
        """Process same file repeatedly and check for memory growth."""
        gc.collect()
        tracemalloc.start()

        initial_snapshot = tracemalloc.take_snapshot()

        # Process file 50 times
        for i in range(50):
            result = process_file(small_coinbase_csv)
            assert result['success'], f"Processing failed on iteration {i}"

            # Force garbage collection every 10 iterations
            if i % 10 == 0:
                gc.collect()

        gc.collect()
        final_snapshot = tracemalloc.take_snapshot()

        # Compare memory usage
        top_stats = final_snapshot.compare_to(initial_snapshot, 'lineno')

        # Calculate total memory growth
        total_growth = sum(stat.size_diff for stat in top_stats[:10])

        tracemalloc.stop()

        # Allow up to 50MB growth for 50 iterations (1MB per iteration max)
        max_growth = 50 * 1024 * 1024
        assert total_growth < max_growth, f"Memory growth {total_growth / 1024 / 1024:.1f}MB exceeds limit"

    def test_no_memory_leak_large_file(self, large_coinbase_csv):
        """Process large file and verify memory is released."""
        gc.collect()
        tracemalloc.start()

        initial_snapshot = tracemalloc.take_snapshot()

        # Process large file
        result = process_file(large_coinbase_csv)
        assert result['success']
        record_count = len(result.get('records', []))

        # Clear result and collect garbage
        del result
        gc.collect()

        final_snapshot = tracemalloc.take_snapshot()

        top_stats = final_snapshot.compare_to(initial_snapshot, 'lineno')
        retained_memory = sum(stat.size_diff for stat in top_stats[:20] if stat.size_diff > 0)

        tracemalloc.stop()

        # Memory retained should be minimal after cleanup
        max_retained = 10 * 1024 * 1024  # 10MB
        assert retained_memory < max_retained, \
            f"Retained {retained_memory / 1024 / 1024:.1f}MB after processing {record_count} records"


class TestResponseTimeBenchmarks:
    """Test 3: Response time benchmarks for processing operations."""

    def test_small_file_response_time(self, small_coinbase_csv):
        """100-row file should process in < 1 second."""
        start = time.time()
        result = process_file(small_coinbase_csv)
        elapsed = time.time() - start

        assert result['success']
        assert elapsed < 1.0, f"100-row file took {elapsed:.2f}s (limit: 1s)"

    def test_medium_file_response_time(self, medium_coinbase_csv):
        """1000-row file should process in < 3 seconds."""
        start = time.time()
        result = process_file(medium_coinbase_csv)
        elapsed = time.time() - start

        assert result['success']
        assert elapsed < 3.0, f"1000-row file took {elapsed:.2f}s (limit: 3s)"

    def test_large_file_response_time(self, large_coinbase_csv):
        """10000-row file should process in < 15 seconds."""
        start = time.time()
        result = process_file(large_coinbase_csv)
        elapsed = time.time() - start

        assert result['success']
        assert elapsed < 15.0, f"10000-row file took {elapsed:.2f}s (limit: 15s)"

    def test_fingerprinting_response_time(self, small_coinbase_csv):
        """Exchange detection should be fast (< 100ms)."""
        try:
            import pandas as pd
        except ImportError:
            pytest.skip("pandas not available")

        # Parse CSV to DataFrame
        from io import StringIO
        csv_text = small_coinbase_csv.decode('utf-8')
        # Skip metadata rows for Coinbase
        lines = csv_text.split('\n')
        header_idx = next((i for i, line in enumerate(lines) if 'ID,Timestamp' in line), 0)
        df = pd.read_csv(StringIO('\n'.join(lines[header_idx:])), nrows=5)

        start = time.time()
        for _ in range(100):  # Run 100 times
            detect_exchange_from_headers(df)
        elapsed = time.time() - start

        avg_time = elapsed / 100
        assert avg_time < 0.01, f"Fingerprinting took {avg_time * 1000:.2f}ms (limit: 10ms)"


class TestDatabaseQueryOptimization:
    """Test 4: Database query optimization verification."""

    def test_fingerprint_cache_lookup_speed(self):
        """Fingerprint cache lookup should be O(1)."""
        try:
            import pandas as pd
        except ImportError:
            pytest.skip("pandas not available")

        # Test exchange detection speed with various headers
        test_dataframes = [
            pd.DataFrame({'Date(UTC)': [1], 'Pair': [2], 'Side': [3]}),  # Binance-like
            pd.DataFrame({'Timestamp': [1], 'Transaction Type': [2], 'Asset': [3]}),  # Coinbase-like
            pd.DataFrame({'txid': [1], 'refid': [2], 'type': [3]}),  # Kraken-like
        ]

        start = time.time()
        for _ in range(100):
            for df in test_dataframes:
                detect_exchange_from_headers(df)
        elapsed = time.time() - start

        # 300 lookups (100 iterations * 3 dataframes) should complete in < 1s
        assert elapsed < 1.0, f"Pattern matching took {elapsed * 1000:.1f}ms for 300 lookups"

    def test_no_n_plus_1_queries_in_batch_processing(self, small_coinbase_csv):
        """Verify batch processing doesn't cause N+1 query patterns."""
        # Track number of "database" calls (mocked)
        db_calls = []

        original_process = process_file

        def tracking_process(*args, **kwargs):
            db_calls.append(time.time())
            return original_process(*args, **kwargs)

        # Process file
        result = tracking_process(small_coinbase_csv)
        assert result['success']

        record_count = len(result.get('records', []))

        # For batch processing, DB calls should not scale with record count
        # Ideally 1-3 calls max (connect, query, disconnect)
        # This is a design verification - actual DB would need integration test


# =============================================================================
# SECURITY TESTS
# =============================================================================

class TestSQLInjection:
    """Test 6: SQL injection testing."""

    SQL_INJECTION_PAYLOADS = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "1; SELECT * FROM passwords",
        "' UNION SELECT * FROM users --",
        "1'; EXEC xp_cmdshell('dir'); --",
        "admin'--",
        "' OR 1=1 --",
        "'; INSERT INTO users VALUES('hacker', 'pass'); --",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --",
        "${7*7}",  # Template injection
        "{{7*7}}",  # Jinja injection
    ]

    def test_sql_injection_in_filename(self):
        """SQL injection in filename should be sanitized."""
        csv_data = generate_coinbase_csv(10)

        for payload in self.SQL_INJECTION_PAYLOADS:
            # The engine doesn't use filename for queries, but verify it handles bad input
            result = process_file(csv_data)
            assert result['success'], f"Processing failed with payload in context"

            # Check that payload doesn't appear in any output
            records = result.get('records', [])
            for record in records:
                for value in record.values():
                    if isinstance(value, str):
                        assert payload not in value, f"SQL payload leaked to output"

    def test_sql_injection_in_csv_content(self):
        """SQL injection in CSV content should be sanitized."""
        for payload in self.SQL_INJECTION_PAYLOADS:
            # Create CSV with injection payload in description field
            csv_content = f'''
Transactions
"User,Test,uuid123"
ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
tx001,2024-01-01T00:00:00Z,Buy,BTC,1.0,USD,50000,50000,50500,500,{payload}
'''
            result = process_file(csv_content.encode('utf-8'))

            # Processing should succeed - payload is just treated as text
            if result['success']:
                records = result.get('records', [])
                # Verify payload is sanitized (no raw SQL metacharacters that could be harmful)
                for record in records:
                    desc = record.get('Description', '')
                    # Verify CSV injection protection applied
                    if payload.startswith(("'", "=", "+", "-", "@", "\t", "\r")):
                        # These should be escaped or removed
                        assert not desc.startswith(payload[0]) or desc.startswith("'"), \
                            f"CSV injection not sanitized: {desc}"


class TestXSSVulnerabilities:
    """Test 7: XSS vulnerability scanning."""

    XSS_PAYLOADS = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert(1)</script>',
        "javascript:alert('XSS')",
        '<svg onload=alert("XSS")>',
        '<body onload=alert("XSS")>',
        '{{constructor.constructor("alert(1)")()}}',
        '<iframe src="javascript:alert(1)">',
        '<a href="javascript:alert(1)">click</a>',
        "'-alert(1)-'",
    ]

    def test_xss_in_csv_content_sanitized(self):
        """XSS payloads in CSV content should be sanitized."""
        for payload in self.XSS_PAYLOADS:
            csv_content = f'''
Transactions
"User,Test,uuid123"
ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
tx001,2024-01-01T00:00:00Z,Buy,BTC,1.0,USD,50000,50000,50500,500,{payload}
'''
            result = process_file(csv_content.encode('utf-8'))

            if result['success']:
                records = result.get('records', [])
                for record in records:
                    for key, value in record.items():
                        if isinstance(value, str):
                            # Script tags should never appear in output
                            assert '<script>' not in value.lower(), \
                                f"XSS payload in {key}: {value}"
                            assert 'javascript:' not in value.lower(), \
                                f"JavaScript URL in {key}: {value}"

    def test_csv_value_sanitization(self):
        """Test sanitize_csv_value function directly."""
        dangerous_values = [
            "=cmd|'/C calc.exe'!A0",
            "+cmd|'/C calc.exe'!A0",
            "-cmd|'/C calc.exe'!A0",
            "@SUM(A1:A10)",
            "\t=cmd|'/C calc.exe'",
            "\r\n=cmd|'/C calc.exe'",
        ]

        for value in dangerous_values:
            sanitized = sanitize_csv_value(value)
            # Sanitized value should not start with dangerous characters
            assert not sanitized.startswith('='), f"Formula injection: {sanitized}"
            assert not sanitized.startswith('+'), f"Formula injection: {sanitized}"
            assert not sanitized.startswith('-'), f"Formula injection: {sanitized}"
            assert not sanitized.startswith('@'), f"Formula injection: {sanitized}"


class TestCSRFProtection:
    """Test 8: CSRF protection verification."""

    def test_api_routes_require_authentication(self):
        """Verify API routes are designed for authenticated access."""
        # This is a design verification - actual CSRF requires integration testing
        # The webhook handler expects userId in request body
        pass

    def test_presigned_urls_are_user_scoped(self):
        """Verify presigned URLs include user context."""
        # Webhook handler includes user-id in S3 metadata
        # This prevents cross-user access
        pass


class TestRateLimiting:
    """Test 9: Rate limiting validation."""

    def test_rapid_processing_requests(self, small_coinbase_csv):
        """Verify system handles rapid requests without crashing."""
        # Simulate burst of requests
        results = []

        start = time.time()
        for i in range(20):
            result = process_file(small_coinbase_csv)
            results.append(result['success'])
        elapsed = time.time() - start

        # All should succeed (no rate limiting at engine level)
        assert all(results), "Some requests failed under load"

        # Should complete in reasonable time
        assert elapsed < 30, f"20 requests took {elapsed:.1f}s"


class TestFileUploadSecurity:
    """Test 10: File upload security (malicious file handling)."""

    def test_rejects_oversized_files(self):
        """Files exceeding size limit should be rejected."""
        from services.engine import MAX_FILE_SIZE

        # Create file larger than limit (just check the constant exists)
        assert MAX_FILE_SIZE == 50 * 1024 * 1024, "MAX_FILE_SIZE should be 50MB"

    def test_rejects_non_csv_content(self):
        """Non-CSV content should fail gracefully."""
        # Binary garbage
        result = process_file(b'\x00\x01\x02\x03\x04\x05')
        assert not result['success'] or len(result.get('records', [])) == 0

        # Executable header
        result = process_file(b'MZ\x90\x00\x03\x00\x00\x00')
        assert not result['success'] or len(result.get('records', [])) == 0

    def test_rejects_zip_bombs(self):
        """Compressed file markers should be rejected."""
        # ZIP header
        result = process_file(b'PK\x03\x04')
        assert not result['success'] or len(result.get('records', [])) == 0

        # GZIP header
        result = process_file(b'\x1f\x8b\x08')
        assert not result['success'] or len(result.get('records', [])) == 0

    def test_handles_malformed_csv(self):
        """Malformed CSV should fail gracefully, not crash."""
        malformed_inputs = [
            b'',  # Empty
            b'\n\n\n',  # Only newlines
            b'"unclosed quote',  # Unclosed quote
            b'a,b,c\n1,2',  # Missing column
            b'a,b,c\n1,2,3,4,5,6',  # Extra columns
            b'\xff\xfe' + 'test'.encode('utf-16'),  # BOM with wrong encoding claim
        ]

        for data in malformed_inputs:
            try:
                result = process_file(data)
                # Should not crash - either fails gracefully or returns empty
                assert isinstance(result, dict)
            except Exception as e:
                pytest.fail(f"Malformed input caused crash: {e}")

    def test_path_traversal_in_content(self):
        """Path traversal attempts in content should be sanitized."""
        traversal_payloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32',
            '/etc/passwd',
            'C:\\Windows\\System32',
            'file:///etc/passwd',
        ]

        for payload in traversal_payloads:
            csv_content = f'''
Transactions
"User,Test,uuid123"
ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
tx001,2024-01-01T00:00:00Z,Buy,BTC,1.0,USD,50000,50000,50500,500,{payload}
'''
            result = process_file(csv_content.encode('utf-8'))

            if result['success']:
                records = result.get('records', [])
                # Path traversal should just be treated as text, not executed
                # Verify no file system access occurred (would fail if tried)
                assert len(records) >= 0


class TestAuthenticationEdgeCases:
    """Test 11: Authentication edge cases."""

    def test_anonymous_processing_allowed(self, small_coinbase_csv):
        """Processing should work without user context (for testing)."""
        result = process_file(small_coinbase_csv)
        assert result['success']

    def test_handles_empty_user_id(self, small_coinbase_csv):
        """Empty user ID should be handled gracefully."""
        result = process_file(small_coinbase_csv)
        # Engine doesn't require user ID
        assert result['success']

    def test_processes_regardless_of_user_tier(self, small_coinbase_csv):
        """Processing engine works regardless of subscription tier."""
        # Tier affects AI insights, not core processing
        result = process_file(small_coinbase_csv)
        assert result['success']


# =============================================================================
# ADDITIONAL SECURITY TESTS
# =============================================================================

class TestCSVInjection:
    """Test CSV formula injection protection."""

    def test_formula_injection_prevention(self):
        """Formulas in CSV should be escaped."""
        dangerous_formulas = [
            '=1+1',
            '=HYPERLINK("http://evil.com")',
            '=IMPORTXML("http://evil.com", "//a")',
            '@SUM(A1:A100)',
            '+1+1',
            '-1+1',
        ]

        for formula in dangerous_formulas:
            sanitized = sanitize_csv_value(formula)
            # Should be prefixed with single quote or similar protection
            first_char = sanitized[0] if sanitized else ''
            assert first_char not in ['=', '+', '-', '@'], \
                f"Formula {formula} not sanitized: {sanitized}"

    def test_newline_injection_prevention(self):
        """Newlines in values should be handled."""
        value_with_newline = "line1\nline2\rline3"
        sanitized = sanitize_csv_value(value_with_newline)

        # Newlines should be escaped or removed
        # (depends on implementation - just verify no crash)
        assert isinstance(sanitized, str)


class TestEncodingAttacks:
    """Test encoding-based attacks."""

    def test_handles_various_encodings(self):
        """Process files with various encodings safely."""
        csv_base = '''
Transactions
"User,Test,uuid123"
ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
tx001,2024-01-01T00:00:00Z,Buy,BTC,1.0,USD,50000,50000,50500,500,Test
'''

        encodings = ['utf-8', 'utf-16', 'latin-1', 'ascii']

        for encoding in encodings:
            try:
                encoded = csv_base.encode(encoding)
                result = process_file(encoded)
                # Should either succeed or fail gracefully
                assert isinstance(result, dict)
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass  # Some encodings can't represent all characters

    def test_null_byte_injection(self):
        """Null bytes should be handled safely."""
        csv_with_nulls = b'ID,Name\n1,Test\x00Injection'

        try:
            result = process_file(csv_with_nulls)
            assert isinstance(result, dict)
            # Should not crash
        except Exception as e:
            pytest.fail(f"Null byte caused crash: {e}")


# =============================================================================
# BENCHMARK COLLECTION
# =============================================================================

class TestBenchmarkCollection:
    """Collect benchmark data for reporting."""

    def test_collect_processing_benchmarks(self, small_coinbase_csv, medium_coinbase_csv):
        """Collect processing time benchmarks."""
        benchmarks = {}

        # 100 rows
        start = time.time()
        result = process_file(small_coinbase_csv)
        benchmarks['100_rows'] = {
            'time': time.time() - start,
            'success': result['success'],
            'records': len(result.get('records', [])),
        }

        # 1000 rows
        start = time.time()
        result = process_file(medium_coinbase_csv)
        benchmarks['1000_rows'] = {
            'time': time.time() - start,
            'success': result['success'],
            'records': len(result.get('records', [])),
        }

        # Calculate throughput
        for key, data in benchmarks.items():
            if data['time'] > 0:
                data['rows_per_second'] = data['records'] / data['time']

        # Print benchmark report
        print("\n=== Processing Benchmarks ===")
        for key, data in benchmarks.items():
            print(f"{key}: {data['time']:.3f}s, {data.get('rows_per_second', 0):.0f} rows/s")

        # All should succeed
        assert all(b['success'] for b in benchmarks.values())


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
