/**
 * OVERCADE 8-Byte Binary Gamepad Protocol + 4-Byte Host Feedback Protocol
 * Zero-GC ArrayBuffer & DataView Serialization
 *
 * Controller -> Host (8 Bytes):
 * Byte 0: Uint8  - Packet Type (0x01 = Gamepad State, 0x02 = Heartbeat/Ping)
 * Byte 1: Uint8  - 8-Button Bitmask (A, B, X, Y, L1, R1, START, SELECT)
 * Byte 2: Int8   - Left Stick X (-127..127)
 * Byte 3: Int8   - Left Stick Y (-127..127)
 * Byte 4: Int8   - Right Stick X (-127..127)
 * Byte 5: Int8   - Right Stick Y (-127..127)
 * Byte 6-7: Uint16 (Little-Endian) - Circular Sequence Number (0..65535)
 *
 * Host -> Controller (4 Bytes):
 * Byte 0: Uint8  - Packet Type (0x03 = Player Slot & Telemetry Feedback)
 * Byte 1: Uint8  - Assigned Player Slot Index (0 = P1, 1 = P2, 2 = P3, 3 = P4)
 * Byte 2: Uint8  - Mech Armor HP Percentage (0..100)
 * Byte 3: Uint8  - Haptic Vibration Duration in ms (0..250)
 */

export const PACKET_TYPE_GAMEPAD = 0x01;
export const PACKET_TYPE_HEARTBEAT = 0x02;
export const PACKET_TYPE_HOST_FEEDBACK = 0x03;

export const MAX_PLAYERS = 4;

export const PLAYER_COLORS = ['#FF5500', '#10B981', '#F59E0B', '#06B6D4'] as const;
export const PLAYER_CALLSIGNS = ['MECH-01 // P1', 'MECH-02 // P2', 'MECH-03 // P3', 'MECH-04 // P4'] as const;

export interface GamepadButtons {
  A: boolean;
  B: boolean;
  X: boolean;
  Y: boolean;
  L1: boolean;
  R1: boolean;
  START: boolean;
  SELECT: boolean;
}

export interface GamepadAxes {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

export interface GamepadState {
  buttons: GamepadButtons;
  axes: GamepadAxes;
  sequence: number;
  timestamp: number;
  rawBytes: [number, number, number, number, number, number, number, number];
}

export interface HostFeedbackPacket {
  playerSlot: number;
  hpPercent: number;
  vibrateMs: number;
}

export function createEmptyGamepadState(): GamepadState {
  return {
    buttons: {
      A: false,
      B: false,
      X: false,
      Y: false,
      L1: false,
      R1: false,
      START: false,
      SELECT: false,
    },
    axes: {
      leftX: 0,
      leftY: 0,
      rightX: 0,
      rightY: 0,
    },
    sequence: 0,
    timestamp: performance.now(),
    rawBytes: [0x01, 0, 0, 0, 0, 0, 0, 0],
  };
}

function clampAxisToInt8(value: number): number {
  const clamped = Math.max(-1, Math.min(1, value));
  return Math.round(clamped * 127);
}

/**
 * Reusable encoder instance on the mobile controller to avoid allocating
 * a new ArrayBuffer on every 60Hz frame (Zero Garbage Collection pressure).
 */
export class GamepadPacketEncoder {
  private readonly buffer = new ArrayBuffer(8);
  private readonly view = new DataView(this.buffer);
  private readonly uint8View = new Uint8Array(this.buffer);
  private sequence = 0;

  public encode(buttons: GamepadButtons, axes: GamepadAxes): ArrayBuffer {
    this.view.setUint8(0, PACKET_TYPE_GAMEPAD);

    let bitmask = 0;
    if (buttons.A) bitmask |= 1 << 0;
    if (buttons.B) bitmask |= 1 << 1;
    if (buttons.X) bitmask |= 1 << 2;
    if (buttons.Y) bitmask |= 1 << 3;
    if (buttons.L1) bitmask |= 1 << 4;
    if (buttons.R1) bitmask |= 1 << 5;
    if (buttons.START) bitmask |= 1 << 6;
    if (buttons.SELECT) bitmask |= 1 << 7;
    this.view.setUint8(1, bitmask);

    this.view.setInt8(2, clampAxisToInt8(axes.leftX));
    this.view.setInt8(3, clampAxisToInt8(axes.leftY));
    this.view.setInt8(4, clampAxisToInt8(axes.rightX));
    this.view.setInt8(5, clampAxisToInt8(axes.rightY));

    this.view.setUint16(6, this.sequence, true);
    this.sequence = (this.sequence + 1) & 0xffff;

    return this.buffer;
  }

