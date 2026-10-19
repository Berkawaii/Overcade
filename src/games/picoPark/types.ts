export type PicoCalloutText = 'JUMP!' | 'PUSH!' | 'WAIT!' | 'NICE!';

export interface PicoPlayer {
  slotIndex: number;
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  coyoteTimer: number;
  facing: 'left' | 'right';
  animTimer: number;
  ridingOnPlayerId: number | null;
  ridingOnPlatformId: string | null;
  ridingOnBlockId: string | null;
  carryingShield: boolean;
  hasKey: boolean;
  enteredDoor: boolean;
  isDead: boolean;
  speechBubble: PicoCalloutText | null;
  speechTimer: number;
  crownScore: number;
  hasCrown: boolean;
  stunTimer: number;
}

export interface PicoPlatform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  initialX: number;
  initialY: number;
  color: string;
  type: 'solid' | 'moving' | 'bridge' | 'elevator_left' | 'elevator_right';
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  linkedSwitchId?: string;
  activeWhenPressed?: boolean;
  isOpen?: boolean;
  currentWeight?: number;
}

export interface PicoNumberBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  baseRequiredPlayers: number;
  requiredPlayers: number;
  currentPushers: number;
  pushDirection: -1 | 0 | 1;
  color: string;
  isGrounded: boolean;
}

export interface PicoSwitch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'hold' | 'toggle' | 'gravity';
  isPressed: boolean;
  wasPressedLastFrame: boolean;
  color: string;
  label: string;
}

export interface PicoKey {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  carrierSlot: number | null;
  isCollected: boolean;
  isUnlockedDoor: boolean;
  bombTimer: number | null;
  maxBombTimer: number | null;
  passCooldown: number;
}

export interface PicoDoor {
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  enteredCount: number;
  requiredCount: number;
}

export interface PicoSpring {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bounceVy: number;
  compressTimer: number;
}

export interface PicoLaserEmitter {
  id: string;
  x: number;
  y: number;
  dir: 'left' | 'right' | 'down' | 'up';
  period: number;
  activeDuration: number;
  timer: number;
  isFiring: boolean;
  beamEndX: number;
  beamEndY: number;
}

export interface PicoJumpRope {
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
  phase: number;
  speed: number;
  jumpCount: number;
  targetJumps: number;
  completed: boolean;
}

export interface PicoHazard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spikes_up' | 'spikes_down' | 'lava';
}

export interface PicoCannon {
  x: number;
  y: number;
  launchVx: number;
  launchVy: number;
  cooldown: number;
}

export interface PicoParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface PicoStageDefinition {
  id: string;
  stageNumber: number;
  title: string;
  subtitle: string;
  gimmickBadge: string;
  hintText: string;
  tetherEnabled?: boolean;
  tetherLength?: number;
  shieldAvailable?: boolean;
  shieldSpawn?: { x: number; y: number };
  bombKeySeconds?: number;
  gravityFlipAllowed?: boolean;
  isBattleMode?: boolean;
  spawnPos: { x: number; y: number };
  keyPos: { x: number; y: number };
  doorPos: { x: number; y: number };
  platforms: Omit<PicoPlatform, 'initialX' | 'initialY'>[];
  numberBlocks: Omit<
    PicoNumberBlock,
    'vx' | 'vy' | 'requiredPlayers' | 'currentPushers' | 'pushDirection' | 'isGrounded'
  >[];
  switches: Omit<PicoSwitch, 'isPressed' | 'wasPressedLastFrame'>[];
  springs: Omit<PicoSpring, 'compressTimer'>[];
  lasers: Omit<PicoLaserEmitter, 'timer' | 'isFiring' | 'beamEndX' | 'beamEndY'>[];
  hazards: PicoHazard[];
  jumpRope?: Omit<PicoJumpRope, 'phase' | 'jumpCount' | 'completed'>;
  cannon?: Omit<PicoCannon, 'cooldown'>;
}

export interface PicoStageTelemetry {
  stageIndex: number;
  stageNumber: number;
  title: string;
  subtitle: string;
  gimmickBadge: string;
  hintText: string;
  activeUnitCount: number;
  activeControlledSlot: number;
  squadFollowMode: boolean;
  keyCollected: boolean;
  doorOpen: boolean;
  enteredCount: number;
  requiredCount: number;
  bombTimer: number | null;
  jumpRopeCount: number | null;
  jumpRopeTarget: number | null;
  gravityDir: 1 | -1;
  stageCleared: boolean;
  failReason: string | null;
  isBattleMode: boolean;
  battleWinner: string | null;
  players: PicoPlayer[];
}
