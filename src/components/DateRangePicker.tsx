import { useState, useEffect, useRef } from 'react';
import './DateRangePicker.css';

interface DateRangePickerProps {
  initialStartDate: string;
  initialEndDate: string;
  onChange?: (start: string, end: string) => void;
}

type PresetType = 'today' | 'yesterday' | 'last7days' | 'last14days' | 'custom';

// 取得 YYYY-MM-DD 格式
const getFormattedDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function DateRangePicker({ initialStartDate, initialEndDate, onChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<PresetType>('last7days');

  // NOTE: 點擊外部關閉 popover，避免使用者需要手動找到取消按鈕
  const containerRef = useRef<HTMLDivElement>(null);

  // 如果從外部動態改變 initial 值，則更新內部狀態
  useEffect(() => {
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  // NOTE: 監聽 mousedown 而非 click，確保在點擊 popover 內的 input 時不會觸發關閉
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };

    // NOTE: 稍微延遲綁定，避免觸發按鈕本身的 click 直接關閉
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, initialStartDate, initialEndDate]);

  // NOTE: Escape 鍵關閉 popover，符合鍵盤無障礙操作規範
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handlePresetClick = (p: PresetType) => {
    setPreset(p);
    const today = new Date();
    let newStart = '';
    let newEnd = getFormattedDate(today);

    switch (p) {
      case 'today':
        newStart = newEnd;
        break;
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        newStart = getFormattedDate(y);
        newEnd = newStart;
        break;
      }
      case 'last7days': {
        const d7 = new Date(today);
        d7.setDate(d7.getDate() - 6);
        newStart = getFormattedDate(d7);
        break;
      }
      case 'last14days': {
        const d14 = new Date(today);
        d14.setDate(d14.getDate() - 13);
        newStart = getFormattedDate(d14);
        break;
      }
      case 'custom':
        // 自訂日期模式下，保留先前的 startDate 和 endDate 不更動
        return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleApply = () => {
    setIsOpen(false);
    if (onChange) {
      onChange(startDate, endDate);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  };

  // NOTE: 計算觸發按鈕的日期文字顯示，依 preset 給予更友善的標籤
  const getTriggerLabel = (): string => {
    switch (preset) {
      case 'today': return '今天';
      case 'yesterday': return '昨天';
      case 'last7days': return '最近 7 天';
      case 'last14days': return '最近 14 天';
      default:
        return `${startDate.replace(/-/g, '/')} — ${endDate.replace(/-/g, '/')}`;
    }
  };

  return (
    <div className="date-picker-container" ref={containerRef}>
      <button
        className={`date-picker-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="選擇日期範圍"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* NOTE: 行事曆 SVG 圖示取代 📅 emoji */}
        <svg className="trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="date-text">{getTriggerLabel()}</span>
        {/* NOTE: Chevron SVG 取代 ▼ 字元，並加入開閉動畫 */}
        <svg className={`trigger-chevron ${isOpen ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 手機版底層遮罩 */}
          <div className="date-picker-overlay" aria-hidden="true" />
          <div
            className="date-picker-popover"
            role="dialog"
            aria-label="選擇日期範圍"
          >
            <div className="date-picker-header">
              <h4>選擇報告區間</h4>
              <button className="date-picker-close" onClick={handleCancel} aria-label="關閉">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="date-picker-body-split">
              <div className="date-picker-presets">
                <button className={preset === 'today' ? 'active' : ''} onClick={() => handlePresetClick('today')}>今天</button>
                <button className={preset === 'yesterday' ? 'active' : ''} onClick={() => handlePresetClick('yesterday')}>昨天</button>
                <button className={preset === 'last7days' ? 'active' : ''} onClick={() => handlePresetClick('last7days')}>前 7 天</button>
                <button className={preset === 'last14days' ? 'active' : ''} onClick={() => handlePresetClick('last14days')}>前 14 天</button>
                <button className={preset === 'custom' ? 'active' : ''} onClick={() => handlePresetClick('custom')}>自訂日期</button>
              </div>

              {preset === 'custom' ? (
                <div className="date-picker-custom-inputs">
                  <div className="date-input-group">
                    <label>開始日期</label>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPreset('custom');
                      }}
                    />
                  </div>
                  <div className="date-input-group">
                    <label>結束日期</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={getFormattedDate(new Date())}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPreset('custom');
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="date-picker-custom-inputs" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                  <div className="date-input-group">
                    <label>開始日期</label>
                    <input type="date" value={startDate} readOnly />
                  </div>
                  <div className="date-input-group">
                    <label>結束日期</label>
                    <input type="date" value={endDate} readOnly />
                  </div>
                </div>
              )}
            </div>
            <div className="date-picker-footer">
              <button className="btn-cancel" onClick={handleCancel}>取消</button>
              <button className="btn-apply" onClick={handleApply}>套用</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
