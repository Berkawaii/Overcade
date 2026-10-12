import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth, tryAnonymousSession } from './firebase';
import {
  decodeHostFeedbackPacket,
  encodeHostFeedbackPacket,
  MAX_PLAYERS,
  type HostFeedbackPacket,
} from './binaryProtocol';
import { GameEngineBridge, useConsoleConnectionStore } from './gameEngineBridge';

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

const ROOM_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6): string {
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CHARSET[randomValues[i] % ROOM_CHARSET.length];
  }
  return code;
}

interface PeerSlotEntry {
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  connected: boolean;
}

/**
 * Multi-Slot Host Session Manager (PC / Smart TV Browser)
 * Supports 1 to 4 simultaneous Mobile Controllers over the SAME 6-character roomId!
 * Whenever a controller finishes its handshake and opens its P2P DataChannel,
 * the Host automatically clears the signaling candidates and arms a fresh SDP Offer
 * for the next open player slot (P1 -> P2 -> P3 -> P4).
 * Once all 4 slots are filled (or when manually locked), Firestore listeners are detached
 * and the room document is garbage-collected.
 */
export class HostSignalingSession {
  private slots: PeerSlotEntry[] = Array.from({ length: MAX_PLAYERS }, () => ({
    pc: null,
    dc: null,
    connected: false,
  }));

  private activePendingSlot: number | null = null;
  private roomCreatedAt = 0;
  private hostUid = 'anonymous-host';
  private roomUnsubscribe: Unsubscribe | null = null;
  private calleeIceUnsubscribe: Unsubscribe | null = null;
  private isRearming = false;
  public roomId = '';

  constructor() {
    GameEngineBridge.registerFeedbackSender((slot, hpPercent, vibrateMs = 0) => {
      this.sendFeedbackToSlot(slot, hpPercent, vibrateMs);
    });
  }

  public async startNewRoom(): Promise<string> {
    await this.cleanup();
    GameEngineBridge.resetSession();

    const store = useConsoleConnectionStore.getState();
    store.setPhase('creating_room');

    await tryAnonymousSession();

    this.roomId = generateRoomCode(6);
    this.roomCreatedAt = Date.now();
    this.hostUid = auth.currentUser?.uid || 'anonymous-host';
    store.setRoomId(this.roomId);

    for (let i = 0; i < MAX_PLAYERS; i++) {
      store.setSlotConnected(i, false);
    }

    await this.armOfferForNextAvailableSlot(true);
    return this.roomId;
  }

