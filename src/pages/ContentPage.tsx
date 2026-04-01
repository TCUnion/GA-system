import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { getPageData, getLandingPageData, getDailyTraffic } from '../services/ga4Service';
import PageLoader from '../components/PageLoader';
import type { PageData } from '../services/ga4Service';

const CHART_COLORS = ['#3b82f6', '#22c997'];
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

function ContentPage() {
  const { data: pages, loading: L1 } = useGA4Data(getPageData, []);
  const { data: landing, loading: L2 } = useGA4Data(getLandingPageData, []);
  const { data: traffic, loading: L3 } = useGA4Data(getDailyTraffic, []);

  const isLoading = L1 || L2 || L3;

  const maxViews = Math.max(...pages.map((p) => p.views), 1);

  const pageColumns: Column<PageData>[] = [
    { key: 'pageTitle', label: '頁面', render: (_v, row, i) => (<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''} flex-shrink-0`}>{i + 1}</span><div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: 'var(--text-primary)' }}>{row.pageTitle}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{row.pagePath}</div></div></div>) },
    { key: 'views', label: '瀏覽量', align: 'right', render: (v) => { const n = v as number; return (<div className="bar-cell"><div className="bar-track"><div className="bar-fill" style={{ width: `${(n / maxViews) * 100}%` }} /></div><span className="bar-value">{n.toLocaleString('zh-TW')}</span></div>); } },
    { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
    { key: 'avgDuration', label: '平均停留', align: 'right', render: (v) => { const n = v as number; return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`; } },
    { key: 'bounceRate', label: '跳出率', align: 'right', render: (v) => { const n = v as number; return <span className={n <= 25 ? 'rate-high' : n <= 40 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
  ];

  const landingColumns: Column<PageData>[] = [
    { key: 'pageTitle', label: '到達頁面', render: (_v, row, i) => (<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''} flex-shrink-0`}>{i + 1}</span><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: 'var(--text-primary)' }}>{row.pageTitle}</div></div>) },
    { key: 'views', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
    { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
    { key: 'bounceRate', label: '跳出率', align: 'right', render: (v) => { const n = v as number; return <span className={n <= 25 ? 'rate-high' : n <= 40 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
  ];

  return (
    <div className="relative min-h-[500px]">
      {isLoading && <PageLoader />}
      <div className={`page-grid transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="page-header">
        <h1>
          {/* NOTE: SVG 文件圖示取代 📄 emoji */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          內容分析
        </h1>
        <p>了解哪些頁面最受歡迎，以及使用者的瀏覽行為</p>
      </div>

      <ChartCard title="頁面瀏覽趨勢" subtitle="所選期間的每日瀏覽量與工作階段數">
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
  </div>
  );
}

export default ContentPage;
