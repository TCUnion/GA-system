import sys
import os
# 將目前 backend 目錄加入 python path，讓絕對引用生效
sys.path.append(os.path.dirname(__file__))

from fastapi import FastAPI
from api.sync import router as sync_router

app = FastAPI(
    title="南庄山水 GA4 Backend",
    description="透過排程手動拉取 GA4 資料，寫入 Supabase 快取",
    version="1.0.0"
)

# 註冊路由器
app.include_router(sync_router, prefix="/api", tags=["同步服務"])

@app.get("/")
def health_check():
    """
    服務健康檢查，可供 n8n 或 Render 檢查服務是否活著
    """
    return {"status": "running", "service": "Nanzhuang GA4 Backend"}

# 啟動指令參考：
# uvicorn main:app --reload
