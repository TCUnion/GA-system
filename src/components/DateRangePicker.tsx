import { useState } from 'react';
import './DateRangePicker.css';

interface DateRangePickerProps {
  initialStartDate: string;
  initialEndDate: string;
  onChange?: (start: string, end: string) => void;
}

export default function DateRangePicker({ initialStartDate, initialEndDate, onChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    setIsOpen(false);
    if (onChange) {
      onChange(startDate, endDate);
    } else {
      alert('進階功能：即時自訂日期區間查詢將於後續開放，目前展示過去 30 天數據。');
      // Reset back to initial for now, acting as a mock
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
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
          <div className="date-picker-body">
            <div className="date-input-group">
              <label>開始日期</label>
              <input 
                type="date" 
                value={startDate} 
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            <div className="date-input-group">
              <label>結束日期</label>
              <input 
                type="date" 
                value={endDate}
                min={startDate}
                max={initialEndDate}
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
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
