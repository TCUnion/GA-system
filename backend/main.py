import sys
import os
# 將目前 backend 目錄加入 python path，讓絕對引用生效
sys.path.append(os.path.dirname(__file__))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.sync import router as sync_router
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
    version="1.1.0",
    lifespan=lifespan,
)

# 註冊路由器
app.include_router(sync_router, prefix="/api", tags=["同步服務"])


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
