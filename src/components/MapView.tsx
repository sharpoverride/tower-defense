import React from 'react';
import { LevelInfo, GameState } from '../game/types';
import { LEVELS } from '../game/Engine';
import { Globe, MapPin, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface MapViewProps {
  gameState: GameState;
  onSelectLevel: (levelId: number) => void;
}

export default function MapView({ gameState, onSelectLevel }: MapViewProps) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-6 sm:p-8 bg-[#020617] relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100px_100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center mb-6 sm:mb-12"
      >
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 flex items-center justify-center gap-3 sm:gap-4 leading-tight">
          <Globe className="text-indigo-500 animate-pulse shrink-0" size={32} />
          GLOBAL DEFENSE COMMAND
        </h1>
        <p className="text-slate-500 uppercase tracking-widest text-xs sm:text-sm font-bold leading-relaxed">Select an active sector to initialize defenses</p>
      </motion.div>

      <div className="relative w-full max-w-5xl aspect-[4/3] sm:aspect-[2/1] bg-slate-900/40 border-2 border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Stylized World Map SVG */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg viewBox="0 0 1000 500" className="w-full h-full fill-slate-700">
            {/* Very simplified world outline */}
            {/* North America */}
            <path d="M 80 120 L 120 70 L 250 80 L 320 180 L 300 220 L 240 260 L 240 300 L 200 260 L 120 280 Z" />
            {/* South America */}
            <path d="M 240 310 L 320 310 L 350 360 L 330 420 L 300 480 L 260 460 L 240 400 Z" />
            {/* Europe & Africa */}
            <path d="M 450 100 L 530 80 L 580 120 L 580 180 L 540 220 L 600 280 L 580 430 L 520 460 L 460 380 L 410 280 L 450 220 Z" />
            {/* Asia */}
            <path d="M 600 120 L 700 80 L 850 90 L 920 140 L 940 300 L 880 380 L 780 400 L 700 380 L 620 300 L 600 200 Z" />
            {/* Oceania */}
            <path d="M 820 380 L 920 410 L 880 480 L 800 450 Z" />
            {/* Antarctica */}
            <path d="M 200 490 L 800 490 L 750 500 L 250 500 Z" />
            
            {/* Hex/Dot Pattern Overlay on map surface */}
            <defs>
              <pattern id="dotPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" fillOpacity="0.4" />
              </pattern>
            </defs>
            <rect width="1000" height="500" fill="url(#dotPattern)" opacity="0.3" />
          </svg>
          
          {/* Scanning Line */}
          <motion.div 
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 w-full h-[2px] bg-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-0"
          />
        </div>

        {/* Decorative Map Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 1000 500">
           <path d="M 0 250 Q 250 100 500 250 T 1000 250" fill="none" stroke="white" strokeWidth="1" />
           <path d="M 0 150 Q 250 0 500 150 T 1000 150" fill="none" stroke="white" strokeWidth="1" />
           <path d="M 0 350 Q 250 200 500 350 T 1000 350" fill="none" stroke="white" strokeWidth="1" />
        </svg>

        {/* Level Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {LEVELS.map((level, index) => {
            if (index === 0) return null;
            const prevLevel = LEVELS[index - 1];
            const isCompleted = gameState.completedLevels.includes(prevLevel.id);
            if (!isCompleted) return null;

            return (
              <motion.path
                key={`line-${index}`}
                d={`M ${prevLevel.mapPos.x} ${prevLevel.mapPos.y} L ${level.mapPos.x} ${level.mapPos.y}`}
                stroke={gameState.completedLevels.includes(level.id) ? "#10b981" : "#6366f1"}
                strokeWidth="0.5"
                strokeDasharray="1 1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
            );
          })}
        </svg>

        {LEVELS.map((level) => {
          const isCompleted = gameState.completedLevels.includes(level.id);
          const isNext = level.id === 0 || gameState.completedLevels.includes(level.id - 1);
          const isLocked = !isCompleted && !isNext;

          return (
            <motion.button
              key={level.id}
              whileHover={!isLocked ? { scale: 1.1 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              onClick={() => !isLocked && onSelectLevel(level.id)}
              disabled={isLocked}
              className="absolute group z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${level.mapPos.x}%`, top: `${level.mapPos.y}%` }}
            >
              <div className="relative flex items-center justify-center">
                {/* Ping Animation for Recommended/Next Level */}
                {isNext && !isCompleted && (
                  <div className="absolute w-12 h-12 bg-indigo-500/20 rounded-full animate-ping" />
                )}
                
                  <div className={`p-3 sm:p-4 rounded-2xl border-2 transition-all shadow-lg ${
                  isCompleted 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                    : isLocked 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-600 grayscale'
                      : 'bg-indigo-500/20 border-indigo-500 text-indigo-400 hover:bg-indigo-500/40'
                }`}>
                  {isCompleted ? <CheckCircle2 size={22} /> : isLocked ? <Lock size={22} /> : <MapPin size={22} />}
                </div>

                {/* Level Tag */}
                <div className={`absolute bottom-full mb-4 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
                   <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg shadow-xl whitespace-nowrap">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{level.location}</span>
                      <span className="block text-sm font-bold text-white">{level.name}</span>
                   </div>
                   <div className="w-0.5 h-4 bg-slate-700"></div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 sm:mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-12 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400"></div>
            <span>Sector Secured</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 border border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            <span>Deployment Possible</span>
         </div>
         <div className="flex items-center gap-2 grayscale brightness-50">
            <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600"></div>
            <span>Intelligence Limited</span>
         </div>
      </div>
    </div>
  );
}
