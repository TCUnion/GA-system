-- =============================================
-- Migration 002: 多專案 + 使用者權限系統
-- 在 Supabase SQL Editor 中執行此腳本
-- =============================================

-- =============================================
-- 1. 使用者 Profile 表（擴展 auth.users，記錄角色）
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 新使用者建立時自動建立 profile（with viewer 角色）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 2. 專案表（每個 GA4 Property = 一個專案）
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 顯示名稱（例：南庄山水）
  ga_property_id TEXT NOT NULL,          -- GA4 Property ID
  description TEXT,
  color TEXT DEFAULT '#3b82f6',          -- UI 識別色（hex）
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. 使用者↔專案 多對多授權表
-- =============================================
CREATE TABLE IF NOT EXISTS user_project_permissions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

-- =============================================
-- 4. 現有快取表加入 project_id 欄位
-- =============================================

-- ga4_cache：移除舊 unique constraint，改為 (report_type, project_id)
ALTER TABLE ga4_cache
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- 先移除舊 unique constraint（若存在）
ALTER TABLE ga4_cache
  DROP CONSTRAINT IF EXISTS ga4_cache_report_type_unique;

-- 新增複合 unique constraint
ALTER TABLE ga4_cache
  DROP CONSTRAINT IF EXISTS ga4_cache_report_type_project_unique;
ALTER TABLE ga4_cache
  ADD CONSTRAINT ga4_cache_report_type_project_unique
    UNIQUE (report_type, project_id);

-- ga4_daily_snapshot：加入 project_id
ALTER TABLE ga4_daily_snapshot
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE ga4_daily_snapshot
  DROP CONSTRAINT IF EXISTS ga4_daily_snapshot_date_unique;
ALTER TABLE ga4_daily_snapshot
  DROP CONSTRAINT IF EXISTS ga4_daily_snapshot_date_project_unique;
ALTER TABLE ga4_daily_snapshot
  ADD CONSTRAINT ga4_daily_snapshot_date_project_unique
    UNIQUE (snapshot_date, project_id);

-- =============================================
-- 5. 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ga4_cache_project ON ga4_cache (project_id);
CREATE INDEX IF NOT EXISTS idx_ga4_daily_snapshot_project ON ga4_daily_snapshot (project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_perms_user ON user_project_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_perms_project ON user_project_permissions (project_id);

-- =============================================
-- 6. RLS 策略 (修正 Infinite Recursion)
-- =============================================

-- 建立一個繞過 RLS 的 Security Definer 函數，用來檢查 admin 權限
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- profiles：啟用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 使用者只能看自己的 profile
CREATE POLICY "使用者可讀自己的 profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 管理員可讀全部 profiles (改用 is_admin 避免無限迴圈)
DROP POLICY IF EXISTS "管理員可讀所有 profile" ON profiles;
CREATE POLICY "管理員可讀所有 profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- projects：啟用 RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 已登入使用者可讀「自己有權限」的專案
DROP POLICY IF EXISTS "使用者只能看有權限的專案" ON projects;
CREATE POLICY "使用者只能看有權限的專案"
  ON projects FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR
    EXISTS (
      SELECT 1 FROM user_project_permissions upp
      WHERE upp.user_id = auth.uid() AND upp.project_id = projects.id
    )
  );

-- user_project_permissions：啟用 RLS
ALTER TABLE user_project_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "使用者只能看自己的授權記錄" ON user_project_permissions;
CREATE POLICY "使用者只能看自己的授權記錄"
  ON user_project_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    is_admin()
  );

-- 更新 ga4_cache RLS
DROP POLICY IF EXISTS "允許匿名讀取 ga4_cache" ON ga4_cache;
DROP POLICY IF EXISTS "已登入使用者可讀有授權的快取" ON ga4_cache;
CREATE POLICY "已登入使用者可讀有授權的快取"
  ON ga4_cache FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM user_project_permissions upp
      WHERE upp.user_id = auth.uid() AND upp.project_id = ga4_cache.project_id
    )
  );

-- 更新 ga4_daily_snapshot RLS
DROP POLICY IF EXISTS "允許匿名讀取 ga4_daily_snapshot" ON ga4_daily_snapshot;
DROP POLICY IF EXISTS "已登入使用者可讀有授權的快照" ON ga4_daily_snapshot;
CREATE POLICY "已登入使用者可讀有授權的快照"
  ON ga4_daily_snapshot FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM user_project_permissions upp
      WHERE upp.user_id = auth.uid() AND upp.project_id = ga4_daily_snapshot.project_id
    )
  );

-- =============================================
-- 7. 初始資料 Seed
-- =============================================

-- 建立「南庄山水」初始專案
INSERT INTO projects (id, name, ga_property_id, description, color)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '南庄山水',
  '529541216',
  '南庄山水越野賽事官方網站',
  '#3b82f6'
)
ON CONFLICT (id) DO NOTHING;

-- 將現有 ga4_cache 舊資料補上 project_id
UPDATE ga4_cache
SET project_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE project_id IS NULL;

-- 將現有 ga4_daily_snapshot 舊資料補上 project_id
UPDATE ga4_daily_snapshot
SET project_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE project_id IS NULL;

-- 將 service@tsu.com.tw 設為 admin（需在建立帳號後執行才有效）
-- NOTE: 先建立 profile（若 trigger 尚未建立時手動建立的帳號可能沒有 profile）
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'service@tsu.com.tw'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 授權 service@tsu.com.tw 存取南庄山水專案
INSERT INTO user_project_permissions (user_id, project_id)
SELECT
  u.id,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
FROM auth.users u
WHERE u.email = 'service@tsu.com.tw'
ON CONFLICT (user_id, project_id) DO NOTHING;
