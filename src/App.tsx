import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { ProjectProvider } from './contexts/ProjectContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const AudiencePage = lazy(() => import('./pages/AudiencePage'));
const AcquisitionPage = lazy(() => import('./pages/AcquisitionPage'));
const ContentPage = lazy(() => import('./pages/ContentPage'));
const EngagementPage = lazy(() => import('./pages/EngagementPage'));
const TechPage = lazy(() => import('./pages/TechPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const HeatmapPage = lazy(() => import('./pages/HeatmapPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

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
              <Route path="/" element={<Suspense fallback={<PageLoader />}><OverviewPage /></Suspense>} />
              <Route path="/audience" element={<Suspense fallback={<PageLoader />}><AudiencePage /></Suspense>} />
              <Route path="/acquisition" element={<Suspense fallback={<PageLoader />}><AcquisitionPage /></Suspense>} />
              <Route path="/content" element={<Suspense fallback={<PageLoader />}><ContentPage /></Suspense>} />
              <Route path="/engagement" element={<Suspense fallback={<PageLoader />}><EngagementPage /></Suspense>} />
              <Route path="/heatmap" element={<Suspense fallback={<PageLoader />}><HeatmapPage /></Suspense>} />
              <Route path="/tech" element={<Suspense fallback={<PageLoader />}><TechPage /></Suspense>} />
              <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
