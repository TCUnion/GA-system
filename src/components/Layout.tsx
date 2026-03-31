import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useConnection } from '../contexts/ConnectionContext';
import DateRangePicker from './DateRangePicker';
import './Layout.css';

/**
 * Layout 元件
 * 包含側邊欄導覽和主內容區域
 * 動態顯示 Supabase 連線狀態與最後更新時間
 */

// NOTE: 使用 inline SVG 取代 emoji，確保跨平台渲染一致性與無障礙支援
const NAV_ICONS: Record<string, React.ReactNode> = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  audience: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  acquisition: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  engagement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  tech: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
};

interface NavItem {
  path: string;
  iconKey: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', iconKey: 'overview', label: '總覽' },
  { path: '/audience', iconKey: 'audience', label: '使用者分析' },
  { path: '/acquisition', iconKey: 'acquisition', label: '流量來源' },
  { path: '/content', iconKey: 'content', label: '內容分析' },
  { path: '/engagement', iconKey: 'engagement', label: '參與分析' },
  { path: '/tech', iconKey: 'tech', label: '技術分析' },
];

/**
 * 格式化最後更新時間為台北時間
 */
function formatLastUpdated(isoString: string | null): string {
  if (!isoString) return '未知';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '未知';
  }
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status, lastUpdatedAt, dateRange, setDateRange } = useConnection();

  // 連線狀態文字與樣式映射
  const statusConfig = {
    connected: { label: 'Supabase 已連線', className: 'status-connected' },
    disconnected: { label: '模擬資料模式', className: 'status-disconnected' },
    checking: { label: '連線檢查中...', className: 'status-checking' },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="layout">
      {/* 側邊欄 */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            {/* NOTE: 品牌 Logo 使用 SVG 山形圖示，取代跨平台渲染不一致的 🏔️ emoji */}
            <div className="sidebar-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 20 22 20" />
                <polyline points="7 20 12 11 17 20" />
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <h2>南庄山水</h2>
              <span>Analytics Dashboard</span>
            </div>
          </div>

          {/* 新增：將原本在 footer 的狀態移到此處形成資訊卡片 */}
          <div className="sidebar-data-status">
            <div className="data-status-header">資料連線狀態</div>
            <div className={`sidebar-status ${currentStatus.className}`}>
              <span className="status-dot" />
              <span>{currentStatus.label}</span>
            </div>
            {status === 'connected' && lastUpdatedAt && (
              <div className="sidebar-update-time">
                {/* NOTE: 使用 SVG 時鐘圖示取代 🕐 emoji */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatLastUpdated(lastUpdatedAt)}
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">報表</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon">{NAV_ICONS[item.iconKey]}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 主內容區 */}
      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="切換選單"
            >
              {/* NOTE: 使用 SVG Hamburger 圖示取代 ☰ 字元 */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="top-bar-title">GA4 數據儀表板</span>
          </div>
          <div className="top-bar-right">
            <DateRangePicker
              initialStartDate={dateRange.startDate}
              initialEndDate={dateRange.endDate}
              onChange={(start, end) => setDateRange(start, end)}
            />
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* 手機版遮罩層 */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default Layout;
