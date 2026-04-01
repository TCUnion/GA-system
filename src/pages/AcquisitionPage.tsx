import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { getChannelData, getSourceMediumData, getSocialData } from '../services/ga4Service';
import type { SourceMediumData } from '../services/ga4Service';
import { channelData as fb1, sourceMediumData as fb2, socialData as fb3 } from '../data/mockData';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

const smColumns: Column<SourceMediumData>[] = [
  { key: 'source', label: '來源 / 媒介', render: (_v, row) => (<div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>{row.source}</strong><span style={{ color: 'hsl(215, 15%, 45%)', margin: '0 4px' }}>/</span><span style={{ color: 'hsl(215, 20%, 65%)' }}>{row.medium}</span></div></div>) },
  { key: 'sessions', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'newUsers', label: '新使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => { const n = v as number; return <span className={n >= 65 ? 'rate-high' : n >= 50 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
  { key: 'avgDuration', label: '平均停留', align: 'right', render: (v) => { const n = v as number; return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`; } },
];

function AcquisitionPage() {
  const { data: channels } = useGA4Data(getChannelData, fb1);
  const { data: sm } = useGA4Data(getSourceMediumData, fb2);
  const { data: social } = useGA4Data(getSocialData, fb3);

  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>
          {/* NOTE: SVG 連結圖示取代 🔗 emoji */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          流量來源分析
        </h1>
        <p>了解使用者從哪些管道來到你的網站</p>
      </div>

      <div className="grid-2">
        <ChartCard title="管道分佈" subtitle="各流量管道的工作階段佔比">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={channels} dataKey="sessions" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {channels.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="社群媒體流量" subtitle="各社群平台帶來的工作階段">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={social} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="platform" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Bar dataKey="sessions" name="工作階段" radius={[0, 6, 6, 0]} barSize={24}>{social.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="來源 / 媒介明細" subtitle="完整的流量來源與對應表現指標">
        <DataTable columns={smColumns} data={sm} />
      </ChartCard>
    </div>
  );
}

export default AcquisitionPage;
