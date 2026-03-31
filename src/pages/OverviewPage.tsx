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

interface KpiCardRowProps {
  data: typeof fallbackKpi;
}

const KpiCardRow = ({ data }: KpiCardRowProps) => {
  return (
    <div className="kpi-grid">
      {data.map((kpi, i) => (
        <ScoreCard key={i} {...kpi} />
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
        <h1>📊 總覽儀表板</h1>
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
