import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import PageLoader from '../components/PageLoader';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { getChannelData, getSourceMediumData, getSocialData, getAiTrafficData } from '../services/ga4Service';
import type { SourceMediumData } from '../services/ga4Service';
import { tooltipStyle as ts } from '../utils/chartStyles';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);

const smColumns: Column<SourceMediumData>[] = [
  { key: 'source', label: '來源 / 媒介', render: (_v, row) => (<div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>{row.source}</strong><span style={{ color: 'hsl(215, 15%, 45%)', margin: '0 4px' }}>/</span><span style={{ color: 'hsl(215, 20%, 65%)' }}>{row.medium}</span></div></div>) },
  { key: 'sessions', label: '工作階段', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'users', label: '使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'newUsers', label: '新使用者', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  { key: 'engagementRate', label: '參與率', align: 'right', render: (v) => { const n = v as number; return <span className={n >= 65 ? 'rate-high' : n >= 50 ? 'rate-medium' : 'rate-low'}>{n.toFixed(1)}%</span>; } },
  { key: 'avgDuration', label: '平均停留', align: 'right', render: (v) => { const n = v as number; return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`; } },
];

function AcquisitionPage() {
  const { data: channels, loading: L1 } = useGA4Data(getChannelData, []);
  const { data: sm, loading: L2 } = useGA4Data(getSourceMediumData, []);
  const { data: social, loading: L3 } = useGA4Data(getSocialData, []);
  const { data: aiTraffic, loading: L4 } = useGA4Data(getAiTrafficData, []);

  const isLoading = L1 || L2 || L3 || L4;

  // NOTE: 記錄目前選取的管道名稱，用於篩選下方表格
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);

  const totalSessions = channels.reduce((acc, c) => acc + c.sessions, 0);
  // 帶入 total 給 renderActiveShape 計算百分比
  const channelsWithTotal = channels.map(c => ({ ...c, total: totalSessions }));

  // 點擊圓餅圖區塊：切換篩選，再次點擊同一塊則取消
  const handlePieClick = (_: unknown, index: number) => {
    if (activePieIndex === index) {
      setActiveChannel(null);
      setActivePieIndex(undefined);
    } else {
      setActiveChannel(channels[index]?.name ?? null);
      setActivePieIndex(index);
    }
  };

  // 根據選取的管道篩選來源/媒介資料
  const filteredSm = activeChannel
    ? sm.filter(row => row.channelGroup === activeChannel)
    : sm;

  const tableTitle = activeChannel
    ? `來源 / 媒介明細 — 篩選：${activeChannel}`
    : '來源 / 媒介明細';

  const tableSubtitle = activeChannel
    ? `顯示「${activeChannel}」管道的所有流量來源（共 ${filteredSm.length} 筆），點擊圓餅圖同一區塊可取消篩選`
    : '點擊上方圓餅圖任一管道區塊，可下鑽查看該管道的詳細來源';

  return (
    <div className="relative min-h-[500px]">
      {isLoading && <PageLoader />}
      <div className={`page-grid transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="page-header">
          <h1>
            {/* NOTE: SVG 連結圖示取代 🔗 emoji */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            流量來源分析
          </h1>
          <p>了解使用者從哪些管道來到你的網站</p>
        </div>

        <div className="grid-2">
          <ChartCard title="管道分佈" subtitle={activeChannel ? `已選取：${activeChannel}，再次點選可取消篩選` : '點擊區塊可篩選下方來源/媒介表格'}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={channelsWithTotal}
                  dataKey="sessions"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  onClick={handlePieClick}
                  style={{ cursor: 'pointer' }}
                >
                  {channelsWithTotal.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      opacity={activePieIndex !== undefined && activePieIndex !== i ? 0.35 : 1}
                      stroke={activePieIndex === i ? 'white' : 'transparent'}
                      strokeWidth={activePieIndex === i ? 2 : 0}
                      style={{ transition: 'opacity 0.2s, stroke 0.2s', filter: activePieIndex === i ? `drop-shadow(0 0 6px ${CHART_COLORS[i % CHART_COLORS.length]})` : 'none' }}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={fmt} contentStyle={ts} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="社群媒體流量" subtitle="各社群平台帶來的工作階段">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={social} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="platform" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={fmt} contentStyle={ts} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar dataKey="sessions" name="工作階段" radius={[0, 6, 6, 0]} barSize={24}>{social.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* --- AI 搜尋/對話流量 (AEO) --- */}
        <div className="grid-2 mt-6">
          <ChartCard 
            title="AI 搜尋 / 對話流量 (AEO)" 
            subtitle="來自 ChatGPT, Perplexity, Claude 等 AI 平台的訪客點擊"
          >
            {aiTraffic.length > 0 ? (
              <div className="flex flex-col h-full">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-blue-400/60 uppercase font-bold tracking-wider mb-1">AI 總工作階段</div>
                    <div className="text-xl font-bold text-blue-100">{aiTraffic.reduce((acc, curr) => acc + curr.sessions, 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-purple-400/60 uppercase font-bold tracking-wider mb-1">AI 獨立使用者</div>
                    <div className="text-xl font-bold text-purple-100">{aiTraffic.reduce((acc, curr) => acc + curr.users, 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-emerald-400/60 uppercase font-bold tracking-wider mb-1">平均參與率</div>
                    <div className="text-xl font-bold text-emerald-100">
                      {(aiTraffic.reduce((acc, curr) => acc + curr.engagementRate, 0) / aiTraffic.length).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex-grow">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={aiTraffic} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="platform" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={fmt} contentStyle={ts} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                      <Bar dataKey="sessions" name="工作階段" radius={[0, 4, 4, 0]} barSize={20}>
                        {aiTraffic.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm italic">
                目前尚無明顯來自 AI 平台的來源數據
              </div>
            )}
          </ChartCard>

          <ChartCard title="AEO 優化建議" subtitle="提升站在 AI 搜尋回答中的被引用率">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-blue-400 font-bold mb-1">1. 結構化資料 (Schema.org)</h4>
                <p className="text-xs leading-relaxed text-slate-400">
                  確保頁面包含 JSON-LD 格式的結構化標記，幫助 AI 爬蟲更精準地抓取專案細節與數據。
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-purple-400 font-bold mb-1">2. 內容摘要與 Q&A</h4>
                <p className="text-xs leading-relaxed text-slate-400">
                  在頁面頂部提供簡短的執行摘要，並針對常見問題提供直接的回答，增加被 AI 選為來源的機率。
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-emerald-400 font-bold mb-1">3. 定期更新 OpenGraph</h4>
                <p className="text-xs leading-relaxed text-slate-400">
                  AI 顯示結果時常會抓取 OG 預覽圖與描述，保持這些資訊與最新數據同步至關重要。
                </p>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* NOTE: 篩選狀態提示列 */}
        {activeChannel && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 16px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'hsl(215, 80%, 75%)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>目前篩選管道：<strong>{activeChannel}</strong>，共 {filteredSm.length} 筆來源/媒介</span>
            <button
              onClick={() => { setActiveChannel(null); setActivePieIndex(undefined); }}
              style={{
                marginLeft: 'auto',
                padding: '3px 10px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '4px',
                color: 'hsl(215, 80%, 80%)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              × 清除篩選
            </button>
          </div>
        )}

        <ChartCard title={tableTitle} subtitle={tableSubtitle}>
          <DataTable columns={smColumns} data={filteredSm} />
        </ChartCard>
      </div>
    </div>
  );
}

export default AcquisitionPage;
