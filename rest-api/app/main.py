from fastapi import FastAPI, UploadFile, File, Query, Depends, Body, HTTPException
from fastapi.responses import JSONResponse
from .schemas import PredictResponse, AnalyzeRequest, AnalyzeResponse, OrdersResponse
from .workloads import cpu as cpu_work, memory as mem_work, io as io_work
from .middleware import MetricsMiddleware, metrics_endpoint
from .config import settings
from .db import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, File, UploadFile, HTTPException, Query


app = FastAPI(title=settings.APP_NAME)
app.add_middleware(MetricsMiddleware)
app.add_route("/metrics", metrics_endpoint, methods=["GET"])

@app.get("/healthz")
async def health():
    return {"status":"ok"}

# ---------- CPU-BOUND ----------
@app.post("/predict", response_model=PredictResponse)
async def predict(
    file: UploadFile = File(..., description="Upload product image"),
    topk: int = Query(5, ge=1, le=20, description="Number of top predictions to return")
):
    try:
        content = await file.read()
        result = cpu_work.classify_image(content, topk=topk)
        return PredictResponse(
            mode="resnet18",
            result=result["predictions"],
            elapsed_ms=result["elapsed_ms"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------- MEMORY-BOUND ----------
@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    payload: AnalyzeRequest = Body(..., description="Large JSON transactions"),
):
    res = mem_work.analyze(
        list(payload.transactions),
        expand_factor=payload.expand_factor,
        heavy_agg=payload.heavy_agg,
    )
    return AnalyzeResponse(**res)

# ---------- I/O-BOUND ----------
@app.get("/orders", response_model=OrdersResponse)
async def orders(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    extra_latency_ms: int = Query(settings.IO_DEFAULT_LAT_MS, ge=0, le=2000),
    session: AsyncSession = Depends(get_session),
):
    res = await io_work.get_orders(session, limit, offset, extra_latency_ms)
    return OrdersResponse(**res)
