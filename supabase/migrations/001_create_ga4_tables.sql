-- =============================================
-- 南庄山水 GA4 儀表板 — Supabase 資料表結構
-- 在 Supabase SQL Editor 中執行此腳本
-- =============================================

-- 1. GA4 快取主表：儲存各類報表的 JSON 資料
CREATE TABLE IF NOT EXISTS ga4_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,           -- 'overview', 'audience', 'acquisition', 'content', 'engagement', 'tech'
  data JSONB NOT NULL,                 -- 完整報表資料（JSON 格式）
  fetched_at TIMESTAMPTZ DEFAULT NOW(),-- 抓取時間
  expires_at TIMESTAMPTZ,              -- 快取過期時間
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 每種報表類型只保留一筆最新快取
  CONSTRAINT ga4_cache_report_type_unique UNIQUE (report_type)
);

-- 2. GA4 每日快照：保留歷史資料供趨勢分析
CREATE TABLE IF NOT EXISTS ga4_daily_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  avg_session_duration NUMERIC(10, 2) DEFAULT 0,
  bounce_rate NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT ga4_daily_snapshot_date_unique UNIQUE (snapshot_date)
);

-- 3. GA4 頁面熱度：追蹤各頁面表現
CREATE TABLE IF NOT EXISTS ga4_page_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  views INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  avg_duration NUMERIC(10, 2) DEFAULT 0,
  bounce_rate NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT ga4_page_stats_unique UNIQUE (snapshot_date, page_path)
);

-- 4. GA4 流量來源：追蹤各管道表現
CREATE TABLE IF NOT EXISTS ga4_traffic_source (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5, 2) DEFAULT 0,
  avg_duration NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT ga4_traffic_source_unique UNIQUE (snapshot_date, source, medium)
);

-- =============================================
-- RLS 策略：啟用行級安全性
-- =============================================

-- 啟用 RLS
ALTER TABLE ga4_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga4_daily_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga4_page_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga4_traffic_source ENABLE ROW LEVEL SECURITY;

