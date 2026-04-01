import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute 元件
 *
 * 路由保護守衛：
 * - loading=true 時顯示全頁 Loading（避免未驗證完就閃爍到登入頁）
 * - user=null 時重導至 /login
 * - 已登入則渲染子路由 <Outlet />
 */
function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen" aria-label="驗證中">
        <div className="auth-loading-spinner" />
        <p>驗證登入狀態中...</p>
      </div>
    );
  }

  if (!user) {
    // NOTE: replace=true 避免使用者按上一頁回到受保護的頁面
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
