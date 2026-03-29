import './ScoreCard.css';

/**
 * ScoreCard 元件
 * 顯示單一 KPI 指標，含比較趨勢
 *
 * @param label - 指標名稱
 * @param value - 目前數值
 * @param previousValue - 前期數值（用於計算變化率）
 * @param format - 數值格式類型
 * @param icon - 顯示圖示
 */

interface ScoreCardProps {
  label: string;
  value: number;
  previousValue: number;
  format: 'number' | 'percent' | 'duration' | 'decimal';
  icon: string;
}

function ScoreCard({ label, value, previousValue, format, icon }: ScoreCardProps) {
  // NOTE: 計算與前期的變化百分比
  const changePercent = ((value - previousValue) / previousValue) * 100;
  const isPositive = changePercent >= 0;

  /**
   * 根據格式類型，將數值轉為顯示字串
   */
  const formatValue = (val: number): string => {
    switch (format) {
      case 'number':
        return val.toLocaleString('zh-TW');
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'duration': {
        const mins = Math.floor(val / 60);
        const secs = val % 60;
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
        <span className="scorecard-icon">{icon}</span>
      </div>
      <div className="scorecard-value">{formatValue(value)}</div>
      <div className={`scorecard-compare ${isPositive ? 'positive' : 'negative'}`}>
        <span>{isPositive ? '▲' : '▼'}</span>
        <span>{Math.abs(changePercent).toFixed(1)}%</span>
        <span className="scorecard-compare-label">vs 前期</span>
      </div>
    </div>
  );
}

export default ScoreCard;
