-- 效能優化索引 — 2026-04-04
-- 請在 Supabase SQL Editor 或 psql 中執行

-- 1. ga4_cache: 修正 NULL project_id 造成的 upsert 重複問題，並支援 TTL 排序查詢
--    PostgreSQL 預設 unique constraint 允許多個 NULL（每個 NULL 視為不同值），
--    NULLS NOT DISTINCT 讓 NULL 也被視為相等，確保每個 (report_type, project_id=NULL) 只有一筆。
create unique index concurrently if not exists ga4_cache_report_type_project_id_uidx
    on public.ga4_cache (report_type, project_id) nulls not distinct;

-- 2. ga4_cache: 支援 get_cache 的 ORDER BY fetched_at DESC LIMIT 1 查詢
create index concurrently if not exists ga4_cache_report_type_project_id_fetched_at_idx
    on public.ga4_cache (report_type, project_id, fetched_at desc);

-- 3. projects: 加速 is_active = true 的過濾查詢（partial index）
create index concurrently if not exists projects_is_active_true_idx
    on public.projects (is_active) where is_active = true;
