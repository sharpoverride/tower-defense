import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GameEngine } from '../game/Engine';
import { GameState, TOWER_STATS, TowerType, ENEMY_STATS, WAVES, MAX_TOWER_LEVEL } from '../game/types';
import { Play, Pause, FastForward, Info, ArrowLeft, Trophy, ExternalLink, Globe, ChevronsUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapView from './MapView';

const CARDINAL_DOT_POSITIONS = [
  'left-1/2 top-1 -translate-x-1/2',
  'right-1 top-1/2 -translate-y-1/2',
  'left-1/2 bottom-1 -translate-x-1/2',
  'left-1 top-1/2 -translate-y-1/2',
];

export default function Game() {
  const engineRef = useRef(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(engineRef.current.state);
  const [selectedCell, setSelectedCell] = useState<{ x: number, y: number } | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const update = (time: number) => {
    if (lastTimeRef.current !== 0 && !isPaused) {
      const dt = ((time - lastTimeRef.current) / 1000) * speed;
      
      // Cap dt to prevent huge jumps if tab was inactive
      if (dt < 0.1 * speed) {
         engineRef.current.update(dt);
         // simple clone to trigger react updates, but we need performance here
         // shallow copy is usually enough if we mutate carefully, but let's do a fast shallow copy
         setGameState({ ...engineRef.current.state, towers: [...engineRef.current.state.towers], enemies: [...engineRef.current.state.enemies], projectiles: [...engineRef.current.state.projectiles] });
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPaused, speed]); // Re-bind on pause/speed change to keep scoped variables fresh if needed

  const handleCellClick = (x: number, y: number) => {
    const existingTower = gameState.towers.find(t => t.x === x && t.y === y);
    if (existingTower) {
      setSelectedTowerId(existingTower.id);
      setSelectedCell(null);
    } else {
      setSelectedCell({ x, y });
      setSelectedTowerId(null);
    }
  };

  const buildTower = (type: TowerType) => {
    if (selectedCell) {
      if (engineRef.current.buildTower(type, selectedCell.x, selectedCell.y)) {
        setSelectedCell(null);
        // Force update to remove menu instantly
        setGameState({ ...engineRef.current.state, towers: [...engineRef.current.state.towers] });
      }
    }
  };

  const sellTower = () => {
    if (selectedTowerId) {
      engineRef.current.sellTower(selectedTowerId);
      setSelectedTowerId(null);
      setGameState({ ...engineRef.current.state, towers: [...engineRef.current.state.towers] });
    }
  };

  const upgradeTower = () => {
    if (selectedTowerId) {
      engineRef.current.upgradeTower(selectedTowerId);
      setGameState({ ...engineRef.current.state, towers: [...engineRef.current.state.towers] });
    }
  };

  const startWave = () => {
    engineRef.current.startWave();
    setGameState({ ...engineRef.current.state });
  };

  const handleSelectLevel = (levelId: number) => {
    engineRef.current.selectLevel(levelId);
    setGameState({ ...engineRef.current.state });
  };

  const handleReturnToMap = () => {
    engineRef.current.returnToMap();
    setGameState({ ...engineRef.current.state });
  };

  // Determine what is drawn on the board map
  const pathCells = useMemo(() => {
    const cells = new Set<string>();
    const path = engineRef.current.state.path;
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
               cells.add(`${x},${y}`);
            }
        }
    }
    return cells;
  }, [engineRef.current.state.path]);

  const baseCellSize = 40;
  const isPhoneLayout = viewport.width < 1024;
  const boardMaxWidth = isPhoneLayout ? Math.max(280, viewport.width - 32) : viewport.width - 384;
  const boardMaxHeight = isPhoneLayout ? Math.max(300, viewport.height * 0.56) : viewport.height - 112;
  const CELL_SIZE = Math.floor(Math.min(baseCellSize, boardMaxWidth / gameState.gridWidth, boardMaxHeight / gameState.gridHeight));

  const pathSvgData = useMemo(() => {
    const path = engineRef.current.state.path;
    if (!path.length) return '';
    return 'M ' + path.map(p => `${(p.x + 0.5) * CELL_SIZE} ${(p.y + 0.5) * CELL_SIZE}`).join(' L ');
  }, [engineRef.current.state.path]);

  const selectedTower = selectedTowerId ? gameState.towers.find(t => t.id === selectedTowerId) : null;
  const enemyIntelEntries = Object.entries(
    gameState.enemiesToSpawn.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  if (gameState.status === 'map') {
    return <MapView gameState={gameState} onSelectLevel={handleSelectLevel} />;
  }

  return (
    <div className="flex h-dvh bg-[#020617] text-slate-200 font-sans overflow-hidden border-4 sm:border-8 border-slate-900 shadow-2xl flex-col">
      
      {/* Header: Stats Bar */}
      <header className="flex flex-wrap min-[520px]:flex-nowrap items-center justify-between gap-2 px-2 py-1.5 sm:px-4 lg:px-6 bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-md shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-10">
          <button 
            onClick={handleReturnToMap}
            title="Return to map"
            className="flex items-center gap-1.5 p-1.5 -ml-1 text-slate-500 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-widest"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">RETURN TO MAP</span>
          </button>
          <div className="flex flex-col">
            <span className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-500 font-bold">System Status</span>
            <span className={`font-mono text-sm sm:text-lg ${gameState.status === 'countdown' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {gameState.status === 'playing' ? 'DEFENSE ACTIVE' : 
               gameState.status === 'countdown' ? `NEXT WAVE: ${Math.ceil(gameState.waveCountdown)}S` : 'IDLE'}
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"></div>
              <span className="font-mono text-base sm:text-lg">{gameState.lives}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-amber-400">$</span>
              <span className="text-base sm:text-lg">{gameState.money}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full min-[520px]:w-auto flex-wrap items-center justify-between gap-2 sm:justify-end lg:gap-5">
          <div className="flex gap-1.5 sm:gap-3 items-center">
            {(gameState.status === 'idle' || gameState.status === 'countdown') && (
              <button 
                onClick={startWave} 
                className={`px-3 sm:px-5 py-1.5 text-white font-bold rounded uppercase tracking-widest text-[10px] sm:text-xs transition-transform hover:scale-105 active:scale-95 border ${gameState.status === 'countdown' ? 'bg-amber-600 hover:bg-amber-500 border-amber-400/50' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/50'}`}
              >
                {gameState.status === 'countdown' ? 'Skip Timer' : 'Start Wave'}
              </button>
            )}
            <button title="Play / Pause" onClick={() => setIsPaused(!isPaused)} className={`p-1.5 rounded border transition-colors ${isPaused ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button title="Fast Forward" onClick={() => setSpeed(speed === 1 ? 2 : 1)} className={`p-1.5 rounded border transition-colors ${speed === 2 ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
              <FastForward size={16} />
            </button>
          </div>
          <div className="hidden h-6 w-px bg-slate-700 mx-1 sm:block"></div>
             <div className="flex items-baseline gap-1 font-mono">
               <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">L</span>
               <span className="text-base sm:text-lg text-emerald-400">{gameState.currentLevel + 1}<span className="text-slate-600">/{4}</span></span>
             </div>
             <div className="flex items-baseline gap-1 font-mono">
               <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">W</span>
               <span className="text-base sm:text-lg text-white">{Math.min(gameState.wave + 1, WAVES.length)}<span className="text-slate-600">/{WAVES.length}</span></span>
             </div>
           </div>
       </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT PANEL: GAME BOARD */}
        <div className="flex-1 min-h-0 relative bg-slate-950 p-2 sm:p-4 flex items-center justify-center">
          {/* Grid Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '40px 40px' }} />


        {/* GAME OVER / WON OVERLAYS */}
        <AnimatePresence>
          {gameState.status === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center">
                <h1 className="text-6xl font-black text-red-500 tracking-tighter mb-4">GAME OVER</h1>
                <p className="text-xl text-slate-300 mb-8">The enemies breached your defenses.</p>
                <button 
                  onClick={handleReturnToMap}
                  className="px-8 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Return to Map
                </button>
              </div>
            </motion.div>
          )}

          {gameState.status === 'level_cleared' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-950/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center text-center p-12 bg-slate-900 rounded-[3rem] border-4 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-lg"
              >
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <Trophy size={48} className="text-white" />
                </div>
                <h1 className="text-5xl font-black text-emerald-400 tracking-tighter mb-2 uppercase">Level Secured</h1>
                <p className="text-slate-400 mb-8 text-lg font-medium">Strategic location under control. Defensive protocols established.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                    <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Defense Integrity</span>
                    <span className="text-2xl font-mono text-emerald-400">{((gameState.lives / 20) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                    <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Combat Bonus</span>
                    <span className="text-2xl font-mono text-amber-400">$300</span>
                  </div>
                </div>

                <button 
                  onClick={handleReturnToMap}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  Confirm & Next Objective
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState.status === 'won' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-950/95 backdrop-blur-xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-12 relative">
                  <Globe className="text-indigo-400 w-48 h-48 animate-pulse" />
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                </div>
                <h1 className="text-8xl font-black text-white tracking-tightest mb-4 uppercase italic">Planet Secured</h1>
                <p className="text-2xl text-indigo-200/60 max-w-2xl font-light mb-12">The global threat has been neutralized. Your leadership has saved billions.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-12 py-5 bg-white text-indigo-950 font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-50 transition-all hover:scale-110 shadow-2xl"
                >
                  Restart Mission
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOARD RENDERER */}
        <div 
           className="relative bg-slate-800 shadow-2xl rounded-xl border-2 sm:border-4 border-slate-700 overflow-hidden shrink-0" 
           style={{ width: gameState.gridWidth * CELL_SIZE, height: gameState.gridHeight * CELL_SIZE }}
        >
          {/* GRID & PATH */}
          {Array.from({ length: gameState.gridWidth }).map((_, x) => 
            Array.from({ length: gameState.gridHeight }).map((_, y) => {
               const isSelected = selectedCell?.x === x && selectedCell?.y === y;
               return (
                 <div
                   key={`${x}-${y}`}
                   onClick={() => handleCellClick(x, y)}
                   className={`absolute transition-colors duration-200 border-r border-b border-slate-700/10 hover:bg-slate-700/30 ${isSelected ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-900/40 z-10' : ''}`}
                   style={{
                     left: x * CELL_SIZE,
                     top: y * CELL_SIZE,
                     width: CELL_SIZE,
                     height: CELL_SIZE
                   }}
                 />
               );
            })
          )}
          
          <svg className="absolute inset-0 pointer-events-none" width={gameState.gridWidth * CELL_SIZE} height={gameState.gridHeight * CELL_SIZE}>
            <path d={pathSvgData} fill="none" stroke="#312e81" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <path d={pathSvgData} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="10 10" opacity="0.8" />
          </svg>

          {/* TOWERS */}
          {gameState.towers.map(tower => {
            const isSelected = selectedTowerId === tower.id;
            const stat = TOWER_STATS[tower.type];
            return (
              <div
                key={tower.id}
                onClick={(e) => { e.stopPropagation(); handleCellClick(tower.x, tower.y); }}
                className={`absolute rounded flex items-center justify-center cursor-pointer transition-all border-2 ${isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'}`}
                style={{
                  left: tower.x * CELL_SIZE + 2,
                  top: tower.y * CELL_SIZE + 2,
                  width: CELL_SIZE - 4,
                  height: CELL_SIZE - 4,
                  backgroundColor: stat.color + '33', // 20% opacity
                  borderColor: stat.color,
                  boxShadow: `0 0 15px ${stat.color}66` // 40% opacity for glow
                }}
              >
                  {tower.type === 'basic' && <div className="w-1/2 h-1/2 rounded-sm rotate-45" style={{ backgroundColor: stat.color }}></div>}
                  {tower.type === 'sniper' && <div className="w-3/4 h-1.5 rounded-full" style={{ backgroundColor: stat.color }}></div>}
                  {tower.type === 'rapid' && <div className="w-1/2 h-1/2 border-2 rounded-sm" style={{ borderColor: stat.color }}></div>}
                  
                  <div className="absolute inset-0 opacity-80 pointer-events-none">
                    {CARDINAL_DOT_POSITIONS.map((positionClass, index) => (
                      <span
                        key={index}
                        className={`absolute h-1.5 w-1.5 rounded-full shadow-[0_0_4px_rgba(255,255,255,0.35)] ${positionClass}`}
                        style={{ backgroundColor: index < tower.level ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.5)' }}
                      />
                    ))}
                  </div>
                  
                  {/* Range indicator when selected */}
                  {isSelected && (
                    <div className="absolute rounded-full border border-dashed pointer-events-none opacity-50"
                         style={{ 
                           width: tower.range * 2 * CELL_SIZE, 
                           height: tower.range * 2 * CELL_SIZE,
                           borderColor: stat.color,
                           left: '50%',
                           top: '50%',
                           transform: 'translate(-50%, -50%)',
                           backgroundColor: stat.color + '11'
                         }}
                    />
                  )}
              </div>
            )
          })}

          {/* ENEMIES */}
          {gameState.enemies.map(enemy => {
            const stat = ENEMY_STATS[enemy.type];
            return (
              <div
                key={enemy.id}
                className="absolute z-20 flex items-center justify-center shadow-md flex-col"
                style={{
                  left: (enemy.x + 0.5 + enemy.offset.x) * CELL_SIZE - (stat.radius * CELL_SIZE),
                  top: (enemy.y + 0.5 + enemy.offset.y) * CELL_SIZE - (stat.radius * CELL_SIZE),
                  width: stat.radius * 2 * CELL_SIZE,
                  height: stat.radius * 2 * CELL_SIZE,
                }}
              >
                 {/* Health bar */}
                 {enemy.hp < enemy.maxHp && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-800 border border-slate-700">
                       <div className="h-full" style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`, backgroundColor: stat.color }} />
                    </div>
                 )}
                 
                 <div className="w-full h-full rounded-full border-2 flex items-center justify-center animate-pulse"
                      style={{ backgroundColor: stat.color + '4D', borderColor: stat.color }}
                 >
                    <div className="w-1/2 h-1/2 rotate-45" style={{ backgroundColor: stat.color }}></div>
                 </div>

                 {enemy.type === 'boss' && <span className="absolute -bottom-4 text-[9px] uppercase font-bold tracking-tighter whitespace-nowrap" style={{color: stat.color}}>BOSS UNIT</span>}
              </div>
            )
          })}

          {/* PROJECTILES */}
          {gameState.projectiles.map(proj => (
             <div
               key={proj.id}
               className="absolute rounded-full z-30 pointer-events-none"
               style={{
                 left: proj.x * CELL_SIZE - 2,
                 top: proj.y * CELL_SIZE - 2,
                 width: 4,
                 height: 4,
                 backgroundColor: '#ffffff',
                 boxShadow: `0 0 10px 4px ${proj.color}`,
               }}
             />
          ))}
        </div>

      </div>

      {/* RIGHT PANEL: ACTIONS / SHOP */}
      <aside className="w-full lg:w-80 h-[230px] min-[520px]:h-[206px] lg:h-auto bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col lg:pt-4 overflow-hidden z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.35)] lg:shadow-[-10px_0_20px_rgba(0,0,0,0.5)] shrink-0">
         {/* Wave Upcoming Info */}
         <div className="px-4 sm:px-5 border-b border-slate-800 h-[30px] shrink-0 overflow-hidden flex items-center gap-2">
            <h3 className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500">Intel</h3>
            {enemyIntelEntries.length > 0 ? (
               <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
                 {enemyIntelEntries.map(([type, count]) => {
                    const cStat = ENEMY_STATS[type as keyof typeof ENEMY_STATS];
                    return (
                      <div key={type} className="flex shrink-0 items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-0.5">
                         <div className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: cStat.color }}></div>
                         <div className="text-[9px] font-bold uppercase truncate" style={{color: cStat.color}}>{type} <span className="text-slate-500">x{count}</span></div>
                      </div>
                    )
                 })}
               </div>
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">clear</span>
            )}
         </div>
         
         {!selectedCell && !selectedTower && (
            <div className="px-4 py-2.5 sm:px-5 flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Command Center</h2>
               <div className="bg-slate-950 p-3 border border-indigo-500/50 rounded-lg flex items-start gap-3">
                  <Info className="text-indigo-400 mt-0.5 shrink-0" size={18} />
                  <p className="text-xs text-slate-400 leading-relaxed">Select any empty grid tile to initialize a defense unit. Ensure critical paths are covered.</p>
               </div>
            </div>
         )}

         {/* BUILD MENU */}
         {selectedCell && (
            <div className="px-4 py-2.5 sm:px-5 flex-1 min-h-0 overflow-y-auto flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-200">
               <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Build</h2>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                    SEC: {selectedCell.x}-{selectedCell.y}
                  </span>
               </div>
               
               <div className="grid gap-1.5 min-[520px]:grid-cols-3 lg:grid-cols-1">
               {(Object.keys(TOWER_STATS) as TowerType[]).map(type => {
                  const stat = TOWER_STATS[type];
                  const canAfford = gameState.money >= stat.cost;
                  const canBuild = engineRef.current.canBuildTower(selectedCell.x, selectedCell.y);

                  return (
                     <button
                       key={type}
                       disabled={!canAfford || !canBuild}
                       onClick={() => buildTower(type)}
                       title={stat.description}
                       className={`w-full text-left px-2.5 py-2 rounded bg-slate-950 border grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 transition-all group hover:bg-slate-900 min-h-12 ${(!canAfford || !canBuild) ? 'border-slate-800 opacity-50 cursor-not-allowed' : 'border-slate-700'}`}
                       style={{ borderColor: (!canAfford || !canBuild) ? undefined : `${stat.color}55` }}
                     >
                       {type === 'basic' && <div className="w-3 h-3 rounded-[2px] rotate-45 shadow-[0_0_10px_rgba(currentColor,0.4)]" style={{ backgroundColor: stat.color }} />}
                       {type === 'sniper' && <div className="w-4 h-1.5 rounded-full shadow-[0_0_10px_rgba(currentColor,0.4)]" style={{ backgroundColor: stat.color }} />}
                       {type === 'rapid' && <div className="w-3 h-3 border-2 rounded-[2px]" style={{ borderColor: stat.color }} />}
                       <div className="min-w-0">
                         <div className="flex items-center gap-2">
                           <span className="font-bold text-sm tracking-wide truncate" style={{ color: stat.color }}>{stat.name}</span>
                           <span className={`text-[11px] font-mono font-bold ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>${stat.cost}</span>
                         </div>
                         <div className="mt-0.5 flex gap-2 text-[9px] font-mono text-slate-400">
                           <span>D{stat.damage}</span>
                           <span>R{stat.range}</span>
                           <span>S{stat.fireRate}</span>
                         </div>
                       </div>
                       <span className="text-[10px] text-slate-600 group-hover:text-slate-400">+</span>
                     </button>
                  )
               })}
               </div>
               
               {!engineRef.current.canBuildTower(selectedCell.x, selectedCell.y) && (
                  <p className="text-rose-400 text-[10px] uppercase tracking-widest text-center font-bold mt-3 animate-pulse">Invalid Sector</p>
               )}
            </div>
         )}

         {/* TOWER UPGRADE/SELL MENU */}
         {selectedTower && (
            <div className="px-4 py-2.5 sm:px-5 flex-1 min-h-0 overflow-y-auto flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-200">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Tower Inspector</h2>
               
               <div className="grid gap-2 min-[520px]:grid-cols-[1fr_128px] lg:grid-cols-1">
               <div className="bg-slate-950 p-2.5 border rounded-lg" style={{ borderColor: `${TOWER_STATS[selectedTower.type].color}55` }}>
                  <div className="flex justify-between items-start gap-3 mb-2">
                     <div className="min-w-0">
                       <span className="block font-bold tracking-wide leading-tight" style={{ color: TOWER_STATS[selectedTower.type].color }}>{TOWER_STATS[selectedTower.type].name}</span>
                       <p className="mt-1 truncate text-[11px] text-slate-400">{TOWER_STATS[selectedTower.type].description}</p>
                     </div>
                     <div className="relative h-6 w-6 rounded border" style={{ backgroundColor: `${TOWER_STATS[selectedTower.type].color}1A`, borderColor: `${TOWER_STATS[selectedTower.type].color}55` }}>
                       {CARDINAL_DOT_POSITIONS.slice(0, MAX_TOWER_LEVEL).map((positionClass, index) => (
                         <span
                           key={index}
                           className={`absolute h-1.5 w-1.5 rounded-full ${positionClass}`}
                           style={{ backgroundColor: index < selectedTower.level ? TOWER_STATS[selectedTower.type].color : '#334155' }}
                         />
                       ))}
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="rounded bg-slate-900/70 border border-slate-800 px-2 py-1.5">
                      <div className="flex items-baseline justify-between gap-1 mb-1"><span className="text-[8px] uppercase text-slate-500">DMG</span> <span className="text-[11px] text-slate-200 font-mono">{selectedTower.damage}</span></div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${Math.min(100, (selectedTower.damage / 100) * 100)}%`, backgroundColor: TOWER_STATS[selectedTower.type].color }}></div>
                      </div>
                    </div>
                    <div className="rounded bg-slate-900/70 border border-slate-800 px-2 py-1.5">
                      <div className="flex items-baseline justify-between gap-1 mb-1"><span className="text-[8px] uppercase text-slate-500">RNG</span> <span className="text-[11px] text-slate-200 font-mono">{(selectedTower.range * 10).toFixed(0)}</span></div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${Math.min(100, (selectedTower.range / 10) * 100)}%`, backgroundColor: TOWER_STATS[selectedTower.type].color }}></div>
                      </div>
                    </div>
                    <div className="rounded bg-slate-900/70 border border-slate-800 px-2 py-1.5">
                      <div className="flex items-baseline justify-between gap-1 mb-1"><span className="text-[8px] uppercase text-slate-500">SPD</span> <span className="text-[11px] text-slate-200 font-mono">{selectedTower.fireRate.toFixed(1)}</span></div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${Math.min(100, (selectedTower.fireRate / 10) * 100)}%`, backgroundColor: TOWER_STATS[selectedTower.type].color }}></div>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="flex flex-col gap-2 min-[520px]:justify-center">
               {/* Upgrade Action */}
               {(() => {
                  const isMaxLevel = selectedTower.level >= MAX_TOWER_LEVEL;
                  const upgradeCost = Math.max(10, Math.floor(TOWER_STATS[selectedTower.type].cost * Math.pow(1.5, selectedTower.level)) - 20);
                  const canAfford = !isMaxLevel && gameState.money >= upgradeCost;

                  if (isMaxLevel) {
                    return (
                      <div
                        title="Tower is at max level"
                        className="w-full text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <ChevronsUp size={18} strokeWidth={2.5} />
                        <span className="text-xs tracking-widest">MAX</span>
                      </div>
                    )
                  }

                  return (
                     <button
                       disabled={!canAfford}
                       onClick={upgradeTower}
                       aria-label={`Upgrade to level ${selectedTower.level + 1} for $${upgradeCost}`}
                       title={`Upgrade to level ${selectedTower.level + 1}`}
                       className="w-full text-white py-2 rounded font-bold text-sm transition-all border-b-4 flex items-center justify-center gap-2"
                       style={{ 
                         backgroundColor: canAfford ? TOWER_STATS[selectedTower.type].color : '#1e293b', 
                         borderColor: canAfford ? '#00000033' : '#0f172a',
                         opacity: canAfford ? 1 : 0.5,
                         cursor: canAfford ? 'pointer' : 'not-allowed'
                       }}
                     >
                        <ChevronsUp size={20} strokeWidth={2.5} />
                        <span className="flex flex-col items-start leading-none">
                          <span className="text-xs">L{selectedTower.level + 1}</span>
                          <span className="mt-1 text-[10px] font-mono opacity-75">${upgradeCost}</span>
                        </span>
                     </button>
                  )
               })()}

               {/* Sell Action */}
               <button
                 onClick={sellTower}
                 aria-label={`Sell unit for $${Math.floor(selectedTower.value * 0.7)}`}
                 title="Sell unit"
                 className="w-full bg-slate-800 hover:bg-slate-700 text-rose-400 py-1.5 rounded text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2"
               >
                 <Trash2 size={14} />
                 <span>${Math.floor(selectedTower.value * 0.7)}</span>
               </button>
               </div>
               </div>
            </div>
         )}
      </aside>
      </main>

    </div>
  );
}
