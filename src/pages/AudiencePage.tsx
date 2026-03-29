import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { getDeviceData, getOsData, getCityData, getLanguageData } from '../services/ga4Service';
import type { CityData } from '../services/ga4Service';
import { deviceData as fb1, osData as fb2, cityData as fb3, languageData as fb4 } from '../data/mockData';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

const cityColumns: Column<CityData>[] = [
  { key: 'city', label: '城市', render: (_v, row, i) => (<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''}`}>{i + 1}</span>{row.city}</span>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'sessions', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => { const n = v as number; return <span className={n >= 65 ? 'rate-high' : n >= 50 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
];

function AudiencePage() {
  const { data: devices } = useGA4Data(getDeviceData, fb1);
  const { data: os } = useGA4Data(getOsData, fb2);
  const { data: cities } = useGA4Data(getCityData, fb3);
  const { data: languages } = useGA4Data(getLanguageData, fb4);

  return (
    <div className="page-grid">
      <div className="page-header"><h1>👥 使用者分析</h1><p>了解你的使用者輪廓、地區分佈和裝置偏好</p></div>
      <div className="grid-2">
        <ChartCard title="裝置類型" subtitle="依裝置類別區分的使用者數">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={devices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Bar dataKey="users" name="使用者" radius={[0, 6, 6, 0]} barSize={28}>{devices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="語言分佈" subtitle="使用者瀏覽器語言設定">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={languages} dataKey="users" nameKey="language" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                {languages.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="作業系統分佈" subtitle="使用者作業系統佔比">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={os}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip formatter={fmt} contentStyle={ts} />
            <Bar dataKey="users" name="使用者" radius={[6, 6, 0, 0]} barSize={40}>{os.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Top 10 城市" subtitle="使用者數量最多的城市排行">
        <DataTable columns={cityColumns} data={cities} />
      </ChartCard>
    </div>
  );
}

export default AudiencePage;
