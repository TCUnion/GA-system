import { useMemo } from 'react';
import './HourlyHeatmap.css';

export interface HourlyByDateRow {
  date: string;
  label: string;    // MM/DD 格式
  hours: number[];  // 長度 24，索引對應 0-23 時
  isWeekend?: boolean;
}

interface HourlyHeatmapProps {
  data: HourlyByDateRow[];
}

/**
 * 每小時 × 日期熱力圖
 *
 * X 軸 = 0-23 小時
 * Y 軸 = 日期（依時間順序由上到下）
 * 顏色深淺 = 工作階段數量
 */
export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  // 每 3 小時顯示一個刻度標籤
  const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
    i % 3 === 0 ? `${i.toString().padStart(2, '0')}` : ''
  );

  const maxVal = useMemo(() => {
    let m = 0;
    data.forEach((row) => row.hours.forEach((v) => { if (v > m) m = v; }));
    return m || 1;
  }, [data]);

  /**
   * 根據數值百分比產生顏色
   * 從深紫 (低流量) → 亮紫/白 (高流量)
   */
  const getColor = (val: number): string => {
    const pct = val / maxVal;
    if (pct === 0) return 'rgba(255,255,255,0.03)';

    // 紫色系漸層: 低流量深紫 → 高流量亮紫
    const r = Math.round(85 + pct * 105);
    const g = Math.round(20 + pct * 20);
    const b = Math.round(200 + pct * 55);
    const alpha = 0.20 + pct * 0.80;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const formatTooltip = (label: string, hour: number, sessions: number) =>
    `${label}  ${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00\n工作階段: ${sessions.toLocaleString('zh-TW')}`;

  // 最多顯示 14 列（若超過則只取最近幾天）
  const maxRows = 14;
  const displayData = data.length > maxRows ? data.slice(-maxRows) : data;

  if (!data || data.length === 0) {
    return (
      <div className="heatmap-empty">
        <span>暫無資料</span>
      </div>
    );
  }

  return (
    <div className="heatmap-wrapper">
      {/* 小時 X 軸標籤 */}
      <div className="heatmap-x-axis">
        <div className="heatmap-y-label-spacer" />
        {HOUR_LABELS.map((label, i) => (
          <div key={i} className="heatmap-x-tick">
            {label}
          </div>
        ))}
      </div>

      {/* 主要網格區域 */}
      <div className="heatmap-grid-area">
        {displayData.map((row) => (
          <div key={row.date} className="heatmap-row">
            {/* Y 軸日期標籤 */}
            <div className={`heatmap-y-label ${row.isWeekend ? 'is-weekend' : ''}`}>
              {row.label}
            </div>

            {/* 24 個色塊 */}
            {row.hours.map((val, h) => (
              <div
                key={h}
                className="heatmap-cell"
                style={{ background: getColor(val) }}
                title={formatTooltip(row.label, h, val)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 圖例 Legend */}
      <div className="heatmap-legend">
        <span className="legend-label">低</span>
        <div className="legend-gradient" />
        <span className="legend-label">高流量</span>
        <span className="legend-max">{maxVal.toLocaleString('zh-TW')}</span>
      </div>
    </div>
  );
}
