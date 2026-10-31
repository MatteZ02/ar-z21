import type {EventSubscription} from 'expo';
import Z21Udp from '../../modules/z21-udp';
import {TransportHandlers, UdpTransport} from './transport';

// UdpTransport backed by the local native module (modules/z21-udp).
export class NativeUdpTransport implements UdpTransport {
  private socketId: number | null = null;
  private subscriptions: EventSubscription[] = [];

  async open(
    host: string,
    port: number,
    handlers: TransportHandlers,
  ): Promise<void> {
    this.subscriptions = [
      Z21Udp.addListener('onMessage', (event) => {
        if (event.socketId === this.socketId) {
          handlers.onMessage(Uint8Array.from(event.data));
        }
      }),
      Z21Udp.addListener('onError', (event) => {
        if (event.socketId === this.socketId) {
          handlers.onError(event.message);
        }
      }),
    ];
    try {
      this.socketId = await Z21Udp.open(host, port);
    } catch (error) {
      this.removeListeners();
      throw error;
    }
  }

  send(data: Uint8Array): void {
    if (this.socketId !== null) {
      Z21Udp.send(this.socketId, Array.from(data));
    }
  }

  close(): void {
    this.removeListeners();
    if (this.socketId !== null) {
      Z21Udp.close(this.socketId);
      this.socketId = null;
    }
  }

  private removeListeners(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.remove();
    });
    this.subscriptions = [];
  }
}
