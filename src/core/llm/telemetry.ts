export function emitTelemetry(event: Record<string, any>) {
  // Minimal no-op telemetry stub for dev
  if (typeof window !== 'undefined' && (window as any).console) {
    console.debug('[telemetry stub]', event.type || event);
  }
}

export default { emitTelemetry };