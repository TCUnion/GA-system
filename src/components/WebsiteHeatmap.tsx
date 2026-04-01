import { useMemo } from 'react';
import './WebsiteHeatmap.css';

// 動態引入切割後的圖片以避開瀏覽器 GPU 高度限制
import part1 from '../assets/nanzhuang_heatmap_bg_part1.jpg';
import part2 from '../assets/nanzhuang_heatmap_bg_part2.jpg';

const imageChunks = [
  part1, part2
];

export interface HeatmapDataPoint {
  x: number;     // 水平位置 (百分比 0-100)
  y: number;     // 垂直位置 (原始解析度下的絕對像素 px)
  value: number; // 點擊總數 / 熱度權重 
}

interface WebsiteHeatmapProps {
  data: HeatmapDataPoint[];
}

export default function WebsiteHeatmap({ data }: WebsiteHeatmapProps) {
  // 取出最大值作為比較基準，計算每個紅點的相對熱度
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.value), 1);
  }, [data]);

  const originalHeight = 26388; // 新版雙圖片合併後總高度
  const originalWidth = 1280; // 新版原始截圖寬度

  return (
    <div className="website-heatmap-container">
      <div className="heatmap-scroll-wrapper">
        <div className="heatmap-image-wrapper">
          <div className="heatmap-images-container">
            {imageChunks.map((src, i) => (
              <img key={i} src={src} alt={`Website background part ${i+1}`} className="heatmap-image" />
            ))}
          </div>
          <div className="heatmap-overlay">
            {data.map((point, index) => {
              // 計算熱度強度 (0.0 - 1.0)
              const intensity = point.value / maxValue;
              // 範圍隨機放大，強度越強光環越大
              const sizePx = 150 + intensity * 200; 
              // 將原本以絕對 px 給定的熱點大小與 y 座標，轉為相對 wrapper 的百分比
              const sizePct = (sizePx / originalWidth) * 100;
              const topPct = (point.y / originalHeight) * 100;
              
              return (
                <div 
                  key={index}
                  className="heatmap-spot"
                  style={{
                    left: `${point.x}%`,
                    top: `${topPct}%`,
                    width: `${sizePct}%`,
                    aspectRatio: '1 / 1',
                    // 利用徑向漸層來模擬熱力圖效果，由內而外：紅 -> 橘 -> 綠 -> 透明
                    background: `radial-gradient(circle, 
                      rgba(239, 68, 68, ${0.8 * intensity + 0.2}) 0%, 
                      rgba(245, 158, 11, ${0.6 * intensity + 0.1}) 35%, 
                      rgba(34, 197, 94, ${0.4 * intensity + 0.1}) 65%, 
                      rgba(59, 130, 246, 0) 100%)`
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
