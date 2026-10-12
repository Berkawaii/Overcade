import { create } from 'zustand';
import {
  createEmptyGamepadState,
  decodeGamepadPacket,
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
  setRoomId: (roomId: string) => void;
  setPhase: (phase: ConnectionPhase, errorMessage?: string | null) => void;
  incrementFirestoreOps: (count?: number) => void;
  setFirestoreListenersActive: (active: boolean) => void;
  recordPacketMetrics: (received: number, dropped: number, pps: number) => void;
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
  setRoomId: (roomId) => set({ roomId }),
  setPhase: (phase, errorMessage = null) => set({ phase, errorMessage }),
  incrementFirestoreOps: (count = 1) =>
    set((state) => ({ firestoreSignalingOps: state.firestoreSignalingOps + count })),
  setFirestoreListenersActive: (active) => set({ firestoreListenersActive: active }),
  recordPacketMetrics: (packetsReceived, packetsDropped, packetsPerSecond) =>
    set({ packetsReceived, packetsDropped, packetsPerSecond }),
}));

type DirectionCommandListener = (dir: MenuDirection) => void;
type ButtonCommandListener = (button: ButtonKey) => void;

/**
 * GameEngineBridge
 * High-frequency mutable singleton for 60-120Hz gamepad input consumption.
 * Follows `perf-never-set-state-in-useframe`: Three.js scenes and HUD canvases
 * read `GameEngineBridge.currentInput` directly inside requestAnimationFrame / useFrame
 * without triggering React re-renders.
 */
class GameEngineBridgeCore {
  public readonly currentInput: GamepadState = createEmptyGamepadState();
  public lastReceivedSequence = -1;
  public totalPacketsReceived = 0;
  public totalPacketsDropped = 0;

  private packetsInCurrentSecond = 0;
  private lastSecondTimestamp = performance.now();

  private prevButtons: GamepadButtons = {
    A: false,
    B: false,
    X: false,
    Y: false,
    L1: false,
    R1: false,
    START: false,
    SELECT: false,
  };

  private lastStickNavTimestamp = 0;
  private stickNeutral = true;

  private directionListeners = new Set<DirectionCommandListener>();
  private buttonListeners = new Set<ButtonCommandListener>();

  public resetSession(): void {
    const empty = createEmptyGamepadState();
    Object.assign(this.currentInput.buttons, empty.buttons);
    Object.assign(this.currentInput.axes, empty.axes);
    this.currentInput.sequence = 0;
    this.currentInput.rawBytes = [0x01, 0, 0, 0, 0, 0, 0, 0];
    this.lastReceivedSequence = -1;
    this.totalPacketsReceived = 0;
    this.totalPacketsDropped = 0;
    this.packetsInCurrentSecond = 0;
    useConsoleConnectionStore.getState().recordPacketMetrics(0, 0, 0);
  }

  public dispatchBinaryPacket(buffer: ArrayBuffer): void {
    const result = decodeGamepadPacket(
      buffer,
      this.lastReceivedSequence,
      this.currentInput
    );

    if (!result.accepted) {
      this.totalPacketsDropped += 1;
      return;
    }

    this.lastReceivedSequence = result.sequence;
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

    this.processEdgeEvents(now);
  }

  /**
   * Allows local keyboard/gamepad testing on Host PC to feed into the same bridge
   */
  public dispatchSyntheticInput(partial: {
    buttons?: Partial<GamepadButtons>;
    axes?: Partial<GamepadState['axes']>;
  }): void {
    if (partial.buttons) {
      Object.assign(this.currentInput.buttons, partial.buttons);
    }
    if (partial.axes) {
      Object.assign(this.currentInput.axes, partial.axes);
    }
    this.currentInput.timestamp = performance.now();
    this.processEdgeEvents(this.currentInput.timestamp);
  }

  private processEdgeEvents(now: number): void {
    const b = this.currentInput.buttons;
    const keys: ButtonKey[] = ['A', 'B', 'X', 'Y', 'L1', 'R1', 'START', 'SELECT'];

    for (const key of keys) {
      if (b[key] && !this.prevButtons[key]) {
        this.buttonListeners.forEach((cb) => cb(key));
      }
      this.prevButtons[key] = b[key];
    }

    // Left analog stick spatial navigation edge trigger
    const { leftX, leftY } = this.currentInput.axes;
    const threshold = 0.52;
    const repeatCooldownMs = 230;

    if (Math.abs(leftX) < 0.25 && Math.abs(leftY) < 0.25) {
      this.stickNeutral = true;
      return;
    }

    if (this.stickNeutral || now - this.lastStickNavTimestamp > repeatCooldownMs) {
      let triggeredDir: MenuDirection | null = null;
      if (Math.abs(leftX) > Math.abs(leftY)) {
        if (leftX > threshold) triggeredDir = 'right';
        else if (leftX < -threshold) triggeredDir = 'left';
      } else {
        if (leftY > threshold) triggeredDir = 'down';
        else if (leftY < -threshold) triggeredDir = 'up';
      }

      if (triggeredDir) {
        this.stickNeutral = false;
        this.lastStickNavTimestamp = now;
        this.directionListeners.forEach((cb) => cb(triggeredDir));
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
