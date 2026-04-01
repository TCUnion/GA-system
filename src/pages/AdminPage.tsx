import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject, type Project } from '../contexts/ProjectContext';
import './AdminPage.css';

/**
 * AdminPage — 管理員頁面
 *
 * 分為兩個 Tab：
 * 1. 使用者管理：新增/刪除使用者、修改角色
 * 2. 專案管理：新增/刪除 GA4 專案、分配使用者授權
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface UserRecord {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  created_at: string | null;
  last_sign_in_at: string | null;
}

interface ProjectRecord extends Project {
  is_active: boolean;
  created_at?: string;
}

function AdminPage() {
  const { session } = useAuth();
  const { reloadProjects } = useProject();
  const [activeTab, setActiveTab] = useState<'users' | 'projects'>('users');

  // ── 使用者清單 ──
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // ── 專案清單 ──
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // ── 新增使用者表單 ──
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormLoading, setUserFormLoading] = useState(false);

  // ── 新增專案表單 ──
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPropertyId, setNewProjectPropertyId] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');
  const [projectFormError, setProjectFormError] = useState<string | null>(null);
  const [projectFormLoading, setProjectFormLoading] = useState(false);

  // ── 使用者授權管理 ──
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);

  // ── 通用 API 呼叫 ──
  const apiCall = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          ...(options.headers as Record<string, string>),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: '操作失敗' }));
        throw new Error(err.detail || '操作失敗');
      }
      return res.json();
    },
    [session?.access_token]
  );

  // ── 載入使用者清單 ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await apiCall('/api/admin/users');
      setUsers(data.users || []);
    } catch (e) {
      console.error('載入使用者失敗:', e);
    } finally {
      setUsersLoading(false);
    }
  }, [apiCall]);

  // ── 載入專案清單 ──
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await apiCall('/api/admin/projects');
      setProjects(data.projects || []);
    } catch (e) {
      console.error('載入專案失敗:', e);
    } finally {
      setProjectsLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, [loadUsers, loadProjects]);

  // ── 新增使用者 ──
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUserFormError(null);
    setUserFormLoading(true);
    try {
      await apiCall('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole }),
      });
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('viewer');
      await loadUsers();
    } catch (err: unknown) {
      setUserFormError(err instanceof Error ? err.message : '建立失敗');
    } finally {
      setUserFormLoading(false);
    }
  }

  // ── 修改角色 ──
  async function handleUpdateRole(userId: string, role: 'admin' | 'viewer') {
    try {
      await apiCall(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await loadUsers();
    } catch (err) {
      console.error('更新角色失敗:', err);
    }
  }

  // ── 刪除使用者 ──
  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`確定要刪除使用者 ${email}？此操作無法復原。`)) return;
    try {
      await apiCall(`/api/admin/users/${userId}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err) {
      console.error('刪除使用者失敗:', err);
    }
  }

  // ── 新增專案 ──
  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setProjectFormError(null);
    setProjectFormLoading(true);
    try {
      await apiCall('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: newProjectName,
          ga_property_id: newProjectPropertyId,
          description: newProjectDescription,
          color: newProjectColor,
        }),
      });
      setNewProjectName('');
      setNewProjectPropertyId('');
      setNewProjectDescription('');
      setNewProjectColor('#3b82f6');
      await loadProjects();
      await reloadProjects();
    } catch (err: unknown) {
      setProjectFormError(err instanceof Error ? err.message : '建立失敗');
    } finally {
      setProjectFormLoading(false);
    }
  }

  // ── 刪除專案 ──
  async function handleDeleteProject(projectId: string, name: string) {
    if (!confirm(`確定要刪除專案「${name}」？相關快取資料也會一併刪除。`)) return;
    try {
      await apiCall(`/api/admin/projects/${projectId}`, { method: 'DELETE' });
      await loadProjects();
      await reloadProjects();
    } catch (err) {
      console.error('刪除專案失敗:', err);
    }
  }

  // ── 開啟授權管理 ──
  async function openPermissions(userId: string) {
    setSelectedUserId(userId);
    setPermLoading(true);
    try {
      const data = await apiCall(`/api/admin/users/${userId}/permissions`);
      const ids = (data.permissions || []).map((p: { project_id: string }) => p.project_id);
      setUserPermissions(ids);
    } catch {
      setUserPermissions([]);
    } finally {
      setPermLoading(false);
    }
  }

  // ── 儲存授權 ──
  async function savePermissions() {
    if (!selectedUserId) return;
    try {
      await apiCall(`/api/admin/users/${selectedUserId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ project_ids: userPermissions }),
      });
      setSelectedUserId(null);
    } catch (err) {
      console.error('儲存授權失敗:', err);
    }
  }

  function toggleProjectPerm(projectId: string) {
    setUserPermissions((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  }

  // ── 時間格式化 ──
  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            <line x1="19" y1="8" x2="22" y2="8" /><line x1="22" y1="5" x2="22" y2="11" />
          </svg>
          管理後台
        </h1>
        <p>管理使用者帳號、GA4 專案，以及存取授權。</p>
      </div>

      {/* Tab 切換 */}
      <div className="admin-tabs">
        <button
          id="admin-tab-users"
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          使用者管理
        </button>
        <button
          id="admin-tab-projects"
          className={`admin-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          GA4 專案管理
        </button>
      </div>

      {/* ── 使用者管理 Tab ── */}
      {activeTab === 'users' && (
        <div className="admin-section">
          {/* 新增使用者表單 */}
          <div className="glass-card admin-form-card">
            <h2 className="admin-card-title">新增使用者</h2>
            <form className="admin-form" onSubmit={handleCreateUser}>
              <div className="admin-form-row">
                <div className="form-group">
                  <label className="form-label">電子郵件</label>
                  <input
                    id="new-user-email"
                    type="email"
                    className="admin-input"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    disabled={userFormLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">密碼</label>
                  <input
                    id="new-user-password"
                    type="password"
                    className="admin-input"
                    placeholder="至少 6 個字元"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    disabled={userFormLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">角色</label>
                  <select
                    id="new-user-role"
                    className="admin-select"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'viewer')}
                    disabled={userFormLoading}
                  >
                    <option value="viewer">Viewer（一般）</option>
                    <option value="admin">Admin（管理員）</option>
                  </select>
                </div>
                <button
                  id="create-user-btn"
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={userFormLoading}
                >
                  {userFormLoading ? '建立中...' : '建立帳號'}
                </button>
              </div>
              {userFormError && <div className="admin-error">{userFormError}</div>}
            </form>
          </div>

          {/* 使用者列表 */}
          <div className="glass-card admin-table-card">
            <h2 className="admin-card-title">使用者清單 ({users.length})</h2>
            {usersLoading ? (
              <div className="admin-loading">載入中...</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>電子郵件</th>
                      <th>角色</th>
                      <th>建立日期</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="admin-user-email">{user.email}</td>
                        <td>
                          <select
                            className={`role-badge role-badge--${user.role}`}
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value as 'admin' | 'viewer')}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="admin-date">{formatDate(user.created_at)}</td>
                        <td className="admin-actions">
                          <button
                            className="admin-btn admin-btn--sm admin-btn--ghost"
                            onClick={() => openPermissions(user.id)}
                            title="管理專案授權"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            授權
                          </button>
                          <button
                            className="admin-btn admin-btn--sm admin-btn--danger"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            title="刪除使用者"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" /><path d="M14 11v6" />
                            </svg>
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 專案管理 Tab ── */}
      {activeTab === 'projects' && (
        <div className="admin-section">
          {/* 新增專案表單 */}
          <div className="glass-card admin-form-card">
            <h2 className="admin-card-title">新增 GA4 專案</h2>
            <form className="admin-form" onSubmit={handleCreateProject}>
              <div className="admin-form-row admin-form-row--wrap">
                <div className="form-group">
                  <label className="form-label">專案名稱</label>
                  <input
                    id="new-project-name"
                    type="text"
                    className="admin-input"
                    placeholder="例：南庄山水"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    disabled={projectFormLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GA4 Property ID</label>
                  <input
                    id="new-project-property-id"
                    type="text"
                    className="admin-input"
                    placeholder="例：529541216"
                    value={newProjectPropertyId}
                    onChange={(e) => setNewProjectPropertyId(e.target.value)}
                    required
                    disabled={projectFormLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">識別色</label>
                  <div className="color-input-wrapper">
                    <input
                      id="new-project-color"
                      type="color"
                      className="admin-color-input"
                      value={newProjectColor}
                      onChange={(e) => setNewProjectColor(e.target.value)}
                      disabled={projectFormLoading}
                    />
                    <span className="color-value">{newProjectColor}</span>
                  </div>
                </div>
                <div className="form-group form-group--wide">
                  <label className="form-label">描述（可選）</label>
                  <input
                    id="new-project-description"
                    type="text"
                    className="admin-input"
                    placeholder="專案簡短描述"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    disabled={projectFormLoading}
                  />
                </div>
              </div>
              <div className="admin-form-actions">
                {projectFormError && <div className="admin-error">{projectFormError}</div>}
                <button
                  id="create-project-btn"
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={projectFormLoading}
                >
                  {projectFormLoading ? '建立中...' : '建立專案'}
                </button>
              </div>
            </form>
          </div>

          {/* 專案列表 */}
          <div className="glass-card admin-table-card">
            <h2 className="admin-card-title">GA4 專案清單 ({projects.length})</h2>
            {projectsLoading ? (
              <div className="admin-loading">載入中...</div>
            ) : (
              <div className="admin-projects-grid">
                {projects.map((project) => (
                  <div key={project.id} className="admin-project-card glass-card">
                    <div className="admin-project-color" style={{ background: project.color || '#3b82f6' }} />
                    <div className="admin-project-info">
                      <div className="admin-project-name">{project.name}</div>
                      <div className="admin-project-id">Property: {project.ga_property_id}</div>
                      {project.description && (
                        <div className="admin-project-desc">{project.description}</div>
                      )}
                    </div>
                    <div className="admin-project-actions">
                      <button
                        className="admin-btn admin-btn--sm admin-btn--danger"
                        onClick={() => handleDeleteProject(project.id, project.name)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                        刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 授權管理 Modal */}
      {selectedUserId && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUserId(null)}>
          <div className="admin-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>專案授權設定</h3>
              <button className="admin-modal-close" onClick={() => setSelectedUserId(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              {permLoading ? (
                <div className="admin-loading">載入中...</div>
              ) : (
                <div className="perm-project-list">
                  {projects.map((project) => (
                    <label key={project.id} className="perm-project-item">
                      <input
                        type="checkbox"
                        checked={userPermissions.includes(project.id)}
                        onChange={() => toggleProjectPerm(project.id)}
                      />
                      <div className="perm-project-dot" style={{ background: project.color || '#3b82f6' }} />
                      <div className="perm-project-info">
                        <span className="perm-project-name">{project.name}</span>
                        <span className="perm-project-id">{project.ga_property_id}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn--ghost" onClick={() => setSelectedUserId(null)}>取消</button>
              <button id="save-perms-btn" className="admin-btn admin-btn--primary" onClick={savePermissions}>儲存授權</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
