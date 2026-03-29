/**
 * 南庄山水 GA4 儀表板 — 模擬數據
 * NOTE: 此模擬資料結構對應 GA4 Data API 回傳格式，
 *       後續串接真實 API 時只需替換資料來源即可。
 */

// --- 日期工具 ---
const generateDates = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// --- KPI 摘要 ---
export interface KpiData {
  label: string;
  value: number;
  previousValue: number;
  format: 'number' | 'percent' | 'duration' | 'decimal';
  icon: string;
}

export const kpiData: KpiData[] = [
  { label: '瀏覽量', value: 28456, previousValue: 24120, format: 'number', icon: '👀' },
  { label: '使用者', value: 12840, previousValue: 11200, format: 'number', icon: '👥' },
  { label: '新使用者', value: 9650, previousValue: 8430, format: 'number', icon: '🆕' },
  { label: '參與率', value: 62.8, previousValue: 58.3, format: 'percent', icon: '📊' },
  { label: '平均停留時間', value: 185, previousValue: 162, format: 'duration', icon: '⏱️' },
  { label: '每位使用者工作階段', value: 1.68, previousValue: 1.54, format: 'decimal', icon: '🔄' },
];

// --- 每日流量趨勢 ---
export interface DailyTraffic {
  date: string;
  label: string;
  users: number;
  views: number;
  sessions: number;
  newUsers: number;
}

const dates = generateDates(30);
export const dailyTrafficData: DailyTraffic[] = dates.map((date, i) => {
  // 模擬週末流量較高的真實趨勢
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const baseUsers = isWeekend ? 520 : 380;
  const noise = Math.sin(i * 0.5) * 60 + Math.random() * 80;
  const trend = i * 3; // 逐漸上升的趨勢

  const users = Math.round(baseUsers + noise + trend);
  return {
    date,
    label: formatDateLabel(date),
    users,
    views: Math.round(users * (2.1 + Math.random() * 0.4)),
    sessions: Math.round(users * (1.3 + Math.random() * 0.3)),
    newUsers: Math.round(users * (0.65 + Math.random() * 0.15)),
  };
});

// --- 流量管道來源 ---
export interface ChannelData {
  name: string;
  sessions: number;
  users: number;
  engagementRate: number;
  avgDuration: number;
  color: string;
}

export const channelData: ChannelData[] = [
  { name: 'Organic Search', sessions: 6842, users: 5230, engagementRate: 68.5, avgDuration: 210, color: 'var(--chart-1)' },
  { name: 'Direct', sessions: 4520, users: 3410, engagementRate: 72.1, avgDuration: 245, color: 'var(--chart-2)' },
  { name: 'Social', sessions: 3890, users: 3120, engagementRate: 45.2, avgDuration: 125, color: 'var(--chart-3)' },
  { name: 'Referral', sessions: 1560, users: 1240, engagementRate: 58.8, avgDuration: 180, color: 'var(--chart-4)' },
  { name: 'Paid Search', sessions: 890, users: 780, engagementRate: 52.3, avgDuration: 155, color: 'var(--chart-5)' },
  { name: 'Email', sessions: 420, users: 360, engagementRate: 78.6, avgDuration: 290, color: 'var(--chart-6)' },
];

// --- 來源/媒介明細 ---
export interface SourceMediumData {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  newUsers: number;
  engagementRate: number;
  avgDuration: number;
}

export const sourceMediumData: SourceMediumData[] = [
  { source: 'google', medium: 'organic', sessions: 5620, users: 4310, newUsers: 3200, engagementRate: 69.2, avgDuration: 215 },
  { source: '(direct)', medium: '(none)', sessions: 4520, users: 3410, newUsers: 1890, engagementRate: 72.1, avgDuration: 245 },
  { source: 'facebook.com', medium: 'referral', sessions: 2340, users: 1980, newUsers: 1650, engagementRate: 42.8, avgDuration: 110 },
  { source: 'instagram.com', medium: 'referral', sessions: 1120, users: 950, newUsers: 820, engagementRate: 38.5, avgDuration: 95 },
  { source: 'line.me', medium: 'referral', sessions: 890, users: 780, newUsers: 450, engagementRate: 65.3, avgDuration: 195 },
  { source: 'yahoo', medium: 'organic', sessions: 780, users: 620, newUsers: 480, engagementRate: 61.7, avgDuration: 185 },
  { source: 'google', medium: 'cpc', sessions: 650, users: 580, newUsers: 520, engagementRate: 52.3, avgDuration: 155 },
  { source: 'bing', medium: 'organic', sessions: 442, users: 380, newUsers: 310, engagementRate: 64.8, avgDuration: 190 },
  { source: 'newsletter', medium: 'email', sessions: 420, users: 360, newUsers: 120, engagementRate: 78.6, avgDuration: 290 },
  { source: 'ptt.cc', medium: 'referral', sessions: 280, users: 250, newUsers: 210, engagementRate: 55.2, avgDuration: 165 },
];

