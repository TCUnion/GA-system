import type { ReactNode } from 'react';
import './ChartCard.css';

/**
 * ChartCard 圖表容器元件
 * 統一的圖表外框設計，包含標題和可選操作區
 *
 * @param title - 圖表標題
 * @param subtitle - 副標題說明
 * @param children - 圖表內容
 * @param style - 額外的行內樣式
 */

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

function ChartCard({ title, subtitle, children, style }: ChartCardProps) {
  return (
    <div className="chart-card glass-card" style={style}>
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          {subtitle && <div className="chart-card-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}

export default ChartCard;
