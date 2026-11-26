#!/usr/bin/env python3
"""Validate draft SQL in a disposable native PostgreSQL cluster (no dependencies).

Needs initdb, pg_ctl and psql on PATH, or --postgres-bin /path/to/bin.
Never connects to Supabase or any pre-existing database. Supabase Auth and
Cron are simulated; the tests execute the command registered with Cron.
"""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--postgres-bin", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    binaries = {}
    for name in ("initdb", "pg_ctl", "psql"):
        path = str(args.postgres_bin / name) if args.postgres_bin else shutil.which(name)
        if not path or not Path(path).is_file():
            parser.error(f"{name} not found; use --postgres-bin")
        binaries[name] = path

    def run(name, *arguments):
        result = subprocess.run([binaries[name], *map(str, arguments)], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(f"{name} failed:\n{result.stdout}\n{result.stderr}")
        return result

    # A short path also fits PostgreSQL's Unix-domain socket path limit on macOS.
    with tempfile.TemporaryDirectory(prefix="instinct-db-", dir="/tmp") as folder:
        temp = Path(folder)
        data = temp / "data"
        started = False
        try:
            run("initdb", "-D", data, "-A", "trust", "--no-locale", "-E", "UTF8")
            run("pg_ctl", "-D", data, "-l", temp / "postgres.log", "-o",
                f"-k {temp} -p 55439 -c listen_addresses='' -c wal_level=logical", "-w", "start")
            started = True
            migrations = sorted((root / "supabase/migrations").glob("*.sql"))
            if len(migrations) != 1:
                raise RuntimeError("Expected exactly one baseline migration.")
            migration = migrations[0]
            # Native PostgreSQL lacks the pg_cron extension. The test bootstrap
            # captures the schedule registration so its command can be tested.
            baseline = temp / migration.name
            baseline.write_text(migration.read_text().replace(
                "create extension if not exists pg_cron with schema pg_catalog;",
                "-- pg_cron is provided by the test bootstrap.",
            ))
            files = [
                root / "supabase/tests/support/native_postgres_bootstrap.sql",
                baseline,
                *sorted((root / "supabase/tests").glob("*.sql")),
            ]
            for file in files:
                run("psql", "-h", temp, "-p", "55439", "-U", os.environ.get("USER", "postgres"),
                    "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-f", file)
                print(f"PASS {file.name}")
        finally:
            if started:
                run("pg_ctl", "-D", data, "-m", "fast", "-w", "stop")


if __name__ == "__main__":
    main()
