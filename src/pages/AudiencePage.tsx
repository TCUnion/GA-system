import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import TaiwanMap from '../components/TaiwanMap';
import { useGA4Data } from '../hooks/useGA4Data';
import { getDeviceData, getOsData, getCityData, getLanguageData, aggregateToCounties, getCountryData } from '../services/ga4Service';
import PageLoader from '../components/PageLoader';
import type { CityData, CountyData, CountryData } from '../services/ga4Service';
import { useMemo } from 'react';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

const countyColumns: Column<CountyData>[] = [
  { key: 'name', label: '縣市', render: (_v, row, i) => (<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''} flex-shrink-0`}>{i + 1}</span><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: 'var(--text-primary)' }}>{row.name}</div></div>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
];

const cityColumns: Column<CityData>[] = [
  { key: 'city', label: '城市 (市區)', render: (_v, row, i) => (<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className={`rank-cell flex-shrink-0`}>{i + 1}</span><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: 'var(--text-primary)' }}>{row.city}</div></div>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'sessions', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => { const n = v as number; return <span className={n >= 65 ? 'rate-high' : n >= 50 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
];

const countryColumns: Column<CountryData>[] = [
  { key: 'name', label: '國家', render: (_v, row, i) => (<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''} flex-shrink-0`}>{i + 1}</span><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: 'var(--text-primary)' }}>{row.name}</div></div>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'sessions', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => { const n = v as number; return <span className={n >= 65 ? 'rate-high' : n >= 50 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
];

function AudiencePage() {
  const { data: devices, loading: L1 } = useGA4Data(getDeviceData, []);
  const { data: os, loading: L2 } = useGA4Data(getOsData, []);
  const { data: cities, loading: L3 } = useGA4Data(getCityData, []);
  const { data: languages, loading: L4 } = useGA4Data(getLanguageData, []);
  const { data: countries, loading: L5 } = useGA4Data(getCountryData, []);

  // 將城市資料聚合為台灣縣市資料
  const countyData = useMemo(() => aggregateToCounties(cities), [cities]);

  const isLoading = L1 || L2 || L3 || L4 || L5;

  return (
    <div className="relative min-h-[500px]">
      {isLoading && <PageLoader />}
      <div className={`page-grid transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="page-header">
        <h1>
          {/* NOTE: SVG 使用者群組圖示取代 👥 emoji */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          使用者分析
        </h1>
        <p>了解你的使用者輪廓、地區分佈和裝置偏好</p>
      </div>

      <div className="grid-2">
        <ChartCard title="裝置類型" subtitle="依裝置類別區分的使用者數">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={devices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={fmt} contentStyle={ts} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
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
            <Tooltip formatter={fmt} contentStyle={ts} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="users" name="使用者" radius={[6, 6, 0, 0]} barSize={40}>{os.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mt-8">
        <ChartCard title="國家分佈" subtitle="各國使用者所在地上層排行">
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            <DataTable columns={countryColumns} data={countries} />
          </div>
        </ChartCard>
      </div>

      <div className="grid-2 mt-8">
        <TaiwanMap data={countyData} />
        <ChartCard title="縣市分佈" subtitle="各縣市地理位置排行數據">
          <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
            <DataTable columns={countyColumns} data={countyData} />
          </div>
        </ChartCard>
      </div>
      
      <div className="mt-8">
        <ChartCard title="城市分佈 (細分市區)" subtitle="所有基層城市及市區的使用者排行數據">
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            <DataTable columns={cityColumns} data={cities} />
          </div>
        </ChartCard>
      </div>
      </div>
    </div>
  );
}

export default AudiencePage;
