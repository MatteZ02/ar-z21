import {
  CONNECT_TIMEOUT_MS,
  ConnectionManager,
  ConnectionState,
  CONNECTION_LOST_AFTER_MS,
  DEVICE_INFO_TIMEOUT_MS,
  KEEPALIVE_IDLE_MS,
  RECONNECT_DELAYS_MS,
} from '../ConnectionManager';
import {THROTTLE_INTERVAL_MS} from '../driveThrottle';
import {TrackStatus} from '../trackStatus';
import {FakeTransport} from '../testUtils/fakeTransport';

const SET_FLAGS_AND_STATUS = '08 00 50 00 01 00 00 00 07 00 40 00 21 24 05';
const GET_STATUS = '07 00 40 00 21 24 05';
const DEVICE_INFO_REQUESTS = '04 00 1A 00 04 00 18 00 04 00 10 00';
const GET_FIRMWARE_VERSION = '07 00 40 00 F1 0A FB';
const LOGOFF = '04 00 30 00';
const STATUS_NORMAL = '08 00 40 00 62 22 00 40';
const HWINFO_FW_143 = '0C 00 1A 00 04 02 00 00 43 01 00 00';
const HWINFO_FW_142 = '0C 00 1A 00 04 02 00 00 42 01 00 00';

const setup = (options: {combineDatasets?: boolean} = {}) => {
  const transports: FakeTransport[] = [];
  const manager = new ConnectionManager({
    createTransport: () => {
      const transport = new FakeTransport();
      transports.push(transport);
      return transport;
    },
    ...options,
  });
  const states: ConnectionState[] = [];
  const trackStatuses: TrackStatus[] = [];
  manager.on('state', (state) => states.push(state));
  manager.on('trackStatus', (status) => trackStatuses.push(status));
  const current = () => transports[transports.length - 1];
  return {manager, transports, current, states, trackStatuses};
};

// Lets the async socket open complete.
const settle = () => jest.advanceTimersByTimeAsync(0);

const connected = async (options?: {combineDatasets?: boolean}) => {
  const context = setup(options);
  context.manager.connect('192.168.0.111');
  await settle();
  context.current().receive(STATUS_NORMAL);
  context.current().takeSent();
  return context;
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('connecting', () => {
  it('logs in by setting broadcast flags and requesting status in one datagram', async () => {
    const {manager, current, states} = setup();
    manager.connect('192.168.0.111');
    await settle();

    expect(current().host).toBe('192.168.0.111');
    expect(current().port).toBe(21105);
    expect(current().sent).toEqual([SET_FLAGS_AND_STATUS]);
    expect(states).toEqual(['connecting']);
  });

  it('is connected on the first reply and then asks for device info', async () => {
    const {manager, current, states, trackStatuses} = setup();
    manager.connect('192.168.0.111');
    await settle();
    current().takeSent();

    current().receive(STATUS_NORMAL);

    expect(states).toEqual(['connecting', 'connected']);
    expect(trackStatuses).toEqual(['normal']);
    expect(current().takeSent()).toEqual([DEVICE_INFO_REQUESTS]);
  });

  it('collects device info', async () => {
    const {manager, current} = await connected();
    current().receive(HWINFO_FW_143);
    current().receive('05 00 18 00 02');
    current().receive('08 00 10 00 39 30 00 00');

    expect(manager.getDeviceInfo()).toEqual({
      hardwareType: 0x204,
      firmwareVersion: '1.43',
      lockCode: 2,
      serialNumber: 12345,
    });
  });

  it('falls back to LAN_X_GET_FIRMWARE_VERSION when HWINFO is not answered', async () => {
    const {manager, current} = await connected();
    jest.advanceTimersByTime(DEVICE_INFO_TIMEOUT_MS);
    expect(current().takeSent()).toEqual([GET_FIRMWARE_VERSION]);

    current().receive('09 00 40 00 F3 0A 01 23 DB');
    expect(manager.getDeviceInfo().firmwareVersion).toBe('1.23');
  });

  it('does not use the fallback when HWINFO answered', async () => {
    const {current} = await connected();
    current().receive(HWINFO_FW_143);
    jest.advanceTimersByTime(DEVICE_INFO_TIMEOUT_MS);
    expect(current().takeSent()).toEqual([]);
  });

  it('retries with backoff while the central unit does not answer', async () => {
    const {manager, transports, states} = setup();
    manager.connect('192.168.0.111');
    await settle();

    await jest.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);
    expect(transports[0].closed).toBe(true);
    expect(transports[0].sent).toEqual([SET_FLAGS_AND_STATUS]); // no logoff
    expect(states).toEqual(['connecting', 'reconnecting']);

    await jest.advanceTimersByTimeAsync(RECONNECT_DELAYS_MS[0]);
    expect(transports).toHaveLength(2);
    expect(transports[1].sent).toEqual([SET_FLAGS_AND_STATUS]);

    // Second failure waits for the second delay.
    await jest.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);
    await jest.advanceTimersByTimeAsync(RECONNECT_DELAYS_MS[1] - 1);
    expect(transports).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(transports).toHaveLength(3);
  });

  it('retries when the socket cannot be opened', async () => {
    const transports: FakeTransport[] = [];
    const manager = new ConnectionManager({
      createTransport: () => {
        const transport = new FakeTransport();
        transport.failOpen = transports.length === 0;
        transports.push(transport);
        return transport;
      },
    });
    manager.connect('192.168.0.111');
    await settle();
    expect(manager.getState()).toBe('reconnecting');

    await jest.advanceTimersByTimeAsync(RECONNECT_DELAYS_MS[0]);
    expect(transports[1].sent).toEqual([SET_FLAGS_AND_STATUS]);
  });

  it('uses separate datagrams when combining is turned off', async () => {
    const {manager, current} = setup({combineDatasets: false});
    manager.connect('192.168.0.111');
    await settle();
    expect(current().sent).toEqual(['08 00 50 00 01 00 00 00', GET_STATUS]);
  });
});

