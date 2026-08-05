"""Schema parity — alembic migrations must cover every model table.

Runs `alembic upgrade head` against a fresh SQLite database and compares
the resulting schema with Base.metadata. This is the CI guard that
create_all-only tests never provided: adding a model table/column without
a migration fails here.
"""

import os
import sqlalchemy as sa

from backend.database import Base


def _run_alembic(db_path: str) -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    command.upgrade(cfg, "head")


def test_migrations_cover_all_model_tables(tmp_path):
    db_path = tmp_path / "parity.db"
    _run_alembic(str(db_path))

    engine = sa.create_engine(f"sqlite:///{db_path}")
    inspector = sa.inspect(engine)

    migrated_tables = set(inspector.get_table_names())
    model_tables = set(Base.metadata.tables.keys())

    # alembic_version is alembic's bookkeeping table
    assert model_tables - migrated_tables <= {"alembic_version"}, (
        f"Model tables missing from migrations: {sorted(model_tables - migrated_tables)}"
    )

    # Column-level parity for every model table
    mismatches = []
    for table_name in sorted(model_tables):
        model_cols = {c.name for c in Base.metadata.tables[table_name].columns}
        db_cols = {c["name"] for c in inspector.get_columns(table_name)}
        missing = model_cols - db_cols
        if missing:
            mismatches.append(f"{table_name}: missing {sorted(missing)}")
    assert not mismatches, "Model columns missing from migrated schema:\n" + "\n".join(mismatches)


def test_migration_is_idempotent_on_existing_schema(tmp_path):
    """Re-running upgrade on an already-migrated DB must not fail.

    Guards the inspector-guarded baseline (0010) against prod-style DBs
    where most tables already exist.
    """
    db_path = tmp_path / "parity2.db"
    _run_alembic(str(db_path))
    _run_alembic(str(db_path))  # second run — must be a no-op
