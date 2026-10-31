// All user-visible text lives here. Components import from this module instead
// of using string literals in JSX.
export const strings = {
  appName: 'AR Z21',
  back: 'Back',

  menu: {
    drive: 'Drive',
    settings: 'Settings',
  },

  connection: {
    connected: 'Connected',
    connecting: 'Connecting…',
    reconnecting: 'No answer from the central unit, trying again…',
    disconnected: 'Not connected',
    // Short forms for the header.
    connectedShort: 'Online',
    connectingShort: 'Wait',
    disconnectedShort: 'Offline',
    locked:
      'This z21 start is locked. Driving from apps needs the Z21 WLAN unlock code from Roco.',
  },

  // The global STOP control.
  stop: {
    label: 'STOP',
    accessibilityHint: {
      emergencyStopThenPowerOff:
        'Stops all trains. Tap twice quickly to also switch the track power off.',
      emergencyStopOnly: 'Stops all trains. Track power stays on.',
      powerOff: 'Switches the track power off.',
    },
    notConnected: 'Not connected: STOP cannot reach the layout.',
  },

  track: {
    normal: 'Track on',
    emergencyStop: 'Emergency stop: all trains stopped',
    powerOff: 'Track power is off',
    shortCircuit: 'SHORT CIRCUIT: track power is off',
    programming: 'Programming mode',
    unknown: 'Track status unknown',
    powerOn: 'Track power on',
    resume: 'Resume',
  },

  drive: {
    title: 'Drive',
    loco: 'Loco',
    address: 'Address',
    speedStep: 'Step',
    of: 'of',
    speed: 'Speed',
    forward: 'Forward',
    reverse: 'Reverse',
    setForward: 'Drive forward',
    setReverse: 'Drive in reverse',
    locoStop: 'STOP',
    locoStopHint: 'Stops this loco immediately.',
    emergencyStopped: 'Stopped',
    waitingForLoco: 'Waiting for the central unit…',
    shared: 'Also driven elsewhere',
    sharedHint: 'Another controller is driving this loco too.',
    functions: 'Functions',
    function: 'Function',
    functionLetter: 'F',
    chooseLoco: 'Choose loco',
    chooseLocoTitle: 'Loco to drive',
    speedSteps: 'Speed steps',
    invalidAddress: 'Enter an address from 1 to 10239.',
    use: 'Drive this loco',
    cancel: 'Cancel',
    slower: 'Slower',
    faster: 'Faster',
    slowerSymbol: '−',
    fasterSymbol: '+',
    addressPrefix: '#',
  },

  settings: {
    title: 'Settings',
    connectionSection: 'Central unit',
    host: 'IP address',
    port: 'Port',
    connect: 'Connect',
    disconnect: 'Disconnect',
    status: 'Status',
    device: 'Device',
    firmware: 'firmware',
    deviceUnknown: 'Not reported',
    invalidPort: 'Enter a port from 1 to 65535.',
    stopSection: 'STOP button',
    stopModes: {
      emergencyStopThenPowerOff: {
        title: 'Emergency stop, double tap: power off',
        detail:
          'One tap stops all trains. Tap twice quickly to also switch the track power off.',
      },
      emergencyStopOnly: {
        title: 'Emergency stop only',
        detail: 'Stops all trains. Track power stays on.',
      },
      powerOff: {
        title: 'Track power off',
        detail: 'Every tap switches the track power off.',
      },
    },
    developerSection: 'For developers',
    connectionTest: 'Connection test and protocol log',
  },

  // Central unit names by LAN_GET_HWINFO hardware type (§2.20).
  hardware: {
    0x200: 'Z21 (black, 2012)',
    0x201: 'Z21 (black, 2013)',
    0x202: 'SmartRail',
    0x203: 'z21 (white)',
    0x204: 'z21 start',
    0x211: 'Z21 XL',
    unknown: 'Unknown central unit',
  } as Record<number | 'unknown', string>,

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
