/**
 * 共用圖表樣式工具
 * 避免各頁面重複定義相同的 Recharts tooltip 樣式
 */

/** Recharts Tooltip contentStyle 共用樣式 */
export const tooltipStyle = {
  background: 'hsl(222, 44%, 12%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: 12,
} as const;
