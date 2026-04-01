import logging
from datetime import date, datetime, timezone
from typing import Any
from supabase import create_client, Client
from core.config import settings

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        """
        初始化 Supabase 客戶端，使用 Service Role Key 確保後端寫入權限 (Bypass RLS)
        """
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )

    def upsert_cache(self, report_type: str, data: Any, project_id: str | None = None):
        """
        將從 GA4 取得之 JSON 報表，寫入 Supabase 'ga4_cache' 快取資料表。
        """
        logger.info(f"💾 將 {report_type} 報表寫入 Supabase 快取 (Project: {project_id})...")
        try:
            now_utc = datetime.now(timezone.utc).isoformat()
            
            # NOTE: 支援多專案後，upsert 衝突條件改為 (report_type, project_id)
            payload = {
                "report_type": report_type,
                "data": data,
                "fetched_at": now_utc,
            }
            if project_id:
                payload["project_id"] = project_id
            
            # 修正 on_conflict 寫法以支援多欄位
            response = self.client.table("ga4_cache").upsert(
                payload, 
                on_conflict="report_type, project_id"
            ).execute()
            return response
        except Exception as e:
            logger.error(f"Supabase upsert 失敗 ({report_type}): {e}")
            raise e

    def upsert_daily_snapshot(self, kpi: dict, project_id: str | None = None):
        """
        將當日 KPI 資料寫入 ga4_daily_snapshot 表，用於前端趨勢圖。
        """
        today = date.today().isoformat()
        logger.info(f"📅 寫入每日快照: {today} (Project: {project_id})")

        try:
            payload = {
                "snapshot_date": today,
                "users": kpi.get("totalUsers", 0),
                "new_users": kpi.get("newUsers", 0),
                "sessions": kpi.get("sessions", 0),
                "pageviews": kpi.get("pageviews", 0),
                "avg_session_duration": kpi.get("avgSessionDuration", 0),
                "bounce_rate": kpi.get("bounceRate", 0),
            }
            if project_id:
                payload["project_id"] = project_id

            response = self.client.table("ga4_daily_snapshot").upsert(
                payload, 
                on_conflict="snapshot_date, project_id"
            ).execute()
            return response
        except Exception as e:
            logger.error(f"Supabase 每日快照寫入失敗: {e}")
            raise e

    def get_cache(self, report_type: str, project_id: str | None = None) -> dict | None:
        """
        從 ga4_cache 表讀取指定報表的快取資料。
        """
        try:
            query = self.client.table("ga4_cache").select("data").eq("report_type", report_type)
            
            if project_id:
                query = query.eq("project_id", project_id)
            else:
                query = query.is_("project_id", "null")

            response = query.execute()
            if response.data:
                return response.data[0]["data"]
            return None
        except Exception as e:
            logger.error(f"Supabase 讀取快取失敗 ({report_type}): {e}")
            return None

    def get_ga_property_id(self, project_id: str) -> str | None:
        """
        透過 project_id 查詢 projects 表，取得對應的 ga_property_id
        """
        if not project_id:
            return None
        try:
            res = self.client.table("projects").select("ga_property_id").eq("id", project_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0].get("ga_property_id")
            return None
        except Exception as e:
            logger.error(f"查詢專案 {project_id} 失敗: {e}")
            return None

supabase_service = SupabaseService()
