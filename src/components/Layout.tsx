import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useConnection } from '../contexts/ConnectionContext';
import './Layout.css';

/**
 * Layout 元件
 * 包含側邊欄導覽和主內容區域
 * 動態顯示 Supabase 連線狀態與最後更新時間
 */

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: '📊', label: '總覽' },
  { path: '/audience', icon: '👥', label: '使用者分析' },
  { path: '/acquisition', icon: '🔗', label: '流量來源' },
  { path: '/content', icon: '📄', label: '內容分析' },
  { path: '/engagement', icon: '⚡', label: '參與分析' },
  { path: '/tech', icon: '📱', label: '技術分析' },
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
  const { status, lastUpdatedAt, refresh } = useConnection();

  const today = new Date();
  const dateStr = `${today.getFullYear()}/${(today.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;

  // NOTE: 計算 30 天前的日期，用於顯示日期範圍
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = `${thirtyDaysAgo.getFullYear()}/${(thirtyDaysAgo.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${thirtyDaysAgo.getDate().toString().padStart(2, '0')}`;

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
            <div className="sidebar-logo">🏔️</div>
            <div className="sidebar-brand-text">
              <h2>南庄山水</h2>
              <span>Analytics Dashboard</span>
            </div>
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
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`sidebar-status ${currentStatus.className}`}>
            <span className="status-dot" />
            <span>{currentStatus.label}</span>
          </div>
          {status === 'connected' && lastUpdatedAt && (
            <div className="sidebar-update-time">
              🕐 更新：{formatLastUpdated(lastUpdatedAt)}
            </div>
          )}
        </div>
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
              ☰
            </button>
            <span className="top-bar-title">GA4 數據儀表板</span>
          </div>
          <div className="top-bar-right">
            <div className="date-display">
              📅 {startDateStr} — {dateStr}
            </div>
            <button
              className="refresh-btn"
              onClick={refresh}
              title="清除快取並重新載入資料"
            >
              🔄 重新整理
            </button>
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
        />
      )}
    </div>
  );
}

export default Layout;