-- NOTE: 儀表板為內部工具，允許匿名讀取快取資料
-- 寫入僅允許 service_role（後端排程使用）
CREATE POLICY "允許匿名讀取 ga4_cache"
  ON ga4_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "允許匿名讀取 ga4_daily_snapshot"
  ON ga4_daily_snapshot FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "允許匿名讀取 ga4_page_stats"
  ON ga4_page_stats FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "允許匿名讀取 ga4_traffic_source"
  ON ga4_traffic_source FOR SELECT
  TO anon, authenticated
  USING (true);

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_ga4_cache_report_type ON ga4_cache (report_type);
CREATE INDEX IF NOT EXISTS idx_ga4_daily_snapshot_date ON ga4_daily_snapshot (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_page_stats_date ON ga4_page_stats (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_traffic_source_date ON ga4_traffic_source (snapshot_date DESC);

-- =============================================
-- 插入模擬資料（用於初始展示）
-- =============================================

-- 插入快取資料（總覽）
INSERT INTO ga4_cache (report_type, data, expires_at) VALUES
('overview', '{
  "kpi": {
    "totalUsers": 12847,
    "newUsers": 9231,
    "sessions": 18432,
    "pageviews": 45123,
    "avgSessionDuration": 187,
    "bounceRate": 32.5
  },
  "previousKpi": {
    "totalUsers": 11200,
    "newUsers": 7800,
    "sessions": 16500,
    "pageviews": 39800,
    "avgSessionDuration": 165,
    "bounceRate": 35.8
  }
}'::jsonb, NOW() + INTERVAL '30 minutes'),

('audience', '{
  "devices": [
    {"name": "手機", "users": 8193},
    {"name": "桌機", "users": 3847},
    {"name": "平板", "users": 807}
  ],
  "os": [
    {"name": "iOS", "users": 5234},
    {"name": "Android", "users": 3890},
    {"name": "Windows", "users": 2456},
    {"name": "macOS", "users": 987},
    {"name": "Linux", "users": 180}
  ],
  "languages": [
    {"language": "zh-TW", "users": 10234},
    {"language": "en-US", "users": 1523},
    {"language": "zh-CN", "users": 678},
    {"language": "ja", "users": 312},
    {"language": "ko", "users": 100}
  ],
  "cities": [
    {"city": "台北市", "users": 3245, "sessions": 4521, "engagementRate": 68.5},
    {"city": "新北市", "users": 2156, "sessions": 2987, "engagementRate": 62.3},
    {"city": "台中市", "users": 1678, "sessions": 2345, "engagementRate": 71.2},
    {"city": "高雄市", "users": 1234, "sessions": 1678, "engagementRate": 58.9},
    {"city": "新竹市", "users": 987, "sessions": 1345, "engagementRate": 73.1},
    {"city": "桃園市", "users": 876, "sessions": 1123, "engagementRate": 64.7},
    {"city": "台南市", "users": 765, "sessions": 998, "engagementRate": 60.2},
    {"city": "苗栗縣", "users": 654, "sessions": 892, "engagementRate": 75.8},
    {"city": "新竹縣", "users": 543, "sessions": 734, "engagementRate": 69.4},
    {"city": "彰化縣", "users": 432, "sessions": 587, "engagementRate": 55.6}
  ]
}'::jsonb, NOW() + INTERVAL '30 minutes'),

('acquisition', '{
  "channels": [
    {"name": "Organic Search", "sessions": 7523},
    {"name": "Direct", "sessions": 4231},
    {"name": "Social", "sessions": 3456},
    {"name": "Referral", "sessions": 2145},
    {"name": "Paid Search", "sessions": 876},
    {"name": "Email", "sessions": 201}
  ],
  "sourceMedium": [
    {"source": "google", "medium": "organic", "sessions": 6234, "users": 5123, "newUsers": 3890, "engagementRate": 72.3, "avgDuration": 198},
    {"source": "(direct)", "medium": "(none)", "sessions": 4231, "users": 3456, "newUsers": 1234, "engagementRate": 58.9, "avgDuration": 145},
    {"source": "facebook.com", "medium": "referral", "sessions": 2134, "users": 1876, "newUsers": 1567, "engagementRate": 45.6, "avgDuration": 87},
    {"source": "line.me", "medium": "social", "sessions": 1876, "users": 1654, "newUsers": 1234, "engagementRate": 52.3, "avgDuration": 112},
    {"source": "instagram.com", "medium": "social", "sessions": 987, "users": 876, "newUsers": 765, "engagementRate": 38.9, "avgDuration": 67}
  ],
  "social": [
    {"platform": "Facebook", "sessions": 2134},
    {"platform": "LINE", "sessions": 1876},
    {"platform": "Instagram", "sessions": 987},
    {"platform": "YouTube", "sessions": 345},
    {"platform": "Twitter/X", "sessions": 114}
  ]
}'::jsonb, NOW() + INTERVAL '30 minutes'),

('content', '{
  "pages": [
    {"pageTitle": "首頁 | 南庄山水", "pagePath": "/", "views": 12456, "users": 8234, "avgDuration": 45, "bounceRate": 25.3},
    {"pageTitle": "2026 南庄山水越野賽", "pagePath": "/events/trail-2026", "views": 8765, "users": 6543, "avgDuration": 187, "bounceRate": 18.7},
    {"pageTitle": "南庄步道導覽地圖", "pagePath": "/trails/map", "views": 6543, "users": 4321, "avgDuration": 234, "bounceRate": 15.2},
    {"pageTitle": "賽事報名", "pagePath": "/registration", "views": 5432, "users": 3987, "avgDuration": 312, "bounceRate": 22.1},
    {"pageTitle": "交通與住宿資訊", "pagePath": "/info/transport", "views": 4321, "users": 3456, "avgDuration": 156, "bounceRate": 28.9},
    {"pageTitle": "賽事成績查詢", "pagePath": "/results", "views": 3876, "users": 2987, "avgDuration": 98, "bounceRate": 35.4},
    {"pageTitle": "關於南庄山水", "pagePath": "/about", "views": 2345, "users": 1876, "avgDuration": 123, "bounceRate": 42.1},
    {"pageTitle": "最新消息", "pagePath": "/news", "views": 1987, "users": 1543, "avgDuration": 87, "bounceRate": 38.7},
    {"pageTitle": "常見問題 FAQ", "pagePath": "/faq", "views": 1654, "users": 1234, "avgDuration": 145, "bounceRate": 30.2},
    {"pageTitle": "聯絡我們", "pagePath": "/contact", "views": 987, "users": 765, "avgDuration": 67, "bounceRate": 52.3}
  ],
  "landingPages": [
    {"pageTitle": "首頁 | 南庄山水", "pagePath": "/", "views": 8765, "users": 6543, "bounceRate": 25.3},
    {"pageTitle": "2026 南庄山水越野賽", "pagePath": "/events/trail-2026", "views": 4321, "users": 3456, "bounceRate": 18.7},
    {"pageTitle": "南庄步道導覽地圖", "pagePath": "/trails/map", "views": 2345, "users": 1876, "bounceRate": 15.2},
    {"pageTitle": "賽事報名", "pagePath": "/registration", "views": 1987, "users": 1543, "bounceRate": 22.1},
    {"pageTitle": "交通與住宿資訊", "pagePath": "/info/transport", "views": 876, "users": 654, "bounceRate": 28.9}
  ]
}'::jsonb, NOW() + INTERVAL '30 minutes'),

('engagement', '{
  "events": [
    {"eventName": "page_view", "eventCount": 45123, "users": 12847},
    {"eventName": "scroll", "eventCount": 32456, "users": 9876},
    {"eventName": "click", "eventCount": 18765, "users": 7654},
    {"eventName": "session_start", "eventCount": 18432, "users": 12847},
    {"eventName": "first_visit", "eventCount": 9231, "users": 9231},
    {"eventName": "form_submit", "eventCount": 2345, "users": 1876},
    {"eventName": "file_download", "eventCount": 876, "users": 654},
    {"eventName": "video_start", "eventCount": 543, "users": 432}
  ],
  "weekday": [
    {"day": "週一", "sessions": 2876},
    {"day": "週二", "sessions": 3123},
    {"day": "週三", "sessions": 2987},
    {"day": "週四", "sessions": 2654},
    {"day": "週五", "sessions": 2456},
    {"day": "週六", "sessions": 2234},
    {"day": "週日", "sessions": 2102}
  ],
  "hourly": [
    {"hour": "00", "sessions": 234}, {"hour": "01", "sessions": 156},
    {"hour": "02", "sessions": 98}, {"hour": "03", "sessions": 67},
    {"hour": "04", "sessions": 45}, {"hour": "05", "sessions": 78},
    {"hour": "06", "sessions": 234}, {"hour": "07", "sessions": 567},
    {"hour": "08", "sessions": 876}, {"hour": "09", "sessions": 1234},
    {"hour": "10", "sessions": 1456}, {"hour": "11", "sessions": 1345},
    {"hour": "12", "sessions": 1123}, {"hour": "13", "sessions": 1234},
    {"hour": "14", "sessions": 1345}, {"hour": "15", "sessions": 1234},
    {"hour": "16", "sessions": 1123}, {"hour": "17", "sessions": 987},
    {"hour": "18", "sessions": 876}, {"hour": "19", "sessions": 987},
    {"hour": "20", "sessions": 1123}, {"hour": "21", "sessions": 1234},
    {"hour": "22", "sessions": 876}, {"hour": "23", "sessions": 456}
  ]
}'::jsonb, NOW() + INTERVAL '30 minutes'),

('tech', '{
  "browsers": [
    {"name": "Chrome Mobile", "users": 5234, "sessions": 6789, "engagementRate": 68.5},
    {"name": "Safari Mobile", "users": 3456, "sessions": 4321, "engagementRate": 72.3},
    {"name": "Chrome", "users": 2345, "sessions": 3456, "engagementRate": 75.1},
    {"name": "Safari", "users": 987, "sessions": 1234, "engagementRate": 70.8},
    {"name": "Edge", "users": 456, "sessions": 567, "engagementRate": 62.4},
    {"name": "Firefox", "users": 234, "sessions": 345, "engagementRate": 58.9},
    {"name": "Samsung Internet", "users": 135, "sessions": 178, "engagementRate": 55.2}
  ],
  "screens": [
    {"resolution": "390x844", "users": 3456},
    {"resolution": "393x873", "users": 2345},
    {"resolution": "414x896", "users": 1876},
    {"resolution": "1920x1080", "users": 1567},
    {"resolution": "360x800", "users": 1234},
    {"resolution": "375x812", "users": 987},
    {"resolution": "1536x864", "users": 654},
    {"resolution": "1440x900", "users": 432},
    {"resolution": "412x915", "users": 345},
    {"resolution": "2560x1440", "users": 234}
  ]
}'::jsonb, NOW() + INTERVAL '30 minutes')

ON CONFLICT (report_type) DO UPDATE SET
  data = EXCLUDED.data,
  fetched_at = NOW(),
  expires_at = EXCLUDED.expires_at,
  updated_at = NOW();

-- 插入每日快照模擬資料（最近 30 天）
INSERT INTO ga4_daily_snapshot (snapshot_date, users, new_users, sessions, pageviews, avg_session_duration, bounce_rate)
SELECT
  (CURRENT_DATE - (gs || ' days')::INTERVAL)::DATE AS snapshot_date,
  (350 + floor(random() * 200))::INTEGER AS users,
  (250 + floor(random() * 150))::INTEGER AS new_users,
  (500 + floor(random() * 300))::INTEGER AS sessions,
  (1200 + floor(random() * 600))::INTEGER AS pageviews,
  (120 + floor(random() * 120))::NUMERIC AS avg_session_duration,
  (25 + random() * 20)::NUMERIC(5,2) AS bounce_rate
FROM generate_series(0, 29) AS gs
ON CONFLICT (snapshot_date) DO NOTHING;
