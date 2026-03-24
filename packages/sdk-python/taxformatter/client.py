"""TaxFormatter API client."""

import base64
import time
from pathlib import Path
from typing import Any, Dict, Optional, Union

import requests

from .errors import TaxFormatterError, AuthenticationError, RateLimitError, ParseError
from .types import ParseResponse, SourcesResponse, UsageResponse, HealthResponse

DEFAULT_BASE_URL = "https://api.taxformatter.com"
DEFAULT_TIMEOUT = 30
DEFAULT_MAX_RETRIES = 3


class TaxFormatter:
    """Client for the TaxFormatter API.

    Args:
        api_key: Your TaxFormatter API key (tf_live_xxx).
        base_url: API base URL. Default: https://api.taxformatter.com
        timeout: Request timeout in seconds. Default: 30
        max_retries: Max retries on 429. Default: 3
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ):
        if not api_key:
            raise ValueError("API key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        })

    def _request(self, method: str, path: str, json: Optional[Dict] = None, attempt: int = 1) -> Any:
        """Make an API request with auto-retry on 429."""
        try:
            resp = self._session.request(
                method,
                f"{self.base_url}{path}",
                json=json,
                timeout=self.timeout,
            )
        except requests.Timeout:
            raise TaxFormatterError("timeout", f"Request timed out after {self.timeout}s", 408)
        except requests.ConnectionError as e:
            raise TaxFormatterError("connection_error", str(e), 0)

        data = resp.json()

        if resp.ok:
            return data

        # Auto-retry on 429
        if resp.status_code == 429 and attempt < self.max_retries:
            retry_after = int(resp.headers.get("Retry-After", 0)) or (2 ** attempt)
            time.sleep(retry_after)
            return self._request(method, path, json=json, attempt=attempt + 1)

        # Raise typed errors
        code = data.get("code", "unknown_error")
        message = data.get("message", f"Request failed with status {resp.status_code}")
        suggestion = data.get("suggestion", "")

        if resp.status_code == 401:
            raise AuthenticationError(message)
        if resp.status_code == 429:
            raise RateLimitError(message, data.get("metadata", {}).get("retry_after_seconds", 0))
        if resp.status_code == 422:
            raise ParseError(code, message, suggestion)

        raise TaxFormatterError(code, message, resp.status_code, suggestion)

    def parse(
        self,
        input: Union[str, Path, bytes],
        filename: Optional[str] = None,
        output_format: Optional[str] = None,
        exchange: Optional[str] = None,
        bank: Optional[str] = None,
    ) -> ParseResponse:
        """Parse a crypto CSV or bank statement PDF.

        Args:
            input: File path (str/Path) or raw bytes.
            filename: Required when passing bytes. Auto-derived from path otherwise.
            output_format: koinly, turbotax, coinledger, or zenledger.
            exchange: Force exchange detection (e.g., "coinbase").
            bank: Force bank detection (e.g., "chase").
        """
        if isinstance(input, (str, Path)):
            path = Path(input)
            file_bytes = path.read_bytes()
            filename = filename or path.name
        elif isinstance(input, bytes):
            file_bytes = input
            if not filename:
                raise ValueError("filename is required when passing bytes")
        else:
            raise TypeError(f"input must be str, Path, or bytes, got {type(input).__name__}")

        body: Dict[str, str] = {
            "file_content": base64.b64encode(file_bytes).decode(),
            "filename": filename,
        }

        if output_format:
            body["output_format"] = output_format
        if exchange:
            body["exchange"] = exchange
        if bank:
            body["bank"] = bank

        return self._request("POST", "/v1/parse", json=body)

    def list_sources(self) -> SourcesResponse:
        """List all supported crypto exchanges and banks."""
        return self._request("GET", "/v1/sources")

    def get_usage(self) -> UsageResponse:
        """Get current month's API usage."""
        return self._request("GET", "/v1/usage")

    def health(self) -> HealthResponse:
        """Check API health status."""
        return self._request("GET", "/v1/health")
