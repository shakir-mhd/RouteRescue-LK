'use client';

import React from 'react';
import { Incident } from '@/utils/store';

interface MonthlyIncidentTrendChartProps {
  incidents: Incident[];
}

export function MonthlyIncidentTrendChart({ incidents }: MonthlyIncidentTrendChartProps) {
  // Aggregate completed/total incidents per month for the current year
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();

  const monthlyCounts = Array(12).fill(0);
  const monthlyRevenues = Array(12).fill(0);

  (incidents || []).forEach((inc) => {
    if (!inc.timestamp) return;
    const d = new Date(inc.timestamp);
    if (isNaN(d.getTime())) return;
    const m = d.getMonth();
    monthlyCounts[m] += 1;
    if (inc.status === 'Resolved') {
      monthlyRevenues[m] += Number(inc.baseTariff || 1000);
    }
  });

  // Take up to current month (min 6 months view)
  const displayMonths = months.slice(0, Math.max(6, currentMonthIdx + 1));
  const displayCounts = monthlyCounts.slice(0, displayMonths.length);

  const maxVal = Math.max(...displayCounts, 10);
  const chartHeight = 140;
  const chartWidth = 320;
  const padding = 20;

  const points = displayCounts.map((val, i) => {
    const x = padding + (i / Math.max(1, displayMonths.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (val / maxVal) * (chartHeight - padding * 2);
    return { x, y, val, month: displayMonths[i] };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
    : '';

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-bold text-slate-200">Monthly Incident Volume</h4>
          <p className="text-[10px] text-slate-400">Total breakdown dispatch requests per month</p>
        </div>
        <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
          {incidents.length} Total Requests
        </span>
      </div>

      <div className="relative w-full h-40 flex items-center justify-center">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gradientIncidents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#475569" opacity="0.6" />

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#gradientIncidents)" />}

          {/* Trend Line */}
          {pathD && <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data Points */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="4" className="fill-amber-400 stroke-slate-900 stroke-2 group-hover:r-6 transition-all" />
              <text x={pt.x} y={chartHeight - 4} textAnchor="middle" className="text-[9px] fill-slate-400 font-semibold">
                {pt.month}
              </text>
              <text x={pt.x} y={pt.y - 8} textAnchor="middle" className="text-[9px] fill-amber-300 font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">
                {pt.val}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

interface CategoryDistributionChartProps {
  incidents: Incident[];
}

export function CategoryDistributionChart({ incidents }: CategoryDistributionChartProps) {
  const categories: Record<string, number> = {};

  (incidents || []).forEach((inc) => {
    const cat = inc.category || 'General Repair';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const categoryList = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const total = incidents.length || 1;

  const COLORS = ['#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6', '#64748b'];

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
      <div className="mb-3">
        <h4 className="text-xs font-bold text-slate-200">Incident Category Breakdown</h4>
        <p className="text-[10px] text-slate-400">Distribution of roadside failure types</p>
      </div>

      <div className="space-y-2.5">
        {categoryList.slice(0, 5).map(([name, count], i) => {
          const pct = Math.round((count / total) * 100);
          const color = COLORS[i % COLORS.length];
          return (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {name}
                </span>
                <span className="font-bold text-slate-400">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
