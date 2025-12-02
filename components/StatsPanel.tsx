import React from 'react';
import { SimulationStats } from '../types';
import { AreaChart, Area, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  stats: SimulationStats;
  history: any[];
}

const StatsPanel: React.FC<Props> = ({ stats, history }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full h-auto md:h-48">
      
      {/* Metrics Column */}
      <div className="col-span-1 md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-2">
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Density (k)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-purple-400">{stats.density.toFixed(1)}</span>
            <span className="text-xs text-slate-500">v/km</span>
          </div>
        </div>
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Avg Speed (v)</span>
          <div className="flex items-baseline gap-1">
             <span className="text-2xl font-mono font-bold text-blue-400">{stats.avgSpeed.toFixed(0)}</span>
             <span className="text-xs text-slate-500">km/h</span>
          </div>
        </div>
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center col-span-2 md:col-span-1">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Flow (q)</span>
          <div className="flex items-baseline gap-1">
             <span className="text-2xl font-mono font-bold text-emerald-400">{stats.flow.toFixed(0)}</span>
             <span className="text-xs text-slate-500">v/h</span>
          </div>
        </div>
      </div>

      {/* Fundamental Diagram */}
      <div className="col-span-1 md:col-span-2 bg-slate-800 p-2 rounded-lg border border-slate-700 relative">
        <span className="absolute top-2 left-3 text-[10px] font-bold text-slate-400 z-10 uppercase">Fundamental Diagram (k-q)</span>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
                type="number" 
                dataKey="k" 
                name="Density" 
                unit=" v/km" 
                domain={[0, 150]} 
                tick={{fontSize: 10, fill: '#64748b'}}
            />
            <YAxis 
                type="number" 
                dataKey="q" 
                name="Flow" 
                unit=" v/h" 
                domain={[0, 6000]} // Max capacity 3 lanes ~6000
                tick={{fontSize: 10, fill: '#64748b'}}
                width={30}
            />
            <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px'}}
            />
            <Scatter name="Traffic State" data={stats.points} fill="#8884d8">
                {stats.points.map((entry, index) => (
                    <circle key={`cell-${index}`} cx="0" cy="0" r="2" fill={index === stats.points.length - 1 ? '#fff' : '#8b5cf6'} opacity={index/stats.points.length} />
                ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Time Series */}
      <div className="col-span-1 md:col-span-2 bg-slate-800 p-2 rounded-lg border border-slate-700 relative">
         <span className="absolute top-2 left-3 text-[10px] font-bold text-slate-400 z-10 uppercase">Flow Rate History</span>
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <YAxis hide domain={[0, 'auto']} />
              <Area type="monotone" dataKey="flow" stroke="#10b981" fillOpacity={1} fill="url(#colorFlow)" isAnimationActive={false} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsPanel;