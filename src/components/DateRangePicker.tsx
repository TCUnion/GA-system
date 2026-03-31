import { useState, useEffect } from 'react';
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

  // 如果從外部動態改變 initial 值，則更新內部狀態
  useEffect(() => {
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

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
        // 自訂日期模式下，保留先前的 startDate 和 endDate 免費更動
        return;
    }
    
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleApply = () => {
    setIsOpen(false);
    if (onChange) {
      onChange(startDate, endDate);
    } else {
      alert(`已選擇日期：${startDate} 至 ${endDate}\n(API 尚未串接動態日期，此為模擬展示)`);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
    // 預設回復到 last7days 如果想做得很精準可以比較日期，這裡簡化處理
    // 不在此處改 preset，以維持下次打開還是原本的預設為主
  };

  return (
    <div className="date-picker-container">
      <button 
        className="date-picker-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title="選擇日期範圍"
      >
        <span className="icon">📅</span>
        <span className="date-text">{startDate.replace(/-/g, '/')} — {endDate.replace(/-/g, '/')}</span>
        <span className="arrow">▼</span>
      </button>

      {isOpen && (
        <div className="date-picker-popover">
          <div className="date-picker-header">
            <h4>選擇報告區間</h4>
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
      )}
    </div>
  );
}
