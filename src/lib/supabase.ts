import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 客戶端設定
 *
 * NOTE: 僅使用 ANON_KEY 連線，所有資料存取依賴 RLS 策略控制
 * SERVICE_ROLE_KEY 絕對不可在前端使用
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少 Supabase 環境變數，請檢查 .env 檔案');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
