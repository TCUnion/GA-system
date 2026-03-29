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

    NOTE: 因為排程在獨立執行緒中運行，所有例外必須在此捕捉，
    否則 APScheduler 會吞掉錯誤且無法除錯。
    """
    logger.info("⏰ 排程觸發: 開始自動同步 GA4 資料...")
    try:
        # HACK: 延遲匯入避免循環依賴，ga_service 模組層級會初始化 GA4 client
        from services.sync_runner import run_sync
        result = run_sync()
        logger.info(f"⏰ 排程同步完成: {result['message']}")
    except Exception as e:
        logger.error(f"⏰ 排程同步失敗: {e}", exc_info=True)


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
