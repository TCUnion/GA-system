import os
import logging
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
from core.config import settings

logger = logging.getLogger(__name__)

class GAService:
    def __init__(self):
        """
        初始化 GA4 資料取得服務，憑證會自動從 GOOGLE_APPLICATION_CREDENTIALS 指定的檔案載入。
        """
        self.property_id = settings.GA_PROPERTY_ID
        
        # NOTE: 確保 Google SDK 能從環境變數讀到我們指定的憑證路徑，因為 Pydantic Settings 預設不會把值插回 os.environ 中
        # 將相對路徑轉換為絕對路徑
        credentials_path = settings.GOOGLE_APPLICATION_CREDENTIALS
        if not os.path.isabs(credentials_path):
            base_dir = os.path.dirname(os.path.dirname(__file__))
            credentials_path = os.path.join(base_dir, credentials_path)
        
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        
        try:
            self.client = BetaAnalyticsDataClient()
            logger.info("✅ GA4 Client 初始化成功。")
        except Exception as e:
            logger.error(f"GA4 Client 初始化失敗: {e}")
            raise e

    def get_overview_report(self) -> dict:
        """
        取得 GA4 總覽報表資料 (前 30 天) 與前一週期的比較，格式對齊前端的 KpiData。
        """
        logger.info("📊 取得 Overview 總覽報表...")
        
        # 查詢近 30 天的 KPI
        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            metrics=[
                Metric(name="totalUsers"),
                Metric(name="newUsers"),
                Metric(name="sessions"),
                Metric(name="screenPageViews"),
                Metric(name="averageSessionDuration"),
                Metric(name="bounceRate"),
            ],
            date_ranges=[
                DateRange(start_date="30daysAgo", end_date="today"),
                DateRange(start_date="60daysAgo", end_date="31daysAgo") # 對比指標
            ],
        )
        
        try:
            response = self.client.run_report(request)
            
            # 整理出兩組資料 (目前的 30 天與 前一個 30 天的比較)
            kpi = {
                "totalUsers": 0, "newUsers": 0, "sessions": 0,
                "pageviews": 0, "avgSessionDuration": 0.0, "bounceRate": 0.0
            }
            prev_kpi = dict(kpi)
            
            for row in response.rows:
                # row.dimension_values 可以包含 date_range_id
                date_range = row.dimension_values[0].value if row.dimension_values else "date_range_0"
                
                target = kpi if date_range == "date_range_0" else prev_kpi
                
                target["totalUsers"] = int(row.metric_values[0].value)
                target["newUsers"] = int(row.metric_values[1].value)
                target["sessions"] = int(row.metric_values[2].value)
                target["pageviews"] = int(row.metric_values[3].value)
                target["avgSessionDuration"] = round(float(row.metric_values[4].value), 2)
                target["bounceRate"] = round(float(row.metric_values[5].value) * 100, 2)
                
            return {
                "kpi": kpi,
                "previousKpi": prev_kpi,
            }
        except Exception as e:
            logger.error(f"GA4 總覽報表查詢發生錯誤: {e}")
            raise e

ga_service = GAService()
