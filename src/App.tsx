/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Clock, 
  Lock, 
  Unlock, 
  Info, 
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Play,
  Monitor
} from 'lucide-react';
import * as d3 from 'd3';

// --- Constants & Types ---

const MAX_FORCE = 2000;
const MIN_FORCE = 50;
const MAX_TIME = 2.0;
const MIN_TIME = 0.1;
const DEFAULT_IMPULSE = (2 / Math.PI) * 1200 * 0.45; 
const SAFETY_THRESHOLD = 1000;

// --- Sub-components ---

/**
 * D3 Graph component for Force-Time visualization - Robust Version
 */
const ForceTimeGraph: React.FC<{ force: number; time: number }> = ({ force, time }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Use ResizeObserver for accurate dimensions
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dims.width || !dims.height || !svgRef.current) return;

    const width = dims.width;
    const height = Math.max(150, dims.height - 40); 
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const xScale = d3.scaleLinear()
      .domain([0, 2.5])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, MAX_FORCE + 100])
      .range([height - margin.bottom, margin.top]);

    // Grid lines
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-(height - margin.top - margin.bottom)).tickFormat(() => ""))
      .attr("stroke", "#1e293b")
      .attr("stroke-opacity", 0.5);

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(() => ""))
      .attr("stroke", "#1e293b")
      .attr("stroke-opacity", 0.5);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr("color", "#475569")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "10px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", "#475569")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "10px");

    // Curve data
    const dataPoints = 60;
    const lineData = Array.from({ length: dataPoints + 1 }, (_, i) => {
      const t = (i / dataPoints) * time;
      const f = force * Math.sin((Math.PI * t) / time);
      return { t, f };
    });

    const lineGenerator = d3.line<{ t: number; f: number }>()
      .x(d => xScale(d.t))
      .y(d => yScale(d.f))
      .curve(d3.curveBasis);

    const areaGenerator = d3.area<{ t: number; f: number }>()
      .x(d => xScale(d.t))
      .y0(yScale(0))
      .y1(d => yScale(d.f))
      .curve(d3.curveBasis);

    const isDangerous = force > SAFETY_THRESHOLD;
    const accentColor = isDangerous ? "#ef4444" : "#3b82f6";

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", accentColor)
      .attr("stop-opacity", 0.4);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", accentColor)
      .attr("stop-opacity", 0);

    // Area fill
    svg.append("path")
      .datum(lineData)
      .attr("fill", "url(#area-gradient)")
      .attr("d", areaGenerator);

    // Line path
    svg.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", accentColor)
      .attr("stroke-width", 2)
      .attr("d", lineGenerator);

    // Safety threshold line
    svg.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(2.5))
      .attr("y1", yScale(SAFETY_THRESHOLD))
      .attr("y2", yScale(SAFETY_THRESHOLD))
      .attr("stroke", "#ef4444")
      .attr("stroke-dasharray", "4,4")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1);

    svg.append("text")
      .attr("x", xScale(2.45))
      .attr("y", yScale(SAFETY_THRESHOLD) - 5)
      .attr("fill", "#ef4444")
      .attr("fill-opacity", 0.5)
      .attr("text-anchor", "end")
      .attr("font-size", "8px")
      .attr("font-family", "JetBrains Mono, monospace")
      .text("CRITICAL THRESHOLD (1000N)");

    // Peak Marker
    svg.append("circle")
      .attr("cx", xScale(time / 2))
      .attr("cy", yScale(force))
      .attr("r", 4)
      .attr("fill", accentColor)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

    svg.append("text")
      .attr("x", xScale(time / 2))
      .attr("y", yScale(force) - 10)
      .attr("fill", accentColor)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-weight", "bold")
      .text(`${Math.round(force)}N`);

  }, [dims, force, time]);

  return (
    <div id="graph-container" ref={containerRef} className="w-full h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-blue-500" />
          Real-time Force Dynamics
        </h2>
        <span className="text-[10px] text-slate-600 font-mono">Axis: Force (N) / Time (s)</span>
      </div>
      <div className="flex-grow min-h-0 relative bg-slate-950/30 rounded-lg border border-slate-800/50">
        {(!dims.width || !dims.height) && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-[10px] uppercase font-mono tracking-widest">
            Initializing Engine...
          </div>
        )}
        <svg id="force-time-svg" ref={svgRef} className="w-full h-full block" />
      </div>
    </div>
  );
};

/**
 * Visual Metaphor: Car Collision Sim
 */
