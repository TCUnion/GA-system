import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { channelData, sourceMediumData, socialData } from '../data/mockData';

/**
 * 流量來源分析頁面
 * 分析流量管道、來源/媒介明細和社群媒體表現
 */

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];

// NOTE: 來源/媒介表格欄位定義
const smColumns: Column<typeof sourceMediumData[0]>[] = [
  {
    key: 'source',
    label: '來源 / 媒介',
    render: (_val, row) => (
      <span>
        <strong>{row.source}</strong>
        <span style={{ color: 'hsl(215, 15%, 45%)', margin: '0 4px' }}>/</span>
        <span style={{ color: 'hsl(215, 20%, 65%)' }}>{row.medium}</span>
      </span>
    ),
  },
  {
    key: 'sessions',
    label: '工作階段',
    align: 'right',
    render: (val) => (val as number).toLocaleString('zh-TW'),
  },
  {
    key: 'users',
    label: '使用者',
    align: 'right',
    render: (val) => (val as number).toLocaleString('zh-TW'),
  },
  {
    key: 'newUsers',
    label: '新使用者',
    align: 'right',
    render: (val) => (val as number).toLocaleString('zh-TW'),
  },
  {
    key: 'engagementRate',
    label: '參與率',
    align: 'right',
    render: (val) => {
      const v = val as number;
      const cls = v >= 65 ? 'rate-high' : v >= 50 ? 'rate-medium' : 'rate-low';
      return <span className={cls}>{v.toFixed(1)}%</span>;
    },
  },
  {
    key: 'avgDuration',
    label: '平均停留',
    align: 'right',
    render: (val) => {
      const v = val as number;
      const m = Math.floor(v / 60);
      const s = v % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    },
  },
];

function AcquisitionPage() {
  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>🔗 流量來源分析</h1>
        <p>了解使用者從哪些管道來到你的網站</p>
      </div>

      {/* 管道圓餅圖 + 管道長條圖 */}
      <div className="grid-2">
        <ChartCard title="管道分佈" subtitle="各流量管道的工作階段佔比">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={channelData}
                dataKey="sessions"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
              >
                {channelData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value)}
                contentStyle={{
                  background: 'hsl(222, 44%, 12%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="社群媒體流量" subtitle="各社群平台帶來的工作階段">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={socialData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="platform" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value)}
                contentStyle={{
                  background: 'hsl(222, 44%, 12%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sessions" name="工作階段" radius={[0, 6, 6, 0]} barSize={24}>
                {socialData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 來源/媒介明細表格 */}
      <ChartCard title="來源 / 媒介明細" subtitle="完整的流量來源與對應表現指標">
        <DataTable columns={smColumns} data={sourceMediumData} />
      </ChartCard>
    </div>
  );
}

export default AcquisitionPage;
