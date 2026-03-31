import './ScoreCard.css';

/**
 * ScoreCard 元件
 * 顯示單一 KPI 指標，含比較趨勢
 *
 * @param label - 指標名稱
 * @param value - 目前數值
 * @param previousValue - 前期數值（用於計算變化率）
 * @param format - 數值格式類型
 * @param icon - SVG 圖示節點
 */

interface ScoreCardProps {
  label: string;
  value: number;
  previousValue: number;
  format: 'number' | 'percent' | 'duration' | 'decimal';
  icon: React.ReactNode;
}

// NOTE: 上升趨勢 SVG 箭頭
const ArrowUp = () => (
  <svg className="trend-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 9 6 3 10 9" />
  </svg>
);

// NOTE: 下降趨勢 SVG 箭頭
const ArrowDown = () => (
  <svg className="trend-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 3 6 9 10 3" />
  </svg>
);

function ScoreCard({ label, value, previousValue, format, icon }: ScoreCardProps) {
  // NOTE: 計算與前期的變化百分比
  const hasPreviousData = previousValue > 0;
  const changePercent = hasPreviousData ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = hasPreviousData ? changePercent >= 0 : true;

  /**
   * 根據格式類型，將數值轉為顯示字串
   */
  const formatValue = (val: number): string => {
    switch (format) {
      case 'number':
        return Math.round(val).toLocaleString('zh-TW');
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'duration': {
        const roundedVal = Math.round(val);
        const mins = Math.floor(roundedVal / 60);
        const secs = roundedVal % 60;
        return `${mins}分${secs.toString().padStart(2, '0')}秒`;
      }
      case 'decimal':
        return val.toFixed(2);
      default:
        return String(val);
    }
  };

  return (
    <div className="scorecard glass-card">
      <div className="scorecard-header">
        <span className="scorecard-label">{label}</span>
        {/* NOTE: SVG 圖示透過 scorecard-icon 類別統一控制大小與顏色 */}
        <span className="scorecard-icon">{icon}</span>
      </div>
      <div className="scorecard-value">{formatValue(value)}</div>
      <div className={`scorecard-compare ${isPositive ? 'positive' : 'negative'}`}>
        {!hasPreviousData ? (
          <span className="scorecard-compare-label">無前期資料</span>
        ) : (
          <>
            {isPositive ? <ArrowUp /> : <ArrowDown />}
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
            <span className="scorecard-compare-label">vs 前期</span>
          </>
        )}
      </div>
    </div>
  );
}

export default ScoreCard;
