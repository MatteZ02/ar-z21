// All user-visible text lives here. Components import from this module instead
// of using string literals in JSX.
export const strings = {
  appName: 'AR Z21',
  back: 'Back',

  menu: {
    vehicles: 'Vehicles',
    drive: 'Drive',
    settings: 'Settings',
  },

  library: {
    title: 'Vehicles',
    pickTitle: 'Choose a loco',
    entries: (count: number) =>
      count === 1 ? '1 vehicle' : `${count} vehicles`,
    search: 'Search by name or address',
    add: 'Add loco',
    edit: 'Arrange',
    done: 'Done',
    sortByName: 'Sort A–Z',
    sortByAddress: 'Sort by address',
    moveUp: 'Move up',
    moveDown: 'Move down',
    empty: 'No locos yet. Add your first loco with the + button.',
    noMatches: 'No loco matches the search.',
    driveByAddress: 'Drive by address',
    addConsist: 'Add consist',
    consistBadge: 'Consist',
    consistMembers: (count: number) =>
      count === 1 ? '1 loco' : `${count} locos`,
    loadError: 'The loco library could not be opened.',
    noPhoto: 'No photo',
  },

  editor: {
    newTitle: 'New loco',
    dataTab: 'Data',
    functionsTab: 'Functions',
    photo: 'Photo',
    takePhoto: 'Take photo',
    choosePhoto: 'Choose photo',
    removePhoto: 'Remove photo',
    cameraDenied:
      'The app may not use the camera. Allow it in the phone settings, or choose a photo instead.',
    photoFailed: 'The photo could not be saved.',
    name: 'Name',
    address: 'Address (1–10239)',
    speedSteps: 'Speed steps',
    maxSpeed: 'Top speed (km/h)',
    speedDisplay: 'Show speed as',
    speedDisplays: {kmh: 'km/h', step: 'Speed step', mph: 'mph'},
    notes: 'Notes',
    details: 'Details',
    fullName: 'Full name',
    railway: 'Railway',
    articleNumber: 'Article number',
    decoderType: 'Decoder',
    buildYear: 'Year built',
    save: 'Save',
    cancel: 'Cancel',
    duplicate: 'Duplicate',
    delete: 'Delete loco',
    deleteTitle: 'Delete this loco?',
    deleteMessage: (name: string) =>
      `“${name}” and its functions and photo will be deleted. This cannot be undone.`,
    deleteConfirm: 'Delete',
    keep: 'Keep',
    discardTitle: 'Discard changes?',
    discardMessage: 'Your changes to this loco have not been saved.',
    discard: 'Discard',
    keepEditing: 'Keep editing',
    copyName: (name: string) => `${name} (copy)`,
    notFound: 'This loco no longer exists.',
    saveFailed: 'The loco could not be saved.',
    functionsHint:
      'Tap a function to change it, or an empty place to add one. Pages are the same as on the drive screen.',
    problems: {
      nameMissing: 'Enter a name.',
      addressInvalid: 'Enter an address from 1 to 10239.',
      maxSpeedInvalid: 'Enter a top speed from 1 to 500 km/h.',
      functionNumberInvalid: 'Function numbers must be from 0 to 31.',
      functionNumberDuplicate: 'Each function number can be used only once.',
      functionSlotInvalid: 'A function is outside the function pages.',
      functionSlotDuplicate: 'Two functions are in the same place.',
    },
  },

  importer: {
    title: 'Import from Roco Z21 app',
    menuEntry: 'Import from Roco app',
    intro:
      'In the Roco Z21 app, export your layout (Settings → Layouts → Export) and save the .z21 file on this device. Then choose it here.',
    choose: 'Choose export file',
    reading: 'Reading the file…',
    invalid:
      'This file could not be read. Choose the .z21 file exported from the Roco Z21 app.',
    found: (file: string, locos: number, consists: number) =>
      `${file}: ${locos === 1 ? '1 loco' : `${locos} locos`} and ${
        consists === 1 ? '1 consist' : `${consists} consists`
      }.`,
    duplicatesTitle: (count: number) =>
      count === 1
        ? '1 loco has an address that is already in your library'
        : `${count} locos have an address that is already in your library`,
    allDuplicates: 'For all of them',
    choices: {skip: 'Skip', replace: 'Replace', keepBoth: 'Keep both'},
    choiceHints: {
      skip: 'Keep your loco; do not import this one.',
      replace: 'Overwrite your loco with the imported one.',
      keepBoth: 'Import it as an extra loco with the same address.',
    },
    existing: (name: string) => `In your library: ${name}`,
    wagon: 'Wagon, imported as a loco',
    summary: (
      added: number,
      replaced: number,
      skipped: number,
      consists: number,
    ) =>
      `Will add ${added}, replace ${replaced}, skip ${skipped} locos, and add ${consists} ${
        consists === 1 ? 'consist' : 'consists'
      }.`,
    stepsNote:
      'The Roco app does not save speed steps; new locos get 128 steps. You can change this per loco.',
    start: 'Import',
    importing: 'Importing… This can take a minute with many photos.',
    doneTitle: 'Import finished',
    done: (
      added: number,
      replaced: number,
      skipped: number,
      consists: number,
    ) =>
      `${added} added, ${replaced} replaced, ${skipped} skipped, ${consists} ${
        consists === 1 ? 'consist' : 'consists'
      } added.`,
    problemsTitle: 'Not imported or changed',
    issues: {
      invalidAddress: (name: string, address: number | null) =>
        `${name}: address ${address ?? 'missing'} is not a valid DCC address.`,
      unsupportedType: (name: string) =>
        `${name}: this kind of vehicle is not supported.`,
      missingPhoto: (name: string) =>
        `${name}: the photo is missing in the file.`,
      unknownIcon: (name: string, icon: string) =>
        `${name}: function icon "${icon}" is unknown; shown as a number.`,
      functionSkipped: (name: string, number: number) =>
        `${name}: function F${number} could not be placed.`,
      missingMember: (name: string) =>
        `${name}: a loco of this consist is missing in the file.`,
      failed: (name: string) => `${name}: could not be saved.`,
    },
    toLibrary: 'Show vehicles',
  },

  consistEditor: {
    newTitle: 'New consist',
    name: 'Name',
    members: 'Locos, front to back',
    membersHint:
      'The first loco leads: its functions and speed are shown when driving.',
    addMember: 'Add loco',
    chooseMember: 'Choose a loco to add',
    noLocosLeft: 'All locos in the library are already in this consist.',
    reversed: 'Coupled facing backwards',
    reversedHint: 'This loco drives in the opposite direction.',
    speedOffset: 'Speed difference',
    speedOffsetValue: (offset: number, steps: number) =>
      `${offset > 0 ? '+' : ''}${offset} of ${steps} speed steps`,
    speedOffsetHint:
      'Makes this loco a little faster or slower, so that all locos run at the same speed. Never moves a standing train.',
    slower: 'Slower',
    faster: 'Faster',
    slowerSymbol: '−',
    fasterSymbol: '+',
    moveUp: 'Move forward in the train',
    moveDown: 'Move back in the train',
    removeMember: 'Remove from consist',
    delete: 'Delete consist',
    deleteTitle: 'Delete this consist?',
    deleteMessage: (name: string) =>
      `“${name}” will be deleted. Its locos stay in the library.`,
    notFound: 'This consist no longer exists.',
    problems: {
      nameMissing: 'Enter a name.',
      membersMissing: 'Add at least one loco.',
      memberDuplicate: 'Each loco can be in the consist only once.',
      offsetInvalid: 'Speed differences must be from −30 to +30.',
    },
  },

  functionEditor: {
    title: (number: number) => `Function F${number}`,
    addHere: 'Add a function here',
    number: 'Function number (0–31)',
    numberTaken: 'This number is already used by another function.',
    name: 'Name (optional)',
    icon: 'Icon',
    momentary: 'Momentary',
    momentaryHint: 'On only while the button is held, e.g. a horn.',
    remove: 'Remove function',
    done: 'Done',
    allNumbersUsed: 'All 32 function numbers are in use.',
  },

  // Labels for the function icon picker (src/library/icons.ts).
  functionIcons: {
    none: 'Number only',
    light: 'Light',
    headlight: 'Headlights',
    lowBeam: 'Low beam',
    tailLight: 'Tail lights',
    cabLight: 'Cab light',
    interiorLight: 'Interior light',
    sound: 'Sound',
    horn: 'Horn',
    whistle: 'Whistle',
    bell: 'Bell',
    announcement: 'Voice',
    music: 'Music',
    mute: 'Mute',
    volumeUp: 'Louder',
    volumeDown: 'Quieter',
    engine: 'Engine',
    brake: 'Brake',
    compressor: 'Compressor',
    fan: 'Fan',
    sand: 'Sand',
    smoke: 'Smoke',
    steam: 'Steam',
    pantograph: 'Pantograph',
    doorOpen: 'Doors open',
    doorClose: 'Doors close',
    couple: 'Couple',
    uncouple: 'Uncouple',
    shunting: 'Shunting',
    momentum: 'Momentum',
    crane: 'Crane',
    rotateLeft: 'Turn left',
    rotateRight: 'Turn right',
    up: 'Up',
    down: 'Down',
    wiper: 'Wiper',
    generic: 'Other',
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
    addressPrefix: '#',
    pages: ['C I', 'C II', 'C III'],
    // Several pages shown together, e.g. "C I–II" (indexes from 0).
    pageRange: (first: number, last: number) =>
      `C ${['I', 'II', 'III'][first]}–${['I', 'II', 'III'][last]}`,
    page: (number: number) => `Function page ${number}`,
    speedUnits: {kmh: 'km/h', mph: 'mph'},
    library: 'Choose from vehicles',
    recent: 'Recently driven',
    switchTo: (name: string) => `Drive ${name}`,
    current: 'Now driving',
    addressOnly: (address: number) => `Address ${address}`,
    noLoco: 'No loco on this throttle yet.',
    consistEmpty: 'This consist has no locos. Add locos to it in Vehicles.',
    members: 'Locos in this consist',
    memberFunctions: (name: string) => `Show functions of ${name}`,
    conflictTitle: 'Loco already being driven',
    conflictMessage: (addresses: number[]) =>
      `${addresses.length === 1 ? 'Loco' : 'Locos'} ${addresses.join(', ')} ${
        addresses.length === 1 ? 'is' : 'are'
      } also on the other throttle. Driving a loco alone and in a consist at the same time can make it run the wrong way.`,
    driveAnyway: 'Drive anyway',
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
