import type {AnyWebSocketUpdate} from "../../common/TimerInterfaces.ts";
import type {TimerTransport} from "./TimerTransport.ts";

/**
 * Holds the transports an update should be broadcast to.
 *
 * Deliberately free of electron and orchestrator imports so it stays unit testable: the
 * orchestrator itself pulls in powerMonitor, screen and the native NDI/OMT addons.
 */
export class TransportRegistry {
  private _transports = new Set<TimerTransport>();

  add(transport: TimerTransport) {
    this._transports.add(transport);
  }

  remove(transport: TimerTransport) {
    this._transports.delete(transport);
  }

  get size() {
    return this._transports.size;
  }

  /**
   * One failing transport must not stop the others from being delivered to, so each send is
   * isolated. A broadcast with nothing registered is a no-op, which is what makes it safe to
   * broadcast before the remotes have been constructed.
   */
  broadcast(update: AnyWebSocketUpdate) {
    for (const transport of this._transports) {
      try {
        transport.sendToClients(update);
      } catch (error) {
        console.error('Transport failed to send update', error);
      }
    }
  }
}
