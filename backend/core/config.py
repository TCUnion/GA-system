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
    載入並驗證應用程式全域環境變數設定
    """
    GA_PROPERTY_ID: str
    GOOGLE_APPLICATION_CREDENTIALS: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8"
    )

settings = Settings()