const CarSim: React.FC<{ force: number; time: number; isActive: boolean; onComplete: () => void }> = ({ force, time, isActive, onComplete }) => {
  const isDangerous = force > SAFETY_THRESHOLD;
  
  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-end">
      {/* Wall */}
      <div className="absolute right-4 inset-y-4 w-2 bg-slate-700 rounded-full shadow-[0_0_15px_rgba(51,65,85,0.5)]" />
      
      {/* Car */}
      <motion.div
        className="absolute left-6 bottom-12 z-10"
        initial={{ x: 0 }}
        animate={isActive ? { 
          x: [0, 180, 180, 170, 0], 
        } : { x: 0 }}
        transition={isActive ? {
          duration: Math.max(1.2, time * 2),
          times: [0, 0.4, 0.5, 0.7, 1],
          ease: "easeInOut"
        } : {}}
        onAnimationComplete={() => { if (isActive) onComplete(); }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={`w-24 h-10 rounded-t-lg rounded-br-sm relative transition-colors duration-500 ${
            isActive && isDangerous ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 
            isActive ? 'bg-blue-500' : 'bg-green-500'
          }`}>
            <div className="absolute top-1 left-2 w-6 h-3 bg-white/20 rounded-sm" />
            <div className="absolute -bottom-2 left-2 w-4 h-4 bg-slate-900 rounded-full border border-slate-700" />
            <div className="absolute -bottom-2 right-2 w-4 h-4 bg-slate-900 rounded-full border border-slate-700" />
          </div>
          <div className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-tighter uppercase ${
            isDangerous ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
          }`}>
            Status: {isDangerous ? 'High G-Load' : 'Safe Impact'}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 2 }}
            exit={{ opacity: 0 }}
            className="absolute right-12 bottom-20 text-2xl z-20"
          >
            {isDangerous ? "💥" : "🛡️"}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isDangerous ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Collision Metaphor</span>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [force, setForce] = useState(1200);
  const [time, setTime] = useState(0.45);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedImpulse, setLockedImpulse] = useState(DEFAULT_IMPULSE);
  const [isSimulating, setIsSimulating] = useState(false);

  const currentImpulse = useMemo(() => (2 / Math.PI) * force * time, [force, time]);
  const isDangerous = force > SAFETY_THRESHOLD;

  const handleForceChange = (val: number) => {
    setForce(val);
    if (isLocked) {
      const newTime = lockedImpulse / ((2 / Math.PI) * val);
      setTime(Math.max(MIN_TIME, Math.min(MAX_TIME, newTime)));
    }
  };

  const handleTimeChange = (val: number) => {
    setTime(val);
    if (isLocked) {
      const newForce = lockedImpulse / ((2 / Math.PI) * val);
      setForce(Math.max(MIN_FORCE, Math.min(MAX_FORCE, newForce)));
    }
  };

  const toggleLock = () => {
    if (!isLocked) {
      setLockedImpulse(currentImpulse);
    }
    setIsLocked(!isLocked);
  };

  return (
    <div id="app-root" className="h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col font-sans overflow-hidden relative selection:bg-blue-500/30">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      {/* Header Section */}
      <header id="main-header" className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4 flex-shrink-0 z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Kinetic Lab <span className="font-light text-slate-400">// Impulse Explorer</span></h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Analyzing the relationship between Peak Force, Time Duration, and Momentum Change.</p>
        </div>
        <div className="hidden md:flex gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> SYSTEM READY
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-slate-400">
            MODEL: CRASH_TEST_V4.2
          </div>
        </div>
      </header>

      {/* Main Bento Grid */}
      <div id="main-grid" className="flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-6 gap-4 flex-grow min-h-0">
        
        {/* Graph Section */}
        <div id="graph-panel" className="col-span-12 lg:col-span-8 row-span-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative flex flex-col shadow-2xl min-h-[350px]">
          <ForceTimeGraph force={force} time={time} />
        </div>

        {/* Impact Visualizer */}
        <div id="sim-panel" className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden flex flex-col shadow-lg min-h-[200px]">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
            <Monitor className="w-3 h-3" /> Impact Simulation
          </h2>
          <div className="flex-grow">
            <CarSim 
              force={force} 
              time={time} 
              isActive={isSimulating} 
              onComplete={() => setIsSimulating(false)} 
            />
          </div>
          <div className="mt-3 flex justify-between items-center">
            <p className="text-[10px] text-slate-500 italic">Impact duration: {Math.round(time * 1000)}ms</p>
            <button
              id="run-sim-btn"
              disabled={isSimulating}
              onClick={() => setIsSimulating(true)}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-30 uppercase tracking-tighter"
            >
              <Play className="w-3 h-3 fill-current" /> Run Test
            </button>
          </div>
        </div>

        {/* Impulse Stats */}
        <div id="stats-panel" className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2 bg-blue-600 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl transition-colors duration-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform">
             <Zap className="w-24 h-24" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <h2 className="text-xs font-bold uppercase tracking-widest opacity-80">Total Impulse (J)</h2>
            <Zap className="w-5 h-5 opacity-60" />
          </div>
          <div className="relative z-10">
            <div className="text-4xl md:text-6xl font-black tracking-tighter tabular-nums">{currentImpulse.toFixed(1)}</div>
            <div className="text-[10px] font-medium opacity-80 uppercase tracking-widest mt-1">Newton-Seconds (N·s)</div>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden relative z-10">
            <motion.div 
              className="h-full bg-white"
              animate={{ width: `${Math.min(100, (currentImpulse / (DEFAULT_IMPULSE * 2)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Control Panel */}
        <div id="controls-panel" className="col-span-12 row-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8 md:gap-12 shadow-inner">
          
          {/* Lock Toggle */}
          <div className="flex flex-col gap-3 min-w-[160px] w-full md:w-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Constraint Configuration</span>
            <button 
              id="lock-btn"
              onClick={toggleLock}
              className="flex items-center cursor-pointer group w-full text-left bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="relative">
                <div className={`w-10 h-5 rounded-full transition-colors ${isLocked ? 'bg-blue-500' : 'bg-slate-800'}`} />
                <motion.div 
                  className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full"
                  animate={{ x: isLocked ? 20 : 0 }}
                />
              </div>
              <div className="ml-3">
                <div className="text-xs font-bold text-slate-200">Lock Impulse</div>
                <div className="text-[9px] text-slate-500 leading-none">Inverse Scaling {isLocked ? 'Active' : 'Off'}</div>
              </div>
            </button>
          </div>

          {/* Sliders Area */}
          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Peak Force (F)
                </label>
                <span className={`text-sm font-mono font-bold ${isDangerous ? 'text-red-400' : 'text-blue-400'}`}>
                  {Math.round(force)} N
                </span>
              </div>
              <input 
                id="force-slider"
                type="range" 
                min={MIN_FORCE}
                max={MAX_FORCE}
                step={1}
                value={force}
                onChange={(e) => handleForceChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
              />
              <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                <span>{MIN_FORCE}N</span><span>{MAX_FORCE}N</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duration (Δt)
                </label>
                <span className="text-sm font-mono font-bold text-blue-400">
                  {time.toFixed(3)} s
                </span>
              </div>
              <input 
                id="time-slider"
                type="range" 
                min={MIN_TIME}
                max={MAX_TIME}
                step={0.001}
                value={time}
                onChange={(e) => handleTimeChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
              />
              <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                <span>{MIN_TIME}s</span><span>{MAX_TIME}s</span>
              </div>
            </div>
          </div>

          {/* Safety Summary */}
          <div id="safety-indicator" className={`bg-slate-950 border rounded-xl p-4 flex flex-col gap-1 min-w-[180px] w-full md:w-auto shadow-sm ${
            isDangerous ? 'border-red-900/50' : 'border-slate-800'
          }`}>
             <div className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1">
               {isDangerous ? <ShieldAlert className="w-3 h-3 text-red-500" /> : <ShieldCheck className="w-3 h-3 text-green-500" />}
               Safety Rating
             </div>
             <div className={`text-xl font-mono font-black ${isDangerous ? 'text-red-400' : 'text-green-400'}`}>
               {isDangerous ? 'CRITICAL' : 'OPTIMAL'}
               <span className="text-[10px] text-slate-600 ml-2 font-normal block underline decoration-slate-800 underline-offset-4 capitalize">
                 {isDangerous ? 'Structural Damage Likely' : 'Elastic Impact Zone'}
               </span>
             </div>
          </div>
        </div>

      </div>

      {/* Footer Navigation */}
      <footer id="main-footer" className="mt-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-600 uppercase tracking-widest font-medium gap-2">
        <div>Laboratory Simulation Mode // Environment: VACUUM_STP</div>
        <div className="flex gap-6">
          <div className="flex items-center gap-1 border-b border-slate-800 hover:text-slate-400 cursor-help transition-colors">
            <Info className="w-3 h-3" /> Physics Docs
          </div>
          <div className="hidden md:block">Engine Build v1.0.4r-ais</div>
        </div>
      </footer>
    </div>
  );
}
