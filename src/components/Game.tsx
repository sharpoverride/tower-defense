import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GameEngine } from '../game/Engine';
import { GameState, TOWER_STATS, TowerType, ENEMY_STATS, WAVES } from '../game/types';
import { Play, Pause, FastForward, Info, ArrowLeft, Trophy, ExternalLink, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapView from './MapView';

export default function Game() {
  const engineRef = useRef(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(engineRef.current.state);
  const [selectedCell, setSelectedCell] = useState<{ x: number, y: number } | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

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

  const CELL_SIZE = 40; // 40px

  const pathSvgData = useMemo(() => {
    const path = engineRef.current.state.path;
    if (!path.length) return '';
    return 'M ' + path.map(p => `${(p.x + 0.5) * CELL_SIZE} ${(p.y + 0.5) * CELL_SIZE}`).join(' L ');
  }, [engineRef.current.state.path]);

  const selectedTower = selectedTowerId ? gameState.towers.find(t => t.id === selectedTowerId) : null;

  if (gameState.status === 'map') {
    return <MapView gameState={gameState} onSelectLevel={handleSelectLevel} />;
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 font-sans overflow-hidden border-8 border-slate-900 shadow-2xl flex-col">
      
      {/* Header: Stats Bar */}
      <header className="h-16 flex items-center justify-between px-8 bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-12">
          <button 
            onClick={handleReturnToMap}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-widest"
          >
            <ArrowLeft size={16} /> RETURN TO MAP
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">System Status</span>
            <span className="text-emerald-400 font-mono text-xl">{gameState.status === 'playing' ? 'DEFENSE ACTIVE' : 'IDLE'}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"></div>
              <span className="font-mono text-xl">{gameState.lives}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-amber-400">$</span>
              <span className="text-xl">{gameState.money}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4 items-center">
            <button title="Play / Pause" onClick={() => setIsPaused(!isPaused)} className={`p-2 rounded border transition-colors ${isPaused ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button title="Fast Forward" onClick={() => setSpeed(speed === 1 ? 2 : 1)} className={`p-2 rounded border transition-colors ${speed === 2 ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
              <FastForward size={16} />
            </button>
            {gameState.status === 'idle' && (
              <button onClick={startWave} className="ml-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded uppercase tracking-widest text-xs transition-transform hover:scale-105 active:scale-95 border border-indigo-400/50">
                Start Wave
              </button>
            )}
          </div>
          <div className="h-8 w-px bg-slate-700 mx-2"></div>
             <div className="flex flex-col">
               <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Level</span>
               <span className="font-mono text-xl text-emerald-400">{gameState.currentLevel + 1} / {4}</span>
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Wave</span>
               <span className="text-2xl font-mono text-white">{Math.min(gameState.wave + 1, WAVES.length)}<span className="text-slate-600"> / {WAVES.length}</span></span>
             </div>
           </div>
       </header>

      <main className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: GAME BOARD */}
        <div className="flex-1 relative bg-slate-950 p-4 flex items-center justify-center">
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
           className="relative bg-slate-800 shadow-2xl rounded-xl border-4 border-slate-700 overflow-hidden" 
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
                  
                  <div className="absolute -top-6 text-[10px] bg-slate-800 text-slate-200 px-1 border border-slate-600 shadow-md">LV {tower.level}</div>
                  
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
      <aside className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col pt-4 overflow-y-auto z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.5)]">
         
         {!selectedCell && !selectedTower && (
            <div className="p-6">
               <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Command Center</h2>
               <div className="bg-slate-950 p-4 border border-indigo-500/50 rounded-lg">
                  <Info className="text-indigo-400 mb-4" size={24} />
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">Select any empty grid tile to initialize a defense unit. Ensure critical paths are covered.</p>
               </div>
            </div>
         )}

         {/* BUILD MENU */}
         {selectedCell && (
            <div className="p-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-200">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Initialize Unit</h2>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                    SEC: {selectedCell.x}-{selectedCell.y}
                  </span>
               </div>
               
               <div className="space-y-3">
               {(Object.keys(TOWER_STATS) as TowerType[]).map(type => {
                  const stat = TOWER_STATS[type];
                  const canAfford = gameState.money >= stat.cost;
                  const canBuild = engineRef.current.canBuildTower(selectedCell.x, selectedCell.y);

                  return (
                     <button
                       key={type}
                       disabled={!canAfford || !canBuild}
                       onClick={() => buildTower(type)}
                       className={`w-full text-left p-3 rounded bg-slate-950 border flex flex-col gap-2 transition-all group hover:bg-slate-900 ${(!canAfford || !canBuild) ? 'border-slate-800 opacity-50 cursor-not-allowed' : 'border-slate-700'}`}
                       style={{ borderColor: (!canAfford || !canBuild) ? undefined : `${stat.color}55` }}
                     >
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           {type === 'basic' && <div className="w-3 h-3 rounded-[2px] rotate-45 shadow-[0_0_10px_rgba(currentColor,0.4)]" style={{ backgroundColor: stat.color }} />}
                           {type === 'sniper' && <div className="w-4 h-1.5 rounded-full shadow-[0_0_10px_rgba(currentColor,0.4)]" style={{ backgroundColor: stat.color }} />}
                           {type === 'rapid' && <div className="w-3 h-3 border-2 rounded-[2px]" style={{ borderColor: stat.color }} />}
                           <span className="font-bold text-sm tracking-wide" style={{ color: stat.color }}>{stat.name}</span>
                         </div>
                         <span className={`text-xs font-mono font-bold ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>
                           ${stat.cost}
                         </span>
                       </div>
                       
                       <p className="text-[10px] text-slate-400 leading-relaxed">
                         {stat.description}
                       </p>
                       
                       <div className="flex gap-4 mt-1">
                          <div className="flex flex-col"><span className="text-[8px] text-slate-500 uppercase">DMG</span> <span className="text-xs font-mono text-slate-300">{stat.damage}</span></div>
                          <div className="flex flex-col"><span className="text-[8px] text-slate-500 uppercase">RNG</span> <span className="text-xs font-mono text-slate-300">{stat.range}</span></div>
                          <div className="flex flex-col"><span className="text-[8px] text-slate-500 uppercase">SPD</span> <span className="text-xs font-mono text-slate-300">{stat.fireRate}</span></div>
                       </div>
                     </button>
                  )
               })}
               </div>
               
               {!engineRef.current.canBuildTower(selectedCell.x, selectedCell.y) && (
                  <p className="text-rose-400 text-[10px] uppercase tracking-widest text-center font-bold mt-4 animate-pulse">Invalid Sector</p>
               )}
            </div>
         )}

         {/* TOWER UPGRADE/SELL MENU */}
         {selectedTower && (
            <div className="p-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-200">
               <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Tower Inspector</h2>
               
               <div className="bg-slate-950 p-4 border rounded-lg mb-6" style={{ borderColor: `${TOWER_STATS[selectedTower.type].color}55` }}>
                  <div className="flex justify-between items-center mb-2">
                     <span className="font-bold tracking-wide" style={{ color: TOWER_STATS[selectedTower.type].color }}>{TOWER_STATS[selectedTower.type].name}</span>
                     <span className="text-[10px] px-2 py-0.5 rounded border" style={{ backgroundColor: `${TOWER_STATS[selectedTower.type].color}1A`, color: TOWER_STATS[selectedTower.type].color, borderColor: `${TOWER_STATS[selectedTower.type].color}55` }}>Level {selectedTower.level}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{TOWER_STATS[selectedTower.type].description}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] uppercase mb-1"><span className="text-slate-500">Damage</span> <span className="text-slate-200 font-mono">{selectedTower.damage}</span></div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${Math.min(100, (selectedTower.damage / 100) * 100)}%`, backgroundColor: TOWER_STATS[selectedTower.type].color }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] uppercase mb-1"><span className="text-slate-500">Range</span> <span className="text-slate-200 font-mono">{(selectedTower.range * 10).toFixed(0)}m</span></div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${Math.min(100, (selectedTower.range / 10) * 100)}%`, backgroundColor: TOWER_STATS[selectedTower.type].color }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] uppercase mb-1"><span className="text-slate-500">Attack Speed</span> <span className="text-slate-200 font-mono">{selectedTower.fireRate.toFixed(1)}/s</span></div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${Math.min(100, (selectedTower.fireRate / 10) * 100)}%`, backgroundColor: TOWER_STATS[selectedTower.type].color }}></div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Upgrade Action */}
               {(() => {
                  const upgradeCost = Math.max(10, Math.floor(TOWER_STATS[selectedTower.type].cost * Math.pow(1.5, selectedTower.level)) - 20);
                  const canAfford = gameState.money >= upgradeCost;

                  return (
                     <button
                       disabled={!canAfford}
                       onClick={upgradeTower}
                       className="w-full text-white py-3 rounded font-bold text-sm transition-all border-b-4 mb-3 flex items-center justify-center gap-2"
                       style={{ 
                         backgroundColor: canAfford ? TOWER_STATS[selectedTower.type].color : '#1e293b', 
                         borderColor: canAfford ? '#00000033' : '#0f172a',
                         opacity: canAfford ? 1 : 0.5,
                         cursor: canAfford ? 'pointer' : 'not-allowed'
                       }}
                     >
                        UPGRADE <span className="opacity-70 font-normal">(${upgradeCost})</span>
                     </button>
                  )
               })()}

               {/* Sell Action */}
               <button
                 onClick={sellTower}
                 className="w-full bg-slate-800 hover:bg-slate-700 text-rose-400 py-2 rounded text-xs uppercase tracking-widest font-bold transition-colors"
               >
                 Sell Unit (${Math.floor(selectedTower.value * 0.7)})
               </button>
            </div>
         )}
         
         {/* Wave Upcoming Info */}
         <div className="p-6 border-t border-slate-800 mt-auto">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Enemy Intelligence</h3>
            {gameState.enemiesToSpawn.length > 0 ? (
               <div className="bg-slate-950 p-3 border border-slate-700 rounded grid grid-cols-2 gap-2">
                 {Object.entries(gameState.enemiesToSpawn.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([type, count]) => {
                    const cStat = ENEMY_STATS[type as any];
                    return (
                      <div key={type} className="flex items-center gap-2">
                         <div className="w-2 h-2 rotate-45" style={{ backgroundColor: cStat.color }}></div>
                         <div className="text-[9px] font-bold uppercase truncate" style={{color: cStat.color}}>{type} <span className="text-slate-500">x{count}</span></div>
                      </div>
                    )
                 })}
               </div>
            ) : (
               <div className="bg-slate-800/50 p-3 border border-slate-700/50 rounded flex items-center justify-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">No Incoming Swarm</span>
               </div>
            )}
         </div>
      </aside>
      </main>

    </div>
  );
}
