import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import AudiencePage from './pages/AudiencePage';
import AcquisitionPage from './pages/AcquisitionPage';
import ContentPage from './pages/ContentPage';
import EngagementPage from './pages/EngagementPage';
import TechPage from './pages/TechPage';

/**
 * App 元件
 *
 * 路由結構：
 * - /login            → LoginPage（公開，不需登入）
 * - ProtectedRoute    → 驗證 Session，未登入重導至 /login
 *   └── Layout（側邊欄 + ConnectionProvider）
 *       ├── /         → OverviewPage
 *       ├── /audience → AudiencePage
 *       └── ...
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
            <Route element={<ConnectionProvider><Layout /></ConnectionProvider>}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/audience" element={<AudiencePage />} />
              <Route path="/acquisition" element={<AcquisitionPage />} />
              <Route path="/content" element={<ContentPage />} />
              <Route path="/engagement" element={<EngagementPage />} />
              <Route path="/tech" element={<TechPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
