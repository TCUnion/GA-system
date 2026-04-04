from fastapi import APIRouter, HTTPException, Query
import logging
from services.ga_service import ga_service
from services.supabase_service import supabase_service
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# NOTE: 這些 report_type 由 sync_runner 寫入 Supabase，預設日期範圍可直接讀快取
_SYNC_CACHEABLE = {"overview", "audience", "acquisition", "content", "engagement", "tech"}

_REPORT_FETCHERS = {
    "overview": ga_service.get_overview_report,
    "audience": ga_service.fetch_audience_report,
    "acquisition": ga_service.fetch_acquisition_report,
    "content": ga_service.fetch_content_report,
    "engagement": ga_service.fetch_engagement_report,
    "tech": ga_service.fetch_tech_report,
    "traffic": ga_service.fetch_daily_traffic,
}

_DEFAULT_START = "30daysAgo"
_DEFAULT_END = "today"


def _is_default_range(start_date: str, end_date: str) -> bool:
    return start_date == _DEFAULT_START and end_date == _DEFAULT_END


@router.get("/reports/{report_type}")
def get_custom_report(
    report_type: str,
    project_id: str = Query(None, description="Supabase 專案 ID"),
    start_date: str = Query(_DEFAULT_START, description="起始日期，格式可以為 YYYY-MM-DD 或是 30daysAgo"),
    end_date: str = Query(_DEFAULT_END, description="結束日期，格式可以為 YYYY-MM-DD 或是 today")
):
    """
    自訂時間區段與專案抓取 GA4 報表
    - report_type 包含: overview, audience, acquisition, content, engagement, tech, traffic
    - 預設日期範圍優先從 Supabase 快取讀取，GA4 API 作為 fallback，快取降級作為最後防線
    """
    logger.info(f"API 請求: 取得 {report_type} 報表 ({start_date} ~ {end_date}) project_id={project_id}")

    fetcher = _REPORT_FETCHERS.get(report_type)
    if not fetcher:
        raise HTTPException(status_code=400, detail=f"未知的報表類型: {report_type}")

    property_id = None
    if project_id:
        property_id = supabase_service.get_ga_property_id(project_id)
        if not property_id:
            logger.warning(f"找不到 project_id {project_id} 對應的 GA_PROPERTY_ID，回退至全域設定")

    # NOTE: 預設日期範圍 + 可快取類型 → Supabase-first 策略
    if report_type in _SYNC_CACHEABLE and _is_default_range(start_date, end_date):
        cached = supabase_service.get_cache(
            report_type,
            project_id,
            max_age_seconds=settings.REPORTS_CACHE_MAX_AGE_SECONDS,
        )
        if cached is not None:
            logger.debug(f"快取命中: {report_type} (project={project_id})")
            return cached

        logger.info(f"快取未命中或過期，直接呼叫 GA4 API: {report_type}")
        try:
            return fetcher(start_date, end_date, property_id)
        except Exception as e:
            logger.error(f"GA4 API 失敗 ({report_type})，嘗試返回 stale 快取: {e}")
            stale = supabase_service.get_stale_cache(report_type, project_id)
            if stale is not None:
                return stale
            raise HTTPException(status_code=503, detail=f"GA4 API 暫時不可用，且無可用快取: {e}")

    # NOTE: 自訂日期範圍直接呼叫 GA4 API（不走快取）
    try:
        return fetcher(start_date, end_date, property_id)
    except Exception as e:
        logger.error(f"取得 {report_type} 報表失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))
