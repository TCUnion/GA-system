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

export interface CountryData {
  name: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

export interface SourceMediumData {
  channelGroup?: string;
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

export interface SectionData {
  name: string;
  count: number;
  users: number;
}

export interface WeekdayData {
  day: string;
  sessions: number;
}

export interface HourlyData {
  hour: string;
  [date: string]: string | number; // 支援動態日期欄位，如 "03/31": 150
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

export interface BotData {
  name: string;
  users: number;
  sessions: number;
  engagementRate: number;
  reason: string;
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

const COUNTRY_NAME_MAP: Record<string, string> = {
  'Taiwan': '台灣',
  'United States': '美國',
  'Hong Kong': '香港',
  'Japan': '日本',
  'Macau': '澳門',
  'China': '中國',
  'Singapore': '新加坡',
  'Malaysia': '馬來西亞',
  'South Korea': '韓國',
  'United Kingdom': '英國',
  'Australia': '澳洲',
  'Canada': '加拿大',
  'Germany': '德國',
  'France': '法國',
  'Thailand': '泰國',
  'Vietnam': '越南',
  'Philippines': '菲律賓',
  'Indonesia': '印尼',
  'India': '印度',
};

export function translateCountryName(countryName: string): string {
  if (!countryName || countryName.trim() === '' || countryName === '(not set)') return '(未知國家)';
  return COUNTRY_NAME_MAP[countryName] || countryName;
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
  'Hualien City': '花蓮市',
  'Taitung City': '台東市',
  'Yilan City': '宜蘭市',
  'Douliu City': '斗六市',
  'Magong City': '馬公市',
  'Puzih City': '太保/朴子市',
  'Taibao City': '太保市',
  'Zhubei City': '竹北市',
  // 縣級
  'Hsinchu County': '新竹縣',
  'Miaoli County': '苗栗縣',
  'Changhua County': '彰化縣',
  'Nantou County': '南投縣',
  'Yunlin County': '雲林縣',
  'Chiayi County': '嘉義縣',
  'Pingtung County': '屏東縣',
  'Yilan County': '宜蘭縣',
  'Hualien County': '花蓮縣',
  'Taitung County': '台東縣',
  'Penghu County': '澎湖縣',
  'Kinmen County': '金門縣',
  'Lienchiang County': '連江縣',
  // 雙北行政區
  "Da'an District": '大安區',
  "Da’an District": '大安區',
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
  'Linkou District': '林口區',
  'Wugu District': '五股區',
  'Taiishan District': '泰山區',
  'Taishan District': '泰山區',
  'Yingge District': '鶯歌區',
  'Sanxia District': '三峽區',
  'Ruifang District': '瑞芳區',
  'Bali District': '八里區',
  'Shenkeng District': '深坑區',
  // 桃園行政區
  'Taoyuan District': '桃園區',
  'Zhongli District': '中壢區',
  'Pingzhen District': '平鎮區',
  'Bade District': '八德區',
  'Yangmei District': '楊梅區',
  'Luzhu District': '蘆竹區',
  'Guishan District': '龜山區',
  'Longtan District': '龍潭區',
  'Dayuan District': '大園區',
  'Guanyin District': '觀音區',
  // 新竹行政區
  'Zhudong Township': '竹東鎮',
  'Hukou Township': '湖口鄉',
  'Xinfeng Township': '新豐鄉',
  // 苗栗行政區
  'Zhunan Township': '竹南鎮',
  'Toufen City': '頭份市',
  'Miaoli City': '苗栗市',
  'Houlong Township': '後龍鎮',
  'Tongluo Township': '銅鑼鄉',
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
  'Shalu District': '沙鹿區',
  'Longjing District': '龍井區',
  'Wuqi District': '梧棲區',
  'Daya District': '大雅區',
  'Tanzi District': '潭子區',
  // 彰化行政區
  'Yuanlin City': '員林市',
  'He-mei Town': '和美鎮',
  'Hemei Township': '和美鎮',
  'Lukang Township': '鹿港鎮',
  // 台南行政區
  'Yongkang District': '永康區',
  'Annan District': '安南區',
  'Rende District': '仁德區',
  'Guiren District': '歸仁區',
  // 高雄行政區
  'Sanmin District': '三民區',
  'Zuoying District': '左營區',
  'Nanzih District': '楠梓區',
  'Qianzhen District': '前鎮區',
  'Lingya District': '苓雅區',
  'Xiaogang District': '小港區',
  'Fengshan District': '鳳山區',
  'Gushan District': '鼓山區',
  'Dashe District': '大社區',
  'Renwu District': '仁武區',
  'Niaosong District': '鳥松區',
  'Gangshan District': '岡山區',
  // 宜蘭、花蓮、台東
  'Luodong Township': '羅東鎮',
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
  'Los Angeles': '洛杉磯',
  'San Francisco': '舊金山',
  'Sydney': '雪梨',
  'Melbourne': '墨爾本',
  'Kuala Lumpur': '吉隆坡',
  'Osaka City': '大阪市',
  'Bangkok': '曼谷',
};

/**
 * 縣市映射表：將 GA4 的城市/行政區名稱對應到台灣 22 縣市
 * 用於地圖視覺化聚合
 */
export const COUNTY_MAPPING: Record<string, string> = {
  '台北市': '臺北市', '台北': '臺北市', 'Taipei City': '臺北市', 'Taipei': '臺北市',
  '大安區': '臺北市', '信義區': '臺北市', '中山區': '臺北市', '松山區': '臺北市', '內湖區': '臺北市', '中正區': '臺北市', '大同區': '臺北市', '萬華區': '臺北市', '文山區': '臺北市', '南港區': '臺北市', '士林區': '臺北市', '北投區': '臺北市',
  '新北市': '新北市', 'New Taipei City': '新北市',
  '板橋區': '新北市', '中和區': '新北市', '新莊區': '新北市', '三重區': '新北市', '新店區': '新北市', '土城區': '新北市', '永和區': '新北市', '蘆洲區': '新北市', '汐止區': '新北市', '樹林區': '新北市', '淡水區': '新北市', '林口區': '新北市', '三峽區': '新北市', '五股區': '新北市',
  '桃園市': '桃園市', 'Taoyuan City': '桃園市', 'Taoyuan': '桃園市',
  '桃園區': '桃園市', '中壢區': '桃園市', '平鎮區': '桃園市', '八德區': '桃園市', '楊梅區': '桃園市', '蘆竹區': '桃園市', '龜山區': '桃園市', '龍潭區': '桃園市',
  '台中市': '臺中市', 'Taichung City': '臺中市', 'Taichung': '臺中市',
  '西屯區': '臺中市', '南屯區': '臺中市', '北屯區': '臺中市', '北區': '臺中市', '西區': '臺中市', '南區': '臺中市', '東區': '臺中市', '中區': '臺中市', '大里區': '臺中市', '太平區': '臺中市', '豐原區': '臺中市',
  '台南市': '臺南市', 'Tainan City': '臺南市', 'Tainan': '臺南市',
  '永康區': '臺南市', '安南區': '臺南市', '東區(台南)': '臺南市',
  '高雄市': '高雄市', 'Kaohsiung City': '高雄市', 'Kaohsiung': '高雄市',
  '三民區': '高雄市', '左營區': '高雄市', '楠梓區': '高雄市', '前鎮區': '高雄市', '苓雅區': '高雄市', '小港區': '高雄市', '鳳山區': '高雄市',
  '基隆市': '基隆市', 'Keelung City': '基隆市', 'Keelung': '基隆市',
  '新竹市': '新竹市', 'Hsinchu City': '新竹市',
  '新竹縣': '新竹縣', 'Hsinchu County': '新竹縣', '竹北市': '新竹縣', '竹東鎮': '新竹縣',
  '苗栗縣': '苗栗縣', 'Miaoli County': '苗栗縣', '苗栗市': '苗栗縣', '頭份市': '苗栗縣', '竹南鎮': '苗栗縣', '後龍鎮': '苗栗縣',
  '彰化縣': '彰化縣', 'Changhua County': '彰化縣', '彰化市': '彰化縣', '員林市': '彰化縣', '和美鎮': '彰化縣',
  '南投縣': '南投縣', 'Nantou County': '南投縣', '南投市': '南投縣', '草屯鎮': '南投縣', '埔里鎮': '南投縣',
  '雲林縣': '雲林縣', 'Yunlin County': '雲林縣', '斗六市': '雲林縣', '虎尾鎮': '雲林縣',
  '嘉義市': '嘉義市', 'Chiayi City': '嘉義市',
  '嘉義縣': '嘉義縣', 'Chiayi County': '嘉義縣', '太保市': '嘉義縣', '民雄鄉': '嘉義縣',
  '屏東縣': '屏東縣', 'Pingtung County': '屏東縣', '屏東市': '屏東縣', '潮州鎮': '屏東縣',
  '宜蘭縣': '宜蘭縣', 'Yilan County': '宜蘭縣', '宜蘭市': '宜蘭縣', '羅東鎮': '宜蘭縣',
  '花蓮縣': '花蓮縣', 'Hualien County': '花蓮縣', '花蓮市': '花蓮縣',
  '台東縣': '台東縣', 'Taitung County': '台東縣', '台東市': '台東縣',
  '澎湖縣': '澎湖縣', 'Penghu County': '澎湖縣',
  '金門縣': '金門縣', 'Kinmen County': '金門縣',
  '連江縣': '連江縣', 'Lienchiang County': '連江縣',
};

export interface CountyData {
  name: string;
  users: number;
}

/**
 * 將城市資料聚合為縣市資料，用於地圖顯示
 */
export function aggregateToCounties(cities: CityData[]): CountyData[] {
  const countyMap: Record<string, number> = {};
  
  cities.forEach(item => {
    // 優先使用映射表，否則直接使用城市名稱（如果是縣市的話）
    const county = COUNTY_MAPPING[item.city] || (item.city.includes('縣') || item.city.includes('市') ? item.city : null);
    
    if (county) {
      countyMap[county] = (countyMap[county] || 0) + item.users;
    }
  });

  return Object.entries(countyMap)
    .map(([name, users]) => ({ name, users }))
    .sort((a, b) => b.users - a.users);
}


export function translateCityName(cityName: string): string {
  if (!cityName || cityName.trim() === '' || cityName === '(not set)') return '(未知地區)';
  return CITY_NAME_MAP[cityName] || cityName;
}

/**
 * 取得國家排行
 */
export async function getCountryData({ startDate, endDate, project_id }: DateRangeParams): Promise<CountryData[]> {
  const data = await fetchReportData('audience', startDate, endDate, project_id);
  const countries = data?.countries || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return countries.map((country: any) => ({
    ...country,
    name: translateCountryName(country.name)
  }));
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
  const rows = data?.hourlyByDate || [];

  return rows.map((row: HourlyByDateRow) => {
    // 解析 YYYYMMDD 或 YYYY-MM-DD
    const dateStr = row.date.includes('-') 
      ? row.date 
      : `${row.date.slice(0, 4)}-${row.date.slice(4, 6)}-${row.date.slice(6, 8)}`;
    
    const dateObj = new Date(dateStr);
    const day = dateObj.getDay(); // 0 (週日) 到 6 (週六)
    const isWeekend = day === 0 || day === 6;
    
    // 取得簡短星期名稱 (週一, 週二...)
    const weekday = new Intl.DateTimeFormat('zh-TW', { weekday: 'short' }).format(dateObj);
    
    return {
      ...row,
      label: `${row.label} (${weekday})`,
      isWeekend
    };
  });
}

/**
 * 取得區塊排行資料
 */
export async function getSectionData({ startDate, endDate, project_id }: DateRangeParams): Promise<SectionData[]> {
  const data = await fetchReportData('engagement', startDate, endDate, project_id);
  return data?.sections || [];
}

/**
 * 取得瀏覽器資料
 */
export async function getBrowserData({ startDate, endDate, project_id }: DateRangeParams): Promise<BrowserData[]> {
  const data = await fetchReportData('tech', startDate, endDate, project_id);
  return data?.browsers || [];
}

export async function getScreenData({ startDate, endDate, project_id }: DateRangeParams): Promise<ScreenData[]> {
  const data = await fetchReportData('tech', startDate, endDate, project_id);
  return data?.screens || [];
}

/**
 * 取得疑似爬蟲資料
 */
export async function getBotData({ startDate, endDate, project_id }: DateRangeParams): Promise<BotData[]> {
  const data = await fetchReportData('tech', startDate, endDate, project_id);
  return data?.bots || [];
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
