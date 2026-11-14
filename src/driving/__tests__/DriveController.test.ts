import {ConnectionEvents} from '../../connection';
import {TypedEmitter} from '../../connection/emitter';
import {LocoInfo} from '../../protocol';
import {useLocoStore} from '../../store/locoStore';
import {DriveConnection, DriveController} from '../DriveController';
import {STOP_DOUBLE_TAP_WINDOW_MS} from '../globalStop';
import {LOCAL_CHANGE_HOLD_MS} from '../locoIntent';
import {SHARED_CONTROL_HOLD_MS} from '../sharedControl';

const report = (overrides: Partial<LocoInfo> = {}): LocoInfo => ({
  address: 3,
  busy: false,
  speedSteps: 128,
  forward: true,
  speed: 0,
  emergencyStop: false,
  doubleTraction: false,
  smartSearch: false,
  functions: new Array<boolean>(29).fill(false),
  ...overrides,
});

const setup = () => {
  const events = new TypedEmitter<ConnectionEvents>();
  const unwatch = jest.fn();
  const connection = {
    on: jest.fn((event, listener) => events.on(event, listener)),
    drive: jest.fn(),
    setFunction: jest.fn(),
    emergencyStop: jest.fn(),
    emergencyStopLocos: jest.fn(),
    setTrackPower: jest.fn(),
    watchLocos: jest.fn(() => unwatch),
  } satisfies DriveConnection;
  let time = 10000;
  const clock = {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
      jest.advanceTimersByTime(ms);
    },
  };
  const controller = new DriveController(connection, clock.now);
  controller.start();
  const live = (address = 3) => useLocoStore.getState().locos[address];
  const emitReport = (overrides: Partial<LocoInfo> = {}) => {
    events.emit('locoInfo', report(overrides));
  };
  return {connection, controller, clock, live, emitReport, unwatch};
};

