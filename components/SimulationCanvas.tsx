import React, { useRef, useEffect, useState } from 'react';
import { TrafficModel } from '../services/TrafficPhysics';
import { SimulationConfig, Vehicle, VehicleType } from '../types';

interface Props {
  model: TrafficModel;
  config: SimulationConfig;
  onStatsUpdate: (stats: any) => void;
}

const SimulationCanvas: React.FC<Props> = ({ model, config, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportOffset, setViewportOffset] = useState(0); 
  
  // Render Constants
  const PIXELS_PER_METER = 5; 
  const LANE_WIDTH_M = 3.5;
  const LANE_HEIGHT_PX = LANE_WIDTH_M * PIXELS_PER_METER; // ~17.5px
  const ROAD_TOP_MARGIN = 80;

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = (time: number) => {
      // Robust Delta Time
      let dt = (time - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // Cap at 100ms to prevent explosion on tab switch
      lastTime = time;

      if (!config.isPaused) {
        model.step(config);
      }

      frameCount++;
      if (frameCount % 10 === 0) {
        onStatsUpdate(model.getStats());
      }
      
      draw(model, time);
      animationFrameId = requestAnimationFrame(render);
    };

    const draw = (sim: TrafficModel, time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: false });
      if (!canvas || !ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const viewWidthMeters = width / PIXELS_PER_METER;

      // --- Background ---
      ctx.fillStyle = '#0f172a'; // Deep slate
      ctx.fillRect(0, 0, width, height);

      // --- Road Rendering ---
      const roadY = ROAD_TOP_MARGIN;
      const roadHeight = LANE_HEIGHT_PX * 3;
      
      // Shoulders
      ctx.fillStyle = '#334155'; // Gravel/Shoulder
      ctx.fillRect(0, roadY - 10, width, roadHeight + 20);

      // Asphalt (with noise texture simulation via simple rects for performance)
      ctx.fillStyle = '#1e293b'; // Road surface
      ctx.fillRect(0, roadY, width, roadHeight);
      
      // Lane Markings
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      
      // Dash Offset for animation feeling (though camera moves, road is static, markings static)
      // Actually, if we scroll the camera, the markings should move relative to viewport
      const lineDashOffset = -(viewportOffset * PIXELS_PER_METER) % 40;
      
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = lineDashOffset;

      for (let i = 1; i < 3; i++) {
        const y = roadY + i * LANE_HEIGHT_PX;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Solid Edges
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e2e8f0'; // White solid lines
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(width, roadY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, roadY + roadHeight);
      ctx.lineTo(width, roadY + roadHeight);
      ctx.stroke();

      // --- Vehicle Rendering (LOD) ---
      // Filter visible vehicles + buffer
      const visibleVehicles = sim.vehicles.filter(v => 
        v.x >= viewportOffset - 20 && v.x <= viewportOffset + viewWidthMeters + 20
      );

      for (const v of visibleVehicles) {
        const sx = (v.x - viewportOffset) * PIXELS_PER_METER;
        const sy = roadY + v.y * LANE_HEIGHT_PX + (LANE_HEIGHT_PX - v.width * PIXELS_PER_METER)/2;
        const vLen = v.length * PIXELS_PER_METER;
        const vWid = v.width * PIXELS_PER_METER;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx + 2, sy + 2, vLen, vWid);

        // Body
        ctx.fillStyle = (v as any).isCrashed ? '#ef4444' : v.color;
        ctx.beginPath();
        ctx.roundRect(sx, sy, vLen, vWid, 3);
        ctx.fill();

        // Roof (3D fake effect)
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(sx + vLen * 0.2, sy + 1, vLen * 0.5, vWid - 2);

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx + vLen * 0.7, sy + 1, vLen * 0.15, vWid - 2);

        // Brake Lights
        // Intensity depends on deceleration
        const brakeIntensity = v.a < -0.1 ? Math.min(1, Math.abs(v.a) / 3) : 0;
        ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + brakeIntensity * 0.7})`;
        // Glow effect
        if (brakeIntensity > 0.5) {
             ctx.shadowColor = '#ff0000';
             ctx.shadowBlur = 10 * brakeIntensity;
        } else {
             ctx.shadowBlur = 0;
        }
        ctx.fillRect(sx - 1, sy, 3, vWid * 0.3); // Left
        ctx.fillRect(sx - 1, sy + vWid * 0.7, 3, vWid * 0.3); // Right
        ctx.shadowBlur = 0; // Reset

        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sx + vLen - 1, sy, 2, vWid * 0.3);
        ctx.fillRect(sx + vLen - 1, sy + vWid * 0.7, 2, vWid * 0.3);

        // Turn Signals
        if (v.laneChangeDirection !== 0) {
            // Blink roughly 2Hz
            if (Math.floor(time / 250) % 2 === 0) {
                ctx.fillStyle = '#fbbf24'; // Amber
                const yOffset = v.laneChangeDirection === 1 ? vWid * 0.7 : 0; // 1 is right (down visually), -1 is left (up)
                // Draw all 4 corners for simplicity or just side? Just side.
                // Front
                ctx.fillRect(sx + vLen - 2, sy + yOffset, 3, vWid * 0.3);
                // Rear
                ctx.fillRect(sx - 1, sy + yOffset, 3, vWid * 0.3);
            }
        }
      }

      // --- Minimap (Top) ---
      const mmHeight = 40;
      const mmY = 10;
      const mmWidth = width - 40; // Margin
      const mmX = 20;
      const mmScale = mmWidth / sim.roadLength;
      
      // Minimap Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(mmX, mmY, mmWidth, mmHeight);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(mmX, mmY, mmWidth, mmHeight);
      
      // Minimap Viewport Rect
      const vpX = mmX + viewportOffset * mmScale;
      const vpW = Math.max(2, viewWidthMeters * mmScale);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(vpX, mmY, vpW, mmHeight);

      // Minimap Dots
      // Optimize: Only draw every Nth car if count > 1000? 
      // Canvas rects are fast, 3000 is fine.
      for (const v of sim.vehicles) {
        const mx = mmX + v.x * mmScale;
        const my = mmY + (v.y / 3) * mmHeight; // Map lanes to height
        
        // Color based on speed for heat map effect in minimap
        // Red < 20kmh, Yellow < 60kmh, Green > 60kmh
        const speedKmh = v.v * 3.6;
        if (speedKmh < 30) ctx.fillStyle = '#ef4444';
        else if (speedKmh < 70) ctx.fillStyle = '#eab308';
        else ctx.fillStyle = '#22c55e';
        
        ctx.fillRect(mx, my, 2, 3);
      }
      
      // Scale markings
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.fillText('0km', mmX, mmY + mmHeight + 12);
      ctx.fillText('2.5km', mmX + mmWidth/2, mmY + mmHeight + 12);
      ctx.fillText('5km', mmX + mmWidth - 20, mmY + mmHeight + 12);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [model, config, viewportOffset]);

  // Resize Handler
  useEffect(() => {
    const resize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY + e.deltaX;
    setViewportOffset(prev => {
      const next = prev + delta * 1.0; 
      return Math.max(0, Math.min(next, model.roadLength - 100));
    });
  };

  return (
    <div ref={containerRef} className="flex-1 relative h-full w-full overflow-hidden bg-slate-900 border-2 border-slate-700 rounded-lg shadow-inner">
      <div className="absolute top-2 left-4 text-xs font-mono text-slate-400 pointer-events-none opacity-70 z-10">
        <div className="flex gap-4">
            <span>SCALE: {PIXELS_PER_METER}px/m</span>
            <span>VIEW: {viewportOffset.toFixed(0)}m - {(viewportOffset + (containerRef.current?.clientWidth || 0)/PIXELS_PER_METER).toFixed(0)}m</span>
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        onWheel={handleWheel}
        className="w-full h-full block cursor-ew-resize touch-none"
      />
    </div>
  );
};

export default SimulationCanvas;