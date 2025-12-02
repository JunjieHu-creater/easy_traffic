import React, { useState } from 'react';
import { SimulationConfig } from '../types';
import { Play, Pause, AlertTriangle, RefreshCw, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  onReset: () => void;
  onAccident: () => void;
}

const ControlPanel: React.FC<Props> = ({ config, setConfig, onReset, onAccident }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 flex flex-col gap-4 w-full md:w-80 h-full overflow-y-auto custom-scrollbar">
      {/* Main Controls */}
      <div className="flex items-center justify-between sticky top-0 bg-slate-800 z-10 pb-2 border-b border-slate-700">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
           <Settings size={18} /> Params
        </h2>
        <div className="flex gap-2">
           <button 
            onClick={() => setConfig(prev => ({...prev, isPaused: !prev.isPaused}))}
            className={`p-2 rounded-full ${config.isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'} transition text-white shadow`}
          >
            {config.isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button 
            onClick={onReset}
            className="p-2 rounded-full bg-slate-600 hover:bg-slate-500 transition text-white shadow"
            title="Reset Simulation"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Traffic Flow Config */}
      <div className="space-y-4">
        <div className="bg-slate-700/30 p-3 rounded border border-slate-700/50">
          <label className="flex justify-between text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
            Inflow Rate (Q)
            <span className="text-blue-400">{config.inflowRate} veh/h</span>
          </label>
          <input 
            type="range" 
            min="500" 
            max="3000" 
            step="100"
            value={config.inflowRate}
            onChange={(e) => handleChange('inflowRate', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
             <span>Sparse</span>
             <span>Capacity</span>
          </div>
        </div>

        <div className="bg-slate-700/30 p-3 rounded border border-slate-700/50">
          <label className="flex justify-between text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
            Truck Ratio
            <span className="text-purple-400">{(config.truckRatio * 100).toFixed(0)}%</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="0.4" 
            step="0.05"
            value={config.truckRatio}
            onChange={(e) => handleChange('truckRatio', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>

      {/* Advanced Toggle */}
      <button 
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white transition py-2 border-b border-slate-700"
      >
        <span>Microscopic Physics (IDM + MOBIL)</span>
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Advanced Physics Controls */}
      {showAdvanced && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            
           {/* Politeness */}
           <div className="space-y-1">
            <label className="flex justify-between text-xs text-slate-400">
              <span>Politeness (p)</span>
              <span className="text-slate-200">{config.politeness.toFixed(1)}</span>
            </label>
            <input 
              type="range" min="0" max="1.0" step="0.1"
              value={config.politeness}
              onChange={(e) => handleChange('politeness', Number(e.target.value))}
              className="w-full h-1 bg-slate-600 rounded accent-slate-400"
            />
            <p className="text-[10px] text-slate-500 leading-tight">
               0 = Egoistic (Mad Max), 0.5 = Realistic, 1.0 = Altruistic.
            </p>
           </div>

           {/* Time Gap */}
           <div className="space-y-1">
            <label className="flex justify-between text-xs text-slate-400">
              <span>Safe Time Gap (T)</span>
              <span className="text-slate-200">{config.safeTimeGap.toFixed(1)}s</span>
            </label>
            <input 
              type="range" min="0.5" max="3.0" step="0.1"
              value={config.safeTimeGap}
              onChange={(e) => handleChange('safeTimeGap', Number(e.target.value))}
              className="w-full h-1 bg-slate-600 rounded accent-slate-400"
            />
           </div>

           {/* Acceleration Noise */}
           <div className="space-y-1">
            <label className="flex justify-between text-xs text-slate-400">
              <span>Driver Imperfection (Noise)</span>
              <span className="text-slate-200">{config.accelerationNoise.toFixed(2)}</span>
            </label>
            <input 
              type="range" min="0" max="1.0" step="0.1"
              value={config.accelerationNoise}
              onChange={(e) => handleChange('accelerationNoise', Number(e.target.value))}
              className="w-full h-1 bg-slate-600 rounded accent-slate-400"
            />
            <p className="text-[10px] text-slate-500 leading-tight">
               Higher noise creates spontaneous "Ghost Jams".
            </p>
           </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-auto space-y-3 pt-4 border-t border-slate-700">
        <button 
          onClick={onAccident}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 rounded shadow-sm hover:shadow-md transition active:scale-95"
        >
          <AlertTriangle size={18} />
          Create Incident (5s)
        </button>
        <div className="bg-slate-900 p-2 rounded text-[10px] text-slate-500 font-mono">
           Sim Speed: {config.timeScale.toFixed(1)}x
           <input 
             type="range" min="0.1" max="5.0" step="0.1"
             value={config.timeScale}
             onChange={(e) => handleChange('timeScale', Number(e.target.value))}
             className="w-full h-1 bg-slate-800 mt-1 rounded accent-slate-500"
           />
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;