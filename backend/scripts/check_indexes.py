import asyncio
from sqlalchemy import text
from app.db.base import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;"))
        for row in res.fetchall():
            print(f"{row[0]:<25} | {row[1]}")

if __name__ == "__main__":
    asyncio.run(check())
