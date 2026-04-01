import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

/**
 * 專案狀態 Context
 *
 * 管理使用者有權存取的 GA4 專案清單，以及當前選中的專案。
 * 切換專案時會觸發 refreshKey 更新，讓所有圖表重新載入資料。
 *
 * NOTE: 專案清單從後端 /api/admin/me/projects 取得（需 JWT），
 * 管理員看全部專案，一般使用者只看授權的專案。
 */

export interface Project {
  id: string;
  name: string;
  ga_property_id: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

interface ProjectState {
  /** 使用者可存取的專案清單 */
  projects: Project[];
  /** 當前選中的專案（null 表示尚未載入）*/
  currentProject: Project | null;
  /** 使用者角色 */
  role: 'admin' | 'viewer';
  /** 是否正在載入專案清單 */
  loading: boolean;
  /** 切換到指定專案 */
  switchProject: (project: Project) => void;
  /** 重新載入專案清單 */
  reloadProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectState>({
  projects: [],
  currentProject: null,
  role: 'viewer',
  loading: true,
  switchProject: () => {},
  reloadProjects: async () => {},
});

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
// NOTE: localStorage key 用於持久化使用者上次選擇的專案
const STORAGE_KEY = 'ga4_current_project_id';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(true);

  /**
   * 從後端取得使用者有權存取的專案清單
   */
  const reloadProjects = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/me/projects`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.warn('Token 已過期或無效，強制登出...');
          await signOut();
        }
        throw new Error('無法取得專案清單');
      }
      const json = await res.json();
      const fetchedProjects: Project[] = json.projects || [];
      const fetchedRole: 'admin' | 'viewer' = json.role || 'viewer';

      setProjects(fetchedProjects);
      setRole(fetchedRole);

      // 嘗試恢復上次選擇的專案
      const savedId = localStorage.getItem(STORAGE_KEY);
      const savedProject = fetchedProjects.find((p) => p.id === savedId);
      if (savedProject) {
        setCurrentProject(savedProject);
      } else if (fetchedProjects.length > 0) {
        // 預設選第一個專案
        setCurrentProject(fetchedProjects[0]);
        localStorage.setItem(STORAGE_KEY, fetchedProjects[0].id);
      }
    } catch (err) {
      console.warn('取得專案清單失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Session 變更時重新載入專案清單
  useEffect(() => {
    reloadProjects();
  }, [reloadProjects]);

  /**
   * 切換當前選中的專案，並持久化到 localStorage
   */
  const switchProject = useCallback((project: Project) => {
    setCurrentProject(project);
    localStorage.setItem(STORAGE_KEY, project.id);
  }, []);

  return (
    <ProjectContext.Provider value={{ projects, currentProject, role, loading, switchProject, reloadProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * 取得專案狀態的 Hook
 */
export function useProject(): ProjectState {
  return useContext(ProjectContext);
}
