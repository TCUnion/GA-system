import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { deviceData, browserData, screenData } from '../data/mockData';

/**
 * 技術分析頁面
 * 分析使用者的裝置、瀏覽器和螢幕解析度分佈
 */

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];

const browserColumns: Column<typeof browserData[0]>[] = [
  {
    key: 'name',
    label: '瀏覽器',
    render: (val, _row, index) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`rank-cell ${index < 3 ? 'top-3' : ''}`}>{index + 1}</span>
        {val as string}
      </span>
    ),
  },
  {
    key: 'users',
    label: '使用者',
    align: 'right',
    render: (val) => (val as number).toLocaleString('zh-TW'),
  },
  {
    key: 'sessions',
    label: '工作階段',
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
];

const screenColumns: Column<typeof screenData[0]>[] = [
  {
    key: 'resolution',
    label: '螢幕解析度',
    render: (val, _row, index) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`rank-cell ${index < 3 ? 'top-3' : ''}`}>{index + 1}</span>
        <code style={{
          background: 'rgba(255,255,255,0.06)',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: '0.8rem',
        }}>
          {val as string}
        </code>
      </span>
    ),
  },
  {
    key: 'users',
    label: '使用者',
    align: 'right',
    render: (val) => (val as number).toLocaleString('zh-TW'),
  },
];

function TechPage() {
  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>📱 技術分析</h1>
        <p>了解使用者使用的裝置、瀏覽器和螢幕解析度</p>
      </div>

      {/* 裝置圓餅 + 瀏覽器長條 */}
      <div className="grid-2">
        <ChartCard title="裝置類型分佈" subtitle="手機 / 桌機 / 平板佔比">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={deviceData}
                dataKey="users"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
              >
                {deviceData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index]} />
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

        <ChartCard title="瀏覽器分佈" subtitle="依使用者數排序">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={browserData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip
                formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value)}
                contentStyle={{
                  background: 'hsl(222, 44%, 12%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="users" name="使用者" radius={[0, 6, 6, 0]} barSize={22}>
                {browserData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 瀏覽器明細 + 螢幕解析度 */}
      <div className="grid-2">
        <ChartCard title="瀏覽器明細" subtitle="各瀏覽器的參與率比較">
          <DataTable columns={browserColumns} data={browserData} />
        </ChartCard>

        <ChartCard title="螢幕解析度 Top 10" subtitle="使用者最常見的螢幕解析度">
          <DataTable columns={screenColumns} data={screenData} />
        </ChartCard>
      </div>
    </div>
  );
}

export default TechPage;
