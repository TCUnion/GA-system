import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { useConnection } from '../contexts/ConnectionContext';
import { getPageData, getLandingPageData, getDailyTraffic } from '../services/ga4Service';
import type { PageData } from '../services/ga4Service';
import { pageData as fb1, landingPageData as fb2, dailyTrafficData as fb3 } from '../data/mockData';

const CHART_COLORS = ['#3b82f6', '#22c997'];
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

function ContentPage() {
  const { dateRange } = useConnection();
  const args = { startDate: dateRange.startDate, endDate: dateRange.endDate };

  const { data: pages } = useGA4Data(() => getPageData(args), fb1, [dateRange.startDate, dateRange.endDate]);
  const { data: landing } = useGA4Data(() => getLandingPageData(args), fb2, [dateRange.startDate, dateRange.endDate]);
  const { data: traffic } = useGA4Data(() => getDailyTraffic(args), fb3, [dateRange.startDate, dateRange.endDate]);

  const maxViews = Math.max(...pages.map((p) => p.views), 1);

  const pageColumns: Column<PageData>[] = [
    { key: 'pageTitle', label: '頁面', render: (_v, row, i) => (<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''}`}>{i + 1}</span><span><div>{row.pageTitle}</div><div style={{ fontSize: '0.7rem', color: 'hsl(215, 15%, 45%)' }}>{row.pagePath}</div></span></span>) },
    { key: 'views', label: '瀏覽量', align: 'right', render: (v) => { const n = v as number; return (<div className="bar-cell"><div className="bar-track"><div className="bar-fill" style={{ width: `${(n / maxViews) * 100}%` }} /></div><span className="bar-value">{n.toLocaleString('zh-TW')}</span></div>); } },
    { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
    { key: 'avgDuration', label: '平均停留', align: 'right', render: (v) => { const n = v as number; return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`; } },
    { key: 'bounceRate', label: '跳出率', align: 'right', render: (v) => { const n = v as number; return <span className={n <= 25 ? 'rate-high' : n <= 40 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
  ];

  const landingColumns: Column<PageData>[] = [
    { key: 'pageTitle', label: '到達頁面', render: (_v, row, i) => (<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''}`}>{i + 1}</span>{row.pageTitle}</span>) },
    { key: 'views', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
    { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
    { key: 'bounceRate', label: '跳出率', align: 'right', render: (v) => { const n = v as number; return <span className={n <= 25 ? 'rate-high' : n <= 40 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
  ];

  return (
    <div className="page-grid">
      <div className="page-header"><h1>📄 內容分析</h1><p>了解哪些頁面最受歡迎，以及使用者的瀏覽行為</p></div>
      <ChartCard title="頁面瀏覽趨勢" subtitle="過去 30 天每日瀏覽量與工作階段數">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={traffic}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip contentStyle={ts} />
            <Line type="monotone" dataKey="views" name="瀏覽量" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="sessions" name="工作階段" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="熱門頁面排行" subtitle="依瀏覽量排序的 Top 10 頁面">
        <DataTable columns={pageColumns} data={pages} />
      </ChartCard>
      <ChartCard title="到達頁面" subtitle="使用者進入網站的第一個頁面">
        <DataTable columns={landingColumns} data={landing} />
      </ChartCard>
    </div>
  );
}

export default ContentPage;
