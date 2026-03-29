import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { deviceData, osData, cityData, languageData } from '../data/mockData';

/**
 * 使用者分析頁面
 * 分析使用者的裝置、作業系統、城市和語言分佈
 */

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];

// NOTE: 城市表格的欄位定義
const cityColumns: Column<typeof cityData[0]>[] = [
  {
    key: 'city',
    label: '城市',
    render: (_val, _row, index) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`rank-cell ${index < 3 ? 'top-3' : ''}`}>{index + 1}</span>
        {_row.city}
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

function AudiencePage() {
  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>👥 使用者分析</h1>
        <p>了解你的使用者輪廓、地區分佈和裝置偏好</p>
      </div>

      {/* 裝置 + 語言 */}
      <div className="grid-2">
        <ChartCard title="裝置類型" subtitle="依裝置類別區分的使用者數">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value)}
                contentStyle={{
                  background: 'hsl(222, 44%, 12%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="users" name="使用者" radius={[0, 6, 6, 0]} barSize={28}>
                {deviceData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="語言分佈" subtitle="使用者瀏覽器語言設定">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={languageData}
                dataKey="users"
                nameKey="language"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
              >
                {languageData.map((_, index) => (
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
      </div>

      {/* 作業系統 */}
      <ChartCard title="作業系統分佈" subtitle="使用者作業系統佔比">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={osData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value)}
              contentStyle={{
                background: 'hsl(222, 44%, 12%)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="users" name="使用者" radius={[6, 6, 0, 0]} barSize={40}>
              {osData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 城市排行 */}
      <ChartCard title="Top 10 城市" subtitle="使用者數量最多的城市排行">
        <DataTable columns={cityColumns} data={cityData} />
      </ChartCard>
    </div>
  );
}

export default AudiencePage;