// --- 裝置類型 ---
export interface DeviceData {
  name: string;
  users: number;
  sessions: number;
  engagementRate: number;
  color: string;
}

export const deviceData: DeviceData[] = [
  { name: '手機', users: 8320, sessions: 11200, engagementRate: 55.2, color: 'var(--chart-1)' },
  { name: '桌機', users: 3680, sessions: 5400, engagementRate: 74.8, color: 'var(--chart-2)' },
  { name: '平板', users: 840, sessions: 1100, engagementRate: 62.1, color: 'var(--chart-3)' },
];

// --- 瀏覽器分佈 ---
export interface BrowserData {
  name: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

export const browserData: BrowserData[] = [
  { name: 'Chrome', users: 5840, sessions: 8200, engagementRate: 63.5 },
  { name: 'Safari', users: 4120, sessions: 5600, engagementRate: 58.2 },
  { name: 'Edge', users: 1280, sessions: 1800, engagementRate: 71.3 },
  { name: 'Firefox', users: 820, sessions: 1100, engagementRate: 66.8 },
  { name: 'Samsung Internet', users: 480, sessions: 650, engagementRate: 48.5 },
  { name: '其他', users: 300, sessions: 420, engagementRate: 42.1 },
];

// --- 作業系統 ---
export interface OsData {
  name: string;
  users: number;
  color: string;
}

export const osData: OsData[] = [
  { name: 'Android', users: 5420, color: 'var(--chart-2)' },
  { name: 'iOS', users: 3780, color: 'var(--chart-1)' },
  { name: 'Windows', users: 2640, color: 'var(--chart-3)' },
  { name: 'macOS', users: 780, color: 'var(--chart-4)' },
  { name: 'Linux', users: 220, color: 'var(--chart-5)' },
];

// --- 城市分佈 ---
export interface CityData {
  city: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

export const cityData: CityData[] = [
  { city: '台北市', users: 3250, sessions: 4800, engagementRate: 65.2 },
  { city: '新北市', users: 2180, sessions: 3100, engagementRate: 62.8 },
  { city: '台中市', users: 1560, sessions: 2200, engagementRate: 58.5 },
  { city: '桃園市', users: 1240, sessions: 1780, engagementRate: 60.1 },
  { city: '高雄市', users: 1080, sessions: 1520, engagementRate: 56.3 },
  { city: '新竹市', users: 920, sessions: 1340, engagementRate: 68.7 },
  { city: '苗栗縣', users: 850, sessions: 1260, engagementRate: 72.4 },
  { city: '台南市', users: 680, sessions: 950, engagementRate: 54.8 },
  { city: '新竹縣', users: 540, sessions: 780, engagementRate: 70.2 },
  { city: '彰化縣', users: 340, sessions: 480, engagementRate: 51.6 },
];

// --- 熱門頁面 ---
export interface PageData {
  pageTitle: string;
  pagePath: string;
  views: number;
  users: number;
  avgDuration: number;
  bounceRate: number;
}

export const pageData: PageData[] = [
  { pageTitle: '首頁 | 南庄山水', pagePath: '/', views: 8920, users: 6450, avgDuration: 45, bounceRate: 35.2 },
  { pageTitle: '行程介紹 | 南庄山水', pagePath: '/tours', views: 4560, users: 3280, avgDuration: 185, bounceRate: 22.8 },
  { pageTitle: '線上預約 | 南庄山水', pagePath: '/booking', views: 3240, users: 2450, avgDuration: 210, bounceRate: 18.5 },
  { pageTitle: '南庄老街導覽 | 南庄山水', pagePath: '/tours/old-street', views: 2890, users: 2120, avgDuration: 165, bounceRate: 25.3 },
  { pageTitle: '向天湖步道 | 南庄山水', pagePath: '/tours/sky-lake', views: 2340, users: 1780, avgDuration: 195, bounceRate: 20.1 },
  { pageTitle: '關於我們 | 南庄山水', pagePath: '/about', views: 1980, users: 1520, avgDuration: 120, bounceRate: 42.6 },
  { pageTitle: '住宿資訊 | 南庄山水', pagePath: '/accommodation', views: 1650, users: 1280, avgDuration: 155, bounceRate: 28.4 },
  { pageTitle: '交通指南 | 南庄山水', pagePath: '/transport', views: 1420, users: 1100, avgDuration: 95, bounceRate: 38.7 },
  { pageTitle: '賽事活動 | 南庄山水', pagePath: '/events', views: 1180, users: 920, avgDuration: 175, bounceRate: 21.5 },
  { pageTitle: '常見問題 | 南庄山水', pagePath: '/faq', views: 780, users: 620, avgDuration: 85, bounceRate: 45.3 },
];

// --- 到達頁面 ---
export const landingPageData: PageData[] = [
  { pageTitle: '首頁', pagePath: '/', views: 6420, users: 5200, avgDuration: 45, bounceRate: 35.2 },
  { pageTitle: '行程介紹', pagePath: '/tours', views: 2890, users: 2340, avgDuration: 185, bounceRate: 22.8 },
  { pageTitle: '南庄老街導覽', pagePath: '/tours/old-street', views: 1560, users: 1280, avgDuration: 165, bounceRate: 25.3 },
  { pageTitle: '向天湖步道', pagePath: '/tours/sky-lake', views: 1120, users: 920, avgDuration: 195, bounceRate: 20.1 },
  { pageTitle: '賽事活動', pagePath: '/events', views: 850, users: 720, avgDuration: 175, bounceRate: 21.5 },
];

// --- 事件資料 ---
export interface EventData {
  eventName: string;
  eventCount: number;
  users: number;
}

export const eventData: EventData[] = [
  { eventName: 'page_view', eventCount: 28456, users: 12840 },
  { eventName: 'scroll', eventCount: 18920, users: 9450 },
  { eventName: 'click', eventCount: 12680, users: 8200 },
  { eventName: 'session_start', eventCount: 15200, users: 12840 },
  { eventName: 'first_visit', eventCount: 9650, users: 9650 },
  { eventName: 'view_item', eventCount: 6840, users: 4520 },
  { eventName: 'begin_checkout', eventCount: 2450, users: 1890 },
  { eventName: 'purchase', eventCount: 1280, users: 1050 },
  { eventName: 'form_submit', eventCount: 980, users: 820 },
  { eventName: 'share', eventCount: 560, users: 420 },
];

// --- 每週流量分佈 ---
export interface WeekdayData {
  day: string;
  sessions: number;
  users: number;
}

export const weekdayData: WeekdayData[] = [
  { day: '週一', sessions: 2120, users: 1680 },
  { day: '週二', sessions: 2340, users: 1850 },
  { day: '週三', sessions: 2280, users: 1790 },
  { day: '週四', sessions: 2450, users: 1920 },
  { day: '週五', sessions: 2680, users: 2100 },
  { day: '週六', sessions: 3420, users: 2650 },
  { day: '週日', sessions: 3180, users: 2450 },
];

// --- 每小時流量分佈 ---
export interface HourlyData {
  hour: string;
  sessions: number;
}

export const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => {
  // 模擬真實的每小時流量模式
  const hourPatterns = [
    120, 80, 55, 40, 35, 45, 80, 180, 350, 520,
    620, 680, 750, 710, 680, 640, 580, 520, 480,
    560, 620, 520, 380, 220,
  ];
  return {
    hour: `${i.toString().padStart(2, '0')}:00`,
    sessions: hourPatterns[i] + Math.round(Math.random() * 50),
  };
});

// --- 螢幕解析度 ---
export interface ScreenData {
  resolution: string;
  users: number;
}

export const screenData: ScreenData[] = [
  { resolution: '393x873', users: 2840 },
  { resolution: '390x844', users: 2120 },
  { resolution: '1920x1080', users: 1680 },
  { resolution: '414x896', users: 1420 },
  { resolution: '1536x864', users: 980 },
  { resolution: '360x800', users: 850 },
  { resolution: '1440x900', users: 720 },
  { resolution: '375x812', users: 680 },
  { resolution: '2560x1440', users: 420 },
  { resolution: '768x1024', users: 380 },
];

// --- 語言分佈 ---
export interface LanguageData {
  language: string;
  users: number;
  color: string;
}

export const languageData: LanguageData[] = [
  { language: '繁體中文', users: 10820, color: 'var(--chart-1)' },
  { language: '英文', users: 1240, color: 'var(--chart-2)' },
  { language: '日文', users: 420, color: 'var(--chart-3)' },
  { language: '簡體中文', users: 280, color: 'var(--chart-4)' },
  { language: '其他', users: 80, color: 'var(--chart-5)' },
];

// --- 社群媒體來源 ---
export interface SocialData {
  platform: string;
  sessions: number;
  users: number;
  engagementRate: number;
}

export const socialData: SocialData[] = [
  { platform: 'Facebook', sessions: 2340, users: 1980, engagementRate: 42.8 },
  { platform: 'Instagram', sessions: 1120, users: 950, engagementRate: 38.5 },
  { platform: 'LINE', sessions: 890, users: 780, engagementRate: 65.3 },
  { platform: 'YouTube', sessions: 320, users: 280, engagementRate: 52.1 },
  { platform: 'Twitter/X', sessions: 180, users: 150, engagementRate: 35.2 },
  { platform: 'PTT', sessions: 280, users: 250, engagementRate: 55.2 },
];
