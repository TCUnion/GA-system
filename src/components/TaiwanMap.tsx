import React, { useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import type { CountyData } from '../services/ga4Service';

// 使用 g0v 提供之台灣縣市 GeoJSON (2010 版本，包含各縣市邊界)
const geoUrl = "https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json";

interface TaiwanMapProps {
  data: CountyData[];
  title?: string;
}

/**
 * 台灣縣市分佈地圖元件
 * 使用 react-simple-maps 進行渲染，並根據使用者數量呈現熱力圖效果
 */
const TaiwanMap: React.FC<TaiwanMapProps> = ({ data, title = "縣市使用者分佈" }) => {
  // 找出最大值用於顏色縮放
  const maxUsers = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.users));
  }, [data]);

  // 設定顏色比例尺 (從深色主題背景色到鮮豔的品牌色)
  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, maxUsers])
      .range(["#1e293b", "#3b82f6"]); // slate-800 到 blue-500
  }, [maxUsers]);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-full flex flex-col shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-200 font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {title}
        </h3>
        <div className="text-xs text-slate-500 font-mono">Taiwan Choropleth</div>
      </div>

      <div className="flex-1 min-h-[400px] relative">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 6000,
            center: [121.3, 23.7] // 調整中心點以符合台灣導航
          }}
          className="w-full h-full"
        >
          <ZoomableGroup zoom={1} maxZoom={1}>
            <Geographies geography={geoUrl}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {({ geographies }: { geographies: any[] }) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                geographies.map((geo: any) => {
                  const countyName = geo.properties.COUNTYNAME || geo.properties.name;
                  const countyRecord = data.find(d => d.name === countyName);
                  const users = countyRecord ? countyRecord.users : 0;
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={colorScale(users)}
                      stroke="#0f172a"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none", transition: "all 300ms" },
                        hover: { fill: "#60a5fa", outline: "none", cursor: "pointer" },
                        pressed: { fill: "#2563eb", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        
        {/* 指示浮層 */}
        <div className="absolute bottom-2 right-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-400 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#1e293b] border border-slate-700"></div>
            <span>0</span>
            <div className="flex-1 h-1 bg-gradient-to-right from-[#1e293b] to-[#3b82f6] rounded-full mx-1"></div>
            <span>{maxUsers}</span>
            <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
          </div>
          <p className="text-center">使用者人數熱力圖</p>
        </div>
      </div>
    </div>
  );
};

export default TaiwanMap;
