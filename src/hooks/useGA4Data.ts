import { useState, useEffect, useCallback } from 'react';

/**
 * useGA4Data Hook
 * 通用的非同步資料載入 Hook，帶有 loading 和 error 狀態
 *
 * @param fetchFn - 非同步資料取得函式
 * @param fallback - Supabase 查詢失敗時的備用資料
 */
interface UseGA4DataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGA4Data<T>(
  fetchFn: () => Promise<T>,
  fallback: T,
): UseGA4DataResult<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      // NOTE: 如果 Supabase 回傳空陣列或 null，使用 fallback
      if (result && (Array.isArray(result) ? result.length > 0 : true)) {
        setData(result);
      } else {
        setData(fallback);
      }
    } catch (err) {
      console.warn('資料載入失敗，使用 fallback:', err);
      setError('資料載入失敗，顯示模擬資料');
      setData(fallback);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refresh: loadData };
}
