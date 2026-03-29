import logging
from datetime import date
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

    def upsert_cache(self, report_type: str, data: Any):
        """
        將從 GA4 取得之 JSON 報表，寫入 Supabase 'ga4_cache' 快取資料表。
        當 record 存在時，將透過 supabase 原生的 upsert 行為更新 updated_at
        """
        logger.info(f"💾 將 {report_type} 報表寫入 Supabase 快取...")
        try:
            response = self.client.table("ga4_cache").upsert({
                "report_type": report_type,
                "data": data,
            }, on_conflict="report_type").execute()
            return response
        except Exception as e:
            logger.error(f"Supabase upsert 失敗 ({report_type}): {e}")
            raise e

    def upsert_daily_snapshot(self, kpi: dict):
        """
        將當日 KPI 資料寫入 ga4_daily_snapshot 表，用於前端趨勢圖。

        Args:
            kpi: 包含 totalUsers, newUsers, sessions, pageviews,
                 avgSessionDuration, bounceRate 的字典
        """
        today = date.today().isoformat()
        logger.info(f"📅 寫入每日快照: {today}")

        try:
            response = self.client.table("ga4_daily_snapshot").upsert({
                "snapshot_date": today,
                "users": kpi.get("totalUsers", 0),
                "new_users": kpi.get("newUsers", 0),
                "sessions": kpi.get("sessions", 0),
                "pageviews": kpi.get("pageviews", 0),
                "avg_session_duration": kpi.get("avgSessionDuration", 0),
                "bounce_rate": kpi.get("bounceRate", 0),
            }, on_conflict="snapshot_date").execute()
            return response
        except Exception as e:
            logger.error(f"Supabase 每日快照寫入失敗: {e}")
            raise e

supabase_service = SupabaseService()
