import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConnectionProvider } from './contexts/ConnectionContext';
import Layout from './components/Layout';
import OverviewPage from './pages/OverviewPage';
import AudiencePage from './pages/AudiencePage';
import AcquisitionPage from './pages/AcquisitionPage';
import ContentPage from './pages/ContentPage';
import EngagementPage from './pages/EngagementPage';
import TechPage from './pages/TechPage';

/**
 * App 元件
 * 定義路由結構，所有頁面共用 Layout 側邊欄
 * ConnectionProvider 提供全局的 Supabase 連線狀態
 */
function App() {
  return (
    <BrowserRouter>
      <ConnectionProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/audience" element={<AudiencePage />} />
            <Route path="/acquisition" element={<AcquisitionPage />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/engagement" element={<EngagementPage />} />
            <Route path="/tech" element={<TechPage />} />
          </Route>
        </Routes>
      </ConnectionProvider>
    </BrowserRouter>
  );
}

export default App;
