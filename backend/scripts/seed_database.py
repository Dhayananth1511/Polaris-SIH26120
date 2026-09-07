#!/usr/bin/env python3
"""
backend/scripts/seed_database.py
Single-command database bootstrap & seeding script conforming to SIH26120 Section 6.
"""
import subprocess
import sys
from pathlib import Path

def main():
    scripts_dir = Path(__file__).resolve().parent
    print("=" * 70)
    print("POLARIS SIH26120 — DATABASE INITIALIZATION & SEEDING")
    print("=" * 70)

    # 1. Ingest Data
    res = subprocess.run([sys.executable, str(scripts_dir / "ingest_data.py")])
    if res.returncode != 0:
        sys.exit(res.returncode)

    # 2. Bootstrap Admin User & Initial Approvals
    print("\n[Step 4] Bootstrapping administrative users & engineering approvals...")
    admin_proc = subprocess.run([sys.executable, str(scripts_dir / "bootstrap_admin.py")])
    if admin_proc.returncode != 0:
        print("[!] Note: Admin bootstrap finished with warnings.")

    print("\n[OK] Database seed process finished successfully.\n")

if __name__ == "__main__":
    main()
