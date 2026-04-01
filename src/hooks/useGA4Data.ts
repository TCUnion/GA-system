import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { useProject } from '../contexts/ProjectContext';
import type { DateRangeParams } from '../services/ga4Service';

/**
 * useGA4Data Hook
 * 通用的非同步資料載入 Hook，帶有 loading 和 error 狀態
 *
 * @param fetchFn - 接受 DateRangeParams 的非同步資料取得函式
 * @param initialData - 初始資料 (通常為空陣列)
 *
 * NOTE: 監聽 ConnectionContext 的 dateRange 與 refreshKey，
 *       當日期改變或觸發全局刷新時，自動傳入最新日期重新拉取資料。
 *       fetchFn 必須引用穩定的函式參考（從 ga4Service import 的頂層函式），
 *       不可傳入 inline lambda，以避免無限重渲染。
 */
interface UseGA4DataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** 資料來源：'api' 表示來自後端 API */
  source: 'api';
}

export function useGA4Data<T>(
  fetchFn: (params: DateRangeParams) => Promise<T>,
  initialData: T,
): UseGA4DataResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'api'>('api');

  // 直接從 Context 讀取，不透過 props 傳入，確保永遠是最新值
  const { refreshKey, dateRange } = useConnection();
  const { currentProject } = useProject();
  const { startDate, endDate } = dateRange;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // NOTE: 每次呼叫都使用當下 startDate/endDate/project_id
      const result = await fetchFn({ startDate, endDate, project_id: currentProject?.id });
      // 完全依賴真實資料，不再使用 fallback
      setData(result !== undefined && result !== null ? result : initialData);
      setSource('api');
    } catch (err) {
      console.warn('資料載入失敗:', err);
      setError('資料載入失敗');
      // 失敗時可以保留原本 data 或重設為 initialData，這裡選擇重設避免顯示舊資料
      setData(initialData);
      setSource('api');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, startDate, endDate, refreshKey, currentProject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refresh: loadData, source };
}
