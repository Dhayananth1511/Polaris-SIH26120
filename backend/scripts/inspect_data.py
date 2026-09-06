#!/usr/bin/env python3
"""
backend/scripts/inspect_data.py
Inspects all 7 provided Baghewala dataset CSVs and outputs a complete data dictionary,
column schemas, inferred types, missing values, and relational keys.
Conforms to SIH26120 Section 5 & 6 requirements.
"""
import csv
import sys
from pathlib import Path

# Resolve dataset directory
def resolve_dataset_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "database",
        Path(__file__).resolve().parent.parent / "database",
        Path(__file__).resolve().parent / "data",
    ]
    for p in candidates:
        if p.exists() and (p / "well_master.csv").exists():
            return p
    raise FileNotFoundError(f"Could not locate dataset directory containing well_master.csv")

DATASET_DIR = resolve_dataset_dir()

CSV_FILES = [
    ("well_master.csv", "well_id", None),
    ("well_telemetry.csv", "telemetry_id", "well_id"),
    ("css_cycles.csv", "css_cycle_id", "well_id"),
    ("production.csv", "production_id", "well_id"),
    ("srp_operations.csv", "srp_id", "well_id"),
    ("dynamometer_cards.csv", "card_id", "well_id"),
    ("failure_events.csv", "event_id", "well_id"),
]

def inspect_csv(filename: str, pk_col: str, fk_col: str | None):
    filepath = DATASET_DIR / filename
    if not filepath.exists():
        print(f"[-] Missing file: {filepath}")
        return

    print(f"\n{'='*70}")
    print(f"FILE: {filename}")
    print(f"Path: {filepath}")
    print(f"Primary Key: {pk_col} | Foreign Key: {fk_col or 'None'}")
    print(f"{'='*70}")

    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    row_count = len(rows)
    print(f"Total Rows: {row_count:,} | Columns: {len(header)}")

    col_stats = {col: {"nulls": 0, "sample": None, "types": set()} for col in header}

    for row in rows:
        for idx, val in enumerate(row):
            col_name = header[idx]
            v = val.strip()
            if not v or v.lower() in ("null", "none", "nan", "na", ""):
                col_stats[col_name]["nulls"] += 1
            else:
                if col_stats[col_name]["sample"] is None:
                    col_stats[col_name]["sample"] = v
                # infer type
                try:
                    int(v)
                    col_stats[col_name]["types"].add("INTEGER")
                except ValueError:
                    try:
                        float(v)
                        col_stats[col_name]["types"].add("FLOAT")
                    except ValueError:
                        if v.lower() in ("true", "false", "0", "1") and len(v) <= 5:
                            col_stats[col_name]["types"].add("BOOLEAN")
                        elif "-" in v and (":" in v or len(v) == 10):
                            col_stats[col_name]["types"].add("TIMESTAMP/DATE")
                        else:
                            col_stats[col_name]["types"].add("VARCHAR")

    print(f"\n{'Column':<32} {'Inferred Type':<16} {'Null Count':<12} {'Sample Value'}")
    print("-" * 75)
    for col in header:
        types = col_stats[col]["types"]
        if "VARCHAR" in types:
            inferred = "VARCHAR"
        elif "TIMESTAMP/DATE" in types:
            inferred = "TIMESTAMP"
        elif "FLOAT" in types:
            inferred = "FLOAT"
        elif "INTEGER" in types:
            inferred = "INTEGER"
        elif "BOOLEAN" in types:
            inferred = "BOOLEAN"
        else:
            inferred = "TEXT"

        null_count = col_stats[col]["nulls"]
        sample = str(col_stats[col]["sample"])[:25]
        print(f"{col:<32} {inferred:<16} {null_count:<12} {sample}")

def main():
    print(f"Baghewala Field SIH26120 — Dataset Inspection Tool")
    print(f"Scanning synthetic operational dataset from: {DATASET_DIR}")
    for filename, pk, fk in CSV_FILES:
        inspect_csv(filename, pk, fk)
    print("\n[+] Dataset inspection completed successfully.\n")

if __name__ == "__main__":
    main()
