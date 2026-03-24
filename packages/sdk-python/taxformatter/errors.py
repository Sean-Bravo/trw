"""Error classes for the TaxFormatter SDK."""


class TaxFormatterError(Exception):
    """Base error for all TaxFormatter API errors."""

    def __init__(self, code: str, message: str, status_code: int, suggestion: str = ""):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.suggestion = suggestion

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(code={self.code!r}, status_code={self.status_code})"


class AuthenticationError(TaxFormatterError):
    """Raised on 401 — invalid or missing API key."""

    def __init__(self, message: str = "Invalid or missing API key"):
        super().__init__("authentication_error", message, 401)


class RateLimitError(TaxFormatterError):
    """Raised on 429 — rate limit exceeded (after retries exhausted)."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 0):
        super().__init__(
            "rate_limited", message, 429,
            suggestion="Wait and retry. Upgrade your tier for higher limits.",
        )
        self.retry_after = retry_after


class ParseError(TaxFormatterError):
    """Raised on 422 — file could not be parsed."""

    def __init__(self, code: str, message: str, suggestion: str = ""):
        super().__init__(code, message, 422, suggestion)
