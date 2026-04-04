import logging
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# 設定 Logging，依循後端規範
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

class Settings(BaseSettings):
    """
    載入並驗證應用程式全域環境變數設定。

    NOTE: 憑證支援兩種模式：
    1. 本地開發 — 使用 GOOGLE_APPLICATION_CREDENTIALS 指向 JSON 檔案路徑
    2. 雲端部署 — 使用 GOOGLE_CREDENTIALS_BASE64 存放 Base64 編碼的 JSON 內容
    當 GOOGLE_CREDENTIALS_BASE64 存在時優先使用，不需要 JSON 檔案。
    """
    GA_PROPERTY_ID: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # NOTE: 本地開發用，指向 GCP 服務帳戶 JSON 檔案路徑
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None

    # NOTE: 雲端部署用，Base64 編碼的 GCP 服務帳戶 JSON 內容
    GOOGLE_CREDENTIALS_BASE64: str | None = None

    # NOTE: 流量異常告警 Webhook URL (n8n)
    ANOMALY_WEBHOOK_URL: str | None = None

    # NOTE: 排程同步間隔（分鐘），可透過環境變數覆寫，預設每 30 分鐘
    SYNC_INTERVAL_MINUTES: int = 30

    # NOTE: Supabase 快取最大有效期（秒），超過則視為過期，預設 30 分鐘
    REPORTS_CACHE_MAX_AGE_SECONDS: int = 1800

    # NOTE: property_id 記憶體快取 TTL（秒），預設 1 小時
    PROPERTY_ID_CACHE_TTL_SECONDS: int = 3600

    # NOTE: 同步時 GA4 並行取回的最大執行緒數
    SYNC_MAX_WORKERS: int = 4

    # NOTE: GA4 API 單次請求超時（秒）
    GA_API_TIMEOUT_SECONDS: float = 15.0

    # NOTE: GA4 API 暫時性錯誤最大重試次數
    GA_API_MAX_RETRIES: int = 2

    # NOTE: CORS 允許來源白名單，逗號分隔，留空則退回 wildcard（無憑證）
    CORS_ALLOW_ORIGINS: str = ""

    # NOTE: CORS 是否允許攜帶憑證（Cookie/Authorization），wildcard 時強制 False
    CORS_ALLOW_CREDENTIALS: bool = True

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8"
    )

settings = Settings()
