import os
import base64
import json
import logging
import tempfile
import re
import threading
import time
from datetime import datetime, timedelta
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
    OrderBy,
    FilterExpression,
    FilterExpressionList,
    Filter,
)
from google.api_core import exceptions as google_exceptions
from google.oauth2 import service_account
from core.config import settings

# NOTE: GA4 API 暫時性錯誤，值得重試
_RETRYABLE_EXCEPTIONS = (
    google_exceptions.DeadlineExceeded,
    google_exceptions.InternalServerError,
    google_exceptions.ResourceExhausted,
    google_exceptions.ServiceUnavailable,
    google_exceptions.TooManyRequests,
)

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

        # --- 前端請求快取 ---
        # 存儲格式: { cache_key: (timestamp, data) }
        self._api_cache: dict[str, tuple[float, any]] = {}
        self._api_cache_ttl = 300  # 預設緩存 5 分鐘
        self._api_cache_lock = threading.Lock()

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

    def _get_from_cache(self, key: str):
        """從記憶體快取中取得資料，若過期則返回 None（thread-safe）"""
        with self._api_cache_lock:
            entry = self._api_cache.get(key)
            if entry:
                ts, data = entry
                if (datetime.now().timestamp() - ts) < self._api_cache_ttl:
                    logger.info(f"⚡ 從快取讀取: {key}")
                    return data
                del self._api_cache[key]
        return None

    def _set_to_cache(self, key: str, data: any):
        """將資料存入記憶體快取（thread-safe）"""
        with self._api_cache_lock:
            self._api_cache[key] = (datetime.now().timestamp(), data)


    def _run_report(self, dimensions: list[str], metrics: list[str],
                    date_ranges: list[DateRange] | None = None,
                    order_bys: list[OrderBy] | None = None,
                    dimension_filter: FilterExpression | None = None,
                    limit: int = 0,
                    property_id: str | None = None):
        """
        共用的 GA4 報表查詢方法，簡化各報表的重複程式碼。
        內建 exponential backoff 重試（針對暫時性 GA4 API 錯誤）。

        Args:
            dimensions: 維度名稱列表
            metrics: 指標名稱列表
            date_ranges: 日期範圍（預設為近 30 天）
            order_bys: 排序規則
            dimension_filter: 維度過濾器
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
            dimension_filter=dimension_filter,
            limit=limit,
        )

        max_retries = settings.GA_API_MAX_RETRIES
        timeout = settings.GA_API_TIMEOUT_SECONDS
        for attempt in range(max_retries + 1):
            try:
                return self.client.run_report(request, timeout=timeout)
            except _RETRYABLE_EXCEPTIONS as e:
                if attempt >= max_retries:
                    logger.error(f"GA4 API 重試 {max_retries} 次後仍失敗: {e}")
                    raise
                wait = 2 ** attempt  # 1s, 2s, 4s …
                logger.warning(f"GA4 API 暫時錯誤 (嘗試 {attempt + 1}/{max_retries + 1})，{wait}s 後重試: {e}")
                time.sleep(wait)

    # ----- 1. Overview 總覽報表 -----

    def get_overview_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得 GA4 總覽報表資料 (前 30 天) 與前一週期的比較。

        Returns:
            格式對齊前端 KpiData[]：
            { kpi: {...}, previousKpi: {...} }
        """
        logger.info(f"📊 取得 Overview 總覽報表 ({start_date} ~ {end_date})...")
        
        cache_key = f"overview:{start_date}:{end_date}:{property_id or 'default'}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data: return cached_data

        current_range = DateRange(start_date=start_date, end_date=end_date)
        compare_range = self._get_compare_date_range(start_date, end_date)

        try:
            response = self._run_report(
                dimensions=[],
                metrics=["totalUsers", "newUsers", "sessions", "screenPageViews",
                         "averageSessionDuration", "bounceRate"],
                date_ranges=[current_range, compare_range],
                property_id=property_id,
            )

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

            result = {"kpi": kpi, "previousKpi": prev_kpi}
            self._set_to_cache(cache_key, result)
            return result
        except Exception as e:
            logger.error(f"GA4 總覽報表查詢發生錯誤: {e}")
            raise e

    def fetch_daily_traffic(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得每日流量趨勢
        Returns: { "dailyTraffic": [ ... ] }
        """
        logger.info(f"📈 取得 Daily Traffic 報表 ({start_date} ~ {end_date})...")
        
        cache_key = f"traffic:{start_date}:{end_date}:{property_id or 'default'}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data: return cached_data
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

            result = {
                "dailyTraffic": daily_traffic,
            }
            self._set_to_cache(cache_key, result)
            return result
        except Exception as e:
            logger.error(f"GA4 每日流量報表查詢失敗: {e}")
            raise e

    # ----- 2. Audience 使用者分析報表 -----

    def fetch_audience_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得使用者分析報表，包含裝置、語言、OS、城市分佈、國家分佈。

        Returns:
            格式對齊前端：
            { devices: DeviceData[], os: OsData[], languages: LanguageData[], cities: CityData[], countries: dict[] }
        """
        logger.info(f"👥 取得 Audience 使用者分析報表 ({start_date} ~ {end_date})...")
        
        cache_key = f"audience:{start_date}:{end_date}:{property_id or 'default'}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data: return cached_data
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

            # 國家分佈
            country_response = self._run_report(
                dimensions=["country"],
                metrics=["totalUsers", "sessions", "engagementRate"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=100,
                property_id=property_id,
            )
            countries = []
            for row in country_response.rows:
                country_name = row.dimension_values[0].value
                if country_name == "(not set)":
                    continue
                countries.append({
                    "name": country_name,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value),
                    "engagementRate": round(float(row.metric_values[2].value) * 100, 1),
                })

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

            result = {
                "devices": devices,
                "os": os_data,
                "languages": languages,
                "cities": cities,
                "countries": countries,
            }
            self._set_to_cache(cache_key, result)
            return result
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
        
        cache_key = f"acquisition:{start_date}:{end_date}:{property_id or 'default'}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data: return cached_data
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

            # 來源 / 媒介明細 (含所屬管道群組以支援前端下鑽篩選)
            source_response = self._run_report(
                dimensions=["sessionDefaultChannelGrouping", "sessionSource", "sessionMedium"],
                metrics=["sessions", "totalUsers", "newUsers", "engagementRate", "averageSessionDuration"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=50,
                property_id=property_id,
            )
            source_medium = []
            for row in source_response.rows:
                source_medium.append({
                    "channelGroup": row.dimension_values[0].value,
                    "source": row.dimension_values[1].value,
                    "medium": row.dimension_values[2].value,
                    "sessions": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                    "newUsers": int(row.metric_values[2].value),
                    "engagementRate": round(float(row.metric_values[3].value) * 100, 1),
                    "avgDuration": round(float(row.metric_values[4].value), 0),
                })

            # --- ç¤¾ç¾¤å¹³èºè AI æå°/å°è©±æµé (AEO) ---
            social_platforms = {
                "facebook.com": "Facebook", "l.facebook.com": "Facebook",
                "m.facebook.com": "Facebook", "fb.com": "Facebook",
                "line.me": "LINE", "lm.facebook.com": "Facebook",
                "instagram.com": "Instagram", "l.instagram.com": "Instagram",
                "youtube.com": "YouTube", "m.youtube.com": "YouTube",
                "twitter.com": "Twitter/X", "t.co": "Twitter/X",
                "linkedin.com": "LinkedIn", "threads.net": "Threads",
            }
            ai_platforms = {
                "chatgpt.com": "ChatGPT", "openai.com": "ChatGPT",
                "perplexity.ai": "Perplexity", "anthropic.com": "Claude",
                "claude.ai": "Claude", "gemini.google.com": "Gemini",
            }
            
            social_agg: dict[str, int] = {}
            ai_agg = {}

            for row in source_response.rows:
                # 0: Channel Group, 1: Source
                channel_raw = row.dimension_values[0].value.lower()
                source_raw = row.dimension_values[1].value.lower()
                sessions = int(row.metric_values[0].value)
                users = int(row.metric_values[1].value)
                eng_rate = round(float(row.metric_values[3].value) * 100, 1)

                # èçç¤¾ç¾¤æµé
                if source_raw in social_platforms:
                    p = social_platforms[source_raw]
                    social_agg[p] = social_agg.get(p, 0) + sessions
                elif channel_raw in social_platforms:
                    p = social_platforms[channel_raw]
                    social_agg[p] = social_agg.get(p, 0) + sessions

                # èç AI æµé
                matched_ai = None
                for key, name in ai_platforms.items():
                    if key in source_raw:
                        matched_ai = name
                        break
                
                if matched_ai:
                    if matched_ai not in ai_agg:
                        ai_agg[matched_ai] = {"sessions": 0, "users": 0, "engagementRate": 0, "count": 0}
                    ai_agg[matched_ai]["sessions"] += sessions
                    ai_agg[matched_ai]["users"] += users
                    ai_agg[matched_ai]["engagementRate"] += eng_rate
                    ai_agg[matched_ai]["count"] += 1

            social = sorted(
                [{"platform": k, "sessions": v} for k, v in social_agg.items()],
                key=lambda x: x["sessions"], reverse=True
            )

            # è¨ç® AI åå¹³èºå¹³ååèç
            ai_traffic = []
            for platform, stats in ai_agg.items():
                ai_traffic.append({
                    "platform": platform,
                    "sessions": stats["sessions"],
                    "users": stats["users"],
                    "engagementRate": round(stats["engagementRate"] / stats["count"], 1) if stats["count"] > 0 else 0
                })
            ai_traffic = sorted(ai_traffic, key=lambda x: x["sessions"], reverse=True)

            result = {
                "channels": channels,
                "sourceMedium": source_medium,
                "social": social,
                "aiTraffic": ai_traffic,
            }
            self._set_to_cache(cache_key, result)
            return result

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
        
        cache_key = f"content:{start_date}:{end_date}:{property_id or 'default'}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data: return cached_data
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

            result = {
                "pages": pages,
                "landingPages": landing_pages,
            }
            self._set_to_cache(cache_key, result)
            return result
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
        
        cache_key = f"engagement:{start_date}:{end_date}:{property_id or 'default'}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data: return cached_data
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

        # --- 每小時流量分佈（改為多日對比） ---
        hourly = []
        try:
            hourly_response = self._run_report(
                dimensions=["date", "hour"],
                metrics=["sessions"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"), desc=True)],
                property_id=property_id,
            )
            # 聚合為 { hour: { date: sessions } }
            hourly_data_map: dict[str, dict[str, int]] = {f"{h:02d}:00": {} for h in range(24)}
            
            # 找出最近的 3 個日期
            available_dates = sorted(list(set(row.dimension_values[0].value for row in hourly_response.rows)), reverse=True)[:3]
            
            for row in hourly_response.rows:
                d = row.dimension_values[0].value
                if d not in available_dates:
                    continue
                # 格式化日期為 MM/DD
                d_label = f"{d[4:6]}/{d[6:8]}"
                h = f"{int(row.dimension_values[1].value):02d}:00"
                s = int(row.metric_values[0].value)
                hourly_data_map[h][d_label] = s
            
            # 轉換為前端所需的結構：[ { hour: "00:00", "03/31": 10, "04/01": 20 }, ... ]
            for h in sorted(hourly_data_map.keys()):
                row_data = {"hour": h}
                row_data.update(hourly_data_map[h])
                hourly.append(row_data)
        except Exception as e:
            logger.warning(f"GA4 每小時多日流量查詢失敗（跳過）: {e}")

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

        # --- 區塊瀏覽排行 (按 section_name 分類) ---
        sections = []
        try:
            # 排除 (not set) 與空值，過濾掉非區塊追蹤的雜訊
            not_set_filter = FilterExpression(
                not_expression=FilterExpression(
                    or_group=FilterExpressionList(
                        expressions=[
                            FilterExpression(
                                filter=Filter(
                                    field_name="customEvent:section_name",
                                    string_filter=Filter.StringFilter(value="(not set)")
                                )
                            ),
                            FilterExpression(
                                filter=Filter(
                                    field_name="customEvent:section_name",
                                    string_filter=Filter.StringFilter(value="")
                                )
                            ),
                        ]
                    )
                )
            )

            # NOTE: 查詢帶有 section_name 的事件資料
            section_response = self._run_report(
                dimensions=["customEvent:section_name"],
                metrics=["eventCount", "totalUsers"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="eventCount"), desc=True)],
                dimension_filter=not_set_filter,
                limit=15,
                property_id=property_id,
            )
            sections = [
                {
                    "name": row.dimension_values[0].value if row.dimension_values[0].value != "(not set)" else "未命名區塊",
                    "count": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                }
                for row in section_response.rows
            ]
        except Exception as e:
            logger.warning(f"GA4 區塊排行查詢失敗 (可能是未設定 section_name 自訂維度): {e}")

        # --- 追蹤健康檢測 (Tracking Health) ---
        tracking_health = {
            "total_events": 0,
            "not_set_count": 0,
            "not_set_ratio": 0.0,
            "healthy_count": 0,
            "healthy_ratio": 0.0,
        }
        try:
            # 抓取包含 (not set) 的所有數據以計算比例
            health_response = self._run_report(
                dimensions=["customEvent:section_name"],
                metrics=["eventCount"],
                date_ranges=date_ranges,
                limit=1000,
                property_id=property_id,
            )
            
            total_events = 0
            not_set_count = 0
            for row in health_response.rows:
                count = int(row.metric_values[0].value)
                total_events += count
                val = row.dimension_values[0].value
                if val == "(not set)" or val == "":
                    not_set_count += count
            
            if total_events > 0:
                tracking_health["total_events"] = total_events
                tracking_health["not_set_count"] = not_set_count
                tracking_health["not_set_ratio"] = round(not_set_count / total_events, 4)
                tracking_health["healthy_count"] = total_events - not_set_count
                tracking_health["healthy_ratio"] = round((total_events - not_set_count) / total_events, 4)
        except Exception as e:
            logger.warning(f"GA4 追蹤健康檢測查詢失敗: {e}")

        result = {
            "events": events,
            "sections": sections,
            "weekday": weekday,
            "hourly": hourly,
            "hourlyByDate": hourly_by_date,
            "tracking_health": tracking_health,
        }
        self._set_to_cache(cache_key, result)
        return result

    # ----- 6. Tech 技術分析報表 -----

    def fetch_tech_report(self, start_date: str = "30daysAgo", end_date: str = "today", property_id: str | None = None) -> dict:
        """
        取得技術分析報表，包含瀏覽器與螢幕解析度。

        Returns:
            格式對齊前端：
            { browsers: BrowserData[], screens: ScreenData[] }
        """
        logger.info(f"📱 取得 Tech 技術分析報表 ({start_date} ~ {end_date})...")
        
        cache_key = f"tech:{start_date}:{end_date}:{property_id or 'default'}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data: return cached_data
        date_ranges = [DateRange(start_date=start_date, end_date=end_date)]

        try:
            # 1. 瀏覽器分佈
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

            # 2. 螢幕解析度分佈
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

            # 3. 疑似爬蟲/機器人流量分析
            # 查詢 瀏覽器 + 作業系統，用來匹配常見爬蟲特徵
            bot_response = self._run_report(
                dimensions=["browser", "operatingSystem"],
                metrics=["totalUsers", "sessions", "engagementRate"],
                date_ranges=date_ranges,
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=20,
                property_id=property_id,
            )
            
            # 定義爬蟲特徵關鍵字
            BOT_KEYWORDS = [
                "headless", "bot", "crawl", "spider", "python", "http-client", 
                "java", "postman", "ahrefs", "semrush", "petalbot", "dotbot",
                "screaming frog", "bingbot", "googlebot", "yandex", "baiduspider"
            ]
            
            bots = []
            for row in bot_response.rows:
                browser = row.dimension_values[0].value.lower()
                os_name = row.dimension_values[1].value.lower()
                
                # 識別原因
                reasons = []
                if any(kw in browser for kw in BOT_KEYWORDS):
                    reasons.append("瀏覽器特徵")
                if any(kw in os_name for kw in BOT_KEYWORDS):
                    reasons.append("系統特徵")
                
                # 如果是 (not set) 且參與率極低也標記為疑似
                engagement_rate = float(row.metric_values[2].value)
                if (browser == "(not set)" or os_name == "(not set)") and engagement_rate < 0.05:
                    reasons.append("匿名來源+極低參與")
                
                if reasons:
                    bots.append({
                        "name": f"{row.dimension_values[0].value} / {row.dimension_values[1].value}",
                        "users": int(row.metric_values[0].value),
                        "sessions": int(row.metric_values[1].value),
                        "engagementRate": round(engagement_rate * 100, 1),
                        "reason": " + ".join(reasons)
                    })

            result = {
                "browsers": browsers,
                "screens": screens,
                "bots": bots
            }
            self._set_to_cache(cache_key, result)
            return result
        except Exception as e:
            logger.error(f"GA4 技術分析報表查詢失敗: {e}")
            raise e


    def get_traffic_anomaly_data(self, property_id: str | None = None) -> dict | None:
        """
        [偵測異常] 比較「今日至今」與「昨日」的使用者數。

        如果昨日無流量（例如新站），則跳過。
        預期回傳包含百分比與原始數據的 dict。
        """
        prop_id = property_id or self.property_id
        
        # 取得今天與昨天的 KPI
        # 使用專有的 DateRange 確保精準
        today_range = DateRange(start_date="today", end_date="today")
        yesterday_range = DateRange(start_date="yesterday", end_date="yesterday")
        
        try:
            # 查詢今日
            today_res = self._run_report(
                dimensions=[],
                metrics=["totalUsers"],
                date_ranges=[today_range],
                property_id=prop_id
            )
            today_users = int(today_res.rows[0].metric_values[0].value) if today_res.rows else 0
            
            # 查詢昨日
            yesterday_res = self._run_report(
                dimensions=[],
                metrics=["totalUsers"],
                date_ranges=[yesterday_range],
                property_id=prop_id
            )
            yesterday_users = int(yesterday_res.rows[0].metric_values[0].value) if yesterday_res.rows else 0
            
            if yesterday_users == 0:
                return None
                
            drop_percent = round((yesterday_users - today_users) / yesterday_users * 100, 1)
            
            return {
                "property_id": prop_id,
                "today_users": today_users,
                "yesterday_users": yesterday_users,
                "drop_percent": drop_percent,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"偵測流量異常時發生錯誤: {e}")
            return None

ga_service = GAService()
