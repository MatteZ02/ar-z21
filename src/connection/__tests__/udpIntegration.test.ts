/// <reference types="node" />
import dgram from 'node:dgram';
import {decodeLocoAddress, fromHex, splitDatagram, toHex} from '../../protocol';
import {ConnectionManager, ConnectionState} from '../ConnectionManager';
import {TrackStatus} from '../trackStatus';
import {NodeUdpTransport} from '../testUtils/nodeUdpTransport';

// A very small fake Z21 on localhost: answers status, HWINFO and loco info
// requests, and records every dataset it receives.
const startFakeZ21 = async () => {
  const server = dgram.createSocket('udp4');
  const received: string[] = [];

  server.on('message', (message, remote) => {
    const reply = (hex: string) => {
      server.send(fromHex(hex), remote.port, remote.address);
    };
    for (const {header, data} of splitDatagram(new Uint8Array(message))
      .datasets) {
      received.push(`${header.toString(16)}:${toHex(data)}`);
      const body = toHex(data);
      if (header === 0x40 && body === '21 24 05') {
        reply('08 00 40 00 62 22 00 40');
      } else if (header === 0x1a) {
        reply('0C 00 1A 00 04 02 00 00 43 01 00 00');
      } else if (header === 0x40 && data[0] === 0xe3 && data[1] === 0xf0) {
        const address = decodeLocoAddress(data[2], data[3]);
        if (address === 3) {
          // Two datasets in one datagram: loco info and a track-power broadcast.
          reply(
            '0E 00 40 00 EF 00 03 04 C1 12 01 01 80 BB' +
              '07 00 40 00 81 00 81',
          );
        }
      }
    }
  });

  await new Promise<void>((resolve) => server.bind(0, '127.0.0.1', resolve));
  const {port} = server.address();
  return {port, received, close: () => server.close()};
};

const waitFor = async (condition: () => boolean, timeoutMs = 2000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('ConnectionManager over real UDP', () => {
  it('connects, subscribes, receives combined datasets and logs off', async () => {
    const z21 = await startFakeZ21();
    const manager = new ConnectionManager({
      createTransport: () => new NodeUdpTransport(),
    });
    const states: ConnectionState[] = [];
    const trackStatuses: TrackStatus[] = [];
    const speeds: number[] = [];
    manager.on('state', (state) => states.push(state));
    manager.on('trackStatus', (status) => trackStatuses.push(status));
    manager.on('locoInfo', (loco) => speeds.push(loco.speed));

    try {
      manager.connect('127.0.0.1', z21.port);
      await waitFor(() => manager.getState() === 'connected');
      await waitFor(() => manager.getDeviceInfo().firmwareVersion === '1.43');

      manager.watchLocos([3]);
      await waitFor(() => speeds.length > 0);
      await waitFor(() => trackStatuses.includes('emergencyStop'));

      manager.disconnect();
      await waitFor(() => z21.received.includes('30:'));

      expect(states).toEqual(['connecting', 'connected', 'disconnected']);
      expect(speeds).toEqual([64]);
      expect(z21.received.slice(0, 2)).toEqual([
        '50:01 00 00 00',
        '40:21 24 05',
      ]);
      expect(z21.received).toContain('40:E3 F0 00 03 10');
    } finally {
      manager.dispose();
      z21.close();
    }
  });
});
