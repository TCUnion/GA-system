from fastapi import APIRouter, HTTPException, Query
import logging
from services.ga_service import ga_service
from services.supabase_service import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/reports/{report_type}")
def get_custom_report(
    report_type: str,
    project_id: str = Query(None, description="Supabase 專案 ID"),
    start_date: str = Query("30daysAgo", description="起始日期，格式可以為 YYYY-MM-DD 或是 30daysAgo"),
    end_date: str = Query("today", description="結束日期，格式可以為 YYYY-MM-DD 或是 today")
):
    """
    自訂時間區段與專案抓取 GA4 報表
    - report_type 包含: overview, audience, acquisition, content, engagement, tech, traffic
    """
    logger.info(f"API 請求: 取得 {report_type} 報表 ({start_date} ~ {end_date}) project_id={project_id}")
    
    property_id = None
    if project_id:
        property_id = supabase_service.get_ga_property_id(project_id)
        if not property_id:
            logger.warning(f"找不到 project_id {project_id} 對應的 GA_PROPERTY_ID")
            # 不拋出錯誤，讓自訂報表回退至全域設定（如果預期這樣運作），若有嚴格需求可改為 raise HTTPException
    
    try:
        if report_type == "overview":
            return ga_service.get_overview_report(start_date, end_date, property_id)
        elif report_type == "audience":
            return ga_service.fetch_audience_report(start_date, end_date, property_id)
        elif report_type == "acquisition":
            return ga_service.fetch_acquisition_report(start_date, end_date, property_id)
        elif report_type == "content":
            return ga_service.fetch_content_report(start_date, end_date, property_id)
        elif report_type == "engagement":
            return ga_service.fetch_engagement_report(start_date, end_date, property_id)
        elif report_type == "tech":
            return ga_service.fetch_tech_report(start_date, end_date, property_id)
        elif report_type == "traffic":
            return ga_service.fetch_daily_traffic(start_date, end_date, property_id)
        else:
            raise HTTPException(status_code=400, detail=f"未知的報表類型: {report_type}")
    except Exception as e:
        logger.error(f"取得 {report_type} 報表失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))
