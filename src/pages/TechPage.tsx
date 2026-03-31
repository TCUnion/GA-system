import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { getDeviceData, getBrowserData, getScreenData } from '../services/ga4Service';
import type { BrowserData, ScreenData } from '../services/ga4Service';
import { deviceData as fb1, browserData as fb2, screenData as fb3 } from '../data/mockData';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

const browserColumns: Column<BrowserData>[] = [
  { key: 'name', label: '瀏覽器', render: (v, _r, i) => (<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''}`}>{i + 1}</span>{v as string}</span>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'sessions', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => { const n = v as number; return <span className={n >= 65 ? 'rate-high' : n >= 50 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
];

const screenColumns: Column<ScreenData>[] = [
  { key: 'resolution', label: '螢幕解析度', render: (v, _r, i) => (<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''}`}>{i + 1}</span><code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem' }}>{v as string}</code></span>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
];

function TechPage() {
  const { data: devices } = useGA4Data(getDeviceData, fb1);
  const { data: browsers } = useGA4Data(getBrowserData, fb2);
  const { data: screens } = useGA4Data(getScreenData, fb3);

  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>
          {/* NOTE: SVG 手機圖示取代 📱 emoji */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          技術分析
        </h1>
        <p>了解使用者使用的裝置、瀏覽器和螢幕解析度</p>
      </div>

      <div className="grid-2">
        <ChartCard title="裝置類型分佈" subtitle="手機 / 桌機 / 平板佔比">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={devices} dataKey="users" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3}>
                {devices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="瀏覽器分佈" subtitle="依使用者數排序">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={browsers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Bar dataKey="users" name="使用者" radius={[0, 6, 6, 0]} barSize={22}>{browsers.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid-2">
        <ChartCard title="瀏覽器明細" subtitle="各瀏覽器的參與率比較">
          <DataTable columns={browserColumns} data={browsers} />
        </ChartCard>
        <ChartCard title="螢幕解析度 Top 10" subtitle="使用者最常見的螢幕解析度">
          <DataTable columns={screenColumns} data={screens} />
        </ChartCard>
      </div>
    </div>
  );
}

export default TechPage;
