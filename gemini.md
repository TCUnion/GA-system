# 南庄山水 GA4 儀表板 (Nanzhuang Landscape GA4 Dashboard) - 專案狀態與開發知識庫

此文件（`gemini.md`）用於記錄專案目前的架構設計、部署狀態、以及後續 AI 開發時需要遵循的脈絡，以確保前後端一致性與正確的環境變數設定。

## 1. 系統架構現況
目前系統已完成「資料拉取 -> 快取 -> 前端展示」的完整 MVP 閉環，並成功支援雲端分離部署。

*   **前端 (Frontend)**
    *   **技術棧**: React + Vite + Tailwind CSS + Recharts。
    *   **資料來源**: 直接透過 `@supabase/supabase-js` 讀取 Supabase 中的快取表（`ga4_cache`, `ga4_daily_snapshot`）。
    *   **認證**: 使用 `VITE_SUPABASE_ANON_KEY` 與前端 RLS (Row Level Security) 防護（若有設定表權限）。
*   **後端 (Backend)**
    *   **技術棧**: Python 3.10+ + FastAPI + APScheduler + Google Analytics Data API v1beta。
    *   **核心功能**:
        *   在背景透過 `APScheduler` 每 30 分鐘自動對 GA4 發出請求。
        *   使用 `SUPABASE_SERVICE_ROLE_KEY` 強制將報表寫入 Supabase 達到快取目的。
        *   實作「優雅停止」(FastAPI Lifespan) 以確保伺服器關閉時排程不會中斷關鍵交易。
*   **資料庫 (Database)**
    *   **服務**: Supabase (託管於 Zeabur 等環境)，提供 PostgreSQL 儲存。
    *   **資料表結構**:
        *   `ga4_cache`: 儲存 `overview`, `audience`, `acquisition` 等最新覆蓋報表（以 `report_type` 為 PK）。
        *   `ga4_daily_snapshot`: 儲存包含前向比對的歷史每日快照（以 `snapshot_date` 為 PK）。

## 2. 部署規劃 (Zeabur)
目前前後端已完全解耦，適合在 Zeabur 建立兩個獨立的服務：

*   **後端部署**:
    *   使用 `zbpack.json` 聲明啟動腳本：`uvicorn main:app --host 0.0.0.0 --port 8080`
    *   因 GCP 不適合在公有雲放實體 JSON 檔，實作了 **Base64 憑證環境變數機制**。
    *   已設定 `CORSMiddleware` (allow_origins=["*"]) 確保跨域沒問題。
*   **前端部署**:
    *   標準的 Node.js/Vite 靜態頁面部署，將 Root Directory 指向 `/`。

## 3. 環境變數清單 (Environment Variables)

### 🔴 後端 (FastAPI - `.env` 或 Zeabur Variables)
不得將這些密鑰暴露給前端或存入 Git 中。
*   `GA_PROPERTY_ID`: 目標 GA4 Property ID。
*   `SUPABASE_URL`: Supabase 專案連結。
*   `SUPABASE_SERVICE_ROLE_KEY`: （敏感）用於無視 RLS 寫入快取資料。
*   `GOOGLE_CREDENTIALS_BASE64`: （敏感）供雲端環境使用的 GCP 服務帳戶 Base64 編碼字串。（當設定時，會覆蓋 `GOOGLE_APPLICATION_CREDENTIALS`）
*   `GOOGLE_APPLICATION_CREDENTIALS`: 本地除錯時使用的 `credentials/xxx.json` 實體檔案路徑（與 Base64 擇一使用）。
*   `SYNC_INTERVAL_MINUTES`: （可選）排程頻率，預設為 30。

### 🔵 前端 (Vite - `.env` 或 Zeabur Variables)
*   `VITE_SUPABASE_URL`: 供 supabase-js 初始化使用。
*   `VITE_SUPABASE_ANON_KEY`: 供 supabase-js 初始化使用，允許匿名讀取（須配合正確的 RLS）。
*   `VITE_API_URL`: 已綁定為 `https://tcuga4api.zeabur.app`，若前端未來新增「手動同步」按鈕，可用此對接後端。

## 4. 待辦與未來規劃 (TODO / Next Steps)

1. **圖表開發與綁定**: 前端 UI 開發 Date Range Picker（日期範圍選擇），不過因為快取是 30 天寫死，後續需評估是否由前端發 API 給後端即時拉取任意區間的資料。
2. **安全性優化**:
    *   設定並啟用 Supabase Table 的 RLS 策略：`ENABLE ROW LEVEL SECURITY;`。
    *   將前端的 `allow_origins=["*"]` 限制為正式部署的網域。
3. **錯誤處理 (n8n 備案)**: 若未來有更複雜的錯誤警報機制，或是要寄送報表到 LINE，可接入 n8n 工作流，並由後端拋出 Webhook。
