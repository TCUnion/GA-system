import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '../contexts/ConnectionContext';

/**
 * useGA4Data Hook
 * 通用的非同步資料載入 Hook，帶有 loading 和 error 狀態
 *
 * @param fetchFn - 非同步資料取得函式（從 ga4Service 取得）
 * @param fallback - Supabase 查詢失敗時的備用資料（mockData）
 *
 * NOTE: 監聽 ConnectionContext 的 refreshKey，當觸發全局刷新時自動重新載入
 */
interface UseGA4DataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** 資料來源：'supabase' 表示來自真實資料，'fallback' 表示使用模擬資料 */
  source: 'supabase' | 'fallback';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGA4Data<T>(
  fetchFn: () => Promise<T>,
  fallback: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = []
): UseGA4DataResult<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');
  const { refreshKey } = useConnection();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      // NOTE: 如果 Supabase 回傳空陣列或 null，使用 fallback
      if (result && (Array.isArray(result) ? result.length > 0 : true)) {
        setData(result);
        setSource('supabase');
      } else {
        setData(fallback);
        setSource('fallback');
      }
    } catch (err) {
      console.warn('資料載入失敗，使用 fallback:', err);
      setError('資料載入失敗，顯示模擬資料');
      setData(fallback);
      setSource('fallback');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, ...deps]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refresh: loadData, source };
}
