import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * 認證狀態 Context
 *
 * NOTE: 使用 Supabase Auth 管理 Email/Password 登入 Session
 * Session 由 SDK 自動持久化至 localStorage，頁面重新整理後仍維持登入狀態
 */

interface AuthState {
  /** 目前登入的使用者，null 表示未登入 */
  user: User | null;
  /** Session 物件，可取得 access_token */
  session: Session | null;
  /** 初始化中（防止閃爍）*/
  loading: boolean;
  /**
   * 登入
   * @param email 電子郵件
   * @param password 密碼
   * @returns 錯誤訊息字串，成功則為 null
   */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** 登出並清除 Session */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // NOTE: 初始化時 loading=true，等待 onAuthStateChange 第一次觸發後才設為 false
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化：取得當前 Session（頁面重新整理後恢復登入狀態）
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    // 監聽認證狀態變化（登入、登出、Token 刷新）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * 使用 Email + Password 登入
   * @returns null 表示成功，字串表示錯誤訊息
   */
  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // NOTE: 將 Supabase 英文錯誤訊息轉換為繁體中文友善提示
      if (error.message.includes('Invalid login credentials')) {
        return '電子郵件或密碼錯誤，請重新輸入';
      }
      if (error.message.includes('Email not confirmed')) {
        return '電子郵件尚未驗證，請確認信箱';
      }
      if (error.message.includes('Too many requests')) {
        return '登入嘗試次數過多，請稍後再試';
      }
      return `登入失敗：${error.message}`;
    }
    return null;
  }, []);

  /**
   * 登出，清除所有 Session 狀態
   */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 取得認證狀態的 Hook
 */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
