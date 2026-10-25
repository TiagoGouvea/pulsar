// Emulator builds (dev server or `build:emulator`) talk to local emulators and unlock dev-only routes (/_design).
export const emulatorsEnabled = import.meta.env.DEV || import.meta.env.VITE_USE_EMULATORS === 'true';
