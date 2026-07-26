export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Load Node‑specific instrumentation if present
    import('./instrumentation-node');
  }
}
