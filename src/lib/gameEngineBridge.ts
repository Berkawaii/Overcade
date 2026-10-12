import { create } from 'zustand';
import {
  createEmptyGamepadState,
  decodeGamepadPacket,
  MAX_PLAYERS,
  type GamepadButtons,
  type GamepadState,
} from './binaryProtocol';

export type ConnectionPhase =
  | 'idle'
  | 'creating_room'
  | 'waiting_for_peer'
  | 'negotiating_webrtc'
  | 'connected_p2p'
  | 'disconnected'
  | 'error';

export type MenuDirection = 'up' | 'down' | 'left' | 'right';
export type ButtonKey = keyof GamepadButtons;

interface ConsoleConnectionStore {
  roomId: string;
  phase: ConnectionPhase;
  errorMessage: string | null;
  firestoreSignalingOps: number;
  firestoreListenersActive: boolean;
  packetsReceived: number;
  packetsDropped: number;
  packetsPerSecond: number;
  connectedSlots: [boolean, boolean, boolean, boolean];
  connectedCount: number;
  setRoomId: (roomId: string) => void;
  setPhase: (phase: ConnectionPhase, errorMessage?: string | null) => void;
  incrementFirestoreOps: (count?: number) => void;
  setFirestoreListenersActive: (active: boolean) => void;
  recordPacketMetrics: (received: number, dropped: number, pps: number) => void;
  setSlotConnected: (slotIndex: number, connected: boolean) => void;
}

export const useConsoleConnectionStore = create<ConsoleConnectionStore>((set) => ({
  roomId: '',
  phase: 'idle',
  errorMessage: null,
  firestoreSignalingOps: 0,
  firestoreListenersActive: false,
  packetsReceived: 0,
  packetsDropped: 0,
  packetsPerSecond: 0,
  connectedSlots: [false, false, false, false],
  connectedCount: 0,
  setRoomId: (roomId) => set({ roomId }),
  setPhase: (phase, errorMessage = null) => set({ phase, errorMessage }),
  incrementFirestoreOps: (count = 1) =>
    set((state) => ({ firestoreSignalingOps: state.firestoreSignalingOps + count })),
  setFirestoreListenersActive: (active) => set({ firestoreListenersActive: active }),
  recordPacketMetrics: (packetsReceived, packetsDropped, packetsPerSecond) =>
    set({ packetsReceived, packetsDropped, packetsPerSecond }),
  setSlotConnected: (slotIndex, connected) =>
    set((state) => {
      const next: [boolean, boolean, boolean, boolean] = [...state.connectedSlots];
      if (slotIndex >= 0 && slotIndex < MAX_PLAYERS) {
        next[slotIndex] = connected;
      }
      const connectedCount = next.filter(Boolean).length;
      const phase: ConnectionPhase =
        connectedCount > 0
          ? 'connected_p2p'
          : state.firestoreListenersActive
          ? 'waiting_for_peer'
          : 'disconnected';
      return { connectedSlots: next, connectedCount, phase };
    }),
}));

type DirectionCommandListener = (dir: MenuDirection, playerSlot: number) => void;
type ButtonCommandListener = (button: ButtonKey, playerSlot: number) => void;
type HostFeedbackSender = (playerSlot: number, hpPercent: number, vibrateMs?: number) => void;

/**
 * GameEngineBridge
 * High-frequency mutable singleton for 60-120Hz gamepad input consumption across up to 4 players.
 * Follows `perf-never-set-state-in-useframe`: Three.js scenes and HUD canvases
 * read `GameEngineBridge.playersInput[slot]` directly inside requestAnimationFrame / useFrame
 * without triggering React re-renders.
 */
class GameEngineBridgeCore {
  public readonly playersInput: [GamepadState, GamepadState, GamepadState, GamepadState] = [
    createEmptyGamepadState(),
    createEmptyGamepadState(),
    createEmptyGamepadState(),
    createEmptyGamepadState(),
  ];

  // Alias to Slot 0 (or last active controller) for single-player & inspector compatibility
  public get currentInput(): GamepadState {
    return this.playersInput[this.activeInspectorSlot];
  }

  public activeInspectorSlot = 0;
  public lastReceivedSequences: [number, number, number, number] = [-1, -1, -1, -1];
  public totalPacketsReceived = 0;
  public totalPacketsDropped = 0;

  private packetsInCurrentSecond = 0;
  private lastSecondTimestamp = performance.now();

  private prevButtons: GamepadButtons[] = Array.from({ length: MAX_PLAYERS }, () => ({
    A: false,
    B: false,
    X: false,
    Y: false,
    L1: false,
    R1: false,
    START: false,
    SELECT: false,
  }));

  private lastStickNavTimestamp: number[] = [0, 0, 0, 0];
  private stickNeutral: boolean[] = [true, true, true, true];

  private directionListeners = new Set<DirectionCommandListener>();
  private buttonListeners = new Set<ButtonCommandListener>();
  private feedbackSender: HostFeedbackSender | null = null;

  public registerFeedbackSender(sender: HostFeedbackSender | null): void {
    this.feedbackSender = sender;
  }

  public sendFeedbackToController(
    playerSlot: number,
    hpPercent: number,
    vibrateMs = 0
  ): void {
    if (this.feedbackSender) {
      this.feedbackSender(playerSlot, hpPercent, vibrateMs);
    }
  }

