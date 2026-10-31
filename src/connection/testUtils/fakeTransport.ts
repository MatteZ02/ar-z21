import {fromHex, toHex} from '../../protocol';
import {TransportHandlers, UdpTransport} from '../transport';

// In-memory transport for tests. Records sent datagrams as hex.
export class FakeTransport implements UdpTransport {
  sent: string[] = [];
  closed = false;
  host = '';
  port = 0;
  failOpen = false;
  private handlers: TransportHandlers | null = null;

  async open(
    host: string,
    port: number,
    handlers: TransportHandlers,
  ): Promise<void> {
    if (this.failOpen) {
      throw new Error('open failed');
    }
    this.host = host;
    this.port = port;
    this.handlers = handlers;
  }

  send(data: Uint8Array): void {
    this.sent.push(toHex(data));
  }

  close(): void {
    this.closed = true;
  }

  // Simulates a datagram from the central unit.
  receive(hex: string): void {
    this.handlers?.onMessage(fromHex(hex));
  }

  takeSent(): string[] {
    const sent = this.sent;
    this.sent = [];
    return sent;
  }
}
