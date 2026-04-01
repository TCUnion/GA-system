import WebsiteHeatmap from '../components/WebsiteHeatmap';
import type { HeatmapDataPoint } from '../components/WebsiteHeatmap';
import ChartCard from '../components/ChartCard';

// 模擬資料：假設這是從 GA4 事件回傳的使用者互動座標/區塊熱度
const MOCK_HEATMAP_DATA: HeatmapDataPoint[] = [
  // --- 1. 頂部導覽列 Navbar (y: 35~80) ---
  { x: 20, y: 50, value: 150 },   // Logo
  { x: 60, y: 45, value: 200 },   // 選單項目: 賽事資訊
  { x: 70, y: 45, value: 180 },   // 選單項目: 報名辦法
  { x: 80, y: 45, value: 150 },   // 選單項目: 特約商店
  { x: 92, y: 45, value: 600 },   // 右側「立即報名」大按鈕

  // --- 2. 主視覺 Hero Banner (y: 300~800) ---
  { x: 50, y: 400, value: 850 },  // 主視覺中心停留點擊
  { x: 50, y: 700, value: 950 },  // Hero 區下方可能有的向下捲動/報名提示

  // --- 3. 最新消息 News (y: 1200~1600) ---
  { x: 50, y: 1300, value: 300 }, // 最新消息標題/第一則消息
  { x: 40, y: 1450, value: 250 }, // 第二則消息
  { x: 60, y: 1550, value: 180 }, // 第三則消息

  // --- 4. 賽事路線與海拔 Map & Elevation (y: 2000~3500) ---
  { x: 30, y: 2200, value: 450 }, // 路線圖左側互動 (放大/縮小)
  { x: 70, y: 2250, value: 380 }, // 路線圖右側互動
  { x: 50, y: 2800, value: 500 }, // 下載 GPX / 路線詳情按鈕
  { x: 50, y: 3200, value: 200 }, // 海拔高度圖表檢視

  // --- 5. 報名物資與紀念衫尺寸 Merch & Clothing (y: 4000~5500) ---
  { x: 50, y: 4200, value: 650 }, // 紀念衫顏色展示
  { x: 35, y: 4350, value: 320 }, // 衣服尺寸表點擊
  { x: 65, y: 4350, value: 280 }, // 衣服設計細節
  { x: 50, y: 5000, value: 400 }, // 運動毛巾展示
  { x: 50, y: 5300, value: 350 }, // 水壺/號碼布說明

  // --- 6. 完賽好禮 Finish Gifts (y: 6000~6800) ---
  { x: 50, y: 6200, value: 480 }, // 完賽獎牌展示
  { x: 50, y: 6600, value: 250 }, // 完賽證書範例

  // --- 7. 賽事資訊與分組 Event Info & Groups (y: 7200~8800) ---
  { x: 25, y: 7500, value: 550 }, // 分組一 (挑戰組) 價格與細節
  { x: 75, y: 7500, value: 500 }, // 分組二 (休閒組) 價格與細節
  { x: 50, y: 8100, value: 300 }, // 報名資格限制
  { x: 50, y: 8500, value: 450 }, // 活動時程表 (行程表)

  // --- 8. 報名辦法 Registration Rules (y: 9200~10800) ---
  { x: 50, y: 9500, value: 200 }, // 報名流程說明
  { x: 20, y: 10200, value: 150 },// 退費規則
  { x: 80, y: 10500, value: 120 },// 注意事項展開

  // --- 9. 交通指引與接駁車 Transportation & Shuttle (y: 11200~12500) ---
  { x: 40, y: 11500, value: 380 },// 接駁車班次表
  { x: 60, y: 11700, value: 420 },// 預約接駁車連結
  { x: 50, y: 12200, value: 280 },// 停車場位置指引

  // --- 10. 周邊住宿 Accommodation (y: 13000~14500) ---
  { x: 25, y: 13500, value: 350 },// 住宿方案 A 點擊
  { x: 50, y: 13500, value: 310 },// 住宿方案 B 點擊
  { x: 75, y: 13500, value: 290 },// 住宿方案 C 點擊
  { x: 50, y: 14200, value: 400 },// 「看更多周邊住宿」按鈕

  // --- 11. 特約商店 / 景點 Partners & Spots (y: 15000~16800) ---
  { x: 30, y: 15500, value: 250 },// 特約美食地圖
  { x: 70, y: 15500, value: 220 },// 伴手禮推薦
  { x: 50, y: 16200, value: 300 },// 優惠活動下載/查看詳情

  // --- 12. 常見問題 FAQ (y: 17200~18500) ---
  { x: 50, y: 17500, value: 500 },// FAQ Q1 展開
  { x: 50, y: 17700, value: 450 },// FAQ Q2 展開
  { x: 50, y: 17900, value: 300 },// FAQ Q3 展開
  { x: 50, y: 18100, value: 200 },// FAQ Q4 展開

  // --- 13. 贊助品牌 Sponsors (y: 19000~20000) ---
  { x: 20, y: 19500, value: 150 },// 冠名/主辦單位連結
  { x: 50, y: 19500, value: 100 },// 協辦單位
  { x: 80, y: 19500, value: 90 }, // 贊助商品牌連結

  // --- 14. 頁尾 Footer (y: 20200~20600) ---
  { x: 30, y: 20400, value: 120 },// FB 粉絲頁圖示
  { x: 50, y: 20400, value: 180 },// LINE 官方客服
  { x: 70, y: 20400, value: 80 }, // Email 聯絡信箱
  { x: 50, y: 20550, value: 50 }, // 隱私權政策/服務條款
].map(point => ({ ...point, y: Math.round(point.y * (26388 / 20705)) }));

function HeatmapPage() {

  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>
          {/* SVG Radar/Map 圖示 */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <path d="M22 12A10 10 0 1 0 12 22a10 10 0 0 0 10-10z" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
          </svg>
          網頁互動熱點圖 (Simulated)
        </h1>
        <p>以視覺化方式呈現使用者在網站上的互動點擊熱區，輔助您了解哪些版面區塊最吸引目光。</p>
      </div>

      <ChartCard 
        title="南庄山水悠遊行 - 首頁熱點分佈" 
        subtitle="使用模擬數據渲染網頁點擊熱區。您可以滾動下方視窗檢視整體頁面熱度。"
      >
        <WebsiteHeatmap 
          data={MOCK_HEATMAP_DATA} 
        />
      </ChartCard>
    </div>
  );
}

export default HeatmapPage;
