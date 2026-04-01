import os
import base64
import json
import logging
import tempfile
import re
from datetime import datetime, timedelta
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
    OrderBy,
)
from google.oauth2 import service_account
from core.config import settings

logger = logging.getLogger(__name__)

# NOTE: 預設查詢區間設為 30 天，所有報表共用
DEFAULT_DATE_RANGE = DateRange(start_date="30daysAgo", end_date="today")
COMPARE_DATE_RANGE = DateRange(start_date="60daysAgo", end_date="31daysAgo")


class GAService:
    """
    GA4 資料取得服務

    負責透過 Google Analytics Data API v1beta 拉取各類報表資料，
    回傳的 dict 格式需與前端 ga4Service.ts 中的型別定義完全對齊。

    NOTE: 支援兩種憑證載入方式：
    1. GOOGLE_CREDENTIALS_BASE64 — 雲端部署，Base64 編碼的 JSON 字串
    2. GOOGLE_APPLICATION_CREDENTIALS — 本地開發，JSON 檔案路徑
    """

    def __init__(self):
        """
        初始化 GA4 Client，依優先順序載入憑證：
        1. 若 GOOGLE_CREDENTIALS_BASE64 存在 → 從記憶體載入
        2. 否則使用 GOOGLE_APPLICATION_CREDENTIALS 指向的 JSON 檔案
        """
        self.property_id = settings.GA_PROPERTY_ID

        try:
            if settings.GOOGLE_CREDENTIALS_BASE64:
                # NOTE: 雲端部署模式 — 從環境變數解碼 Base64 JSON
                logger.info("🔑 使用 Base64 環境變數載入 GCP 憑證...")
                creds_json = base64.b64decode(
                    settings.GOOGLE_CREDENTIALS_BASE64
                ).decode("utf-8")
                creds_dict = json.loads(creds_json)
                credentials = service_account.Credentials.from_service_account_info(
                    creds_dict,
                    scopes=["https://www.googleapis.com/auth/analytics.readonly"],
                )
                self.client = BetaAnalyticsDataClient(credentials=credentials)
            else:
                # NOTE: 本地開發模式 — 使用 JSON 檔案路徑
                logger.info("🔑 使用 JSON 檔案載入 GCP 憑證...")
                credentials_path = settings.GOOGLE_APPLICATION_CREDENTIALS
                if not credentials_path:
                    raise ValueError(
                        "必須設定 GOOGLE_CREDENTIALS_BASE64 或 "
                        "GOOGLE_APPLICATION_CREDENTIALS 其中之一"
                    )
                if not os.path.isabs(credentials_path):
                    base_dir = os.path.dirname(os.path.dirname(__file__))
                    credentials_path = os.path.join(base_dir, credentials_path)

                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
                self.client = BetaAnalyticsDataClient()

            logger.info("✅ GA4 Client 初始化成功。")
        except Exception as e:
            logger.error(f"GA4 Client 初始化失敗: {e}")
            raise e

    # ----- 共用內部方法 -----

    def _resolve_real_date(self, date_str: str) -> datetime.date:
        """
        將 GA4 字串 (如 '30daysAgo', 'today') 轉為實際的 datetime.date。
        若是 'YYYY-MM-DD' 則直接解析。
        """
        today = datetime.now().date()
        if date_str == "today":
            return today
        elif date_str == "yesterday":
            return today - timedelta(days=1)
        match = re.match(r'^(\d+)daysAgo$', date_str)
        if match:
            days = int(match.group(1))
            return today - timedelta(days=days)
        
        return datetime.strptime(date_str, "%Y-%m-%d").date()

    def _get_compare_date_range(self, start_date: str, end_date: str) -> DateRange:
        """
        根據給定的起訖日，計算出相同天數的上一期日期範圍。
        """
        start_dt = self._resolve_real_date(start_date)
        end_dt = self._resolve_real_date(end_date)
        delta_days = (end_dt - start_dt).days + 1
        
        prev_end_dt = start_dt - timedelta(days=1)
        prev_start_dt = prev_end_dt - timedelta(days=delta_days - 1)
        
        return DateRange(
            start_date=prev_start_dt.strftime("%Y-%m-%d"),
            end_date=prev_end_dt.strftime("%Y-%m-%d")
        )


    def _run_report(self, dimensions: list[str], metrics: list[str],
                    date_ranges: list[DateRange] | None = None,
                    order_bys: list[OrderBy] | None = None,
                    limit: int = 0,
                    property_id: str | None = None):
        """
        共用的 GA4 報表查詢方法，簡化各報表的重複程式碼。

        Args:
            dimensions: 維度名稱列表
            metrics: 指標名稱列表
            date_ranges: 日期範圍（預設為近 30 天）
            order_bys: 排序規則
            limit: 回傳行數上限，0 表示不限制
            property_id: 指定 GA4 Property ID，如未指定則使用預設值
        """
        actual_property_id = property_id if property_id else self.property_id
        if not actual_property_id:
            raise ValueError("未指定 GA_PROPERTY_ID")
            
        request = RunReportRequest(
            property=f"properties/{actual_property_id}",
            dimensions=[Dimension(name=d) for d in dimensions],
            metrics=[Metric(name=m) for m in metrics],
            date_ranges=date_ranges or [DEFAULT_DATE_RANGE],
            order_bys=order_bys or [],
            limit=limit,
        )
        return self.client.run_report(request)

    # ----- 1. Overview 總覽報表 -----

    def get_overview_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得 GA4 總覽報表資料 (前 30 天) 與前一週期的比較。

        Returns:
            格式對齊前端 KpiData[]：
            { kpi: {...}, previousKpi: {...} }
        """
        logger.info(f"📊 取得 Overview 總覽報表 ({start_date} ~ {end_date})...")

        current_range = DateRange(start_date=start_date, end_date=end_date)
        compare_range = self._get_compare_date_range(start_date, end_date)

        actual_property_id = property_id if property_id else self.property_id
        if not actual_property_id:
            raise ValueError("未指定 GA_PROPERTY_ID")

        request = RunReportRequest(
            property=f"properties/{actual_property_id}",
            metrics=[
                Metric(name="totalUsers"),
                Metric(name="newUsers"),
                Metric(name="sessions"),
                Metric(name="screenPageViews"),
                Metric(name="averageSessionDuration"),
                Metric(name="bounceRate"),
            ],
            date_ranges=[current_range, compare_range],
        )

        try:
            response = self.client.run_report(request)

            kpi = {
                "totalUsers": 0, "newUsers": 0, "sessions": 0,
                "pageviews": 0, "avgSessionDuration": 0.0, "bounceRate": 0.0,
            }
            prev_kpi = dict(kpi)

            for row in response.rows:
                date_range = row.dimension_values[0].value if row.dimension_values else "date_range_0"
                target = kpi if date_range == "date_range_0" else prev_kpi

                target["totalUsers"] = int(row.metric_values[0].value)
                target["newUsers"] = int(row.metric_values[1].value)
                target["sessions"] = int(row.metric_values[2].value)
                target["pageviews"] = int(row.metric_values[3].value)
                target["avgSessionDuration"] = round(float(row.metric_values[4].value), 2)
                target["bounceRate"] = round(float(row.metric_values[5].value) * 100, 2)

            return {"kpi": kpi, "previousKpi": prev_kpi}
        except Exception as e:
            logger.error(f"GA4 總覽報表查詢發生錯誤: {e}")
            raise e

    def fetch_daily_traffic(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得每日流量趨勢
        Returns: { "dailyTraffic": [ ... ] }
        """
        logger.info(f"📈 取得 Daily Traffic 報表 ({start_date} ~ {end_date})...")
        date_ranges = [DateRange(start_date=start_date, end_date=end_date)]

        try:
            response = self._run_report(
                dimensions=["date"],
                metrics=["totalUsers", "newUsers", "sessions", "screenPageViews"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"), desc=False)],
                property_id=property_id,
            )
            daily_traffic = []
            for row in response.rows:
                date_str = row.dimension_values[0].value
                d = datetime.strptime(date_str, "%Y%m%d")
                daily_traffic.append({
                    "date": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}",
                    "label": f"{d.month}/{d.day}",
                    "users": int(row.metric_values[0].value),
                    "newUsers": int(row.metric_values[1].value),
                    "sessions": int(row.metric_values[2].value),
                    "views": int(row.metric_values[3].value),
                })

            return {
                "dailyTraffic": daily_traffic,
            }
        except Exception as e:
            logger.error(f"GA4 每日流量報表查詢失敗: {e}")
            raise e

    # ----- 2. Audience 使用者分析報表 -----

    def fetch_audience_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得使用者分析報表，包含裝置、語言、OS、城市分佈。

        Returns:
            格式對齊前端：
            { devices: DeviceData[], os: OsData[], languages: LanguageData[], cities: CityData[] }
        """
        logger.info(f"👥 取得 Audience 使用者分析報表 ({start_date} ~ {end_date})...")
        date_ranges = [DateRange(start_date=start_date, end_date=end_date)]

        try:
            # 裝置類別分佈
            device_response = self._run_report(
                dimensions=["deviceCategory"],
                metrics=["totalUsers"],
                date_ranges=date_ranges,
                property_id=property_id,
            )
            devices = []
            # NOTE: GA4 回傳英文 device category，需轉換為前端顯示的中文
            device_name_map = {"desktop": "桌機", "mobile": "手機", "tablet": "平板"}
            for row in device_response.rows:
                raw_name = row.dimension_values[0].value
                devices.append({
                    "name": device_name_map.get(raw_name, raw_name),
                    "users": int(row.metric_values[0].value),
                })

            # 作業系統分佈
            os_response = self._run_report(
                dimensions=["operatingSystem"],
                metrics=["totalUsers"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=10,
                property_id=property_id,
            )
            os_data = [
                {"name": row.dimension_values[0].value, "users": int(row.metric_values[0].value)}
                for row in os_response.rows
            ]

            # 語言分佈
            lang_response = self._run_report(
                dimensions=["language"],
                metrics=["totalUsers"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=10,
                property_id=property_id,
            )
            languages = [
                {"language": row.dimension_values[0].value, "users": int(row.metric_values[0].value)}
                for row in lang_response.rows
            ]

            # 城市分佈（含多指標）
            city_response = self._run_report(
                dimensions=["city"],
                metrics=["totalUsers", "sessions", "engagementRate"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=250,
                property_id=property_id,
            )
            cities = []
            for row in city_response.rows:
                city_name = row.dimension_values[0].value
                # NOTE: GA4 有時回傳 "(not set)"，跳過這些無效資料
                if city_name == "(not set)":
                    continue
                cities.append({
                    "city": city_name,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value),
                    "engagementRate": round(float(row.metric_values[2].value) * 100, 1),
                })

            return {
                "devices": devices,
                "os": os_data,
                "languages": languages,
                "cities": cities,
            }
        except Exception as e:
            logger.error(f"GA4 使用者分析報表查詢失敗: {e}")
            raise e

    # ----- 3. Acquisition 流量來源報表 -----

    def fetch_acquisition_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得流量來源報表，包含管道、來源/媒介、社群平台。

        Returns:
            格式對齊前端：
            { channels: ChannelData[], sourceMedium: SourceMediumData[], social: SocialData[] }
        """
        logger.info(f"🔗 取得 Acquisition 流量來源報表 ({start_date} ~ {end_date})...")
        date_ranges = [DateRange(start_date=start_date, end_date=end_date)]

        try:
            # 管道分佈
            channel_response = self._run_report(
                dimensions=["sessionDefaultChannelGrouping"],
                metrics=["sessions"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                property_id=property_id,
            )
            channels = [
                {"name": row.dimension_values[0].value, "sessions": int(row.metric_values[0].value)}
                for row in channel_response.rows
            ]

            # 來源 / 媒介明細
            source_response = self._run_report(
                dimensions=["sessionSource", "sessionMedium"],
                metrics=["sessions", "totalUsers", "newUsers", "engagementRate", "averageSessionDuration"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=20,
                property_id=property_id,
            )
            source_medium = []
            for row in source_response.rows:
                source_medium.append({
                    "source": row.dimension_values[0].value,
                    "medium": row.dimension_values[1].value,
                    "sessions": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                    "newUsers": int(row.metric_values[2].value),
                    "engagementRate": round(float(row.metric_values[3].value) * 100, 1),
                    "avgDuration": round(float(row.metric_values[4].value), 0),
                })

            # 社群平台流量
            # NOTE: 使用 sessionSource 維度，手動篩選已知社群平台來源
            social_platforms = {
                "facebook.com": "Facebook", "l.facebook.com": "Facebook",
                "m.facebook.com": "Facebook", "fb.com": "Facebook",
                "line.me": "LINE", "lm.facebook.com": "Facebook",
                "instagram.com": "Instagram", "l.instagram.com": "Instagram",
                "youtube.com": "YouTube", "m.youtube.com": "YouTube",
                "twitter.com": "Twitter/X", "t.co": "Twitter/X",
                "linkedin.com": "LinkedIn",
                "threads.net": "Threads",
            }
            social_agg: dict[str, int] = {}
            for row in source_response.rows:
                source = row.dimension_values[0].value.lower()
                if source in social_platforms:
                    platform = social_platforms[source]
                    social_agg[platform] = social_agg.get(platform, 0) + int(row.metric_values[0].value)

            social = sorted(
                [{"platform": k, "sessions": v} for k, v in social_agg.items()],
                key=lambda x: x["sessions"],
                reverse=True,
            )

            return {
                "channels": channels,
                "sourceMedium": source_medium,
                "social": social,
            }
        except Exception as e:
            logger.error(f"GA4 流量來源報表查詢失敗: {e}")
            raise e

    # ----- 4. Content 內容分析報表 -----

    def fetch_content_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得內容分析報表，包含頁面排行與到達頁面。

        Returns:
            格式對齊前端：
            { pages: PageData[], landingPages: PageData[] }
        """
        logger.info(f"📄 取得 Content 內容分析報表 ({start_date} ~ {end_date})...")
        date_ranges = [DateRange(start_date=start_date, end_date=end_date)]

        try:
            # 所有頁面排行
            page_response = self._run_report(
                dimensions=["pageTitle", "pagePath"],
                metrics=["screenPageViews", "totalUsers", "averageSessionDuration", "bounceRate"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
                limit=20,
                property_id=property_id,
            )
            pages = []
            for row in page_response.rows:
                pages.append({
                    "pageTitle": row.dimension_values[0].value,
                    "pagePath": row.dimension_values[1].value,
                    "views": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                    "avgDuration": round(float(row.metric_values[2].value), 0),
                    "bounceRate": round(float(row.metric_values[3].value) * 100, 1),
                })

            # 到達頁面（Landing Page）
            landing_response = self._run_report(
                dimensions=["landingPagePlusQueryString"],
                metrics=["sessions", "totalUsers", "bounceRate"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=10,
                property_id=property_id,
            )
            landing_pages = []
            for row in landing_response.rows:
                path = row.dimension_values[0].value
                landing_pages.append({
                    "pageTitle": path,  # NOTE: landingPage 維度不含 pageTitle，用路徑替代
                    "pagePath": path,
                    "views": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                    "avgDuration": 0,
                    "bounceRate": round(float(row.metric_values[2].value) * 100, 1),
                })

            return {
                "pages": pages,
                "landingPages": landing_pages,
            }
        except Exception as e:
            logger.error(f"GA4 內容分析報表查詢失敗: {e}")
            raise e

    # ----- 5. Engagement 參與分析報表 -----

    def fetch_engagement_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得參與分析報表，包含事件明細、每週與每小時分佈。

        Returns:
            格式對齊前端：
            { events: EventData[], weekday: WeekdayData[], hourly: HourlyData[] }
        """
        logger.info(f"⚡ 取得 Engagement 參與分析報表 ({start_date} ~ {end_date})...")
        date_ranges = [DateRange(start_date=start_date, end_date=end_date)]

        # NOTE: 將四個子查詢拆分為獨立 try/except 區塊，
        #       確保單一 GA4 查詢失敗時不拖累整份報表，能回傳部分資料。

        # --- 事件排行 ---
        events = []
        try:
            event_response = self._run_report(
                dimensions=["eventName"],
                metrics=["eventCount", "totalUsers"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="eventCount"), desc=True)],
                limit=20,
                property_id=property_id,
            )
            events = [
                {
                    "eventName": row.dimension_values[0].value,
                    "eventCount": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                }
                for row in event_response.rows
            ]
        except Exception as e:
            logger.warning(f"GA4 事件排行查詢失敗（跳過）: {e}")

        # --- 每週流量分佈 ---
        weekday = []
        try:
            weekday_response = self._run_report(
                dimensions=["dayOfWeek"],
                metrics=["sessions"],
                date_ranges=date_ranges,
                property_id=property_id,
            )
            # NOTE: GA4 的 dayOfWeek 回傳 "0"=週日 ~ "6"=週六，需轉換為中文
            weekday_map = {"0": "週日", "1": "週一", "2": "週二", "3": "週三",
                           "4": "週四", "5": "週五", "6": "週六"}
            weekday_raw = {
                row.dimension_values[0].value: int(row.metric_values[0].value)
                for row in weekday_response.rows
            }
            # 依週一到週日排序
            weekday = [
                {"day": weekday_map[str(i)], "sessions": weekday_raw.get(str(i), 0)}
                for i in [1, 2, 3, 4, 5, 6, 0]
            ]
        except Exception as e:
            logger.warning(f"GA4 每週流量查詢失敗（跳過）: {e}")

        # --- 每小時流量分佈（總覽） ---
        hourly = []
        try:
            hourly_response = self._run_report(
                dimensions=["hour"],
                metrics=["sessions"],
                date_ranges=date_ranges,
                property_id=property_id,
            )
            hourly_raw = {
                row.dimension_values[0].value: int(row.metric_values[0].value)
                for row in hourly_response.rows
            }
            # NOTE: 加上 ":00" 後綴以對齊前端 HourlyData.hour 型別定義（格式 "HH:00"）
            hourly = [
                {"hour": f"{h:02d}:00", "sessions": hourly_raw.get(f"{h:02d}", 0)}
                for h in range(24)
            ]
        except Exception as e:
            logger.warning(f"GA4 每小時流量查詢失敗（跳過）: {e}")

        # --- 每日 × 每小時 熱力圖 ---
        hourly_by_date = []
        try:
            hourly_date_response = self._run_report(
                dimensions=["date", "hour"],
                metrics=["sessions"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"), desc=False)],
                property_id=property_id,
            )
            # 聚合為 { date: { hour: sessions } }
            hourly_by_date_raw: dict[str, dict[str, int]] = {}
            for row in hourly_date_response.rows:
                d = row.dimension_values[0].value   # e.g. "20250101"
                h = row.dimension_values[1].value   # e.g. "9"
                s = int(row.metric_values[0].value)
                if d not in hourly_by_date_raw:
                    hourly_by_date_raw[d] = {}
                hourly_by_date_raw[d][h] = s

            hourly_by_date = [
                {
                    "date": d,
                    "label": f"{d[4:6]}/{d[6:8]}",  # MM/DD 格式
                    "hours": [hourly_by_date_raw[d].get(str(h), 0) for h in range(24)],
                }
                for d in sorted(hourly_by_date_raw)
            ]
        except Exception as e:
            logger.warning(f"GA4 每日每小時熱力圖查詢失敗（跳過）: {e}")

        return {
            "events": events,
            "weekday": weekday,
            "hourly": hourly,
            "hourlyByDate": hourly_by_date,
        }

    # ----- 6. Tech 技術分析報表 -----

    def fetch_tech_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得技術分析報表，包含瀏覽器與螢幕解析度。

        Returns:
            格式對齊前端：
            { browsers: BrowserData[], screens: ScreenData[] }
        """
        logger.info(f"📱 取得 Tech 技術分析報表 ({start_date} ~ {end_date})...")
        date_ranges = [DateRange(start_date=start_date, end_date=end_date)]

        try:
            # 瀏覽器分佈
            browser_response = self._run_report(
                dimensions=["browser"],
                metrics=["totalUsers", "sessions", "engagementRate"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=10,
                property_id=property_id,
            )
            browsers = [
                {
                    "name": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value),
                    "engagementRate": round(float(row.metric_values[2].value) * 100, 1),
                }
                for row in browser_response.rows
            ]

            # 螢幕解析度分佈
            screen_response = self._run_report(
                dimensions=["screenResolution"],
                metrics=["totalUsers"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=10,
                property_id=property_id,
            )
            screens = [
                {
                    "resolution": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value),
                }
                for row in screen_response.rows
            ]

            return {
                "browsers": browsers,
                "screens": screens,
            }
        except Exception as e:
            logger.error(f"GA4 技術分析報表查詢失敗: {e}")
            raise e


ga_service = GAService()
