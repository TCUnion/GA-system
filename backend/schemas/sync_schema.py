from pydantic import BaseModel

class SyncResponse(BaseModel):
    """資料同步完成之回應 Schema"""
    status: str
    message: str
    updated_reports: list[str] = []
