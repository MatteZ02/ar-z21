// All user-visible text lives here. Components import from this module instead
// of using string literals in JSX.
export const strings = {
  appName: 'AR Z21',

  // Developer connection test screen (Phase 1). Not shown to members.
  debug: {
    title: 'Connection test',
    host: 'Central unit IP address',
    hostHint:
      'Android emulator: use 10.0.2.2 to reach a server on this computer.',
    port: 'Port',
    connect: 'Connect',
    disconnect: 'Disconnect',
    connection: 'Connection',
    track: 'Track',
    device: 'Central unit',
    deviceUnknown: 'No device information',
    firmware: 'firmware',
    lockCode: 'lock code',
    requestStatus: 'Ask status',
    powerOn: 'Track power on',
    powerOff: 'Track power off',
    stop: 'STOP',
    loco: 'Loco',
    locoAddress: 'Loco address',
    watch: 'Watch',
    noLocoInfo: 'No loco info yet',
    reverse: 'Change direction',
    light: 'F0',
    locoStop: 'Loco stop',
    busy: 'busy',
    log: 'Protocol log',
    logEnabled: 'Log datasets',
    clearLog: 'Clear log',
  },
} as const;
