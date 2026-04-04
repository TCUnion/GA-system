import logging
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

from core.config import settings
from services.ga_service import ga_service
from services.supabase_service import supabase_service

logger = logging.getLogger(__name__)

# NOTE: 異常告警冷卻快取 { property_id: last_alert_time }
_alert_cooldown = {}


def _notify_anomaly(data: dict):
    """
    透過 Webhook 發送異常告警至 n8n。
    使用 urllib 避免額外相依套件。
    """
    if not settings.ANOMALY_WEBHOOK_URL:
        return

    try:
        req = urllib.request.Request(
            settings.ANOMALY_WEBHOOK_URL,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                logger.info(f"🚀 [異常告警] Webhook 已成功送出: {data['property_id']}")
            else:
                logger.error(f"❌ Webhook 回傳異常狀態碼: {response.status}")
    except Exception as e:
        logger.error(f"❌ 發送異常告警 Webhook 失敗: {e}")


def _check_and_notify_anomaly(project_id: str | None, property_id: str | None):
    """
    執行流量異常偵測，若符合條件且不在冷卻期內則報警。
    """
    pid = property_id or settings.GA_PROPERTY_ID

    # 1. 檢查冷卻時間 (1 小時)
    now = datetime.now()
    if pid in _alert_cooldown:
        if (now - _alert_cooldown[pid]) < timedelta(hours=1):
            return

    # 2. 獲取異常數據
    anomaly_data = ga_service.get_traffic_anomaly_data(property_id=property_id)
    if not anomaly_data:
        return

    # 3. 判斷閾值 (跌幅 > 50%)
    if anomaly_data["drop_percent"] >= 50:
        logger.warning(f"⚠️ [流量異常] {pid} 跌幅達 {anomaly_data['drop_percent']}%")

        # 加上專案名稱（如有）
        project_name = "Nanzhuang GA4 Dashboard"
        if project_id:
            try:
                res = supabase_service.client.table("projects").select("name").eq("id", project_id).execute()
                if res.data:
                    project_name = res.data[0]["name"]
            except Exception:
                pass

        anomaly_data["project_name"] = project_name

        # 4. 發送通知並更新冷卻時間
        _notify_anomaly(anomaly_data)
        _alert_cooldown[pid] = now


def _fetch_report(report_type: str, fetch_fn, property_id: str | None) -> tuple[str, dict]:
    """單一報表的取回包裝，供 ThreadPoolExecutor 並行呼叫。"""
    data = fetch_fn(property_id=property_id)
    return report_type, data


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

    # NOTE: 並行 fetch 所有報表，大幅縮短同步時間（~60s → ~15s）
    fetched_reports: dict[str, dict] = {}
    max_workers = min(settings.SYNC_MAX_WORKERS, len(report_tasks))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(_fetch_report, rtype, fn, property_id): rtype
            for rtype, fn in report_tasks
        }
        for future in as_completed(futures):
            rtype = futures[future]
            try:
                _, data = future.result()
                fetched_reports[rtype] = data
                logger.info(f"✅ 並行取回 [{project_id or 'default'}]: {rtype}")
            except Exception as e:
                logger.error(f"❌ 並行取回失敗 [{project_id or 'default'}]: {rtype} — {e}")

    # NOTE: 循序寫入 Supabase（避免並行寫入同一 row 造成衝突）
    for report_type, data in fetched_reports.items():
        supabase_service.upsert_cache(report_type, data, project_id=project_id)
        updated_reports.append(report_type)

    # 將當日 KPI 寫入每日快照表（直接使用已取回的 overview，避免再次查詢 DB）
    overview_data = fetched_reports.get("overview")
    if overview_data and "kpi" in overview_data:
        logger.info(f"同步 [{project_id or 'default'}]: 每日快照")
        supabase_service.upsert_daily_snapshot(overview_data["kpi"], project_id=project_id)
        updated_reports.append("daily_snapshot")

    # --- 異常偵測與告警掛鉤 ---
    if settings.ANOMALY_WEBHOOK_URL:
        _check_and_notify_anomaly(project_id, property_id)

    duration = (datetime.now() - start_time).total_seconds()
    logger.info(f"✅ 專案 {project_id or 'default'} 同步完成，耗時 {duration:.1f} 秒")

    return {
        "status": "success",
        "message": f"專案 {project_id or 'default'} 資料同步成功",
        "updated_reports": updated_reports,
        "duration_seconds": round(duration, 1),
    }
