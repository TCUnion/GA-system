import { useMemo } from 'react';
import WebsiteHeatmap from '../components/WebsiteHeatmap';
import type { HeatmapDataPoint } from '../components/WebsiteHeatmap';
import ChartCard from '../components/ChartCard';
import PageLoader from '../components/PageLoader';
import { useGA4Data } from '../hooks/useGA4Data';
import { getEventData } from '../services/ga4Service';

// 手動將 GA4 預先定義的事件對應到網頁上的相對座標，以達到不需埋設熱力圖工具的模擬。
// (X 百分比，Y 在原 49966 長度基礎上的虛擬像素)
const EVENT_COORDS_MAP: Record<string, { x: number, y: number }[]> = {
  // 互動與點擊：分散綁定於重要按鈕
  'click': [
    { x: 92, y: 45 },      // 右側立即報名大按鈕
    { x: 50, y: 2800 },    // 路線詳情
    { x: 50, y: 4200 },    // 紀念衫顏色
    { x: 25, y: 7500 },    // 分組一
    { x: 75, y: 7500 },    // 分組二
    { x: 60, y: 11700 },   // 預約接駁車
    { x: 50, y: 14200 },   // 周邊住宿
  ],
  
  // 報名與轉換
  'form_start': [{ x: 50, y: 9500 }],
  'form_submit': [{ x: 50, y: 9500 }],
  
  // 下載或檢視
  'file_download': [{ x: 50, y: 2800 }], // 下載 GPX
  'view_promotion': [{ x: 30, y: 15500 }, { x: 70, y: 15500 }],
};

function HeatmapPage() {
  const { data: events, loading } = useGA4Data(getEventData, []);

  // 組裝呈現用的資料
  const heatmapData = useMemo(() => {
    if (!events || events.length === 0) return [];

    const dataPoints: HeatmapDataPoint[] = [];

    events.forEach(event => {
      // 依照需求：「不需要看到滑動的資料」
      if (event.eventName === 'scroll') return;

      const coords = EVENT_COORDS_MAP[event.eventName] || [];
      if (coords.length > 0) {
        // 如果該事件被對應到多個點，將事件總數平分（或者直接全數附加上去製造光熱亮度）
        const valuePerSpot = Math.round(event.eventCount / coords.length);
        
        coords.forEach(c => {
          dataPoints.push({
            x: c.x,
            // 轉換：將虛擬基準 49966 的 Y 座標換算到我們現在實際新切 2 圖的高度 26388 比例中
            y: Math.round(c.y * (26388 / 20705)), 
            value: valuePerSpot,
          });
        });
      }
    });

    return dataPoints;
  }, [events]);

  return (
    <div className="relative min-h-[500px]">
      {loading && <PageLoader />}
      <div className={`page-grid transition-opacity ${loading ? 'opacity-40' : ''}`}>
        <div className="page-header">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
              <path d="M22 12A10 10 0 1 0 12 22a10 10 0 0 0 10-10z" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
            </svg>
            事件互動熱點對應 (Data Integration)
          </h1>
          <p>結合真實的 GA4 核心事件數據與網站重要區塊坐標，直觀了解各項操作的發生頻率與位置。</p>
        </div>

        <ChartCard 
          title="南庄山水悠遊行 - 真實事件分佈" 
          subtitle="各項 GA4 事件發生時的觸發按鈕與版面映射。(過濾滾動資料)"
        >
          {heatmapData.length > 0 ? (
            <WebsiteHeatmap data={heatmapData} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'gray' }}>
              {!loading && "目前日期區間暫無對應的事件熱區資料"}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default HeatmapPage;
