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

/**
 * Host Session Manager (PC / Smart TV Browser)
 * Creates a room, writes SDP Offer, exchanges ICE candidates via Firestore,
 * and IMMEDIATELY unsubscribes + deletes the Firestore room document once
 * RTCDataChannel opens to guarantee Spark Plan quota protection.
 */
export class HostSignalingSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomUnsubscribe: Unsubscribe | null = null;
  private calleeIceUnsubscribe: Unsubscribe | null = null;
  public roomId = '';

  public async startNewRoom(): Promise<string> {
    await this.cleanup();
    GameEngineBridge.resetSession();

    const store = useConsoleConnectionStore.getState();
    store.setPhase('creating_room');

    await tryAnonymousSession();

    this.roomId = generateRoomCode(6);
    store.setRoomId(this.roomId);

    try {
      this.peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);

      // Configure unordered, zero-retransmit UDP-like DataChannel per Architecture Spec
      this.dataChannel = this.peerConnection.createDataChannel('gamepad', {
        ordered: false,
        maxRetransmits: 0,
      });
      this.dataChannel.binaryType = 'arraybuffer';

      this.setupDataChannelHandlers(this.dataChannel);

      const roomRef = doc(db, 'rooms', this.roomId);
      const callerCandidatesCol = collection(roomRef, 'callerCandidates');
      const calleeCandidatesCol = collection(roomRef, 'calleeCandidates');

      this.peerConnection.onicecandidate = async (event) => {
        if (!event.candidate) return;
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

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          useConsoleConnectionStore.getState().setPhase('disconnected');
        }
      };

      const offerDescription = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offerDescription);

      const now = Date.now();
      await setDoc(roomRef, {
        offer: {
          type: offerDescription.type,
          sdp: offerDescription.sdp || '',
        },
        createdAt: now,
        updatedAt: now,
        hostUid: auth.currentUser?.uid || 'anonymous-host',
        status: 'waiting',
      });
      store.incrementFirestoreOps(1);
      store.setPhase('waiting_for_peer');
      store.setFirestoreListenersActive(true);

      // Listen for SDP Answer from Mobile Controller
      this.roomUnsubscribe = onSnapshot(roomRef, async (snapshot) => {
        const data = snapshot.data();
        if (!this.peerConnection || !data?.answer) return;

        if (!this.peerConnection.currentRemoteDescription) {
          useConsoleConnectionStore.getState().incrementFirestoreOps(1);
          useConsoleConnectionStore.getState().setPhase('negotiating_webrtc');
          const rtcSessionDescription = new RTCSessionDescription(data.answer);
          await this.peerConnection.setRemoteDescription(rtcSessionDescription);
        }
      });

      // Listen for Callee ICE Candidates from Mobile Controller
      this.calleeIceUnsubscribe = onSnapshot(calleeCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added' && this.peerConnection) {
            const candidateData = change.doc.data();
            useConsoleConnectionStore.getState().incrementFirestoreOps(1);
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (err) {
              console.warn('ICE candidate eklenemedi:', err);
            }
          }
        });
      });

      return this.roomId;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sinyalleşme odası oluşturulamadı';
      store.setPhase('error', msg);
      throw error;
    }
  }

  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = async () => {
      const store = useConsoleConnectionStore.getState();
      store.setPhase('connected_p2p');

      // CRITICAL ARCHITECTURE RULE: Detach all Firestore listeners and delete signaling room
      this.detachFirestoreListeners();
      await this.garbageCollectRoom(this.roomId);
    };

    channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        GameEngineBridge.dispatchBinaryPacket(event.data);
      }
    };

    channel.onclose = () => {
      useConsoleConnectionStore.getState().setPhase('disconnected');
    };
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

  private async garbageCollectRoom(targetRoomId: string): Promise<void> {
    if (!targetRoomId) return;
    try {
      const roomRef = doc(db, 'rooms', targetRoomId);
      const callerSnap = await getDocs(collection(roomRef, 'callerCandidates'));
      const calleeSnap = await getDocs(collection(roomRef, 'calleeCandidates'));

      const deletions: Promise<void>[] = [];
      callerSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      calleeSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      await Promise.allSettled(deletions);
      await deleteDoc(roomRef);
      useConsoleConnectionStore.getState().incrementFirestoreOps(1);
    } catch {
      // Room might already be cleaned up
    }
  }

  public async cleanup(): Promise<void> {
    this.detachFirestoreListeners();
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

/**
 * Mobile Controller Signaling Client (PWA)
 * Joins an existing room by 6-char roomId, sends SDP Answer, and detaches
 * from Firestore immediately when the P2P DataChannel opens.
 */
export class ControllerSignalingClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private callerIceUnsubscribe: Unsubscribe | null = null;
  private onStateChange: (phase: 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void;

  constructor(
    onStateChange: (phase: 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void
  ) {
    this.onStateChange = onStateChange;
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
          `Oda (${cleanRoomId}) bulunamadı veya süresi doldu. Lütfen TV/PC ekranından yeni QR kodu tarayın.`
        );
        return;
      }

      const roomData = roomSnap.data();
      if (!roomData?.offer) {
        this.onStateChange('error', 'Oda içerisinde geçerli bir SDP teklifi (Offer) bulunamadı.');
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
          // Detach Firestore listener immediately once P2P link is open
          if (this.callerIceUnsubscribe) {
            this.callerIceUnsubscribe();
            this.callerIceUnsubscribe = null;
          }
          this.onStateChange('connected', 'Doğrudan P2P UDP Veri Kanalı Aktif');
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
