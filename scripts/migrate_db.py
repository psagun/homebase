"""One-time migration: copy all data from source PostgreSQL (Neon) to target (Supabase).

Run from project root:
    python scripts/migrate_db.py

Reads connection strings from .migrate_source.txt and .migrate_target.txt
(created locally, gitignored, deleted after migration).
"""

import os
import sys
import traceback

import psycopg2
import psycopg2.extras


def get_conn(url: str):
    return psycopg2.connect(url)


def get_tables(conn) -> list[str]:
    cur = conn.cursor()
    cur.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    )
    tables = [r[0] for r in cur.fetchall()]
    cur.close()
    return tables


def get_columns(conn, table: str) -> list[str]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,),
    )
    cols = [r[0] for r in cur.fetchall()]
    cur.close()
    return cols


def copy_table(src, dst, table: str) -> int:
    """Copy all rows from one table to another, preserving column order."""
    try:
        cols = get_columns(src, table)
        if not cols:
            return 0

        # Read from source
        cur = src.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f'SELECT * FROM "{table}"')
        rows = cur.fetchall()
        cur.close()
        if not rows:
            return 0

        # Insert into target
        col_list = ", ".join(f'"{c}"' for c in cols)
        placeholders = ", ".join(["%s"] * len(cols))
        insert_sql = f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

        dst_cur = dst.cursor()
        for row in rows:
            vals = [row.get(c) for c in cols]
            dst_cur.execute(insert_sql, vals)
        dst.commit()
        dst_cur.close()
        return len(rows)
    except Exception:
        dst.rollback()
        raise


def main():
    src_url = open(os.path.join(os.path.dirname(__file__), "..", ".migrate_source.txt")).read().strip()
    dst_url = open(os.path.join(os.path.dirname(__file__), "..", ".migrate_target.txt")).read().strip()

    print("Connecting to source (Neon)...")
    src = get_conn(src_url)
    print("Connecting to target (Supabase)...")
    dst = get_conn(dst_url)

    # Create tables in target from source schema
    print("\n== Creating schema in target ==")
    src_cur = src.cursor()
    src_cur.execute(
        """
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
        ORDER BY table_name
        """
    )
    tables = [r[0] for r in src_cur.fetchall()]

    dst_cur = dst.cursor()

    # Step 1: copy enum types (USER-DEFINED columns reference them)
    src_cur.execute(
        """
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typtype = 'e'
        ORDER BY t.typname, e.enumsortorder
        """
    )
    enum_values: dict[str, list[str]] = {}
    for typname, label in src_cur.fetchall():
        enum_values.setdefault(typname, []).append(label)

    for typname, labels in enum_values.items():
        dst_cur.execute("SELECT 1 FROM pg_type WHERE typname = %s", (typname,))
        if not dst_cur.fetchone():
            labels_sql = ", ".join(f"'{l.replace(chr(39), chr(39)+chr(39))}'" for l in labels)
            try:
                dst_cur.execute(f'CREATE TYPE "{typname}" AS ENUM ({labels_sql})')
                print(f"  enum: {typname} ({labels_sql[:60]}...)")
            except Exception as e:
                dst.rollback()
                print(f"  WARN enum {typname}: {e}")
    dst.commit()

    # Step 2: create tables
    for table in tables:
        src_cur.execute(
            """
            SELECT column_name, data_type, udt_name, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name=%s
            ORDER BY ordinal_position
            """,
            (table,),
        )
        cols = src_cur.fetchall()
        col_defs = []
        for name, dtype, udt_name, nullable, default in cols:
            # USER-DEFINED columns use their enum type name
            if dtype == "USER-DEFINED":
                type_sql = f'"{udt_name}"'
            else:
                type_sql = dtype
            parts = [f'"{name}" {type_sql}']
            if nullable == "NO":
                parts.append("NOT NULL")
            if default and "nextval(" not in default:
                # Skip sequence defaults (serial); keep simple defaults, strip casts
                clean_default = default
                if "::" in clean_default:
                    clean_default = clean_default.split("::")[0].strip()
                if clean_default not in ("", "NULL"):
                    parts.append(f"DEFAULT {clean_default}")
            col_defs.append(" ".join(parts))
        create_sql = f'CREATE TABLE IF NOT EXISTS "{table}" ({", ".join(col_defs)})'
        try:
            dst_cur.execute(create_sql)
            print(f"  created: {table} ({len(cols)} cols)")
        except Exception as e:
            dst.rollback()
            print(f"  WARN {table}: {e}")
    dst.commit()
    dst_cur.close()
    src_cur.close()

    # Copy data in FK-safe order (parents before children)
    order = [
        "users",
        "properties",
        "contacts",
        "property_contacts",
        "mortgages",
        "insurance_policies",
        "documents",
        "tasks",
        "transactions",
        "property_taxes",
        "tenants",
        "maintenance_records",
        "investors",
        "ownership_entities",
        "ownership_entity_investors",
        "property_investors",
        "recently_viewed",
    ]
    # Any tables not in the explicit order get appended
    for t in tables:
        if t not in order:
            order.append(t)

    print("\n== Copying data ==")
    total = 0
    for table in order:
        if table not in tables:
            continue
        try:
            n = copy_table(src, dst, table)
            print(f"  {table}: {n} rows")
            total += n
        except Exception as e:
            print(f"  ERROR {table}: {e}")
            traceback.print_exc()

    print(f"\nDone. Total rows copied: {total}")
    src.close()
    dst.close()


if __name__ == "__main__":
    sys.exit(main())