describe('keepalive and connection loss', () => {
  it('sends LAN_X_GET_STATUS after the idle period', async () => {
    const {current} = await connected();
    current().receive(HWINFO_FW_143);
    jest.advanceTimersByTime(KEEPALIVE_IDLE_MS - 1000);
    expect(current().takeSent()).toEqual([]);
    jest.advanceTimersByTime(5000);
    expect(current().takeSent()).toEqual([GET_STATUS]);
  });

  it('probes even while sending, if nothing is received', async () => {
    const {manager, current} = await connected();
    // Drive every second for 30 s without any reply.
    for (let second = 1; second <= 30; second++) {
      manager.drive({address: 3, steps: 128, speed: second, forward: true});
      jest.advanceTimersByTime(1000);
    }
    expect(
      current()
        .takeSent()
        .filter((s) => s === GET_STATUS),
    ).toHaveLength(1);
  });

  it('reconnects with logoff when nothing is received', async () => {
    const {transports, states} = await connected();
    jest.advanceTimersByTime(CONNECTION_LOST_AFTER_MS + 5000);

    expect(transports[0].sent.at(-1)).toBe(LOGOFF);
    expect(transports[0].closed).toBe(true);
    expect(states.at(-1)).toBe('reconnecting');

    await jest.advanceTimersByTimeAsync(RECONNECT_DELAYS_MS[0]);
    expect(transports[1].sent).toEqual([SET_FLAGS_AND_STATUS]);
  });

  it('stays connected while replies keep coming', async () => {
    const {manager, current} = await connected();
    for (let i = 0; i < 10; i++) {
      jest.advanceTimersByTime(KEEPALIVE_IDLE_MS + 5000);
      current().receive(STATUS_NORMAL);
    }
    expect(manager.getState()).toBe('connected');
  });
});

describe('disconnect', () => {
  it('logs off, closes and does not reconnect', async () => {
    const {manager, transports, states} = await connected();
    manager.disconnect();

    expect(transports[0].sent).toEqual([LOGOFF]);
    expect(transports[0].closed).toBe(true);
    expect(states.at(-1)).toBe('disconnected');

    await jest.advanceTimersByTimeAsync(60000);
    expect(transports).toHaveLength(1);
  });

  it('ignores replies arriving after disconnect', async () => {
    const {manager, transports} = await connected();
    manager.disconnect();
    transports[0].receive(STATUS_NORMAL);
    expect(manager.getState()).toBe('disconnected');
  });

  it('drops commands while not connected', async () => {
    const {manager, current} = setup();
    manager.connect('192.168.0.111');
    await settle();
    current().takeSent();

    manager.setTrackPower(false);
    manager.drive({address: 3, steps: 128, speed: 10, forward: true});
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS);
    expect(current().sent).toEqual([]);
  });
});

