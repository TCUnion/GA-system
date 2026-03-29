from fastapi import APIRouter, HTTPException
import logging
from services.ga_service import ga_service
from services.supabase_service import supabase_service
from schemas.sync_schema import SyncResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/sync", response_model=SyncResponse)
def sync_ga_data():
    """
    觸發 GA4 報表爬蟲並建立/更新到 Supabase 快取
    
    NOTE: 由於 GA4 API 為阻塞呼叫，此路由不使用 async 讓 FastAPI 自動指派到 ThreadPool 執行，避免卡住 Event Loop。
    """
    updated_reports = []
    try:
        logger.info("同步: Overview")
        overview_data = ga_service.get_overview_report()
        supabase_service.upsert_cache("overview", overview_data)
        updated_reports.append("overview")
        
        # Audience
        logger.info("同步: Audience")
        audience_data = ga_service.fetch_audience_report()
        supabase_service.upsert_cache("audience", audience_data)
        updated_reports.append("audience")

        # Acquisition
        logger.info("同步: Acquisition")
        acquisition_data = ga_service.fetch_acquisition_report()
        supabase_service.upsert_cache("acquisition", acquisition_data)
        updated_reports.append("acquisition")

        # Content
        logger.info("同步: Content")
        content_data = ga_service.fetch_content_report()
        supabase_service.upsert_cache("content", content_data)
        updated_reports.append("content")

        # Engagement
        logger.info("同步: Engagement")
        engagement_data = ga_service.fetch_engagement_report()
        supabase_service.upsert_cache("engagement", engagement_data)
        updated_reports.append("engagement")

        # Tech
        logger.info("同步: Tech")
        tech_data = ga_service.fetch_tech_report()
        supabase_service.upsert_cache("tech", tech_data)
        updated_reports.append("tech")

        return SyncResponse(
            status="success",
            message="資料同步成功",
            updated_reports=updated_reports
        )
    except Exception as e:
        logger.error(f"同步資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))
