import sys
import os
# 將目前 backend 目錄加入 python path，讓絕對引用生效
sys.path.append(os.path.dirname(__file__))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.sync import router as sync_router
from api.reports import router as reports_router
from api.admin import router as admin_router
from core.config import settings
from core.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan 管理：啟動時開始排程，關閉時優雅停止。

    NOTE: 使用 asynccontextmanager 取代已棄用的 on_event，
    確保資源在伺服器停止時正確釋放。
    """
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="南庄山水 GA4 Backend",
    description="透過排程自動拉取 GA4 資料，寫入 Supabase 快取",
    version="1.2.0",
    lifespan=lifespan,
)

# NOTE: CORS 設定 — 解析 CORS_ALLOW_ORIGINS 白名單
# 若留空則退回 wildcard，但同時強制關閉 allow_credentials（瀏覽器規範不允許兩者並存）
_cors_origins_raw = settings.CORS_ALLOW_ORIGINS.strip()
if _cors_origins_raw:
    _cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
    _cors_credentials = settings.CORS_ALLOW_CREDENTIALS
else:
    _cors_origins = ["*"]
    _cors_credentials = False  # wildcard + credentials 瀏覽器會拒絕

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由器
app.include_router(sync_router, prefix="/api", tags=["同步服務"])
app.include_router(reports_router, prefix="/api", tags=["自訂報表"])
app.include_router(admin_router, prefix="/api", tags=["管理員"])


@app.get("/")
def health_check():
    """
    服務健康檢查，可供 n8n 或 Render 檢查服務是否活著。
    包含排程器狀態資訊。
    """
    from core.scheduler import scheduler
    return {
        "status": "running",
        "service": "Nanzhuang GA4 Backend",
        "scheduler": "active" if scheduler.running else "stopped",
    }


# 啟動指令參考：
# uvicorn main:app --reload
