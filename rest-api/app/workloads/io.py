
import asyncio, time
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Order

async def fetch_orders(session: AsyncSession, limit: int, offset: int):
    q = select(Order).order_by(Order.created_at.desc()).limit(limit).offset(offset)
    res = await session.execute(q)
    rows = res.scalars().all()
    total = await session.scalar(select(func.count()).select_from(Order))
    return rows, int(total or 0)

async def simulate_latency_ms(ms: int):
    if ms > 0:
        await asyncio.sleep(ms/1000.0)

async def get_orders(session: AsyncSession, limit: int, offset: int, extra_latency_ms: int):
    t0 = time.perf_counter()
    await simulate_latency_ms(extra_latency_ms)
    rows, total = await fetch_orders(session, limit, offset)
    dt = (time.perf_counter() - t0) * 1000.0
    payload = [{
        "id": r.id, "user_id": r.user_id, "amount": r.amount,
        "status": r.status, "created_at": r.created_at.isoformat()
    } for r in rows]
    return {"total": total, "items": payload, "elapsed_ms": dt}
