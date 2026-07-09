"""
migrations.py — safe, idempotent ALTER TABLE migrations.

SQLAlchemy's create_all() only creates *new* tables; it never adds columns to
existing ones. This module fills that gap: every migration checks whether the
column already exists before issuing an ALTER TABLE, so it is safe to run on
every startup (and on a brand-new database where the columns already exist
from the initial CREATE TABLE).

Called once from main.py before the app starts serving requests.
"""

import logging
from sqlalchemy import text
from backend.app.database.db import engine

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _column_exists(conn, table: str, column: str) -> bool:
    """Return True if *column* already exists in *table* (PostgreSQL)."""
    row = conn.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    ).fetchone()
    return row is not None


def _table_exists(conn, table: str) -> bool:
    row = conn.execute(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :t"
        ),
        {"t": table},
    ).fetchone()
    return row is not None


def _add_column_if_missing(conn, table: str, column: str, definition: str) -> None:
    """ALTER TABLE … ADD COLUMN only when the column is absent."""
    if not _column_exists(conn, table, column):
        conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN {column} {definition}'))
        log.info("Migration: added column %s.%s", table, column)
    else:
        log.debug("Migration: %s.%s already exists — skipping", table, column)


# ---------------------------------------------------------------------------
# individual migrations (one function per logical change)
# ---------------------------------------------------------------------------

def _m001_users_kyc_onboarding_biometric(conn) -> None:
    """
    Add kyc_status, is_onboarded, biometric_enabled to the users table.
    These columns were added to the ORM model after the table was first
    created, so they are absent on existing databases.
    """
    if not _table_exists(conn, "users"):
        return  # brand-new DB — create_all will build everything from scratch

    _add_column_if_missing(
        conn, "users", "kyc_status",
        "VARCHAR(20) NOT NULL DEFAULT 'pending'"
    )
    _add_column_if_missing(
        conn, "users", "is_onboarded",
        "BOOLEAN NOT NULL DEFAULT FALSE"
    )
    _add_column_if_missing(
        conn, "users", "biometric_enabled",
        "BOOLEAN NOT NULL DEFAULT FALSE"
    )
    _add_column_if_missing(
        conn, "users", "biometric_credential_id",
        "VARCHAR(512) NULL"
    )
    _add_column_if_missing(
        conn, "users", "biometric_public_key",
        "VARCHAR(1024) NULL"
    )


def _m002_linked_cards_table(conn) -> None:
    """
    The linked_cards table is defined in the ORM model but may be missing
    from databases created before it was added.
    create_all() handles brand-new tables, so we only need this guard for
    any column-level additions inside that table in the future.
    (create_all called from main.py will create the table itself.)
    """
    pass  # create_all handles new table creation — nothing extra needed here


def _m003_linked_accounts_last_synced(conn) -> None:
    """
    Ensure linked_accounts.last_synced exists (added alongside LinkedAccount model).
    """
    if not _table_exists(conn, "linked_accounts"):
        return
    _add_column_if_missing(
        conn, "linked_accounts", "last_synced",
        "TIMESTAMP DEFAULT NOW()"
    )


def _m004_loans_interest_rate(conn) -> None:
    """
    Add interest_rate to the loans table so loan records can store APR values.
    """
    if not _table_exists(conn, "loans"):
        return
    _add_column_if_missing(
        conn, "loans", "interest_rate",
        "FLOAT NULL"
    )


# ---------------------------------------------------------------------------
# public entry point
# ---------------------------------------------------------------------------

def run_migrations() -> None:
    """
    Execute all migrations inside a single transaction.
    Safe to call on every application startup.
    """
    migrations = [
        _m001_users_kyc_onboarding_biometric,
        _m002_linked_cards_table,
        _m003_linked_accounts_last_synced,
        _m004_loans_interest_rate,
        _m004_zerodha_connections_table,
    ]

    with engine.begin() as conn:          # auto-commits on success, rolls back on error
        for migration in migrations:
            try:
                migration(conn)
            except Exception as exc:
                log.error("Migration %s failed: %s", migration.__name__, exc)
                raise   # re-raise to abort startup — better than a broken DB

    log.info("All database migrations applied successfully.")
    
# ── Add this function to app/database/migrations.py ──

def _m004_zerodha_connections_table(conn) -> None:
    """
    Creates the zerodha_connections table if it doesn't exist yet.
    NOTE: main.py has `models.Base.metadata.create_all(bind=engine)` commented out,
    so brand-new tables are NOT created automatically — every new table needs an
    explicit CREATE TABLE IF NOT EXISTS here, same as this one.
    """
    conn.execute(text(
        """
        CREATE TABLE IF NOT EXISTS zerodha_connections (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            access_token VARCHAR(512) NOT NULL,
            kite_user_id VARCHAR(50),
            login_time TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """
    ))


# ── Then add it to the list inside run_migrations(): ──
#
#     migrations = [
#         _m001_users_kyc_onboarding_biometric,
#         _m002_linked_cards_table,
#         _m003_linked_accounts_last_synced,
#         _m004_zerodha_connections_table,   # <-- add this line
#     ]
