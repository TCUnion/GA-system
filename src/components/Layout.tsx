import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useConnection } from '../contexts/ConnectionContext';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import DateRangePicker from './DateRangePicker';
import './Layout.css';
import { generateAIPrompt } from '../utils/exportForAI';

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
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const { status, lastUpdatedAt, dateRange, setDateRange } = useConnection();
  const { user, signOut } = useAuth();
  const { projects, currentProject, role, switchProject } = useProject();
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  // 連線狀態文字與樣式映射
  const statusConfig = {
    connected: { label: 'Supabase 已連線', className: 'status-connected' },
    disconnected: { label: '模擬資料模式', className: 'status-disconnected' },
    checking: { label: '連線檢查中...', className: 'status-checking' },
  };

  const currentStatus = statusConfig[status];

  // 處理匯出 AI 報告
  const handleExportAI = async () => {
    setIsExporting(true);
    try {
      const markdown = await generateAIPrompt({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        project_id: currentProject?.id
      });
      await navigator.clipboard.writeText(markdown);
      alert('已成功將 GA4 數據報告複製到剪貼簿！可直接貼給 AI 進行分析。');
    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出資料失敗。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="layout">
      {/* 側邊欄 */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* 品牌標題列 */}
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
              <h2>SEH GA4 SYSTEM</h2>
              <span>Analytics Dashboard</span>
            </div>
          </div>
        </div>

        {/* 專案選擇器（多專案切換） */}
        <div className="project-selector">
          <button
            id="project-selector-btn"
            className="project-selector-btn"
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            aria-expanded={projectDropdownOpen}
          >
            <div
              className="project-dot"
              style={{ background: currentProject?.color || '#3b82f6' }}
            />
            <div className="project-selector-text">
              <span className="project-selector-name">
                {currentProject?.name || '選擇專案'}
              </span>
              <span className="project-selector-id">
                {currentProject?.ga_property_id || ''}
              </span>
            </div>
            <svg className="project-selector-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {projectDropdownOpen && (
            <div className="project-dropdown">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={`project-dropdown-item ${currentProject?.id === project.id ? 'active' : ''}`}
                  onClick={() => {
                    switchProject(project);
                    setProjectDropdownOpen(false);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="project-dot" style={{ background: project.color || '#3b82f6' }} />
                  <div>
                    <div className="project-dropdown-name">{project.name}</div>
                    <div className="project-dropdown-id">{project.ga_property_id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 連線狀態 */}
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

        {/* 主導覽 */}
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

          {/* 管理員才顯示的管理選單 */}
          {role === 'admin' && (
            <>
              <div className="sidebar-section-label sidebar-section-label--admin">系統管理</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    <line x1="19" y1="8" x2="22" y2="8" /><line x1="22" y1="5" x2="22" y2="11" />
                  </svg>
                </span>
                管理後台
              </NavLink>
            </>
          )}
        </nav>

        {/* 側邊欄底部：使用者資訊與登出 */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            {/* NOTE: 使用者頭像使用首字母縮寫取代頭像圖片 */}
            <div className="sidebar-user-avatar" aria-hidden="true">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-email" title={user?.email}>
                {user?.email ?? '未知使用者'}
              </span>
              <span className={`sidebar-user-role role-${role}`}>
                {role === 'admin' ? '管理員' : '一般使用者'}
              </span>
            </div>
          </div>
          <div className="sidebar-footer-actions">
            {role === 'admin' && (
              <button
                id="admin-shortcut-btn"
                className="btn-admin-shortcut"
                onClick={() => { navigate('/admin'); setSidebarOpen(false); }}
                title="管理後台"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </button>
            )}
            <button
              id="sidebar-logout-btn"
              className="btn-logout"
              onClick={() => signOut()}
              aria-label="登出帳號"
              title="登出"
            >
              {/* 登出圖示 */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
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
            <button
              onClick={handleExportAI}
              className="btn-export-ai"
              disabled={isExporting}
              title="將這段時間的全局數據聚合並複製給 AI"
            >
              {isExporting ? (
                <span className="loader-spinner" style={{ width: '16px', height: '16px' }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                </svg>
              )}
              {isExporting ? '處理中...' : '匯出 AI 分析'}
            </button>
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
