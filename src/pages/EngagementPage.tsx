import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { eventData, weekdayData, hourlyData } from '../data/mockData';

/**
 * 參與分析頁面
 * 分析使用者的事件觸發、每週流量分佈和每小時流量模式
 */

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];

// NOTE: 找出最大事件數做為進度條參考
const maxEventCount = Math.max(...eventData.map((e) => e.eventCount));

const eventColumns: Column<typeof eventData[0]>[] = [
  {
    key: 'eventName',
    label: '事件名稱',
    render: (val) => (
      <code style={{
        background: 'rgba(255,255,255,0.06)',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.8rem',
      }}>
        {val as string}
      </code>
    ),
  },
  {
    key: 'eventCount',
    label: '觸發次數',
    align: 'right',
    render: (val) => {
      const v = val as number;
      const pct = (v / maxEventCount) * 100;
      return (
        <div className="bar-cell">
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${pct}%`, background: '#a855f7' }} />
          </div>
          <span className="bar-value">{v.toLocaleString('zh-TW')}</span>
        </div>
      );
    },
  },
  {
    key: 'users',
    label: '使用者數',
    align: 'right',
    render: (val) => (val as number).toLocaleString('zh-TW'),
  },
];

function EngagementPage() {
  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>⚡ 參與分析</h1>
        <p>了解使用者的行為模式和互動頻率</p>
      </div>

      {/* 每週 + 每小時 */}
      <div className="grid-2">
        <ChartCard title="每週流量分佈" subtitle="星期一到星期日的工作階段數">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} />
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
              <Bar dataKey="sessions" name="工作階段" radius={[6, 6, 0, 0]} barSize={36}>
                {weekdayData.map((_, index) => (
                  <Cell key={index} fill={index >= 5 ? CHART_COLORS[1] : CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="每小時流量模式" subtitle="24 小時的工作階段分佈">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="hourGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value)}
                contentStyle={{
                  background: 'hsl(222, 44%, 12%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                name="工作階段"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#hourGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 事件明細 */}
      <ChartCard title="事件觸發明細" subtitle="各事件的觸發次數和觸及使用者數">
        <DataTable columns={eventColumns} data={eventData} />
      </ChartCard>
    </div>
  );
}

export default EngagementPage;
