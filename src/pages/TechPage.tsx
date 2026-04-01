import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import PageLoader from '../components/PageLoader';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { getDeviceData, getBrowserData, getScreenData, getBotData } from '../services/ga4Service';
import type { BrowserData, ScreenData, BotData } from '../services/ga4Service';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

const browserColumns: Column<BrowserData>[] = [
  { key: 'name', label: '瀏覽器', render: (v, _r, i) => (<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''} flex-shrink-0`}>{i + 1}</span><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: 'var(--text-primary)' }}>{v as string}</div></div>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'sessions', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => { const n = v as number; return <span className={n >= 65 ? 'rate-high' : n >= 50 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
];

const screenColumns: Column<ScreenData>[] = [
  { key: 'resolution', label: '螢幕解析度', render: (v, _r, i) => (<div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}><span className={`rank-cell ${i < 3 ? 'top-3' : ''} flex-shrink-0`}>{i + 1}</span><code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v as string}</code></div>) },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
];

const botColumns: Column<BotData>[] = [
  { key: 'name', label: '來源 (瀏覽器 / 作業系統)', render: (v) => <div className="font-mono text-xs opacity-80">{v as string}</div> },
  { key: 'reason', label: '識別特徵', render: (v) => <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-medium border border-amber-500/20">{v as string}</span> },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => <span className="text-red-400 font-medium">{v as number}%</span> },
];

function TechPage() {
  const { data: devices, loading: L1 } = useGA4Data(getDeviceData, []);
  const { data: browsers, loading: L2 } = useGA4Data(getBrowserData, []);
  const { data: screens, loading: L3 } = useGA4Data(getScreenData, []);
  const { data: bots, loading: L4 } = useGA4Data(getBotData, []);

  const isLoading = L1 || L2 || L3 || L4;

  return (
    <div className="relative min-h-[500px]">
      {isLoading && <PageLoader />}
      <div className={`page-grid transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="page-header">
          <h1>
            {/* NOTE: SVG 手機圖示取代 📱 emoji */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            技術分析
          </h1>
          <p>了解使用者使用的裝置、瀏覽器和螢幕解析度</p>
        </div>

        <div className="grid-2">
          <ChartCard title="裝置類型分佈" subtitle="手機 / 桌機 / 平板佔比">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={devices} dataKey="users" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3}>
                  {devices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={fmt} contentStyle={ts} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="瀏覽器分佈" subtitle="依使用者數排序">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={browsers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={fmt} contentStyle={ts} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar dataKey="users" name="使用者" radius={[0, 6, 6, 0]} barSize={22}>{browsers.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="grid-2">
          <ChartCard title="瀏覽器明細" subtitle="各瀏覽器的參與率比較">
            <DataTable columns={browserColumns} data={browsers} />
          </ChartCard>
          <ChartCard title="螢幕解析度 Top 10" subtitle="使用者最常見的螢幕解析度">
            <DataTable columns={screenColumns} data={screens} />
          </ChartCard>
        </div>
        
        {bots && bots.length > 0 && (
          <div className="mt-6">
            <ChartCard 
              title="疑似自動化 / 爬蟲流量分析" 
              subtitle="識別異常低參與率或帶有 Bot 標籤的流量來源 (部分爬蟲可能導致地理定位失效為「未知地區」)"
            >
              <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  提醒：此列表根據瀏覽器標籤 (User Agent) 與參與度行為進行初步識別。自動化流量通常具有極低的參與率，且由於不帶有真實位置資訊，常被歸類為「(未知地區)」。建議在分析轉換數據時排除此類流量。
                </p>
              </div>
              <DataTable columns={botColumns} data={bots} />
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default TechPage;
