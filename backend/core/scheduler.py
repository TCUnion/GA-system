"""
APScheduler 排程管理模組

NOTE: 使用 BackgroundScheduler 在背景執行定時任務，
與 FastAPI 的 lifespan 機制整合，確保伺服器啟動時開始排程、關閉時停止排程。
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from core.config import settings

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _sync_job():
    """
    排程觸發的同步任務包裝函式。
    遍歷資料庫中所有啟用的專案並執行同步。
    """
    logger.info("⏰ 開始執行多專案自動同步任務...")
    
    from services.supabase_service import supabase_service
    from services.sync_runner import run_sync

    try:
        # 1. 取得所有啟用的專案
        res = supabase_service.client.table("projects").select("id, name, ga_property_id").eq("is_active", True).execute()
        projects = res.data or []
        
        if not projects:
            logger.info("📅 查無啟用的專案，跳過同步")
            return

        success_count = 0
        error_count = 0

        # 2. 逐一執行同步
        for project in projects:
            p_id = project["id"]
            p_name = project["name"]
            prop_id = project["ga_property_id"]
            
            try:
                logger.info(f"🔄 正在同步專案: {p_name} ({p_id})")
                run_sync(project_id=p_id, property_id=prop_id)
                success_count += 1
            except Exception as e:
                logger.error(f"❌ 專案 {p_name} 同步失敗: {e}")
                error_count += 1
        
        logger.info(f"🏁 多專案同步任務結束。成功: {success_count}, 失敗: {error_count}")

    except Exception as e:
        logger.error(f"⏰ 排程同步全域錯誤: {e}", exc_info=True)


def start_scheduler():
    """
    啟動排程器，註冊定時同步任務。

    間隔由 SYNC_INTERVAL_MINUTES 環境變數控制（預設 30 分鐘）。
    首次同步不立即執行（避免與啟動時手動同步衝突）。
    """
    interval = settings.SYNC_INTERVAL_MINUTES

    scheduler.add_job(
        _sync_job,
        trigger=IntervalTrigger(minutes=interval),
        id="ga4_sync",
        name=f"GA4 資料同步（每 {interval} 分鐘）",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(f"📅 排程器已啟動 — 每 {interval} 分鐘自動同步 GA4 資料")


def stop_scheduler():
    """
    優雅關閉排程器，等待進行中的任務完成。
    """
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("📅 排程器已停止")