describe('DriveController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useLocoStore.setState({locos: {}});
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes once per loco and releases after the last watcher', () => {
    const {connection, controller, live, unwatch} = setup();
    const first = controller.watch(3);
    const second = controller.watch(3);
    expect(connection.watchLocos).toHaveBeenCalledTimes(1);
    expect(live()).toMatchObject({known: false, speed: 0, speedSteps: 128});

    first();
    first();
    expect(unwatch).not.toHaveBeenCalled();
    second();
    expect(unwatch).toHaveBeenCalledTimes(1);
    expect(live()).toBeUndefined();
  });

  it('keeps two throttles on the same loco in sync without double packets', () => {
    // Split screen with the same loco on both sides.
    const {connection, controller, live, emitReport} = setup();
    const left = controller.watch(3);
    const right = controller.watch(3);
    expect(connection.watchLocos).toHaveBeenCalledTimes(1);

    controller.setSpeed(3, 40);
    expect(connection.drive).toHaveBeenCalledTimes(1);
    // Both throttles read the same live state.
    emitReport({speed: 40});
    expect(live()?.speed).toBe(40);

    left();
    expect(live()?.speed).toBe(40);
    right();
    expect(live()).toBeUndefined();
  });

  it('drives several locos at once with their own speed and direction', () => {
    const {connection, controller, live} = setup();
    controller.watch(3);
    controller.watch(4, 28);
    controller.driveLocos([
      {address: 3, speed: 60, forward: true},
      {address: 4, speed: 99, forward: false},
    ]);
    expect(connection.drive).toHaveBeenCalledWith({
      address: 3,
      steps: 128,
      speed: 60,
      forward: true,
    });
    // Clamped to the 28-step range.
    expect(connection.drive).toHaveBeenCalledWith({
      address: 4,
      steps: 28,
      speed: 28,
      forward: false,
    });
    expect(live(4)).toMatchObject({speed: 28, forward: false});
  });

  it('emergency-stops several locos in one call', () => {
    const {connection, controller} = setup();
    controller.watch(3);
    controller.watch(4, 28);
    controller.emergencyStopLocos([3, 4, 5]);
    expect(connection.emergencyStopLocos).toHaveBeenCalledTimes(1);
    expect(connection.emergencyStopLocos).toHaveBeenCalledWith([
      {address: 3, steps: 128, forward: true},
      {address: 4, steps: 28, forward: true},
    ]);
  });

  it('shows reports from the central unit', () => {
    const {controller, live, emitReport} = setup();
    controller.watch(3);
    emitReport({speed: 42, forward: false});
    expect(live()).toMatchObject({known: true, speed: 42, forward: false});
  });

  it('ignores reports for locos not on screen', () => {
    const {live, emitReport} = setup();
    emitReport({address: 7, speed: 5});
    expect(live(7)).toBeUndefined();
  });

  it('drives with the configured speed steps and current direction', () => {
    const {connection, controller, emitReport} = setup();
    controller.watch(3, 28);
    emitReport({speedSteps: 28, forward: false});
    controller.setSpeed(3, 99);
    expect(connection.drive).toHaveBeenLastCalledWith({
      address: 3,
      steps: 28,
      speed: 28,
      forward: false,
    });
  });

  it('builds quick speed changes on the shown value', () => {
    const {controller, live} = setup();
    controller.watch(3);
    for (let tap = 0; tap < 3; tap++) {
      controller.setSpeed(3, (live()?.speed ?? 0) + 10);
    }
    expect(live()?.speed).toBe(30);
  });

  it('changes direction at the current speed', () => {
    const {connection, controller, emitReport} = setup();
    controller.watch(3);
    emitReport({speed: 20});
    controller.setDirection(3, false);
    expect(connection.drive).toHaveBeenLastCalledWith(
      expect.objectContaining({speed: 20, forward: false}),
    );
  });

  it('stops one loco, normally or as an emergency', () => {
    const {connection, controller, emitReport, live} = setup();
    controller.watch(3);
    emitReport({speed: 20, forward: false});
    controller.stopLoco(3);
    expect(connection.drive).toHaveBeenLastCalledWith(
      expect.objectContaining({speed: 0, forward: false}),
    );
    controller.emergencyStopLoco(3);
    expect(connection.emergencyStopLocos).toHaveBeenCalledWith([
      {address: 3, steps: 128, forward: false},
    ]);
    expect(live()).toMatchObject({speed: 0, emergencyStop: true});
  });

  it('switches functions explicitly on and off', () => {
    const {connection, controller, live} = setup();
    controller.watch(3);
    controller.setFunction(3, 0, true);
    expect(connection.setFunction).toHaveBeenCalledWith(3, 0, true);
    expect(live()?.functions[0]).toBe(true);
  });

  it('follows the global STOP mode and double tap', () => {
    const {connection, controller, clock, live, emitReport} = setup();
    controller.watch(3);
    emitReport({speed: 50});

    expect(controller.globalStop('emergencyStopThenPowerOff')).toBe(
      'emergencyStop',
    );
    expect(connection.emergencyStop).toHaveBeenCalledTimes(1);
    // The loco display keeps following the central unit's reports.
    expect(live()).toMatchObject({speed: 50, emergencyStop: false});

    clock.advance(STOP_DOUBLE_TAP_WINDOW_MS - 100);
    expect(controller.globalStop('emergencyStopThenPowerOff')).toBe('powerOff');
    expect(connection.setTrackPower).toHaveBeenCalledWith(false);
    expect(connection.emergencyStop).toHaveBeenCalledTimes(1);
  });

  it('powers off on a quick second tap in STOP place, resumes on a later one', () => {
    const {controller, connection, clock} = setup();
    controller.globalStop('emergencyStopThenPowerOff');
    // The second tap of a double tap lands on the status in STOP's place.
    clock.advance(300);
    expect(controller.restoreOrStop('emergencyStopThenPowerOff')).toBe(
      'powerOff',
    );
    expect(connection.setTrackPower).toHaveBeenLastCalledWith(false);
    // A separate tap later resumes.
    clock.advance(STOP_DOUBLE_TAP_WINDOW_MS + 1);
    expect(controller.restoreOrStop('emergencyStopThenPowerOff')).toBe(
      'restore',
    );
    expect(connection.setTrackPower).toHaveBeenLastCalledWith(true);
  });

  it('resumes from a single STOP once the double-tap window has passed', () => {
    const {controller, connection, clock} = setup();
    controller.globalStop('emergencyStopThenPowerOff');
    clock.advance(STOP_DOUBLE_TAP_WINDOW_MS + 1);
    expect(controller.restoreOrStop('emergencyStopThenPowerOff')).toBe(
      'restore',
    );
    expect(connection.setTrackPower).toHaveBeenCalledWith(true);
    expect(connection.setTrackPower).not.toHaveBeenCalledWith(false);
  });

  it('lets the report win once the user stops changing things', () => {
    const {controller, clock, live, emitReport} = setup();
    controller.watch(3);
    controller.setSpeed(3, 30);
    emitReport({speed: 10});
    expect(live()?.speed).toBe(30);
    clock.advance(LOCAL_CHANGE_HOLD_MS);
    emitReport({speed: 10});
    expect(live()?.speed).toBe(10);
  });

  it('drops an unconfirmed change after the hold time, even without a report', () => {
    // E.g. a central unit that silently ignores LAN_X_SET_LOCO_E_STOP.
    const {controller, clock, live, emitReport} = setup();
    controller.watch(3);
    emitReport({speed: 126});
    controller.emergencyStopLoco(3);
    expect(live()).toMatchObject({speed: 0, emergencyStop: true});
    clock.advance(LOCAL_CHANGE_HOLD_MS);
    expect(live()).toMatchObject({speed: 126, emergencyStop: false});
  });

  it('shows defaults again if a change is never confirmed and nothing was reported', () => {
    const {controller, clock, live} = setup();
    controller.watch(3);
    controller.setSpeed(3, 40);
    expect(live()?.speed).toBe(40);
    clock.advance(LOCAL_CHANGE_HOLD_MS);
    expect(live()).toMatchObject({known: false, speed: 0});
  });

  it('flags another controller and clears the flag later', () => {
    const {controller, clock, live, emitReport} = setup();
    controller.watch(3);
    emitReport();
    controller.setSpeed(3, 10);
    emitReport({speed: 10});
    expect(live()?.shared).toBe(false);

    emitReport({speed: 60});
    expect(live()?.shared).toBe(true);
    clock.advance(SHARED_CONTROL_HOLD_MS);
    expect(live()?.shared).toBe(false);
  });
});