  public getRawBytesSnapshot(): [number, number, number, number, number, number, number, number] {
    return [
      this.uint8View[0],
      this.uint8View[1],
      this.uint8View[3 - 1],
      this.uint8View[3],
      this.uint8View[4],
      this.uint8View[5],
      this.uint8View[6],
      this.uint8View[7],
    ];
  }

  public getCurrentSequence(): number {
    return this.sequence;
  }
}

/**
 * Decodes an incoming 8-byte ArrayBuffer on the Host and filters out stale
 * out-of-order UDP packets using circular uint16 arithmetic.
 */
export function decodeGamepadPacket(
  buffer: ArrayBuffer,
  lastReceivedSequence: number,
  targetState?: GamepadState
): { accepted: boolean; state: GamepadState; sequence: number } {
  const state = targetState ?? createEmptyGamepadState();

  if (buffer.byteLength < 8) {
    return { accepted: false, state, sequence: lastReceivedSequence };
  }

  const view = new DataView(buffer);
  const packetType = view.getUint8(0);
  if (packetType !== PACKET_TYPE_GAMEPAD) {
    return { accepted: false, state, sequence: lastReceivedSequence };
  }

  const sequence = view.getUint16(6, true);

  // Circular sequence check for unordered UDP mode
  if (
    lastReceivedSequence !== -1 &&
    sequence < lastReceivedSequence &&
    lastReceivedSequence - sequence < 32768
  ) {
    return { accepted: false, state, sequence: lastReceivedSequence };
  }

  const mask = view.getUint8(1);
  state.buttons.A = Boolean(mask & (1 << 0));
  state.buttons.B = Boolean(mask & (1 << 1));
  state.buttons.X = Boolean(mask & (1 << 2));
  state.buttons.Y = Boolean(mask & (1 << 3));
  state.buttons.L1 = Boolean(mask & (1 << 4));
  state.buttons.R1 = Boolean(mask & (1 << 5));
  state.buttons.START = Boolean(mask & (1 << 6));
  state.buttons.SELECT = Boolean(mask & (1 << 7));

  state.axes.leftX = Number((view.getInt8(2) / 127).toFixed(3));
  state.axes.leftY = Number((view.getInt8(3) / 127).toFixed(3));
  state.axes.rightX = Number((view.getInt8(4) / 127).toFixed(3));
  state.axes.rightY = Number((view.getInt8(5) / 127).toFixed(3));

  state.sequence = sequence;
  state.timestamp = performance.now();

  const u8 = new Uint8Array(buffer, 0, 8);
  state.rawBytes[0] = u8[0];
  state.rawBytes[1] = u8[1];
  state.rawBytes[2] = u8[2];
  state.rawBytes[3] = u8[3];
  state.rawBytes[4] = u8[4];
  state.rawBytes[5] = u8[5];
  state.rawBytes[6] = u8[6];
  state.rawBytes[7] = u8[7];

  return { accepted: true, state, sequence };
}

export function encodeHostFeedbackPacket(
  playerSlot: number,
  hpPercent: number,
  vibrateMs = 0
): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint8(0, PACKET_TYPE_HOST_FEEDBACK);
  view.setUint8(1, Math.max(0, Math.min(3, playerSlot)));
  view.setUint8(2, Math.max(0, Math.min(100, Math.round(hpPercent))));
  view.setUint8(3, Math.max(0, Math.min(250, Math.round(vibrateMs))));
  return buf;
}

export function decodeHostFeedbackPacket(buffer: ArrayBuffer): HostFeedbackPacket | null {
  if (buffer.byteLength < 4) return null;
  const view = new DataView(buffer);
  if (view.getUint8(0) !== PACKET_TYPE_HOST_FEEDBACK) return null;
  return {
    playerSlot: view.getUint8(1),
    hpPercent: view.getUint8(2),
    vibrateMs: view.getUint8(3),
  };
}
