# 南庄山水 GA4 數據儀表板

精美的 GA4 數據分析儀表板，使用 React + TypeScript 打造，深色主題搭配玻璃擬態設計風格。

## 功能頁面

| 頁面 | 說明 |
|---|---|
| 📊 總覽 | 6 個 KPI 卡片 + 流量趨勢 + 管道分佈 + 裝置佔比 |
| 👥 使用者分析 | 裝置 / 語言 / OS / 城市分佈 |
| 🔗 流量來源 | 管道圓餅圖 + 社群流量 + 來源明細表 |
| 📄 內容分析 | 熱門頁面排行 + 到達頁面 + 瀏覽趨勢 |
| ⚡ 參與分析 | 每週 / 每小時流量 + 事件明細 |
| 📱 技術分析 | 瀏覽器 / 螢幕解析度 |

## 技術架構

- **前端框架：** React 19 + TypeScript
- **建置工具：** Vite 8
- **圖表庫：** Recharts
- **路由：** React Router DOM v7
- **樣式：** Vanilla CSS（深色主題 + Glassmorphism）

## 快速開始

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev

# 建置正式版
npm run build
```

## 專案結構

```
src/
├── components/          # 共用元件
│   ├── Layout.tsx       # 側邊欄 + 頂部導覽
│   ├── ScoreCard.tsx    # KPI 計分卡
│   ├── ChartCard.tsx    # 圖表容器
│   └── DataTable.tsx    # 資料表格
├── pages/               # 頁面元件
│   ├── OverviewPage.tsx
│   ├── AudiencePage.tsx
│   ├── AcquisitionPage.tsx
│   ├── ContentPage.tsx
│   ├── EngagementPage.tsx
│   └── TechPage.tsx
├── data/
│   └── mockData.ts      # 模擬 GA4 數據
├── index.css            # 全域設計系統
├── App.tsx              # 路由設定
└── main.tsx             # 入口
```

## 後續規劃

- [ ] 串接真實 GA4 Data API（FastAPI 後端）
- [ ] 定時快取機制（每 30 分鐘更新）
- [ ] 日期範圍互動篩選
- [ ] PDF / CSV 匯出功能
- [ ] 部署至 Vercel 或 Cloud Run
