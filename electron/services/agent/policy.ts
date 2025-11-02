export function policyAllows(step: { skill: string; args: any }) {
  // Tighten later: robots, rate limits, per-action caps
  const banned = new Set<string>(['solve_captcha']);
  if (banned.has(step.skill)) return false;
  return true;
}