  private findFirstOpenSlot(): number {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      if (!this.slots[i].connected) {
        return i;
      }
    }
    return -1;
  }

  private async armOfferForNextAvailableSlot(isInitialCreate = false): Promise<void> {
    if (this.isRearming || !this.roomId) return;
    const targetSlot = this.findFirstOpenSlot();

    if (targetSlot === -1) {
      // All 4 controller slots are connected! Detach Firestore and garbage collect room
      this.detachFirestoreListeners();
      await this.garbageCollectRoom(this.roomId);
      return;
    }

    this.isRearming = true;
    this.detachFirestoreListeners();

    try {
      const store = useConsoleConnectionStore.getState();
      const roomRef = doc(db, 'rooms', this.roomId);
      const callerCandidatesCol = collection(roomRef, 'callerCandidates');
      const calleeCandidatesCol = collection(roomRef, 'calleeCandidates');

      if (!isInitialCreate) {
        await this.clearCandidateSubcollections(this.roomId);
      }

      // Close any leftover unconnected PC on this slot
      if (this.slots[targetSlot].pc && !this.slots[targetSlot].connected) {
        this.slots[targetSlot].pc?.close();
      }

      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      const dc = pc.createDataChannel('gamepad', {
        ordered: false,
        maxRetransmits: 0,
      });
      dc.binaryType = 'arraybuffer';

      this.slots[targetSlot] = {
        pc,
        dc,
        connected: false,
      };
      this.activePendingSlot = targetSlot;

      this.setupSlotDataChannel(targetSlot, dc);

      pc.onicecandidate = async (event) => {
        if (!event.candidate || this.activePendingSlot !== targetSlot) return;
        const json = event.candidate.toJSON();
        if (!json.candidate) return;
        try {
          await addDoc(callerCandidatesCol, {
            candidate: json.candidate,
            sdpMid: json.sdpMid ?? null,
            sdpMLineIndex: json.sdpMLineIndex ?? null,
            usernameFragment: json.usernameFragment ?? null,
          });
          useConsoleConnectionStore.getState().incrementFirestoreOps(1);
        } catch (err) {
          console.warn('Caller ICE candidate yazma hatası:', err);
        }
      };

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === 'disconnected' || st === 'failed' || st === 'closed') {
          if (this.slots[targetSlot].connected) {
            this.slots[targetSlot].connected = false;
            GameEngineBridge.resetSlotInput(targetSlot);
            useConsoleConnectionStore.getState().setSlotConnected(targetSlot, false);
          }
        }
      };

      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);

      await setDoc(roomRef, {
        offer: {
          type: offerDesc.type,
          sdp: offerDesc.sdp || '',
        },
        answer: null,
        createdAt: this.roomCreatedAt,
        updatedAt: Date.now(),
        hostUid: this.hostUid,
        status: `waiting_p${targetSlot + 1}`,
      });

      store.incrementFirestoreOps(1);
      if (store.connectedCount === 0) {
        store.setPhase('waiting_for_peer');
      }
      store.setFirestoreListenersActive(true);

      this.roomUnsubscribe = onSnapshot(roomRef, async (snapshot) => {
        const data = snapshot.data();
        if (!data?.answer || this.activePendingSlot !== targetSlot) return;
        const currentPc = this.slots[targetSlot].pc;
        if (currentPc && !currentPc.currentRemoteDescription) {
          useConsoleConnectionStore.getState().incrementFirestoreOps(1);
          if (useConsoleConnectionStore.getState().connectedCount === 0) {
            useConsoleConnectionStore.getState().setPhase('negotiating_webrtc');
          }
          await currentPc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      this.calleeIceUnsubscribe = onSnapshot(calleeCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added' && this.activePendingSlot === targetSlot) {
            const currentPc = this.slots[targetSlot].pc;
            if (currentPc) {
              useConsoleConnectionStore.getState().incrementFirestoreOps(1);
              try {
                await currentPc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
              } catch (err) {
                console.warn('ICE candidate eklenemedi:', err);
              }
            }
          }
        });
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sinyalleşme odası hazırlanamadı';
      useConsoleConnectionStore.getState().setPhase('error', msg);
    } finally {
      this.isRearming = false;
    }
  }

  private setupSlotDataChannel(slotIndex: number, channel: RTCDataChannel): void {
    channel.onopen = async () => {
      this.slots[slotIndex].connected = true;
      useConsoleConnectionStore.getState().setSlotConnected(slotIndex, true);

      // Send 4-byte welcome & slot assignment packet (vibrates controller 35ms)
      this.sendFeedbackToSlot(slotIndex, 100, 35);

      // Rearm the room for the next player slot (e.g., P2, P3, P4) or close Firestore if all 4 full
      await this.armOfferForNextAvailableSlot(false);
    };

    channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        GameEngineBridge.dispatchBinaryPacket(event.data, slotIndex);
      }
    };

    channel.onclose = () => {
      if (this.slots[slotIndex].connected) {
        this.slots[slotIndex].connected = false;
        GameEngineBridge.resetSlotInput(slotIndex);
        useConsoleConnectionStore.getState().setSlotConnected(slotIndex, false);
      }
    };
  }

  public sendFeedbackToSlot(slotIndex: number, hpPercent: number, vibrateMs = 0): void {
    const slot = this.slots[slotIndex];
    if (!slot?.dc || slot.dc.readyState !== 'open') return;
    try {
      const packet = encodeHostFeedbackPacket(slotIndex, hpPercent, vibrateMs);
      slot.dc.send(packet);
    } catch {
      // Ignore transient send error
    }
  }

  public async lockRoomAndStopSignaling(): Promise<void> {
    this.detachFirestoreListeners();
    await this.garbageCollectRoom(this.roomId);
  }

  private detachFirestoreListeners(): void {
    if (this.roomUnsubscribe) {
      this.roomUnsubscribe();
      this.roomUnsubscribe = null;
    }
    if (this.calleeIceUnsubscribe) {
      this.calleeIceUnsubscribe();
      this.calleeIceUnsubscribe = null;
    }
    useConsoleConnectionStore.getState().setFirestoreListenersActive(false);
  }

  private async clearCandidateSubcollections(targetRoomId: string): Promise<void> {
    if (!targetRoomId) return;
    try {
      const roomRef = doc(db, 'rooms', targetRoomId);
      const [callerSnap, calleeSnap] = await Promise.all([
        getDocs(collection(roomRef, 'callerCandidates')),
        getDocs(collection(roomRef, 'calleeCandidates')),
      ]);
      const deletions: Promise<void>[] = [];
      callerSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      calleeSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      await Promise.allSettled(deletions);
    } catch {
      // Ignore cleanup race conditions
    }
  }

  private async garbageCollectRoom(targetRoomId: string): Promise<void> {
    if (!targetRoomId) return;
    try {
      await this.clearCandidateSubcollections(targetRoomId);
      await deleteDoc(doc(db, 'rooms', targetRoomId));
      useConsoleConnectionStore.getState().incrementFirestoreOps(1);
    } catch {
      // Room might already be deleted
    }
  }

  public async cleanup(): Promise<void> {
    this.detachFirestoreListeners();
    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.slots[i].dc?.close();
      this.slots[i].pc?.close();
      this.slots[i] = { pc: null, dc: null, connected: false };
    }
  }
}

