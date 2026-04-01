"""
同步執行器 — 統一管理 GA4 資料同步流程

NOTE: 將同步邏輯抽離為獨立模組，讓 API 端點與排程器共用同一套流程，
避免邏輯重複並確保一致性。
"""
import logging
from datetime import datetime

from services.ga_service import ga_service
from services.supabase_service import supabase_service

logger = logging.getLogger(__name__)


def run_sync(project_id: str | None = None, property_id: str | None = None) -> dict:
    """
    執行完整的 GA4 資料同步流程。

    Args:
        project_id: Supabase 專案 UUID
        property_id: GA4 Property ID

    Returns:
        包含同步結果的字典
    """
    start_time = datetime.now()
    updated_reports = []

    # NOTE: 定義報表類型與對應的取得方法
    report_tasks = [
        ("overview", ga_service.get_overview_report),
        ("audience", ga_service.fetch_audience_report),
        ("acquisition", ga_service.fetch_acquisition_report),
        ("content", ga_service.fetch_content_report),
        ("engagement", ga_service.fetch_engagement_report),
        ("tech", ga_service.fetch_tech_report),
    ]

    for report_type, fetch_fn in report_tasks:
        logger.info(f"同步 [{project_id or 'default'}]: {report_type}")
        # 所有 fetch_fn 均支援 property_id 參數
        data = fetch_fn(property_id=property_id)
        supabase_service.upsert_cache(report_type, data, project_id=project_id)
        updated_reports.append(report_type)

    # 將當日 KPI 寫入每日快照表
    logger.info(f"同步 [{project_id or 'default'}]: 每日快照")
    overview_data = supabase_service.get_cache("overview", project_id=project_id)
    if overview_data and "kpi" in overview_data:
        supabase_service.upsert_daily_snapshot(overview_data["kpi"], project_id=project_id)
        updated_reports.append("daily_snapshot")

    duration = (datetime.now() - start_time).total_seconds()
    logger.info(f"✅ 專案 {project_id or 'default'} 同步完成，耗時 {duration:.1f} 秒")

    return {
        "status": "success",
        "message": f"專案 {project_id or 'default'} 資料同步成功",
        "updated_reports": updated_reports,
        "duration_seconds": round(duration, 1),
    }
