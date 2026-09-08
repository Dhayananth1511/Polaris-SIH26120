import asyncio
from sqlalchemy import text
from app.db.base import engine

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_prod_well_ts_desc ON production (well_id, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_srp_well_ts_desc ON srp_operations (well_id, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_tel_well_ts_desc ON well_telemetry (well_id, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_css_well_cycle_desc ON css_cycles (well_id, cycle_number DESC);",
    "CREATE INDEX IF NOT EXISTS idx_failure_well_ts_desc ON failure_events (well_id, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_prod_ts_desc ON production (timestamp DESC);",
]

async def apply_indexes():
    print("Applying performance indexes to PostgreSQL...")
    async with engine.begin() as conn:
        for sql in INDEXES:
            print(f"Executing: {sql}")
            await conn.execute(text(sql))
    print("All performance indexes applied successfully!")

if __name__ == "__main__":
    asyncio.run(apply_indexes())