/**
 * Mobile Controller Signaling Client (PWA)
 * Joins an existing room by 6-char roomId, sends SDP Answer, receives its assigned
 * Player Slot (P1..P4) + Haptic Feedback packets over WebRTC DataChannel, and detaches
 * from Firestore immediately when the P2P DataChannel opens.
 */
export class ControllerSignalingClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private callerIceUnsubscribe: Unsubscribe | null = null;
  private onStateChange: (
    phase: 'connecting' | 'connected' | 'disconnected' | 'error',
    detail?: string
  ) => void;
  private onHostFeedback?: (feedback: HostFeedbackPacket) => void;

  constructor(
    onStateChange: (
      phase: 'connecting' | 'connected' | 'disconnected' | 'error',
      detail?: string
    ) => void,
    onHostFeedback?: (feedback: HostFeedbackPacket) => void
  ) {
    this.onStateChange = onStateChange;
    this.onHostFeedback = onHostFeedback;
  }

  public async joinRoom(rawRoomId: string): Promise<void> {
    const cleanRoomId = rawRoomId.trim().toUpperCase();
    if (cleanRoomId.length < 4) {
      this.onStateChange('error', 'Geçersiz oda kodu.');
      return;
    }

    this.disconnect();
    this.onStateChange('connecting', `${cleanRoomId} odası aranıyor...`);

    await tryAnonymousSession();

    try {
      const roomRef = doc(db, 'rooms', cleanRoomId);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        this.onStateChange(
          'error',
          `Oda (${cleanRoomId}) bulunamadı veya tüm 4 oyuncu slotu doldu.`
        );
        return;
      }

      const roomData = roomSnap.data();
      if (!roomData?.offer) {
        this.onStateChange(
          'error',
          'Oda şu anda başka bir telefonu eşleştiriyor, 2 saniye sonra tekrar deneyin.'
        );
        return;
      }

      this.peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
      const callerCandidatesCol = collection(roomRef, 'callerCandidates');
      const calleeCandidatesCol = collection(roomRef, 'calleeCandidates');

      this.peerConnection.onicecandidate = async (event) => {
        if (!event.candidate) return;
        const json = event.candidate.toJSON();
        if (!json.candidate) return;
        try {
          await addDoc(calleeCandidatesCol, {
            candidate: json.candidate,
            sdpMid: json.sdpMid ?? null,
            sdpMLineIndex: json.sdpMLineIndex ?? null,
            usernameFragment: json.usernameFragment ?? null,
          });
        } catch (err) {
          console.warn('Callee ICE candidate yazma hatası:', err);
        }
      };

      this.peerConnection.ondatachannel = (event) => {
        const channel = event.channel;
        channel.binaryType = 'arraybuffer';
        this.dataChannel = channel;

        channel.onopen = () => {
          if (this.callerIceUnsubscribe) {
            this.callerIceUnsubscribe();
            this.callerIceUnsubscribe = null;
          }
          this.onStateChange('connected', 'Doğrudan P2P UDP Veri Kanalı Aktif');
        };

        channel.onmessage = (msgEvent) => {
          if (msgEvent.data instanceof ArrayBuffer) {
            const feedback = decodeHostFeedbackPacket(msgEvent.data);
            if (feedback && this.onHostFeedback) {
              this.onHostFeedback(feedback);
            }
          }
        };

        channel.onclose = () => {
          this.onStateChange('disconnected', 'Host ile P2P bağlantısı kapandı.');
        };

        channel.onerror = () => {
          this.onStateChange('error', 'WebRTC veri kanalı hatası oluştu.');
        };
      };

      this.peerConnection.onconnectionstatechange = () => {
        const st = this.peerConnection?.connectionState;
        if (st === 'disconnected' || st === 'failed' || st === 'closed') {
          this.onStateChange('disconnected', 'Konsol bağlantısı kesildi.');
        }
      };

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(roomData.offer));
      const answerDescription = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answerDescription);

      await updateDoc(roomRef, {
        answer: {
          type: answerDescription.type,
          sdp: answerDescription.sdp || '',
        },
        updatedAt: Date.now(),
        status: 'connected',
      });

      this.callerIceUnsubscribe = onSnapshot(callerCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added' && this.peerConnection) {
            const data = change.doc.data();
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
            } catch (err) {
              console.warn('Caller ICE candidate eklenemedi:', err);
            }
          }
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bağlantı kurulamadı';
      this.onStateChange('error', message);
    }
  }

  public sendBinaryBuffer(buffer: ArrayBuffer): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return false;
    }
    try {
      this.dataChannel.send(buffer);
      return true;
    } catch {
      return false;
    }
  }

  public isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  public disconnect(): void {
    if (this.callerIceUnsubscribe) {
      this.callerIceUnsubscribe();
      this.callerIceUnsubscribe = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
