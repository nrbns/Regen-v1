export function analyzeText(text: string) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const entities = Array.from(new Set(words.filter(w => /[A-Z][a-z]+/.test(w)).slice(0, 5)));
  const summary = words.slice(0, 50).join(' ');
  const report = `# Analysis\n\n**Entities:** ${entities.join(', ') || 'None'}\n\n**Summary:** ${summary}`;
  return { entities, summary, report };
}


