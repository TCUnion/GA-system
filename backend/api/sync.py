from fastapi import APIRouter, HTTPException
import logging
from services.sync_runner import run_sync
from schemas.sync_schema import SyncResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sync", response_model=SyncResponse)
def sync_ga_data():
    """
    手動觸發 GA4 報表同步並寫入 Supabase 快取。

    NOTE: 此端點與排程器使用同一套 sync_runner 邏輯，
    也可從 n8n Webhook 或 curl 手動呼叫。
    由於 GA4 API 為阻塞呼叫，此路由不使用 async 讓 FastAPI
    自動指派到 ThreadPool 執行，避免卡住 Event Loop。
    """
    try:
        result = run_sync()
        return SyncResponse(
            status=result["status"],
            message=result["message"],
            updated_reports=result["updated_reports"],
        )
    except Exception as e:
        logger.error(f"手動同步資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/status")
def get_sync_status():
    """
    查詢排程器狀態與下次執行時間。

    Returns:
        排程器運行狀態、排程任務清單與下次觸發時間
    """
    from core.scheduler import scheduler

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
        })

    return {
        "scheduler_running": scheduler.running,
        "jobs": jobs,
    }
