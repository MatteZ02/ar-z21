// The UDP socket abstraction the connection manager depends on. The app uses
// the native implementation (nativeUdpTransport.ts); tests use fakes.

export type TransportHandlers = {
  onMessage: (data: Uint8Array) => void;
  // Non-fatal socket errors (e.g. "port unreachable" while the central unit is
  // offline). The connection manager decides from timeouts whether the
  // connection is lost.
  onError: (message: string) => void;
};

export interface UdpTransport {
  // Opens a socket that sends to and receives from host:port only. Rejects if
  // the socket cannot be created.
  open(host: string, port: number, handlers: TransportHandlers): Promise<void>;
  // Fire-and-forget. Datagrams are sent in call order.
  send(data: Uint8Array): void;
  // Datagrams already passed to send() are flushed before the socket closes.
  close(): void;
}
