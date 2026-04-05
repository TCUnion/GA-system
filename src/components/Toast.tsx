import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

/**
 * Toast 通知元件
 * 3 秒後自動消失，取代 alert()
 */
function Toast({ message, type, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 觸發進場動畫
    const enterTimer = requestAnimationFrame(() => setVisible(true));
    // 3 秒後自動退場
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // 等退場動畫結束再移除
    }, 3000);
    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`toast toast--${type} ${visible ? 'toast--visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast__icon" aria-hidden="true">
        {type === 'success' ? (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 8 6 12 14 4" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="7" />
            <line x1="8" y1="5" x2="8" y2="8" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" />
          </svg>
        )}
      </span>
      <span className="toast__message">{message}</span>
    </div>
  );
}

// --- Toast 容器 & 狀態管理 ---

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0;
type ToastListener = (toasts: ToastItem[]) => void;
const listeners = new Set<ToastListener>();
let toasts: ToastItem[] = [];

function notify(listeners: Set<ToastListener>, newToasts: ToastItem[]) {
  toasts = newToasts;
  listeners.forEach((fn) => fn(newToasts));
}

/** 顯示一則 Toast 通知 */
export function showToast(message: string, type: ToastType = 'success') {
  const id = ++toastIdCounter;
  notify(listeners, [...toasts, { id, message, type }]);
}

function removeToast(id: number) {
  notify(listeners, toasts.filter((t) => t.id !== id));
}

/** Toast 容器，放置於 Layout 根層 */
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-container" aria-label="通知區域">
      {items.map((item) => (
        <Toast
          key={item.id}
          message={item.message}
          type={item.type}
          onDismiss={() => removeToast(item.id)}
        />
      ))}
    </div>
  );
}

export default Toast;
