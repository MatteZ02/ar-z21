import * as Haptics from 'expo-haptics';

// Haptic feedback. Never lets a failure (e.g. no vibration motor) escape.
const run = (promise: Promise<void>): void => {
  promise.catch(() => undefined);
};

export const feedback = {
  // Global STOP: emergency stop sent.
  emergencyStop: () => {
    run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  // Track power switched off, or a short circuit appeared.
  alarm: () => {
    run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  // Function buttons, direction.
  tap: () => {
    run(Haptics.selectionAsync());
  },
};
