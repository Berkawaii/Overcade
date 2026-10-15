export type EnemyKind = 'wolf' | 'boar' | 'bandit';

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  baseAtk: number;
  speed: number;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'patrol' | 'chase' | 'windup' | 'attack' | 'hurt' | 'dead';
  stateTimer: number;
  targetSlot: number | null;
  hurtTimer: number;
  windupTimer: number;
  attackCooldown: number;
  chargeTargetX: number;
  chargeTargetY: number;
  goldValue: number;
  expValue: number;
  color: string;
}

export function createEnemy(
  id: string,
  kind: EnemyKind,
  x: number,
  y: number
): EnemyEntity {
  switch (kind) {
    case 'wolf':
      return {
        id,
        kind: 'wolf',
        name: 'Steppe Pack Wolf',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 20,
        hp: 180,
        maxHp: 180,
        baseAtk: 22,
        speed: 210,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 20,
        expValue: 25,
        color: '#94A3B8',
      };
    case 'boar':
      return {
        id,
        kind: 'boar',
        name: 'Armored Tusker Boar',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 26,
        hp: 360,
        maxHp: 360,
        baseAtk: 34,
        speed: 160,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 2.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 40,
        expValue: 45,
        color: '#B45309',
      };
    case 'bandit':
      return {
        id,
        kind: 'bandit',
        name: 'Plains Marauder',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 22,
        hp: 240,
        maxHp: 240,
        baseAtk: 28,
        speed: 180,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.6,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 35,
        expValue: 35,
        color: '#DC2626',
      };
  }
}
