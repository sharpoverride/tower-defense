export type Position = { x: number; y: number };

export type EnemyType = 'goblin' | 'orc' | 'boss' | 'fast';
export type TowerType = 'basic' | 'sniper' | 'rapid';

export const MAX_TOWER_LEVEL = 4;

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  x: number; // grid coords (can be fractional)
  y: number; // grid coords
  pathIndex: number; // current segment in the path
  speed: number;
  reward: number;
  damage: number;
  offset: Position; // Visual offset for crowd appearance
}

export interface Tower {
  id: string;
  type: TowerType;
  x: number; // grid coords (integer)
  y: number;
  level: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  cooldown: number; // current cooldown timer in seconds
  value: number; // total money spent on this tower
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number; // grid cells per second
  color: string;
}

export interface LevelInfo {
  id: number;
  name: string;
  location: string;
  mapPos: { x: number; y: number }; // Percentage 0-100
  path: Position[];
}

export interface GameState {
  status: 'idle' | 'countdown' | 'playing' | 'gameover' | 'level_cleared' | 'won' | 'map';
  money: number;
  lives: number;
  wave: number;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  gridWidth: number;
  gridHeight: number;
  path: Position[];
  currentLevel: number;
  completedLevels: number[];
  timeSinceLastSpawn: number;
  enemiesToSpawn: EnemyType[];
  waveCountdown: number;
}

export const TOWER_STATS: Record<TowerType, { name: string; cost: number; range: number; damage: number; fireRate: number; color: string; description: string }> = {
  basic: { name: 'Basic', cost: 30, range: 3.5, damage: 24, fireRate: 1, color: '#3b82f6', description: 'Balanced starter tower' },
  sniper: { name: 'Sniper', cost: 100, range: 7, damage: 96, fireRate: 0.4, color: '#ef4444', description: 'High range, high damage, slow fire' },
  rapid: { name: 'Rapid', cost: 130, range: 2.5, damage: 6, fireRate: 6, color: '#eab308', description: 'Very fast firing rate, short range' },
};

export const ENEMY_STATS: Record<EnemyType, { maxHp: number; speed: number; reward: number; damage: number; color: string; radius: number }> = {
  goblin: { maxHp: 30, speed: 2, reward: 5, damage: 1, color: '#22c55e', radius: 0.3 },
  fast: { maxHp: 20, speed: 3.5, reward: 8, damage: 1, color: '#14b8a6', radius: 0.25 },
  orc: { maxHp: 100, speed: 1.2, reward: 15, damage: 2, color: '#b91c1c', radius: 0.4 },
  boss: { maxHp: 800, speed: 0.8, reward: 100, damage: 5, color: '#7e22ce', radius: 0.6 },
};

export const WAVES: EnemyType[][] = [
  ['goblin', 'goblin', 'goblin', 'goblin', 'goblin'],
  ['goblin', 'goblin', 'goblin', 'fast', 'fast', 'goblin'],
  ['goblin', 'orc', 'goblin', 'orc', 'goblin', 'fast'],
  ['orc', 'orc', 'orc', 'fast', 'fast', 'fast', 'boss'],
  ['goblin', 'boss', 'orc', 'orc', 'orc', 'boss', 'orc'],
  ['fast', 'fast', 'fast', 'boss', 'fast', 'fast', 'fast', 'boss'],
  ['orc', 'orc', 'boss', 'orc', 'orc', 'boss', 'orc', 'orc'],
  ['boss', 'boss', 'orc'],
  ['boss', 'fast', 'fast', 'boss', 'fast', 'orc', 'orc', 'boss'],
  ['orc', 'boss', 'fast', 'fast', 'boss', 'boss', 'goblin', 'fast'],
  ['fast', 'fast', 'boss', 'boss', 'boss', 'boss', 'fast', 'fast'],
  ['orc', 'orc', 'boss', 'boss', 'boss', 'boss', 'orc', 'orc'],
  ['boss', 'boss', 'boss', 'boss', 'boss', 'boss', 'boss', 'boss']
];
