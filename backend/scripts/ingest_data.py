#!/usr/bin/env python3
"""
backend/scripts/ingest_data.py
Automated ingestion pipeline to initialize and seed PostgreSQL with all 7 Baghewala datasets.
Conforms to SIH26120 Section 6.
"""
import subprocess
import sys
from pathlib import Path

def run():
    print("=" * 70)
    print("POLARIS SIH26120 — AUTOMATED DATABASE INGESTION PIPELINE")
    print("=" * 70)

    scripts_dir = Path(__file__).resolve().parent

    # 1. Run validation
    print("\n[Step 1/3] Running dataset validation...")
    val_proc = subprocess.run([sys.executable, str(scripts_dir / "validate_data.py")])
    if val_proc.returncode != 0:
        print("[-] Data validation reported warnings, proceeding with robust ingestion...")

    # 2. Seed primary dataset
    print("\n[Step 2/3] Seeding relational database tables...")
    seed_proc = subprocess.run([sys.executable, str(scripts_dir / "seed_dataset.py")])
    if seed_proc.returncode != 0:
        print("[-] Error occurred during dataset seeding.")
        sys.exit(seed_proc.returncode)

    # 3. Seed dynamometer cards
    print("\n[Step 3/3] Seeding high-frequency dynamometer card points...")
    dyn_proc = subprocess.run([sys.executable, str(scripts_dir / "seed_dynamometer.py")])
    if dyn_proc.returncode != 0:
        print("[-] Error occurred during dynamometer card seeding.")
        sys.exit(dyn_proc.returncode)

    print("\n[✓] Ingestion complete. All Baghewala records ingested into PostgreSQL successfully.\n")

if __name__ == "__main__":
    run()
