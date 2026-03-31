import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ScoreCard from '../components/ScoreCard';
import ChartCard from '../components/ChartCard';
import { useGA4Data } from '../hooks/useGA4Data';
import { useConnection } from '../contexts/ConnectionContext';
import {
  getOverviewKpi, getDailyTraffic, getChannelData, getDeviceData,
} from '../services/ga4Service';
import {
  kpiData as fallbackKpi,
  dailyTrafficData as fallbackTraffic,
  channelData as fallbackChannel,
  deviceData as fallbackDevice,
} from '../data/mockData';

/**
 * 總覽頁面
 * 從 Supabase 讀取 GA4 快取資料，失敗時 fallback 到模擬數據
 */

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];

const tooltipStyle = {
  background: 'hsl(222, 44%, 12%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: 12,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="hsl(215, 20%, 65%)" textAnchor={x > cx ? 'start' : 'end'} fontSize={11} dominantBaseline="central">
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatTooltipValue = (value: any) =>
  typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="custom-tooltip-item">
          <span className="custom-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <span className="custom-tooltip-value">
            {typeof entry.value === 'number' ? entry.value.toLocaleString('zh-TW') : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function OverviewPage() {
  const { dateRange } = useConnection();
  const args = { startDate: dateRange.startDate, endDate: dateRange.endDate };

  const { data: kpi, loading: kpiLoading } = useGA4Data(() => getOverviewKpi(args), fallbackKpi, [dateRange.startDate, dateRange.endDate]);
  const { data: traffic } = useGA4Data(() => getDailyTraffic(args), fallbackTraffic, [dateRange.startDate, dateRange.endDate]);
  const { data: channels } = useGA4Data(() => getChannelData(args), fallbackChannel, [dateRange.startDate, dateRange.endDate]);
  const { data: devices } = useGA4Data(() => getDeviceData(args), fallbackDevice, [dateRange.startDate, dateRange.endDate]);

  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>📊 總覽儀表板</h1>
        <p>過去 30 天的網站表現摘要</p>
      </div>

      {/* KPI 計分卡列 */}
      <div className="grid-6">
        {kpiLoading ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'hsl(215, 20%, 55%)' }}>
            載入中...
          </div>
        ) : (
          kpi.map((k) => <ScoreCard key={k.label} {...k} />)
        )}
      </div>

      {/* 流量趨勢折線圖 */}
      <ChartCard title="流量趨勢" subtitle="過去 30 天使用者與瀏覽量變化">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={traffic}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={2} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            <Line type="monotone" dataKey="users" name="使用者" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: CHART_COLORS[0] }} />
            <Line type="monotone" dataKey="views" name="瀏覽量" stroke={CHART_COLORS[1]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: CHART_COLORS[1] }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 管道 + 裝置 */}
      <div className="grid-2">
        <ChartCard title="流量管道來源" subtitle="依管道分類的工作階段佔比">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={channels} dataKey="sessions" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={renderCustomLabel}>
                {channels.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="裝置類型分佈" subtitle="使用者的裝置類別佔比">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={devices} dataKey="users" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} label={renderCustomLabel} labelLine={false}>
                {devices.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export default OverviewPage;
