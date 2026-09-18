import type {AnyWebSocketUpdate} from "../../common/TimerInterfaces.ts";

export interface TimerTransport {
  sendToClients(update: AnyWebSocketUpdate): void
}