  public resetSession(): void {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const empty = createEmptyGamepadState();
      Object.assign(this.playersInput[i].buttons, empty.buttons);
      Object.assign(this.playersInput[i].axes, empty.axes);
      this.playersInput[i].sequence = 0;
      this.playersInput[i].rawBytes = [0x01, 0, 0, 0, 0, 0, 0, 0];
      this.lastReceivedSequences[i] = -1;
    }
    this.totalPacketsReceived = 0;
    this.totalPacketsDropped = 0;
    this.packetsInCurrentSecond = 0;
    useConsoleConnectionStore.getState().recordPacketMetrics(0, 0, 0);
  }

  public resetSlotInput(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= MAX_PLAYERS) return;
    const empty = createEmptyGamepadState();
    Object.assign(this.playersInput[slotIndex].buttons, empty.buttons);
    Object.assign(this.playersInput[slotIndex].axes, empty.axes);
    this.playersInput[slotIndex].sequence = 0;
    this.playersInput[slotIndex].rawBytes = [0x01, 0, 0, 0, 0, 0, 0, 0];
    this.lastReceivedSequences[slotIndex] = -1;
  }

  public dispatchBinaryPacket(buffer: ArrayBuffer, slotIndex = 0): void {
    const safeSlot = Math.max(0, Math.min(MAX_PLAYERS - 1, slotIndex));
    const result = decodeGamepadPacket(
      buffer,
      this.lastReceivedSequences[safeSlot],
      this.playersInput[safeSlot]
    );

    if (!result.accepted) {
      this.totalPacketsDropped += 1;
      return;
    }

    this.lastReceivedSequences[safeSlot] = result.sequence;
    this.totalPacketsReceived += 1;
    this.packetsInCurrentSecond += 1;

    const now = performance.now();
    if (now - this.lastSecondTimestamp >= 1000) {
      const pps = Math.round(
        (this.packetsInCurrentSecond * 1000) / (now - this.lastSecondTimestamp)
      );
      useConsoleConnectionStore
        .getState()
        .recordPacketMetrics(this.totalPacketsReceived, this.totalPacketsDropped, pps);
      this.packetsInCurrentSecond = 0;
      this.lastSecondTimestamp = now;
    }

    this.processEdgeEvents(safeSlot, now);
  }

  /**
   * Allows local PC keyboard testing to drive either Slot 0 (if no phone is on P1)
   * or Slot 1 (so 1 Phone + 1 Keyboard can play 2-Player Co-op/PvP on the same PC!)
   */
  public dispatchSyntheticInput(
    partial: {
      buttons?: Partial<GamepadButtons>;
      axes?: Partial<GamepadState['axes']>;
    },
    explicitSlot?: number
  ): void {
    const connected = useConsoleConnectionStore.getState().connectedSlots;
    // If Phone 1 is connected, map local keyboard to Player 2 (Slot 1) automatically for instant 2P testing!
    const targetSlot =
      explicitSlot !== undefined ? explicitSlot : connected[0] && !connected[1] ? 1 : 0;

    const state = this.playersInput[targetSlot];
    if (partial.buttons) {
      Object.assign(state.buttons, partial.buttons);
    }
    if (partial.axes) {
      Object.assign(state.axes, partial.axes);
    }
    state.timestamp = performance.now();
    this.processEdgeEvents(targetSlot, state.timestamp);
  }

  private processEdgeEvents(slot: number, now: number): void {
    const b = this.playersInput[slot].buttons;
    const prev = this.prevButtons[slot];
    const keys: ButtonKey[] = ['A', 'B', 'X', 'Y', 'L1', 'R1', 'START', 'SELECT'];

    for (const key of keys) {
      if (b[key] && !prev[key]) {
        this.activeInspectorSlot = slot;
        this.buttonListeners.forEach((cb) => cb(key, slot));
      }
      prev[key] = b[key];
    }

    // Left analog stick spatial navigation edge trigger
    const { leftX, leftY } = this.playersInput[slot].axes;
    const threshold = 0.52;
    const repeatCooldownMs = 230;

    if (Math.abs(leftX) < 0.25 && Math.abs(leftY) < 0.25) {
      this.stickNeutral[slot] = true;
      return;
    }

    if (this.stickNeutral[slot] || now - this.lastStickNavTimestamp[slot] > repeatCooldownMs) {
      let triggeredDir: MenuDirection | null = null;
      if (Math.abs(leftX) > Math.abs(leftY)) {
        if (leftX > threshold) triggeredDir = 'right';
        else if (leftX < -threshold) triggeredDir = 'left';
      } else {
        if (leftY > threshold) triggeredDir = 'down';
        else if (leftY < -threshold) triggeredDir = 'up';
      }

      if (triggeredDir) {
        this.stickNeutral[slot] = false;
        this.lastStickNavTimestamp[slot] = now;
        this.activeInspectorSlot = slot;
        this.directionListeners.forEach((cb) => cb(triggeredDir, slot));
      }
    }
  }

  public onDirection(listener: DirectionCommandListener): () => void {
    this.directionListeners.add(listener);
    return () => this.directionListeners.delete(listener);
  }

  public onButtonPress(listener: ButtonCommandListener): () => void {
    this.buttonListeners.add(listener);
    return () => this.buttonListeners.delete(listener);
  }
}

export const GameEngineBridge = new GameEngineBridgeCore();
