from fastapi import APIRouter, HTTPException
import logging
from services.sync_runner import run_sync
from schemas.sync_schema import SyncResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sync", response_model=SyncResponse)
def sync_ga_data(project_id: str | None = None):
    """
    手動觸發 GA4 報表同步。
    若帶有 project_id，僅同步該專題；否則遍歷所有啟用的專案。
    """
    from services.supabase_service import supabase_service
    
    try:
        if project_id:
            # 取得該專案的 GA Property ID
            res = supabase_service.client.table("projects").select("id, name, ga_property_id").eq("id", project_id).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="找不到指定專案")
            
            project = res.data[0]
            result = run_sync(project_id=project["id"], property_id=project["ga_property_id"])
            return SyncResponse(
                status=result["status"],
                message=f"專案 {project['name']} 同步完畢",
                updated_reports=result["updated_reports"],
            )
        else:
            # 同步所有啟用的專案
            from core.scheduler import _sync_job
            _sync_job()
            return SyncResponse(
                status="success",
                message="多專案背景同步任務已手動觸發",
                updated_reports=["all_projects"],
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
