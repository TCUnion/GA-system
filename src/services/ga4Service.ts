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
  project_id?: string;
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
async function fetchReportData(reportType: string, startDate: string, endDate: string, project_id?: string): Promise<any | null> {
  const cacheKey = `${reportType}_${startDate}_${endDate}_${project_id || 'default'}`;
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
    const url = new URL(`${API_BASE_URL}/api/reports/${reportType}`);
    url.searchParams.append('start_date', startDate);
    url.searchParams.append('end_date', endDate);
    if (project_id) {
      url.searchParams.append('project_id', project_id);
    }
    const response = await fetch(url.toString());
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
export async function getOverviewKpi({ startDate, endDate, project_id }: DateRangeParams): Promise<KpiData[]> {
  const data = await fetchReportData('overview', startDate, endDate, project_id);
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
export async function getDailyTraffic({ startDate, endDate, project_id }: DateRangeParams): Promise<DailyTraffic[]> {
  const data = await fetchReportData('traffic', startDate, endDate, project_id);
  return data?.dailyTraffic || [];
}

/**
 * 取得流量管道資料
 */
export async function getChannelData({ startDate, endDate, project_id }: DateRangeParams): Promise<ChannelData[]> {
  const data = await fetchReportData('acquisition', startDate, endDate, project_id);
  return data?.channels || [];
}

/**
 * 取得裝置分佈
 */
export async function getDeviceData({ startDate, endDate, project_id }: DateRangeParams): Promise<DeviceData[]> {
  const data = await fetchReportData('audience', startDate, endDate, project_id);
  return data?.devices || [];
}

/**
 * 取得 OS 分佈
 */
export async function getOsData({ startDate, endDate, project_id }: DateRangeParams): Promise<OsData[]> {
  const data = await fetchReportData('audience', startDate, endDate, project_id);
  return data?.os || [];
}

/**
 * 取得語言分佈
 */
export async function getLanguageData({ startDate, endDate, project_id }: DateRangeParams): Promise<LanguageData[]> {
  const data = await fetchReportData('audience', startDate, endDate, project_id);
  return data?.languages || [];
}

const CITY_NAME_MAP: Record<string, string> = {
  '': '(未知地區)',
  '(not set)': '(未知地區)',
  'Taipei': '台北市',
  'Taipei City': '台北市',
  'New Taipei City': '新北市',
  'Taoyuan': '桃園市',
  'Taoyuan City': '桃園市',
  'Taichung': '台中市',
  'Taichung City': '台中市',
  'Tainan': '台南市',
  'Tainan City': '台南市',
  'Kaohsiung': '高雄市',
  'Kaohsiung City': '高雄市',
  'Hsinchu': '新竹',
  'Hsinchu City': '新竹市',
  'Keelung': '基隆市',
  'Keelung City': '基隆市',
  'Chiayi City': '嘉義市',
  'Changhua City': '彰化市',
  // 雙北行政區
  "Da'an District": '大安區',
  'Xinyi District': '信義區',
  'Zhongshan District': '中山區',
  'Songshan District': '松山區',
  'Neihu District': '內湖區',
  'Zhongzheng District': '中正區',
  'Datong District': '大同區',
  'Wanhua District': '萬華區',
  'Wenshan District': '文山區',
  'Nangang District': '南港區',
  'Shilin District': '士林區',
  'Beitou District': '北投區',
  'Banqiao District': '板橋區',
  'Zhonghe District': '中和區',
  'Xinzhuang District': '新莊區',
  'Sanchong District': '三重區',
  'Xindian District': '新店區',
  'Tucheng District': '土城區',
  'Yonghe District': '永和區',
  'Luzhou District': '蘆洲區',
  'Xizhi District': '汐止區',
  'Shulin District': '樹林區',
  'Danshui District': '淡水區',
  'Tamsui District': '淡水區',
  // 桃園行政區
  'Taoyuan District': '桃園區',
  'Zhongli District': '中壢區',
  'Pingzhen District': '平鎮區',
  'Bade District': '八德區',
  'Yangmei District': '楊梅區',
  'Luzhu District': '蘆竹區',
  'Guishan District': '龜山區',
  // 新竹行政區
  'Zhubei City': '竹北市',
  'Zhudong Township': '竹東鎮',
  // 苗栗行政區
  'Zhunan Township': '竹南鎮',
  'Toufen City': '頭份市',
  'Miaoli City': '苗栗市',
  // 台中行政區
  'Xitun District': '西屯區',
  'Nantun District': '南屯區',
  'Beitun District': '北屯區',
  'North District': '北區',
  'West District': '西區',
  'South District': '南區',
  'East District': '東區',
  'Central District': '中區',
  'Dali District': '大里區',
  'Taiping District': '太平區',
  'Fengyuan District': '豐原區',
  // 高雄行政區
  'Sanmin District': '三民區',
  'Zuoying District': '左營區',
  'Nanzih District': '楠梓區',
  'Qianzhen District': '前鎮區',
  'Lingya District': '苓雅區',
  'Xiaogang District': '小港區',
  'Fengshan District': '鳳山區',
  // 宜蘭、花蓮、台東
  'Yilan City': '宜蘭市',
  'Luodong Township': '羅東鎮',
  'Hualien City': '花蓮市',
  'Taitung City': '台東市',
  // 全球主要城市
  'Hong Kong': '香港',
  'Singapore': '新加坡',
  'Macau': '澳門',
  'Beijing': '北京',
  'Shanghai': '上海',
  'Tokyo': '東京',
  'Osaka': '大阪',
  'Seoul': '首爾',
  'New York': '紐約',
  'London': '倫敦',
};

export function translateCityName(cityName: string): string {
  if (!cityName || cityName.trim() === '' || cityName === '(not set)') return '(未知地區)';
  return CITY_NAME_MAP[cityName] || cityName;
}

/**
 * 取得城市排行
 */
export async function getCityData({ startDate, endDate, project_id }: DateRangeParams): Promise<CityData[]> {
  const data = await fetchReportData('audience', startDate, endDate, project_id);
  const cities = data?.cities || [];
  return cities.map((city: CityData) => ({
    ...city,
    city: translateCityName(city.city)
  }));
}

/**
 * 取得來源/媒介資料
 */
export async function getSourceMediumData({ startDate, endDate, project_id }: DateRangeParams): Promise<SourceMediumData[]> {
  const data = await fetchReportData('acquisition', startDate, endDate, project_id);
  return data?.sourceMedium || [];
}

/**
 * 取得社群流量
 */
export async function getSocialData({ startDate, endDate, project_id }: DateRangeParams): Promise<SocialData[]> {
  const data = await fetchReportData('acquisition', startDate, endDate, project_id);
  return data?.social || [];
}

/**
 * 取得頁面資料
 */
export async function getPageData({ startDate, endDate, project_id }: DateRangeParams): Promise<PageData[]> {
  const data = await fetchReportData('content', startDate, endDate, project_id);
  return data?.pages || [];
}

/**
 * 取得到達頁面
 */
export async function getLandingPageData({ startDate, endDate, project_id }: DateRangeParams): Promise<PageData[]> {
  const data = await fetchReportData('content', startDate, endDate, project_id);
  return data?.landingPages || [];
}

/**
 * 取得事件資料
 */
export async function getEventData({ startDate, endDate, project_id }: DateRangeParams): Promise<EventData[]> {
  const data = await fetchReportData('engagement', startDate, endDate, project_id);
  return data?.events || [];
}

/**
 * 取得每週分佈
 */
export async function getWeekdayData({ startDate, endDate, project_id }: DateRangeParams): Promise<WeekdayData[]> {
  const data = await fetchReportData('engagement', startDate, endDate, project_id);
  return data?.weekday || [];
}

/**
 * 取得每小時分佈
 */
export async function getHourlyData({ startDate, endDate, project_id }: DateRangeParams): Promise<HourlyData[]> {
  const data = await fetchReportData('engagement', startDate, endDate, project_id);
  return data?.hourly || [];
}

/**
 * 取得每日 × 每小時熱力圖資料
 */
export async function getHourlyByDateData({ startDate, endDate, project_id }: DateRangeParams): Promise<HourlyByDateRow[]> {
  const data = await fetchReportData('engagement', startDate, endDate, project_id);
  return data?.hourlyByDate || [];
}

/**
 * 取得瀏覽器資料
 */
export async function getBrowserData({ startDate, endDate, project_id }: DateRangeParams): Promise<BrowserData[]> {
  const data = await fetchReportData('tech', startDate, endDate, project_id);
  return data?.browsers || [];
}

/**
 * 取得螢幕解析度
 */
export async function getScreenData({ startDate, endDate, project_id }: DateRangeParams): Promise<ScreenData[]> {
  const data = await fetchReportData('tech', startDate, endDate, project_id);
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
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
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
