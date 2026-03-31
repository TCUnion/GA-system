import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import HourlyHeatmap from '../components/HourlyHeatmap';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { getEventData, getWeekdayData, getHourlyData, getHourlyByDateData } from '../services/ga4Service';
import type { EventData } from '../services/ga4Service';
import { eventData as fb1, weekdayData as fb2, hourlyData as fb3, hourlyByDateData as fb4 } from '../data/mockData';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

function EngagementPage() {
  const { data: events } = useGA4Data(getEventData, fb1);
  const { data: weekday } = useGA4Data(getWeekdayData, fb2);
  const { data: hourly } = useGA4Data(getHourlyData, fb3);
  const { data: hourlyByDate } = useGA4Data(getHourlyByDateData, fb4);

  const maxEventCount = Math.max(...events.map((e) => e.eventCount), 1);

  const eventColumns: Column<EventData>[] = [
    { key: 'eventName', label: '事件名稱', render: (v) => (<code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem' }}>{v as string}</code>) },
    { key: 'eventCount', label: '觸發次數', align: 'right', render: (v) => { const n = v as number; return (<div className="bar-cell"><div className="bar-track"><div className="bar-fill" style={{ width: `${(n / maxEventCount) * 100}%`, background: '#a855f7' }} /></div><span className="bar-value">{n.toLocaleString('zh-TW')}</span></div>); } },
    { key: 'users', label: '使用者數', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  ];

  return (
    <div className="page-grid">
      <div className="page-header"><h1>⚡ 參與分析</h1><p>了解使用者的行為模式和互動頻率</p></div>
      <div className="grid-2">
        <ChartCard title="每週流量分佈" subtitle="星期一到星期日的工作階段數">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Bar dataKey="sessions" name="工作階段" radius={[6, 6, 0, 0]} barSize={36}>{weekday.map((_, i) => <Cell key={i} fill={i >= 5 ? CHART_COLORS[1] : CHART_COLORS[0]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="每小時流量模式" subtitle="24 小時的工作階段總覽">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourly}>
              <defs><linearGradient id="hourGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={fmt} contentStyle={ts} />
              <Area type="monotone" dataKey="sessions" name="工作階段" stroke="#a855f7" strokeWidth={2} fill="url(#hourGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="每小時流量模式（依日期分類）" subtitle="X 軸 = 小時　Y 軸 = 日期　顏色深淺 = 工作階段數">
        <HourlyHeatmap data={hourlyByDate} />
      </ChartCard>

      <ChartCard title="事件觸發明細" subtitle="各事件的觸發次數和觸及使用者數">
        <DataTable columns={eventColumns} data={events} />
      </ChartCard>
    </div>
  );
}

export default EngagementPage;
