import { Enemy, EnemyType, GameState, Position, Projectile, Tower, TowerType, TOWER_STATS, ENEMY_STATS, WAVES, LevelInfo, MAX_TOWER_LEVEL } from './types';

// Multiple levels with different paths
export const LEVELS_PATHS: Position[][] = [
  // Level 1: Classic
  [
    { x: 0, y: 2 },
    { x: 4, y: 2 },
    { x: 4, y: 8 },
    { x: 10, y: 8 },
    { x: 10, y: 3 },
    { x: 16, y: 3 },
    { x: 16, y: 9 },
    { x: 19, y: 9 },
  ],
  // Level 2: The Box
  [
    { x: 0, y: 5 },
    { x: 15, y: 5 },
    { x: 15, y: 10 },
    { x: 5, y: 10 },
    { x: 5, y: 2 },
    { x: 19, y: 2 },
  ],
  // Level 3: Zig Zag
  [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 5, y: 11 },
    { x: 10, y: 11 },
    { x: 10, y: 0 },
    { x: 15, y: 0 },
    { x: 15, y: 11 },
    { x: 19, y: 11 },
  ],
  // Level 4: Spiral-ish
  [
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 2, y: 10 },
    { x: 2, y: 2 },
    { x: 17, y: 2 },
    { x: 17, y: 8 },
    { x: 6, y: 8 },
    { x: 6, y: 4 },
    { x: 19, y: 4 },
  ],
];

export const LEVELS: LevelInfo[] = [
  {
    id: 0,
    name: 'Sector London',
    location: 'United Kingdom',
    mapPos: { x: 48, y: 22 },
    path: LEVELS_PATHS[0]
  },
  {
    id: 1,
    name: 'Sector Tokyo',
    location: 'Japan',
    mapPos: { x: 86, y: 38 },
    path: LEVELS_PATHS[1]
  },
  {
    id: 2,
    name: 'Sector Washington',
    location: 'USA',
    mapPos: { x: 25, y: 35 },
    path: LEVELS_PATHS[2]
  },
  {
    id: 3,
    name: 'Sector Brasília',
    location: 'Brazil',
    mapPos: { x: 35, y: 70 },
    path: LEVELS_PATHS[3]
  }
];

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 12;

export function initialGameState(): GameState {
  return {
    status: 'map',
    money: 200,
    lives: 20,
    wave: 0,
    currentLevel: 0,
    completedLevels: [],
    enemies: [],
    towers: [],
    projectiles: [],
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    path: LEVELS_PATHS[0],
    timeSinceLastSpawn: 0,
    enemiesToSpawn: [],
    waveCountdown: 0,
  };
}

let idCounter = 0;
const getId = () => `id_${idCounter++}`;

