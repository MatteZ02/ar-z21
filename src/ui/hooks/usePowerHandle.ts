import {useEffect, useRef, useState} from 'react';
import {
  HANDLE_TICK_MS,
  HandleLoco,
  nextHandleSpeed,
} from '../../driving/powerHandle';

type Options = HandleLoco & {
  // The displayed speed step (follows LAN_X_LOCO_INFO).
  speed: number;
  // False while the handle must not move the loco: not connected, track not
  // in normal operation, or the loco emergency-stopped.
  active: boolean;
  // Sends a new speed step.
  drive: (step: number) => void;
};

// Runs the power handle of one throttle. While the handle is off centre, it
// recomputes the speed every HANDLE_TICK_MS and sends the step when it
// changes; at centre nothing runs. Whenever driving is not allowed (STOP,
// track off, short circuit, disconnect, loco stop), the handle returns to
// coast, so the loco never starts again by itself afterwards.
export const usePowerHandle = (options: Options) => {
  const [handle, setHandle] = useState(0);
  const latest = useRef(options);
  latest.current = options;
  const handleRef = useRef(handle);
  handleRef.current = handle;
  const moving = handle !== 0;

  useEffect(() => {
    if (!options.active) {
      setHandle(0);
    }
  }, [options.active]);

  useEffect(() => {
    if (!moving || !latest.current.active) {
      return;
    }
    // The simulated speed keeps fractions between steps. It follows the
    // displayed speed again if that changes from elsewhere (another
    // controller, or the central unit not taking a step).
    let simulated = latest.current.speed;
    let lastStep = latest.current.speed;
    let lastTime = Date.now();
    const timer = setInterval(() => {
      const current = latest.current;
      const now = Date.now();
      if (current.speed !== lastStep) {
        simulated = current.speed;
      }
      simulated = nextHandleSpeed(
        simulated,
        handleRef.current,
        current,
        now - lastTime,
      );
      lastTime = now;
      const step = Math.round(simulated);
      if (step !== current.speed) {
        current.drive(step);
      }
      lastStep = step;
    }, HANDLE_TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [moving, options.active]);

  return {handle, setHandle};
};
