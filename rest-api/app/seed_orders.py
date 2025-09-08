import asyncio, random
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .db import engine, Base, AsyncSessionLocal
from .models import Order

STATUSES = ["created", "paid", "shipped", "cancelled", "refunded"]

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def seed_orders(n: int = 5000):
    async with AsyncSessionLocal() as session:
        # quick check
        count = (await session.execute(text("SELECT COUNT(*) FROM orders"))).scalar() or 0
        if count >= n:
            return
        now = datetime.now(timezone.utc)
        batch = []
        for i in range(n):
            dt = now - timedelta(minutes=random.randint(0, 60*24*30))
            batch.append(Order(
                user_id=random.randint(1, 2000),
                amount=round(random.uniform(5, 500), 2),
                status=random.choice(STATUSES),
                meta={"source": random.choice(["web","mobile","ads"])},
                created_at=dt
            ))
            if len(batch) >= 1000:
                session.add_all(batch)
                await session.commit()
                batch.clear()
        if batch:
            session.add_all(batch)
            await session.commit()

async def main():
    await init_db()
    await seed_orders()

if __name__ == "__main__":
    asyncio.run(main())
