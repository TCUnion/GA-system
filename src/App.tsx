import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { ProjectProvider } from './contexts/ProjectContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import AudiencePage from './pages/AudiencePage';
import AcquisitionPage from './pages/AcquisitionPage';
import ContentPage from './pages/ContentPage';
import EngagementPage from './pages/EngagementPage';
import TechPage from './pages/TechPage';
import AdminPage from './pages/AdminPage';

/**
 * App 元件
 *
 * 路由結構：
 * - /login            → LoginPage（公開，不需登入）
 * - ProtectedRoute    → 驗證 Session，未登入重導至 /login
 *   └── ProjectProvider（管理多專案狀態）
 *       └── Layout（側邊欄 + ConnectionProvider）
 *           ├── /         → OverviewPage
 *           ├── /audience → AudiencePage
 *           ├── /admin    → AdminPage（限 admin 角色）
 *           └── ...
 * NOTE: ProjectProvider 放在 ProtectedRoute 內，確保只有登入後才初始化
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公開路由：登入頁 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 受保護路由：需登入才可存取 */}
          <Route element={<ProtectedRoute />}>
            <Route element={
              <ProjectProvider>
                <ConnectionProvider><Layout /></ConnectionProvider>
              </ProjectProvider>
            }>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/audience" element={<AudiencePage />} />
              <Route path="/acquisition" element={<AcquisitionPage />} />
              <Route path="/content" element={<ContentPage />} />
              <Route path="/engagement" element={<EngagementPage />} />
              <Route path="/tech" element={<TechPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
