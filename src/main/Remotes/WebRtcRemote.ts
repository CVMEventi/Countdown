import {BrowserWindow} from "electron";
import type {AnyWebSocketUpdate} from "../../common/TimerInterfaces.ts";
import type {TimerTransport} from "./TimerTransport.ts";
import type {RemoteSettings} from "../../common/config.ts";
import {DEFAULT_WEBRTC_ENABLED} from "../../common/config.ts";
import {formatPairingCode, roomCodeToPeerId} from "../../common/protocol.ts";
import {generateRoomCode} from "../Utilities/roomCode.ts";
import type {
  WebRtcClient,
  WebRtcConnectionState,
  WebRtcSession,
  WebRtcStatus,
} from "../../common/webrtcStatus.ts";

export type {WebRtcClient, WebRtcConnectionState, WebRtcSession, WebRtcStatus};

type HostWindowFactory = () => {
  browserWindow: BrowserWindow | null
  loadPage: (path: string) => Promise<void>
  destroy: () => void
}

export class WebRtcRemote implements TimerTransport {
  private _session: WebRtcSession | null = null;
  private _state: WebRtcConnectionState = 'disabled';
  private _lastError: string | null = null;
  private _clients = new Map<string, WebRtcClient>();
  private _host: ReturnType<HostWindowFactory> | null = null;
  private _createHost: HostWindowFactory;
  private _onStatusChange: (status: WebRtcStatus) => void;
  private _askApproval: (name: string) => Promise<boolean>;
  private _approved = new Set<string>();

  // Keys are rotated rather than remembered, so a revoked client cannot come straight back
  private _blocked = new Set<string>();

  constructor(
    createHost: HostWindowFactory,
    onStatusChange: (status: WebRtcStatus) => void,
    askApproval: (name: string) => Promise<boolean> = async () => true,
  ) {
    this._createHost = createHost;
    this._onStatusChange = onStatusChange;
    this._askApproval = askApproval;
  }

  // A leaked code alone gets an attacker nothing when this is on
  async requestApproval(clientId: string, name: string): Promise<boolean> {
    if (this._blocked.has(clientId)) return false;
    if (this._approved.has(clientId)) return true;

    const allowed = await this._askApproval(name);
    if (allowed) {
      this._approved.add(clientId);
    } else {
      this._blocked.add(clientId);
    }
    return allowed;
  }

  isApproved(clientId: string) {
    return this._approved.has(clientId);
  }

  get isRunning() {
    return this._host !== null;
  }

  get session() {
    return this._session;
  }

  get hostWebContentsId(): number | null {
    return this._host?.browserWindow?.webContents.id ?? null;
  }

  status(): WebRtcStatus {
    return {
      enabled: this.isRunning,
      state: this._state,
      peerId: this._session ? roomCodeToPeerId(this._session.sessionId) : null,
      controlCode: this._session ? formatPairingCode({sessionId: this._session.sessionId, key: this._session.controlKey}) : null,
      viewCode: this._session ? formatPairingCode({sessionId: this._session.sessionId, key: this._session.viewKey}) : null,
      lastError: this._lastError,
      clients: [...this._clients.values()],
    };
  }

  async applyState(remote: RemoteSettings) {
    const enabled = remote.webrtcEnabled ?? DEFAULT_WEBRTC_ENABLED;

    if (!enabled) {
      if (this.isRunning) await this.stop();
      return;
    }

    if (this.isRunning) return;
    await this.start(remote);
  }

  async start(remote: RemoteSettings) {
    if (this.isRunning) return;

    this._session = this._resolveSession(remote);
    this._state = 'starting';
    this._lastError = null;
    this._clients.clear();
    this._blocked.clear();
    this._approved.clear();

    this._host = this._createHost();
    await this._host.loadPage('/webrtc-host');
    this._emit();
  }

  async stop() {
    this._host?.destroy();
    this._host = null;
    this._state = 'disabled';
    this._clients.clear();
    this._emit();
  }

  rotateCode() {
    this._session = {
      sessionId: generateRoomCode(),
      controlKey: generateRoomCode(),
      viewKey: generateRoomCode(),
    };
    this._clients.clear();
    this._send('webrtc-host:session', this._session);
    this._emit();
    return this._session;
  }

  revoke(clientId: string) {
    this._blocked.add(clientId);
    this._clients.delete(clientId);
    this._send('webrtc-host:revoke', clientId);
    this._emit();
  }

  isBlocked(clientId: string) {
    return this._blocked.has(clientId);
  }

  hostReportedStatus(state: WebRtcConnectionState, lastError: string | null) {
    this._state = state;
    this._lastError = lastError;
    this._emit();
  }

  hostReportedClients(clients: WebRtcClient[]) {
    this._clients.clear();
    clients.forEach(client => this._clients.set(client.clientId, client));
    this._emit();
  }

  sendToClients(update: AnyWebSocketUpdate): void {
    this._send('webrtc-host:broadcast', update);
  }

  // A session code is only persisted when the user asked for a stable one
  private _resolveSession(remote: RemoteSettings): WebRtcSession {
    if (remote.webrtcCodeRotation === 'manual' && remote.webrtcRoomCode) {
      const [sessionId, controlKey, viewKey] = remote.webrtcRoomCode.split('.');
      if (sessionId && controlKey && viewKey) return {sessionId, controlKey, viewKey};
    }

    return {
      sessionId: generateRoomCode(),
      controlKey: generateRoomCode(),
      viewKey: generateRoomCode(),
    };
  }

  private _send(channel: string, payload: unknown) {
    const window = this._host?.browserWindow;
    if (!window || window.isDestroyed()) return;
    window.webContents.send(channel, payload);
  }

  private _emit() {
    this._onStatusChange(this.status());
  }
}
