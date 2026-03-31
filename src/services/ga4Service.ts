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
  // NOTE: iconKey 為語意鍵值，在 UI 元件中映射為對應的 SVG 圖示
  iconKey: string;
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

export interface HourlyByDateRow {
  date: string;
  label: string;
  hours: number[];  // 長度 24，索引對應 0-23 時
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

export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

// --- 快取容器（避免重複查詢） ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 前端快取 5 分鐘

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * 從後端 API 讀取指定報表的 JSON 資料（支援動態日期），並做前端記憶體快取
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchReportData(reportType: string, startDate: string, endDate: string): Promise<any | null> {
  const cacheKey = `${reportType}_${startDate}_${endDate}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 如果沒有設定 API URL，預設可以做一個簡單防呆，但這裡假設有
  if (!API_BASE_URL) {
    console.warn('VITE_API_URL 未設定');
    // 如果沒有後端 API，可以考慮這裡 fallback 到 Supabase (選填)
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/reports/${reportType}?start_date=${startDate}&end_date=${endDate}`);
    if (!response.ok) {
      throw new Error(`API 回傳錯誤: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // 更新前端快取
    cache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  } catch (err) {
    console.warn(`後端 API 連線失敗 (${reportType}):`, err);
    return null;
  }
}

// (移除 fetchDailySnapshots，統一使用 fetchReportData)

// --- 公開 API：各頁面的資料取得函式 ---

/**
 * 取得總覽頁面的 KPI 資料
 */
export async function getOverviewKpi({ startDate, endDate }: DateRangeParams): Promise<KpiData[]> {
  const data = await fetchReportData('overview', startDate, endDate);
  if (!data) return [];

  const { kpi, previousKpi } = data;
  return [
    { label: '使用者',    value: kpi.totalUsers,          previousValue: previousKpi.totalUsers,          format: 'number',   iconKey: 'users' },
    { label: '新使用者',  value: kpi.newUsers,            previousValue: previousKpi.newUsers,            format: 'number',   iconKey: 'newUsers' },
    { label: '工作階段',  value: kpi.sessions,            previousValue: previousKpi.sessions,            format: 'number',   iconKey: 'sessions' },
    { label: '瀏覽量',    value: kpi.pageviews,           previousValue: previousKpi.pageviews,           format: 'number',   iconKey: 'views' },
    { label: '平均停留',  value: kpi.avgSessionDuration,  previousValue: previousKpi.avgSessionDuration,  format: 'duration', iconKey: 'duration' },
    { label: '跳出率',    value: kpi.bounceRate,          previousValue: previousKpi.bounceRate,          format: 'percent',  iconKey: 'engagement' },
  ];
}

/**
 * 取得每日流量趨勢
 */
export async function getDailyTraffic({ startDate, endDate }: DateRangeParams): Promise<DailyTraffic[]> {
  const data = await fetchReportData('traffic', startDate, endDate);
  return data?.dailyTraffic || [];
}

/**
 * 取得流量管道資料
 */
export async function getChannelData({ startDate, endDate }: DateRangeParams): Promise<ChannelData[]> {
  const data = await fetchReportData('acquisition', startDate, endDate);
  return data?.channels || [];
}

/**
 * 取得裝置分佈
 */
export async function getDeviceData({ startDate, endDate }: DateRangeParams): Promise<DeviceData[]> {
  const data = await fetchReportData('audience', startDate, endDate);
  return data?.devices || [];
}

/**
 * 取得 OS 分佈
 */
export async function getOsData({ startDate, endDate }: DateRangeParams): Promise<OsData[]> {
  const data = await fetchReportData('audience', startDate, endDate);
  return data?.os || [];
}

/**
 * 取得語言分佈
 */
export async function getLanguageData({ startDate, endDate }: DateRangeParams): Promise<LanguageData[]> {
  const data = await fetchReportData('audience', startDate, endDate);
  return data?.languages || [];
}

/**
 * 取得城市排行
 */
export async function getCityData({ startDate, endDate }: DateRangeParams): Promise<CityData[]> {
  const data = await fetchReportData('audience', startDate, endDate);
  return data?.cities || [];
}

/**
 * 取得來源/媒介資料
 */
export async function getSourceMediumData({ startDate, endDate }: DateRangeParams): Promise<SourceMediumData[]> {
  const data = await fetchReportData('acquisition', startDate, endDate);
  return data?.sourceMedium || [];
}

/**
 * 取得社群流量
 */
export async function getSocialData({ startDate, endDate }: DateRangeParams): Promise<SocialData[]> {
  const data = await fetchReportData('acquisition', startDate, endDate);
  return data?.social || [];
}

/**
 * 取得頁面資料
 */
export async function getPageData({ startDate, endDate }: DateRangeParams): Promise<PageData[]> {
  const data = await fetchReportData('content', startDate, endDate);
  return data?.pages || [];
}

/**
 * 取得到達頁面
 */
export async function getLandingPageData({ startDate, endDate }: DateRangeParams): Promise<PageData[]> {
  const data = await fetchReportData('content', startDate, endDate);
  return data?.landingPages || [];
}

/**
 * 取得事件資料
 */
export async function getEventData({ startDate, endDate }: DateRangeParams): Promise<EventData[]> {
  const data = await fetchReportData('engagement', startDate, endDate);
  return data?.events || [];
}

/**
 * 取得每週分佈
 */
export async function getWeekdayData({ startDate, endDate }: DateRangeParams): Promise<WeekdayData[]> {
  const data = await fetchReportData('engagement', startDate, endDate);
  return data?.weekday || [];
}

/**
 * 取得每小時分佈
 */
export async function getHourlyData({ startDate, endDate }: DateRangeParams): Promise<HourlyData[]> {
  const data = await fetchReportData('engagement', startDate, endDate);
  return data?.hourly || [];
}

/**
 * 取得每日 × 每小時熱力圖資料
 */
export async function getHourlyByDateData({ startDate, endDate }: DateRangeParams): Promise<HourlyByDateRow[]> {
  const data = await fetchReportData('engagement', startDate, endDate);
  return data?.hourlyByDate || [];
}

/**
 * 取得瀏覽器資料
 */
export async function getBrowserData({ startDate, endDate }: DateRangeParams): Promise<BrowserData[]> {
  const data = await fetchReportData('tech', startDate, endDate);
  return data?.browsers || [];
}

/**
 * 取得螢幕解析度
 */
export async function getScreenData({ startDate, endDate }: DateRangeParams): Promise<ScreenData[]> {
  const data = await fetchReportData('tech', startDate, endDate);
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
