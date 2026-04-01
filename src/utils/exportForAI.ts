import {
  getOverviewKpi,
  getChannelData,
  getPageData,
  getCountryData,
  getDeviceData,
  type DateRangeParams
} from '../services/ga4Service';

/**
 * 取得 GA4 關鍵數據並格式化為 Markdown 格式的 AI 提示詞
 */
export async function generateAIPrompt(params: DateRangeParams): Promise<string> {
  // 並發取得整站關鍵報表
  const [
    overviewkpis,
    channels,
    pages,
    countries,
    devices
  ] = await Promise.all([
    getOverviewKpi(params),
    getChannelData(params),
    getPageData(params),
    getCountryData(params),
    getDeviceData(params)
  ]);

  const output: string[] = [];
  
  // 1. Prompt Header
  output.push(`# GA4 數據分析報告 (${params.startDate} ~ ${params.endDate})`);
  output.push('');
  output.push('請扮演一位資深的資料分析師與行銷專家。以下為該網站從 Google Analytics 4 (GA4) 取得的關鍵數據。');
  output.push('請根據這些數據，幫我：');
  output.push('1. 總結這段時間的流量表現與變化趨勢。');
  output.push('2. 點出主要的流量來源與熱門頁面。');
  output.push('3. 根據數據特徵，給出三個具體的後續優化或行銷建議。');
  output.push('');
  
  // 2. Overview KPI
  output.push('## 1. 總覽指標 (Overview KPI)');
  output.push('| 指標名稱 | 數值 | 上一期數值 | 變化趨勢 |');
  output.push('|---|---|---|---|');
  overviewkpis.forEach(kpi => {
    let diffStr = '0%';
    if (kpi.previousValue > 0) {
      const diff = ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100;
      const sign = diff >= 0 ? '+' : '';
      diffStr = `${sign}${diff.toFixed(1)}%`;
    }
    
    // 實作格式化函式
    const formatValue = (val: number, type: typeof kpi.format) => {
      if (type === 'percent') return `${val}%`;
      if (type === 'duration') return `${Math.floor(val / 60)}m ${Math.floor(val % 60)}s`;
      return val.toLocaleString('zh-TW');
    };

    const valStr = formatValue(kpi.value, kpi.format);
    const prevStr = formatValue(kpi.previousValue, kpi.format);
    
    output.push(`| ${kpi.label} | ${valStr} | ${prevStr} | ${diffStr} |`);
  });
  output.push('');

  // 3. Channels
  output.push('## 2. 管道分佈 (Top Channels)');
  output.push('| 管道名稱 | 工作階段 (Sessions) |');
  output.push('|---|---|');
  channels.slice(0, 10).forEach(ch => {
    output.push(`| ${ch.name} | ${ch.sessions.toLocaleString('zh-TW')} |`);
  });
  output.push('');

  // 4. Pages
  output.push('## 3. 熱門頁面 (Top 10 Pages)');
  output.push('| 網頁路徑 (含標題) | 瀏覽量 (Views) | 使用者數 (Users) |');
  output.push('|---|---|---|');
  pages.slice(0, 10).forEach(p => {
    // 避免標題內的 pipe 破壞 Markdown 表格結構
    const safeTitle = p.pageTitle.replace(/\|/g, '-').replace(/\n/g, ' ');
    output.push(`| [${safeTitle}](${p.pagePath}) | ${p.views.toLocaleString('zh-TW')} | ${p.users.toLocaleString('zh-TW')} |`);
  });
  output.push('');

  // 5. Audience
  output.push('## 4. 目標對象 (Audience)');
  output.push('### 裝置分佈');
  devices.forEach(d => {
    output.push(`- **${d.name}**: ${d.users.toLocaleString('zh-TW')} 名使用者`);
  });
  output.push('');
  
  output.push('### 國家排行 (Top 10)');
  output.push('| 國家名稱 | 使用者數 (Users) | 工作階段 (Sessions) |');
  output.push('|---|---|---|');
  countries.slice(0, 10).forEach(c => {
    output.push(`| ${c.name} | ${c.users.toLocaleString('zh-TW')} | ${c.sessions.toLocaleString('zh-TW')} |`);
  });
  output.push('');
  
  return output.join('\n');
}
