/// <reference types="node" />
import dgram from 'node:dgram';
import {TransportHandlers, UdpTransport} from '../transport';

// UdpTransport on Node's dgram, for tests that use real sockets.
export class NodeUdpTransport implements UdpTransport {
  private socket: dgram.Socket | null = null;

  open(host: string, port: number, handlers: TransportHandlers): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      socket.on('message', (message) => {
        handlers.onMessage(new Uint8Array(message));
      });
      socket.on('error', (error) => {
        handlers.onError(error.message);
      });
      socket.once('error', reject);
      socket.connect(port, host, () => {
        socket.off('error', reject);
        this.socket = socket;
        resolve();
      });
    });
  }

  send(data: Uint8Array): void {
    this.socket?.send(data);
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }
}
