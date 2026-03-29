import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { pageData, landingPageData, dailyTrafficData } from '../data/mockData';

/**
 * 內容分析頁面
 * 分析熱門頁面、到達頁面和頁面瀏覽趨勢
 */

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899'];

// NOTE: 找出最大瀏覽量做為進度條參考值
const maxViews = Math.max(...pageData.map((p) => p.views));

const pageColumns: Column<typeof pageData[0]>[] = [
  {
    key: 'pageTitle',
    label: '頁面',
    render: (_val, row, index) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`rank-cell ${index < 3 ? 'top-3' : ''}`}>{index + 1}</span>
        <span>
          <div>{row.pageTitle}</div>
          <div style={{ fontSize: '0.7rem', color: 'hsl(215, 15%, 45%)' }}>{row.pagePath}</div>
        </span>
      </span>
    ),
  },
  {
    key: 'views',
    label: '瀏覽量',
    align: 'right',
    render: (val) => {
      const v = val as number;
      const pct = (v / maxViews) * 100;
      return (
        <div className="bar-cell">
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="bar-value">{v.toLocaleString('zh-TW')}</span>
        </div>
      );
    },
  },
  {
    key: 'users',
    label: '使用者',
    align: 'right',
    render: (val) => (val as number).toLocaleString('zh-TW'),
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
  {
    key: 'bounceRate',
    label: '跳出率',
    align: 'right',
    render: (val) => {
      const v = val as number;
      const cls = v <= 25 ? 'rate-high' : v <= 40 ? 'rate-medium' : 'rate-low';
      return <span className={cls}>{v.toFixed(1)}%</span>;
    },
  },
];

const landingColumns: Column<typeof landingPageData[0]>[] = [
  {
    key: 'pageTitle',
    label: '到達頁面',
    render: (_val, row, index) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`rank-cell ${index < 3 ? 'top-3' : ''}`}>{index + 1}</span>
        <span>{row.pageTitle}</span>
      </span>
    ),
  },
  { key: 'views', label: '工作階段', align: 'right' as const, render: (val: unknown) => (val as number).toLocaleString('zh-TW') },
  { key: 'users', label: '使用者', align: 'right' as const, render: (val: unknown) => (val as number).toLocaleString('zh-TW') },
  {
    key: 'bounceRate',
    label: '跳出率',
    align: 'right' as const,
    render: (val: unknown) => {
      const v = val as number;
      const cls = v <= 25 ? 'rate-high' : v <= 40 ? 'rate-medium' : 'rate-low';
      return <span className={cls}>{v.toFixed(1)}%</span>;
    },
  },
];

function ContentPage() {
  return (
    <div className="page-grid">
      <div className="page-header">
        <h1>📄 內容分析</h1>
        <p>了解哪些頁面最受歡迎，以及使用者的瀏覽行為</p>
      </div>

      {/* 頁面瀏覽趨勢 */}
      <ChartCard title="頁面瀏覽趨勢" subtitle="過去 30 天每日瀏覽量與使用者數">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyTrafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              contentStyle={{
                background: 'hsl(222, 44%, 12%)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="views" name="瀏覽量" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="sessions" name="工作階段" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 熱門頁面排行 */}
      <ChartCard title="熱門頁面排行" subtitle="依瀏覽量排序的 Top 10 頁面">
        <DataTable columns={pageColumns} data={pageData} />
      </ChartCard>

      {/* 到達頁面 */}
      <ChartCard title="到達頁面" subtitle="使用者進入網站的第一個頁面">
        <DataTable columns={landingColumns} data={landingPageData} />
      </ChartCard>
    </div>
  );
}

export default ContentPage;
