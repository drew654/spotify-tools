// Minimal instrumentation hook for Next.js (CommonJS)
exports.register = function () {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Load Node‑specific instrumentation if present
    require('./instrumentation-node');
  }
};
