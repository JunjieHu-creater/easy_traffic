import React, { useState, useRef } from 'react';
import { TrafficModel } from './services/TrafficPhysics';
import { SimulationConfig, SimulationStats } from './types';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';

const App: React.FC = () => {
  const modelRef = useRef(new TrafficModel(5000));
  
  // Default Config: "Research Baseline"
  const [config, setConfig] = useState<SimulationConfig>({
    inflowRate: 2000,
    truckRatio: 0.15,
    timeScale: 1.0,
    isPaused: false,
    roadLength: 5000,
    politeness: 0.2, // Some politeness
    safeTimeGap: 1.5, // Standard
    maxAccel: 1.5, // Realistic comfort acceleration
    accelerationNoise: 0.3 // Enough to cause ghost jams at high density
  });

  const [stats, setStats] = useState<SimulationStats>({
    count: 0,
    avgSpeed: 0,
    density: 0,
    flow: 0,
    points: []
  });

  const [history, setHistory] = useState<any[]>([]);

  const handleStatsUpdate = (newStats: SimulationStats) => {
    setStats(newStats);
    setHistory(prev => {
      const nw = [...prev, { time: Date.now(), flow: newStats.flow }];
      if (nw.length > 100) nw.shift(); // Longer history
      return nw;
    });
  };

  const handleReset = () => {
    modelRef.current.reset();
    setHistory([]);
  };

  const handleAccident = () => {
    modelRef.current.triggerAccident();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Compact Header */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7" />
            </svg>
          </div>
          <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
                Traffic<span className="text-blue-500">Lab</span>
              </h1>
              <p className="text-[10px] text-slate-400">Microscopic Traffic Flow Research Tool</p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Sidebar (Controls) */}
        <div className="w-full md:w-72 border-r border-slate-800 bg-slate-900 z-10 flex-shrink-0">
          <ControlPanel 
            config={config} 
            setConfig={setConfig} 
            onReset={handleReset}
            onAccident={handleAccident}
          />
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 flex flex-col relative bg-black">
          {/* Overlay Stats (Top Layer) */}
          <div className="absolute top-0 left-0 right-0 z-10 p-2 bg-gradient-to-b from-slate-900/90 to-transparent pointer-events-none">
             {/* Spacing for visual clarity */}
          </div>
          
          <SimulationCanvas 
            model={modelRef.current} 
            config={config} 
            onStatsUpdate={handleStatsUpdate} 
          />
          
          {/* Bottom Analysis Panel */}
          <div className="h-48 bg-slate-900 border-t border-slate-800 p-2 z-10">
             <StatsPanel stats={stats} history={history} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;