function distance(p1: Position, p2: Position) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export class GameEngine {
  public state: GameState;

  constructor() {
    this.state = initialGameState();
  }

  loadState(state: GameState) {
    this.state = state;
  }

  selectLevel(levelId: number) {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;
    
    this.state.currentLevel = levelId;
    this.state.path = level.path;
    this.state.towers = [];
    this.state.enemies = [];
    this.state.projectiles = [];
    this.state.wave = 0;
    this.state.money = 200 + (this.state.completedLevels.length * 50);
    this.state.lives = 20;
    this.state.status = 'idle';
    this.state.waveCountdown = 0;
  }

  returnToMap() {
    this.state.status = 'map';
  }

  nextLevel() {
    if (!this.state.completedLevels.includes(this.state.currentLevel)) {
      this.state.completedLevels.push(this.state.currentLevel);
    }
    this.state.status = 'level_cleared';
  }

  startWave() {
    if (this.state.status === 'idle' || this.state.status === 'countdown' || (this.state.enemies.length === 0 && this.state.enemiesToSpawn.length === 0)) {
      if (this.state.wave < WAVES.length) {
        this.state.status = 'playing';
        this.state.enemiesToSpawn = [...WAVES[this.state.wave]];
        this.state.timeSinceLastSpawn = 0;
      } else {
        this.state.status = 'won';
      }
    }
  }

  canBuildTower(x: number, y: number): boolean {
    if (x < 0 || x >= this.state.gridWidth || y < 0 || y >= this.state.gridHeight) return false;
    
    // Check if on path
    // We do a simple line segment check for the path
    for (let i = 0; i < this.state.path.length - 1; i++) {
        const p1 = this.state.path[i];
        const p2 = this.state.path[i + 1];
        
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) return false;
    }

    // Check if tower already exists
    if (this.state.towers.some(t => t.x === x && t.y === y)) return false;

    return true;
  }

  buildTower(type: TowerType, x: number, y: number): boolean {
    const cost = TOWER_STATS[type].cost;
    if (this.state.money < cost) return false;
    if (!this.canBuildTower(x, y)) return false;

    this.state.money -= cost;
    this.state.towers.push({
      id: getId(),
      type,
      x,
      y,
      level: 1,
      range: TOWER_STATS[type].range,
      damage: TOWER_STATS[type].damage,
      fireRate: TOWER_STATS[type].fireRate,
      cooldown: 0,
      value: cost,
    });
    return true;
  }

  sellTower(id: string) {
    const index = this.state.towers.findIndex(t => t.id === id);
    if (index === -1) return;
    const tower = this.state.towers[index];
    this.state.money += Math.floor(tower.value * 0.7); // 70% refund
    this.state.towers.splice(index, 1);
  }

  upgradeTower(id: string) {
    const tower = this.state.towers.find(t => t.id === id);
    if (!tower) return;
    if (tower.level >= MAX_TOWER_LEVEL) return;
    const upgradeCost = Math.max(10, Math.floor(TOWER_STATS[tower.type].cost * Math.pow(1.5, tower.level)) - 20);
    if (this.state.money < upgradeCost) return;

    this.state.money -= upgradeCost;
    tower.level += 1;
    tower.damage = Math.floor(tower.damage * 1.5);
    tower.range = tower.range * 1.1;
    tower.fireRate = tower.fireRate * 1.2;
    tower.value += upgradeCost;
  }

  update(dt: number) {
    if (this.state.status === 'countdown') {
      this.state.waveCountdown -= dt;
      if (this.state.waveCountdown <= 0) {
        this.startWave();
      }
    }

    if (this.state.status !== 'playing' && this.state.status !== 'countdown') return;

    // 1. Spawning
    if (this.state.enemiesToSpawn.length > 0 && this.state.status === 'playing') {
      this.state.timeSinceLastSpawn += dt;
      // Calculate dynamic spawn interval based on enemy speed to keep spacing consistent
      const nextType = this.state.enemiesToSpawn[0];
      const spacingSeconds = 1.0 / (ENEMY_STATS[nextType].speed / 2); // Faster enemies spawn closer in time to maintain physical gap
      
      if (this.state.timeSinceLastSpawn >= Math.max(0.6, spacingSeconds)) { 
        this.state.timeSinceLastSpawn = 0;
        const type = this.state.enemiesToSpawn.shift()!;
        const start = this.state.path[0];
        const healthMultiplier = 1 + (this.state.wave * 0.4);
        const maxHp = ENEMY_STATS[type].maxHp * healthMultiplier;
        
        this.state.enemies.push({
          id: getId(),
          type,
          hp: maxHp,
          maxHp: maxHp,
          x: start.x,
          y: start.y,
          pathIndex: 0,
          speed: ENEMY_STATS[type].speed,
          reward: ENEMY_STATS[type].reward,
          damage: ENEMY_STATS[type].damage,
          offset: { 
            x: (Math.random() - 0.5) * 0.4, 
            y: (Math.random() - 0.5) * 0.4 
          },
        });
      }
    } else if (this.state.enemies.length === 0 && this.state.status === 'playing') {
      this.state.wave++;
      if (this.state.wave >= WAVES.length) {
        if (this.state.currentLevel < LEVELS_PATHS.length - 1) {
           this.nextLevel();
        } else {
           this.state.status = 'won';
        }
      } else {
        this.state.status = 'countdown';
        this.state.waveCountdown = 7.0;
      }
    }

    // 2. Move enemies
    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.state.enemies[i];
      if (enemy.pathIndex >= this.state.path.length - 1) continue;

      const targetPos = this.state.path[enemy.pathIndex + 1];
      const distToNextNode = distance(enemy, targetPos);

      // Spacing logic: check if there's someone in front on the same path segment or slightly ahead
      let speedScale = 1.0;
      const minGap = 0.6; // minimum grid distance between enemies

      for (const other of this.state.enemies) {
        if (other.id === enemy.id) continue;
        
        // Only care about enemies that are "ahead"
        // A simple check is comparing pathIndex or progress towards next node
        const isOtherAhead = other.pathIndex > enemy.pathIndex || 
                            (other.pathIndex === enemy.pathIndex && distance(other, targetPos) < distToNextNode);
        
        if (isOtherAhead) {
          const d = distance(enemy, other);
          if (d < minGap) {
            // Slow down proportional to closeness
            speedScale = Math.min(speedScale, Math.pow(d / minGap, 2));
          }
        }
      }

      const moveAmount = enemy.speed * speedScale * dt;

      if (distToNextNode <= moveAmount) {
        enemy.x = targetPos.x;
        enemy.y = targetPos.y;
        enemy.pathIndex++;
        if (enemy.pathIndex >= this.state.path.length - 1) {
          // Reached end
          this.state.lives -= enemy.damage;
          this.state.enemies.splice(i, 1);
          if (this.state.lives <= 0) {
            this.state.status = 'gameover';
          }
        }
      } else {
        // Move towards
        const dirX = (targetPos.x - enemy.x) / distToNextNode;
        const dirY = (targetPos.y - enemy.y) / distToNextNode;
        enemy.x += dirX * moveAmount;
        enemy.y += dirY * moveAmount;
      }
    }

    // 3. Towers shooting
    for (const tower of this.state.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      
      if (tower.cooldown > 0) continue;

      // Find target: first enemy in range
      // Priority: furthest along the path
      let bestEnemy: Enemy | null = null;
      let minDistanceToEnd = Infinity;

      for (const enemy of this.state.enemies) {
        // center of tile for tower is x + 0.5
        const tPos = { x: tower.x + 0.5, y: tower.y + 0.5 };
        // center of enemy
        const eCenter = { x: enemy.x + 0.5, y: enemy.y + 0.5 };
        const distToEnemy = distance(tPos, eCenter);
        if (distToEnemy <= tower.range) {
          // simple heuristic: pathIndex is higher = further
          const distToEnd = (this.state.path.length - enemy.pathIndex) - distance(enemy, this.state.path[enemy.pathIndex + 1]);
          if (distToEnd < minDistanceToEnd) {
             minDistanceToEnd = distToEnd;
             bestEnemy = enemy;
          }
        }
      }

      if (bestEnemy) {
        tower.cooldown = 1 / tower.fireRate;
        this.state.projectiles.push({
          id: getId(),
          x: tower.x + 0.5,
          y: tower.y + 0.5,
          targetId: bestEnemy.id,
          damage: tower.damage,
          speed: 15,
          color: TOWER_STATS[tower.type].color,
        });
      }
    }

    // 4. Projectiles moving and hitting
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];
      const target = this.state.enemies.find(e => e.id === proj.targetId);

      if (!target) {
        // Target died, remove projectile
        this.state.projectiles.splice(i, 1);
        continue;
      }

      // Target the center of the enemy (including visual offset)
      const targetCenterX = target.x + 0.5 + target.offset.x;
      const targetCenterY = target.y + 0.5 + target.offset.y;
      const dist = Math.sqrt(Math.pow(targetCenterX - proj.x, 2) + Math.pow(targetCenterY - proj.y, 2));
      const moveAmount = proj.speed * dt;

      if (dist <= moveAmount) {
        // Hit
        target.hp -= proj.damage;
        this.state.projectiles.splice(i, 1);

        if (target.hp <= 0) {
          this.state.money += target.reward;
          const tIndex = this.state.enemies.indexOf(target);
          if (tIndex > -1) {
            this.state.enemies.splice(tIndex, 1);
          }
        }
      } else {
        const dirX = (targetCenterX - proj.x) / dist;
        const dirY = (targetCenterY - proj.y) / dist;
        proj.x += dirX * moveAmount;
        proj.y += dirY * moveAmount;
      }
    }
  }
}