describe('app lifecycle', () => {
  it('suspend logs off and closes; resume reconnects and re-subscribes', async () => {
    const {manager, transports} = await connected();
    manager.watchLocos([3]);
    transports[0].takeSent();

    manager.suspend();
    expect(transports[0].sent).toEqual([LOGOFF]);
    expect(transports[0].closed).toBe(true);
    expect(manager.getState()).toBe('disconnected');

    manager.resume();
    await settle();
    expect(transports[1].takeSent()).toEqual([SET_FLAGS_AND_STATUS]);
    transports[1].receive(STATUS_NORMAL);
    expect(transports[1].takeSent()).toContain('09 00 40 00 E3 F0 00 03 10');
  });

  it('does not reconnect on resume after an explicit disconnect', async () => {
    const {manager, transports} = await connected();
    manager.suspend();
    manager.disconnect();
    manager.resume();
    await settle();
    expect(transports).toHaveLength(1);
  });

  it('does nothing when suspended while disconnected', async () => {
    const {manager, transports} = setup();
    manager.suspend();
    manager.resume();
    await settle();
    expect(transports).toHaveLength(0);
  });
});

describe('track status', () => {
  it('follows broadcasts', async () => {
    const {current, trackStatuses} = await connected();
    current().receive('07 00 40 00 81 00 81'); // stopped
    current().receive('07 00 40 00 61 08 69'); // short circuit
    current().receive('07 00 40 00 61 00 61'); // power off
    current().receive('07 00 40 00 61 01 60'); // power on

    expect(trackStatuses).toEqual([
      'normal',
      'emergencyStop',
      'shortCircuit',
      'powerOff',
      'normal',
    ]);
  });

  it('becomes unknown when the connection is lost', async () => {
    const {manager, trackStatuses} = await connected();
    manager.disconnect();
    expect(trackStatuses.at(-1)).toBe('unknown');
  });

  it('sends track power and emergency stop commands', async () => {
    const {manager, current} = await connected();
    manager.setTrackPower(false);
    manager.setTrackPower(true);
    manager.emergencyStop();
    expect(current().takeSent()).toEqual([
      '07 00 40 00 21 80 A1',
      '07 00 40 00 21 81 A0',
      '06 00 40 00 80 80',
    ]);
  });
});

describe('locos', () => {
  it('subscribes to watched locos in one datagram', async () => {
    const {manager, current} = await connected();
    manager.watchLocos([3, 1234]);
    expect(current().takeSent()).toEqual([
      '09 00 40 00 E3 F0 00 03 10 09 00 40 00 E3 F0 C4 D2 05',
    ]);
  });

  it('only requests a loco once while it is watched', async () => {
    const {manager, current} = await connected();
    manager.watchLocos([3]);
    manager.watchLocos([3]);
    expect(current().takeSent()).toHaveLength(1);
  });

  it('requests info again when a loco comes back on screen', async () => {
    const {manager, current} = await connected();
    const unwatch = manager.watchLocos([3]);
    unwatch();
    manager.watchLocos([3]);
    expect(current().takeSent()).toHaveLength(2);
  });

  it('re-subscribes watched locos after reconnecting', async () => {
    const {manager, transports} = await connected();
    manager.watchLocos([3]);
    jest.advanceTimersByTime(CONNECTION_LOST_AFTER_MS + 5000);
    await jest.advanceTimersByTimeAsync(RECONNECT_DELAYS_MS[0]);

    transports[1].takeSent();
    transports[1].receive(STATUS_NORMAL);
    expect(transports[1].takeSent()).toContain('09 00 40 00 E3 F0 00 03 10');
  });

  it('reports a watched loco pushed out of the 16-loco subscription list', async () => {
    const {manager} = await connected();
    const evicted: number[] = [];
    manager.on('subscriptionEvicted', (address) => evicted.push(address));

    const addresses = Array.from({length: 17}, (_, i) => i + 1);
    manager.watchLocos(addresses);
    expect(evicted).toEqual([1]);
  });

  it('emits loco info', async () => {
    const {manager, current} = await connected();
    const speeds: number[] = [];
    manager.on('locoInfo', (loco) => speeds.push(loco.speed));
    current().receive('0E 00 40 00 EF 00 03 04 C1 12 01 01 80 BB');
    expect(speeds).toEqual([64]);
  });

  it('throttles drive commands', async () => {
    const {manager, current} = await connected();
    manager.drive({address: 3, steps: 128, speed: 63, forward: true});
    manager.drive({address: 3, steps: 128, speed: 64, forward: true});
    jest.advanceTimersByTime(0);
    expect(current().takeSent()).toEqual(['0A 00 40 00 E4 13 00 03 C1 35']);
  });

  it('sends function on/off explicitly', async () => {
    const {manager, current} = await connected();
    manager.setFunction(3, 0, true);
    expect(current().takeSent()).toEqual(['0A 00 40 00 E4 F8 00 03 40 5F']);
  });
});

