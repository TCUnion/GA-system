# n8n 自動化通知系統配置指南

本專案所有的 n8n 工作流均需遵循以下規範。

---

## 1. [TCU]-[GA4-每日報表]-[定時任務]
**類別**: 生產環境 (Production)
**用途**: 每天早晨 9:00 從 Supabase 讀取 GA4 報表快取，並透過 LINE 機器人推送到指定群組。

### 📋 Sticky Note 內容 (畫布說明)
> [!NOTE]
> **觸發條件**: Cron (每天 09:00 Taipei Time)
> **資料來源**: Supabase `ga4_cache`表
> **重要邏輯**: 
> 1. 選取 `report_type = 'overview'`。
> 2. 將 `data` 欄位解構成可讀格式（如訪客數、頁面瀏覽量）。
> 3. 計算並顯示更新時間。
> **已知限制**: Supabase 每個小時寫入一次快取，請確保讀取時間與後端同步。

---

## 2. [TCU]-[n8n-自動備份]-[GitHub]
**類別**: 管理任務 (Admin)
**用途**: 定期執行，將 n8n 中的工作流備份至 GitHub。

### 📋 Sticky Note 內容 (畫布說明)
> [!NOTE]
> **觸發條件**: Cron (每週一次或每日凌晨 02:00)
> **動作**:
> 1. 呼叫 n8n 自有的 API `GET /workflows`。
> 2. 將結果寫入 GitHub 專案的 `/n8n/workflows` 目錄下。
> **憑證管理**: 需準備 `n8n-api-key` 與 `GitHub-PAT`。

---

## 3. [TCU]-[GA4-異常告警]-[Webhook]
**類別**: 生產環境 (Production)
**用途**: 接收後端發出的流量異常信號，並即時推送 LINE 通知。

### 📋 Sticky Note 內容 (畫布說明)
> [!NOTE]
> **觸發條件**: Webhook (POST `ga4-anomaly`)
> **URL**: `https://service.criterium.tw/webhook/ga4-anomaly`
> **動作**:
> 1. 接收後端組裝的 JSON（含 `drop_percent`, `project_name`）。
> 2. 發送 LINE 通報給管理員進行排查。
> **已知限制**: 後端設有 1 小時冷卻期，避免頻繁發送。

---

## 4. 部署建議

1. **認證 (Credentials)**:
   - 在 n8n 中手動建立 **Supabase** 憑證（具備 `ga4_cache` 的讀取權限）。
   - 手動建立 **LINE** 憑證（使用 Channel Access Token）。
2. **導入流程**:
   - 將我為您生成的 JSON 內容複製，並在 n8n 畫布中直接貼上即可自動生成節點。

---

## 4. 目錄結構
```text
/n8n
  /workflows
    /production
      - ga4-daily-report.json
      - backup-to-github.json
  /docs
    - GUIDE.md (此文件)
```
