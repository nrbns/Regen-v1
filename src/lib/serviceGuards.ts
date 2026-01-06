export function heavyServicesDisabled(): boolean {
  try {
    // Respect explicit env flags (set in NPM scripts or CI)
    const v = process.env.OB_DISABLE_HEAVY_SERVICES || process.env.DISABLE_HEAVY_SERVICES
    if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true'
  } catch (e) {
    // In browser-like environments process may be undefined
  }
  return false
}

export function shouldStartService(serviceName: string): boolean {
  if (heavyServicesDisabled()) return false
  // Future per-service toggles can be added here
  return true
}

export default { heavyServicesDisabled, shouldStartService }
