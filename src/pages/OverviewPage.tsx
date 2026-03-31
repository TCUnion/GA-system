import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ScoreCard from '../components/ScoreCard';
import ChartCard from '../components/ChartCard';
import { useGA4Data } from '../hooks/useGA4Data';
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
 * 從後端 API 依照全局選擇的日期區間拉取 GA4 資料
 */

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (v: any) => typeof v === 'number' ? v.toLocaleString('zh-TW') : String(v);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

// NOTE: KPI 圖示 SVG 映射表，對應 mockData.ts 中的 iconKey
const KPI_ICONS: Record<string, React.ReactNode> = {
  views: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  newUsers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  engagement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  duration: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  sessions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
};

interface KpiCardRowProps {
  data: typeof fallbackKpi;
}

const KpiCardRow = ({ data }: KpiCardRowProps) => {
  return (
    <div className="kpi-grid">
      {data.map((kpi, i) => (
        <ScoreCard
          key={i}
          label={kpi.label}
          value={kpi.value}
          previousValue={kpi.previousValue}
          format={kpi.format}
          icon={KPI_ICONS[kpi.iconKey] ?? null}
        />
      ))}
    </div>
  );
};

function OverviewPage() {
  const { data: kpi, loading: kpiLoading } = useGA4Data(getOverviewKpi, fallbackKpi);
  const { data: traffic } = useGA4Data(getDailyTraffic, fallbackTraffic);
  const { data: channels } = useGA4Data(getChannelData, fallbackChannel);
  const { data: devices } = useGA4Data(getDeviceData, fallbackDevice);

  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>
          {/* NOTE: SVG 圓餅圖圖示取代 📊 emoji */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
          總覽儀表板
        </h1>
        <p>掌握網站整體流量表現與核心指標</p>
      </div>

      {kpiLoading ? (
        <div className="kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="score-card loading-skeleton" />
          ))}
        </div>
      ) : (
        <KpiCardRow data={kpi} />
      )}

      <ChartCard title="每日流量趨勢" subtitle="所選期間的每日使用者與工作階段數">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={traffic}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip formatter={fmt} contentStyle={ts} />
            <Line type="monotone" dataKey="users" name="使用者" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="sessions" name="工作階段" stroke="#22c997" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid-2">
        <ChartCard title="流量管道分佈" subtitle="各流量管道的工作階段佔比">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={channels} dataKey="sessions" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {channels.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="裝置分佈" subtitle="各裝置類型的使用者佔比">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={devices} dataKey="users" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {devices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export default OverviewPage;
