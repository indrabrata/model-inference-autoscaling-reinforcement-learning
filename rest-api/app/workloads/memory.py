import time
from collections import defaultdict
from typing import Any, Dict, List

from ..schemas import TransactionItem


def analyze(trans: List[TransactionItem], expand_factor: int = 1, heavy_agg: bool = False):
    t0 = time.perf_counter()

    # Expand to stress memory (duplicate data expand_factor times)
    expanded: List[TransactionItem] = trans * expand_factor

    # Totals by category
    totals: Dict[str, float] = defaultdict(float)
    for t in expanded:
        totals[t.category] += t.amount

    # Top users by total
    per_user: Dict[int, float] = defaultdict(float)
    for t in expanded:
        per_user[t.user_id] += t.amount
    top_users = sorted(
        ({"user_id": uid, "total": amt} for uid, amt in per_user.items()),
        key=lambda x: x["total"], reverse=True
    )[:10]

    # Optional heavy aggregation (simulate memory pressure)
    if heavy_agg:
        # Build a large intermediate structure (hot path for GC)
        buckets = defaultdict(list)
        for t in expanded:
            buckets[(t.category, t.user_id)].append(t.amount)
        # compute means
        _means = {k: (sum(v)/len(v)) for k, v in buckets.items()}

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    # Very rough peak memory estimate (assume ~200 bytes/transaction; adjust in thesis)
    peak_mb = (len(expanded) * 200) / (1024*1024)
    return {
        "num_input": len(trans),
        "expanded": len(expanded),
        "totals_by_category": dict(totals),
        "top_users": top_users,
        "elapsed_ms": elapsed_ms,
        "peak_memory_est_mb": peak_mb,
    }
