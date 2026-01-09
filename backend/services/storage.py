"""
Storage Module for TaxReadyWallet/TRW
Handles database operations for exchange configurations

MIGRATED: From Supabase to Neon PostgreSQL (psycopg2)
"""

import os
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from contextlib import contextmanager

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    import psycopg2.pool
except ImportError:
    raise ImportError("psycopg2 not installed. Run: pip install psycopg2-binary")

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

DATABASE_URL = os.environ.get("DATABASE_URL")

# Connection pool for efficient database connections
_connection_pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None


def get_connection_pool() -> Optional[psycopg2.pool.ThreadedConnectionPool]:
    """Get or create a connection pool for database operations."""
    global _connection_pool

    if _connection_pool is not None:
        return _connection_pool

    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set. Database operations will fail.")
        return None

    try:
        _connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL
        )
        logger.info("PostgreSQL connection pool created")
        return _connection_pool
    except Exception as e:
        logger.error(f"Failed to create connection pool: {e}")
        return None


@contextmanager
def get_db_connection():
    """Context manager for database connections from the pool."""
    pool = get_connection_pool()
    if pool is None:
        yield None
        return

    conn = None
    try:
        conn = pool.getconn()
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            pool.putconn(conn)


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class ExchangeConfig:
    """Represents a stored exchange configuration"""
    fingerprint: str
    exchange_name: str
    mapping_config: Dict[str, str]
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    usage_count: int = 1

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database insertion"""
        return {
            "fingerprint": self.fingerprint,
            "exchange_name": self.exchange_name,
            "mapping_config": self.mapping_config,
            "usage_count": self.usage_count,
        }


# ============================================================================
# CONFIG STORE CLASS (Required for Engine LRU Cache)
# ============================================================================

class ConfigStore:
    """
    Interface for the LRU cache in engine.py to communicate with storage.
    Acts as a wrapper around the functional storage API.
    """
    def get_by_fingerprint(self, fingerprint: str) -> Optional[ExchangeConfig]:
        """Fetch config by fingerprint (used by engine.py)"""
        return get_config_by_hash(fingerprint)


# ============================================================================
# STORAGE OPERATIONS
# ============================================================================

def get_config_by_hash(fingerprint: str) -> Optional[ExchangeConfig]:
    """
    Lookup an exchange configuration by fingerprint hash
    """
    try:
        with get_db_connection() as conn:
            if conn is None:
                return None

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, fingerprint, exchange_name, mapping_config,
                           created_at, usage_count
                    FROM exchange_configs
                    WHERE fingerprint = %s
                    LIMIT 1
                    """,
                    (fingerprint,)
                )
                row = cur.fetchone()

                if row:
                    return ExchangeConfig(
                        id=row["id"],
                        fingerprint=row["fingerprint"],
                        exchange_name=row["exchange_name"],
                        mapping_config=row["mapping_config"],
                        created_at=row["created_at"],
                        usage_count=row.get("usage_count", 1),
                    )

                return None

    except Exception as e:
        logger.error(f"Database error querying config: {e}")
        return None


def save_new_config(
    fingerprint: str,
    exchange_name: str,
    mapping_config: Dict[str, str]
) -> Optional[ExchangeConfig]:
    """
    Save a new exchange configuration to the database
    """
    try:
        with get_db_connection() as conn:
            if conn is None:
                logger.warning("Database not connected")
                return None

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO exchange_configs (fingerprint, exchange_name, mapping_config, usage_count)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (fingerprint) DO UPDATE SET
                        exchange_name = EXCLUDED.exchange_name,
                        mapping_config = EXCLUDED.mapping_config,
                        usage_count = exchange_configs.usage_count + 1
                    RETURNING id, fingerprint, exchange_name, mapping_config, created_at, usage_count
                    """,
                    (fingerprint, exchange_name, psycopg2.extras.Json(mapping_config), 1)
                )
                row = cur.fetchone()

                if row:
                    logger.info(f"Saved config: {fingerprint} for {exchange_name}")
                    return ExchangeConfig(
                        id=row["id"],
                        fingerprint=row["fingerprint"],
                        exchange_name=row["exchange_name"],
                        mapping_config=row["mapping_config"],
                        created_at=row["created_at"],
                        usage_count=row.get("usage_count", 1),
                    )
                else:
                    logger.error("No data returned after insert")
                    return None

    except Exception as e:
        logger.error(f"Database error saving config: {e}")
        return None


def increment_usage_count(fingerprint: str) -> bool:
    """
    Increment the usage count for a configuration
    """
    try:
        with get_db_connection() as conn:
            if conn is None:
                return False

            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE exchange_configs
                    SET usage_count = usage_count + 1
                    WHERE fingerprint = %s
                    """,
                    (fingerprint,)
                )

                if cur.rowcount > 0:
                    logger.debug(f"Incremented usage count for {fingerprint}")
                    return True
                return False

    except Exception as e:
        logger.error(f"Database error incrementing usage count: {e}")
        return False


def get_all_configs() -> List[ExchangeConfig]:
    """
    Get all stored exchange configurations
    """
    try:
        with get_db_connection() as conn:
            if conn is None:
                logger.warning("Database not connected")
                return []

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, fingerprint, exchange_name, mapping_config,
                           created_at, usage_count
                    FROM exchange_configs
                    ORDER BY created_at DESC
                    """
                )
                rows = cur.fetchall()

                return [
                    ExchangeConfig(
                        id=row["id"],
                        fingerprint=row["fingerprint"],
                        exchange_name=row["exchange_name"],
                        mapping_config=row["mapping_config"],
                        created_at=row["created_at"],
                        usage_count=row.get("usage_count", 1),
                    )
                    for row in rows
                ]

    except Exception as e:
        logger.error(f"Database error fetching all configs: {e}")
        return []


def get_most_used_configs(limit: int = 10) -> List[ExchangeConfig]:
    """
    Get the most frequently used configurations (for analytics)
    """
    try:
        with get_db_connection() as conn:
            if conn is None:
                logger.warning("Database not connected")
                return []

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, fingerprint, exchange_name, mapping_config,
                           created_at, usage_count
                    FROM exchange_configs
                    ORDER BY usage_count DESC
                    LIMIT %s
                    """,
                    (limit,)
                )
                rows = cur.fetchall()

                return [
                    ExchangeConfig(
                        id=row["id"],
                        fingerprint=row["fingerprint"],
                        exchange_name=row["exchange_name"],
                        mapping_config=row["mapping_config"],
                        created_at=row["created_at"],
                        usage_count=row.get("usage_count", 1),
                    )
                    for row in rows
                ]

    except Exception as e:
        logger.error(f"Database error fetching most used configs: {e}")
        return []


def test_connection() -> bool:
    """
    Test PostgreSQL connection and verify table exists
    """
    try:
        with get_db_connection() as conn:
            if conn is None:
                logger.error("Database connection not available")
                return False

            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM exchange_configs LIMIT 1")
                logger.info("PostgreSQL connection successful")
                logger.info("exchange_configs table accessible")
                return True

    except Exception as e:
        logger.error(f"PostgreSQL connection test failed: {e}")
        return False


# ============================================================================
# CLEANUP
# ============================================================================

def close_connection_pool():
    """Close the connection pool (call on application shutdown)."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Connection pool closed")
