import { supabase } from '../lib/supabase';

/**
 * GA4 資料服務層
 *
 * 負責從 Supabase 讀取快取的 GA4 報表資料
 * 如果 Supabase 連線失敗，會 fallback 到模擬數據
 *
 * NOTE: 前端只有 SELECT 權限（RLS 控制），寫入由後端排程負責
 */

// --- 型別定義 ---

export interface KpiData {
  label: string;
  value: number;
  previousValue: number;
  format: 'number' | 'percent' | 'duration' | 'decimal';
  icon: string;
}

export interface DailyTraffic {
  date: string;
  label: string;
  users: number;
  newUsers: number;
  sessions: number;
  views: number;
}

export interface ChannelData {
  name: string;
  sessions: number;
}

export interface DeviceData {
  name: string;
  users: number;
}

export interface CityData {
  city: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

export interface SourceMediumData {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  newUsers: number;
  engagementRate: number;
  avgDuration: number;
}

export interface SocialData {
  platform: string;
  sessions: number;
}

export interface PageData {
  pageTitle: string;
  pagePath: string;
  views: number;
  users: number;
  avgDuration: number;
  bounceRate: number;
}

export interface EventData {
  eventName: string;
  eventCount: number;
  users: number;
}

export interface WeekdayData {
  day: string;
  sessions: number;
}

export interface HourlyData {
  hour: string;
  sessions: number;
}

export interface BrowserData {
  name: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

export interface ScreenData {
  resolution: string;
  users: number;
}

export interface OsData {
  name: string;
  users: number;
}

export interface LanguageData {
  language: string;
  users: number;
}

// --- 快取容器（避免重複查詢） ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 前端快取 5 分鐘

/**
 * 從 Supabase ga4_cache 表讀取指定報表的 JSON 資料
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCacheData(reportType: string): Promise<any | null> {
  // 檢查前端記憶體快取
  const cached = cache[reportType];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('ga4_cache')
      .select('data, fetched_at')
      .eq('report_type', reportType)
      .single();

    if (error) {
      console.warn(`Supabase 查詢失敗 (${reportType}):`, error.message);
      return null;
    }

    // 更新前端快取
    cache[reportType] = { data: data.data, timestamp: Date.now() };
    return data.data;
  } catch (err) {
    console.warn(`Supabase 連線失敗 (${reportType}):`, err);
    return null;
  }
}

/**
 * 從 Supabase ga4_daily_snapshot 表讀取每日快照
 */
async function fetchDailySnapshots(): Promise<DailyTraffic[] | null> {
  const cacheKey = '_daily_snapshots';
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('ga4_daily_snapshot')
      .select('snapshot_date, users, new_users, sessions, pageviews')
      .order('snapshot_date', { ascending: true })
      .limit(30);

    if (error) {
      console.warn('Supabase 每日快照查詢失敗:', error.message);
      return null;
    }

    const result: DailyTraffic[] = data.map((row) => {
      const d = new Date(row.snapshot_date);
      return {
        date: row.snapshot_date,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        users: row.users,
        newUsers: row.new_users,
        sessions: row.sessions,
        views: row.pageviews,
      };
    });

    cache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.warn('Supabase 連線失敗 (daily_snapshots):', err);
    return null;
  }
}

// --- 公開 API：各頁面的資料取得函式 ---

/**
 * 取得總覽頁面的 KPI 資料
 */
export async function getOverviewKpi(): Promise<KpiData[]> {
  const data = await fetchCacheData('overview');
  if (!data) return [];

  const { kpi, previousKpi } = data;
  return [
    { label: '使用者', value: kpi.totalUsers, previousValue: previousKpi.totalUsers, format: 'number', icon: '👥' },
    { label: '新使用者', value: kpi.newUsers, previousValue: previousKpi.newUsers, format: 'number', icon: '🆕' },
    { label: '工作階段', value: kpi.sessions, previousValue: previousKpi.sessions, format: 'number', icon: '📊' },
    { label: '瀏覽量', value: kpi.pageviews, previousValue: previousKpi.pageviews, format: 'number', icon: '👁️' },
    { label: '平均工作階段', value: kpi.avgSessionDuration, previousValue: previousKpi.avgSessionDuration, format: 'duration', icon: '⏱️' },
    { label: '跳出率', value: kpi.bounceRate, previousValue: previousKpi.bounceRate, format: 'percent', icon: '🚪' },
  ];
}

/**
 * 取得每日流量趨勢
 */
export async function getDailyTraffic(): Promise<DailyTraffic[]> {
  const result = await fetchDailySnapshots();
  return result || [];
}

/**
 * 取得流量管道資料
 */
export async function getChannelData(): Promise<ChannelData[]> {
  const data = await fetchCacheData('acquisition');
  return data?.channels || [];
}

/**
 * 取得裝置分佈
 */
export async function getDeviceData(): Promise<DeviceData[]> {
  const data = await fetchCacheData('audience');
  return data?.devices || [];
}

/**
 * 取得 OS 分佈
 */
export async function getOsData(): Promise<OsData[]> {
  const data = await fetchCacheData('audience');
  return data?.os || [];
}

/**
 * 取得語言分佈
 */
export async function getLanguageData(): Promise<LanguageData[]> {
  const data = await fetchCacheData('audience');
  return data?.languages || [];
}

/**
 * 取得城市排行
 */
export async function getCityData(): Promise<CityData[]> {
  const data = await fetchCacheData('audience');
  return data?.cities || [];
}

/**
 * 取得來源/媒介資料
 */
export async function getSourceMediumData(): Promise<SourceMediumData[]> {
  const data = await fetchCacheData('acquisition');
  return data?.sourceMedium || [];
}

/**
 * 取得社群流量
 */
export async function getSocialData(): Promise<SocialData[]> {
  const data = await fetchCacheData('acquisition');
  return data?.social || [];
}

/**
 * 取得頁面資料
 */
export async function getPageData(): Promise<PageData[]> {
  const data = await fetchCacheData('content');
  return data?.pages || [];
}

/**
 * 取得到達頁面
 */
export async function getLandingPageData(): Promise<PageData[]> {
  const data = await fetchCacheData('content');
  return data?.landingPages || [];
}

/**
 * 取得事件資料
 */
export async function getEventData(): Promise<EventData[]> {
  const data = await fetchCacheData('engagement');
  return data?.events || [];
}

/**
 * 取得每週分佈
 */
export async function getWeekdayData(): Promise<WeekdayData[]> {
  const data = await fetchCacheData('engagement');
  return data?.weekday || [];
}

/**
 * 取得每小時分佈
 */
export async function getHourlyData(): Promise<HourlyData[]> {
  const data = await fetchCacheData('engagement');
  return data?.hourly || [];
}

/**
 * 取得瀏覽器資料
 */
export async function getBrowserData(): Promise<BrowserData[]> {
  const data = await fetchCacheData('tech');
  return data?.browsers || [];
}

/**
 * 取得螢幕解析度
 */
export async function getScreenData(): Promise<ScreenData[]> {
  const data = await fetchCacheData('tech');
  return data?.screens || [];
}

/**
 * 取得最後更新時間
 */
export async function getLastUpdatedAt(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ga4_cache')
      .select('fetched_at')
      .eq('report_type', 'overview')
      .single();

    if (error) return null;
    return data.fetched_at;
  } catch {
    return null;
  }
}

/**
 * 清除前端記憶體快取（手動重新整理時使用）
 */
export function clearCache(): void {
  Object.keys(cache).forEach((key) => delete cache[key]);
}
