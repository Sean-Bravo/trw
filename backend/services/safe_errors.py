"""
H-9: Safe error message sanitization.

User-facing error strings must not leak internal details (file paths,
library versions, stack context, schema names) to API clients. This
module provides a helper that scrubs and bounds error messages before
returning them.

Server-side logging (logger.exception, sentry_sdk.capture_exception)
should always receive the full original exception; only the message
returned to clients passes through this helper.

See SECURITY_AUDIT.md §H-9 and §M-9.
"""

import re

# Allowlist of safe characters: letters, digits, whitespace, basic punctuation.
# Anything else (path separators, quotes, html, etc.) is dropped.
_SAFE_RE = re.compile(r"[^\w\s:.,\-()/]")

# Hard cap on returned message length so a runaway exception body cannot
# exfiltrate large quantities of internal state.
_MAX_LEN = 200


def safe_error_message(err: object) -> str:
    """
    Return a sanitized, length-bounded error string suitable for sending
    to an untrusted client. Falls back to a generic message if the input
    is empty after sanitization.
    """
    raw = str(err) if err is not None else ""
    cleaned = _SAFE_RE.sub("", raw).strip()
    if not cleaned:
        return "An internal error occurred."
    return cleaned[:_MAX_LEN]