describe('emergency stop safety', () => {
  it('global STOP discards pending drive commands', async () => {
    const {manager, current} = await connected();
    manager.drive({address: 3, steps: 128, speed: 64, forward: true});
    manager.emergencyStop();
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS * 3);
    expect(current().takeSent()).toEqual(['06 00 40 00 80 80']);
  });

  it('per-loco stop sends LAN_X_SET_LOCO_E_STOP and the drive e-stop on FW 1.43', async () => {
    const {manager, current} = await connected();
    current().receive(HWINFO_FW_143);
    manager.emergencyStopLocos([{address: 3, steps: 128, forward: true}]);
    expect(current().takeSent()).toEqual([
      '08 00 40 00 92 00 03 91 0A 00 40 00 E4 13 00 03 81 75',
    ]);
  });

  it('per-loco stop falls back to the e-stop speed value on older firmware', async () => {
    const {manager, current} = await connected();
    current().receive(HWINFO_FW_142);
    manager.emergencyStopLocos([{address: 3, steps: 128, forward: true}]);
    expect(current().takeSent()).toEqual(['0A 00 40 00 E4 13 00 03 81 75']);
  });

  it('per-loco stop of a consist goes out in one datagram and cancels pending drives', async () => {
    const {manager, current} = await connected();
    current().receive(HWINFO_FW_143);
    manager.drive({address: 3, steps: 128, speed: 64, forward: true});
    manager.drive({address: 4, steps: 128, speed: 64, forward: true});
    manager.emergencyStopLocos([
      {address: 3, steps: 128, forward: true},
      {address: 4, steps: 128, forward: false},
    ]);
    jest.advanceTimersByTime(THROTTLE_INTERVAL_MS * 3);
    expect(current().takeSent()).toEqual([
      '08 00 40 00 92 00 03 91 0A 00 40 00 E4 13 00 03 81 75 ' +
        '08 00 40 00 92 00 04 96 0A 00 40 00 E4 13 00 04 01 F2',
    ]);
  });

  it('per-loco stop of a watched loco asks for its state in the same datagram', async () => {
    const {manager, current} = await connected();
    current().receive(HWINFO_FW_143);
    manager.watchLocos([3]);
    current().takeSent();
    manager.emergencyStopLocos([{address: 3, steps: 128, forward: true}]);
    expect(current().takeSent()).toEqual([
      '08 00 40 00 92 00 03 91 0A 00 40 00 E4 13 00 03 81 75 ' +
        '09 00 40 00 E3 F0 00 03 10',
    ]);
  });

  const BC_STOPPED = '07 00 40 00 81 00 81';
  const BC_POWER_ON = '07 00 40 00 61 01 60';
  const BC_POWER_OFF = '07 00 40 00 61 00 61';
  const REQUEST_3_AND_200 =
    '09 00 40 00 E3 F0 00 03 10 09 00 40 00 E3 F0 C0 C8 1B';

  it.each([
    ['emergency stop', BC_STOPPED],
    ['track power off', BC_POWER_OFF],
  ])(
    'asks for the state of watched locos after %s',
    async (_name, broadcast) => {
      const {manager, current} = await connected();
      manager.watchLocos([3, 200]);
      current().takeSent();
      current().receive(broadcast);
      expect(current().takeSent()).toEqual([REQUEST_3_AND_200]);
    },
  );

  it('asks for the state of watched locos when track power returns', async () => {
    const {manager, current} = await connected();
    manager.watchLocos([3, 200]);
    current().receive(BC_POWER_OFF);
    current().takeSent();
    current().receive(BC_POWER_ON);
    expect(current().takeSent()).toEqual([REQUEST_3_AND_200]);
  });

  it('does not ask again for a repeated broadcast', async () => {
    const {manager, current} = await connected();
    manager.watchLocos([3]);
    current().receive(BC_STOPPED);
    current().takeSent();
    current().receive(BC_STOPPED);
    current().receive(BC_POWER_ON);
    current().receive(BC_POWER_ON);
    expect(current().takeSent()).toEqual(['09 00 40 00 E3 F0 00 03 10']);
  });
});
