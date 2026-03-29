import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { clearCache, getLastUpdatedAt } from '../services/ga4Service';

/**
 * 連線狀態 Context
 *
 * 管理 Supabase 連線狀態、最後更新時間，並提供全局刷新功能
 * NOTE: 使用 Context 而非 prop drilling，讓 Layout 和各頁面都能存取
 */

interface ConnectionState {
  /** 連線狀態：'connected' | 'disconnected' | 'checking' */
  status: 'connected' | 'disconnected' | 'checking';
  /** 最後資料更新時間（來自 Supabase fetched_at） */
  lastUpdatedAt: string | null;
  /** 觸發全局資料刷新 */
  refresh: () => void;
  /** 刷新計數器，頁面監聽此值重新載入資料 */
  refreshKey: number;
}

const ConnectionContext = createContext<ConnectionState>({
  status: 'checking',
  lastUpdatedAt: null,
  refresh: () => {},
  refreshKey: 0,
});

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionState['status']>('checking');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * 檢查 Supabase 連線狀態
   * 嘗試從 ga4_cache 讀取一筆資料，成功即視為連線正常
   */
  const checkConnection = useCallback(async () => {
    setStatus('checking');
    try {
      const { error } = await supabase
        .from('ga4_cache')
        .select('report_type')
        .limit(1);

      if (error) {
        console.warn('Supabase 連線檢查失敗:', error.message);
        setStatus('disconnected');
        return;
      }

      setStatus('connected');

      // 取得最後更新時間
      const updatedAt = await getLastUpdatedAt();
      setLastUpdatedAt(updatedAt);
    } catch (err) {
      console.warn('Supabase 連線異常:', err);
      setStatus('disconnected');
    }
  }, []);

  /**
   * 全局刷新：清除前端快取並觸發所有頁面重新載入
   */
  const refresh = useCallback(() => {
    clearCache();
    setRefreshKey((prev) => prev + 1);
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <ConnectionContext.Provider value={{ status, lastUpdatedAt, refresh, refreshKey }}>
      {children}
    </ConnectionContext.Provider>
  );
}

/**
 * 取得連線狀態的 Hook
 */
export function useConnection(): ConnectionState {
  return useContext(ConnectionContext);
}
