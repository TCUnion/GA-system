import React from 'react';

/**
 * 覆蓋全頁內容資料載入中的動畫遮罩
 */
const PageLoader: React.FC = () => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] rounded-xl flex-col gap-4">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      <div className="text-slate-300 font-medium text-sm tracking-widest animate-pulse drop-shadow-md">
        資料載入中...
      </div>
    </div>
  );
};

export default PageLoader;
