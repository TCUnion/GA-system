import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import HourlyHeatmap from '../components/HourlyHeatmap';
import type { Column } from '../components/DataTable';
import { useGA4Data } from '../hooks/useGA4Data';
import { 
  getEventData, getWeekdayData, getHourlyData, 
  getHourlyByDateData, getSectionData, getTrackingHealthData 
} from '../services/ga4Service';
import PageLoader from '../components/PageLoader';
import type { EventData } from '../services/ga4Service';

const CHART_COLORS = ['#3b82f6', '#22c997', '#a855f7', '#f5a623', '#ec4899', '#22d3ee'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (value: any) => typeof value === 'number' ? value.toLocaleString('zh-TW') : String(value);
const ts = { background: 'hsl(222, 44%, 12%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 };

function EngagementPage() {
  const { data: events, loading: L1, error: eventsError } = useGA4Data(getEventData, []);
  const { data: weekday, loading: L2 } = useGA4Data(getWeekdayData, []);
  const { data: hourly, loading: L3 } = useGA4Data(getHourlyData, []);
  const { data: hourlyByDate, loading: L4 } = useGA4Data(getHourlyByDateData, []);
  const { data: sections, loading: L5 } = useGA4Data(getSectionData, []);
  const { data: health, loading: L6 } = useGA4Data(getTrackingHealthData, null);

  const isLoading = L1 || L2 || L3 || L4 || L5 || L6;

  // NOTE: 四個圖表共用同一個 engagement API 端點，
  //       若任一回傳 error，通常表示 GA4 Property 存取失敗或尚無資料
  const hasError = !!eventsError;

  const maxEventCount = Math.max(...events.map((e) => e.eventCount), 1);

  const EVENT_NAMES_ZH: Record<string, string> = {
    'section_view': '區塊瀏覽',
    'page_view': '頁面瀏覽',
    'session_start': '工作階段開始',
    'first_visit': '首次造訪',
    'user_engagement': '使用者參與',
    'registration_open': '開啟報名表單',
    'registration_modal_close': '關閉報名彈窗',
    'outbound_click': '外部連結點擊',
    'scroll': '頁面捲動',
    'click': '一般點擊',
    'video_progress': '影片播放進度',
    'form_start': '開始填寫表單',
    'video_start': '開始播放影片',
    'language_switch': '切換語言'
  };

  const eventColumns: Column<EventData>[] = [
    { 
      key: 'eventName', 
      label: '事件名稱', 
      render: (v) => {
        const name = v as string;
        const zhName = EVENT_NAMES_ZH[name];
        return (
          <div className="flex flex-col gap-1">
            <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', width: 'fit-content' }}>
              {name}
            </code>
            {zhName && <span className="text-xs text-slate-400 ml-1">{zhName}</span>}
          </div>
        );
      }
    },
    { key: 'eventCount', label: '觸發次數', align: 'right', render: (v) => { const n = v as number; return (<div className="bar-cell"><div className="bar-track"><div className="bar-fill" style={{ width: `${(n / maxEventCount) * 100}%`, background: '#a855f7' }} /></div><span className="bar-value">{n.toLocaleString('zh-TW')}</span></div>); } },
    { key: 'users', label: '使用者數', align: 'right', render: (v) => (v as number).toLocaleString('zh-TW') },
  ];

  // 判斷健康度
  const isHealthy = health ? health.not_set_ratio < 0.1 : true;
  const coveragePercent = health ? Math.round(health.healthy_ratio * 100) : 0;

  return (
    <div className="relative min-h-[500px]">
      {isLoading && <PageLoader />}
      <div className={`page-grid transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="page-header">
        <h1>
          {/* NOTE: SVG 閃電圖示取代 ⚡ emoji */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          參與分析
        </h1>
        <p>了解使用者的行為模式和互動頻率</p>
      </div>

      {/* 追蹤異常檢測面板 - 使用全域 glass-card 樣式並修復 SVG 大小異常 */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '24px', 
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '24px',
          borderLeft: isHealthy ? '4px solid var(--color-success)' : '4px solid var(--color-warning)',
          background: isHealthy ? 'rgba(34, 201, 151, 0.05)' : 'rgba(245, 166, 35, 0.05)'
        }}
      >
        <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
          <svg width="96" height="96" viewBox="0 0 36 36">
            <path stroke="rgba(255,255,255,0.06)" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
            <path 
              stroke={isHealthy ? 'var(--color-success)' : 'var(--color-warning)'} 
              strokeDasharray={`${coveragePercent}, 100`} 
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              fill="none" 
              strokeWidth="3" 
              strokeLinecap="round" 
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{coveragePercent}%</span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>覆蓋率</span>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {isHealthy ? (
              <svg width="20" height="20" fill="none" stroke="var(--color-success)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="var(--color-warning)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            )}
            追蹤異常檢測 (Tracking Anomaly Detection)
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isHealthy 
              ? '目前區塊命名追蹤狀況良好，僅有極少數事件未正確標記。' 
              : `偵測到異常！目前約 ${Math.round((health?.not_set_ratio || 0) * 100)}% 的核心區塊數據未帶有名稱 (not set)。建議檢查埋點代碼。`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', paddingRight: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>總事件數</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{health?.total_events.toLocaleString('zh-TW') || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>異常比例</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: isHealthy ? 'inherit' : 'var(--color-warning)' }}>
              {Math.round((health?.not_set_ratio || 0) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* NOTE: 當資料載入失敗時，顯示警示橫幅提醒使用者 */}
      {hasError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 10,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'hsl(0, 84%, 60%)',
          fontSize: '0.82rem',
          marginBottom: 4,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            <strong>資料載入失敗或目前缺乏資料。</strong>
            可能原因：尚未取得此專案 GA4 Property 的存取授權（請確認後端憑證），或是目前日期區間尚無活躍資料。
          </span>
        </div>
      )}

      <div className="grid-2">
        <ChartCard title="每週流量分佈" subtitle="星期一到星期日的工作階段數">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={fmt} contentStyle={ts} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Bar dataKey="sessions" name="工作階段" radius={[6, 6, 0, 0]} barSize={36}>{weekday.map((_, i) => <Cell key={i} fill={i >= 5 ? CHART_COLORS[1] : CHART_COLORS[0]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="每小時流量模式" subtitle="最近 3 日的 24 小時流量對比">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourly}>
              <defs>
                {CHART_COLORS.map((color, i) => (
                  <linearGradient key={`grad-${i}`} id={`hourGradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={fmt} contentStyle={ts} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: 'hsl(215, 20%, 65%)' }} />
              
              {/* 動態渲染日期折線 */}
              {Object.keys(hourly[0] || {})
                .filter(key => key !== 'hour')
                .map((dateKey, index) => (
                  <Area
                    key={dateKey}
                    type="monotone"
                    dataKey={dateKey}
                    name={dateKey}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    fill={`url(#hourGradient-${index % CHART_COLORS.length})`}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="每小時流量模式（依日期分類）" subtitle="X 軸 = 小時　Y 軸 = 日期　顏色深淺 = 工作階段數">
        <HourlyHeatmap data={hourlyByDate} />
      </ChartCard>

      <div className="grid-2">
        <ChartCard title="熱門區塊排行" subtitle="依據 section_name 統計點擊與瀏覽次數">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={sections} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 45%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip formatter={fmt} contentStyle={ts} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Bar dataKey="count" name="觸發次數" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="事件觸發明細" subtitle="各事件的觸發次數和觸及使用者數">
          <DataTable columns={eventColumns} data={events} />
        </ChartCard>
      </div>
    </div>
  </div>
  );
}

export default EngagementPage;
