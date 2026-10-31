import {NativeModule, requireNativeModule} from 'expo';

// Bytes cross the bridge as plain number arrays (0-255). Z21 datagrams are
// small, so this is simple and works the same on both platforms.
type Z21UdpEvents = {
  onMessage: (event: {socketId: number; data: number[]}) => void;
  onError: (event: {socketId: number; message: string}) => void;
};

declare class Z21UdpNativeModule extends NativeModule<Z21UdpEvents> {
  // Creates a UDP socket that sends to and receives from host:port only.
  // Resolves with the socket id.
  open(host: string, port: number): Promise<number>;
  // Fire-and-forget; datagrams are sent in call order.
  send(socketId: number, data: number[]): void;
  // Sends anything still queued, then closes the socket.
  close(socketId: number): void;
}

export default requireNativeModule<Z21UdpNativeModule>('Z21Udp');
