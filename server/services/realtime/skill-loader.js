// server/services/realtime/skill-loader.js
// Event-driven Skill/Plugin Loader for Regen Backend

const eventBus = require('../../eventBus');
const path = require('path');
const fs = require('fs');

// Directory where skills are stored (can be extended to plugins)
const SKILLS_DIR = path.resolve(__dirname, '../../../src/services/skills');

// In-memory loaded skills
const loadedSkills = new Map();

// Helper: load a skill module dynamically
function loadSkill(skillPath) {
  try {
    delete require.cache[require.resolve(skillPath)];
    const skill = require(skillPath);
    loadedSkills.set(skillPath, skill);
    eventBus.emit('skill:loaded', { id: path.basename(skillPath), skill });
    return skill;
  } catch (err) {
    eventBus.emit('skill:failed', { id: path.basename(skillPath), error: err.message });
    return null;
  }
}

// Helper: unload a skill
function unloadSkill(skillPath) {
  loadedSkills.delete(skillPath);
  eventBus.emit('skill:unloaded', { id: path.basename(skillPath) });
}

// Watch for new/changed/removed skills
const _watcher = fs.watch(SKILLS_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename.endsWith('skill.js') && !filename.endsWith('skill.ts')) return;
  const skillPath = path.join(SKILLS_DIR, filename);
  if (eventType === 'rename' && fs.existsSync(skillPath)) {
    loadSkill(skillPath);
  } else if (eventType === 'change') {
    loadSkill(skillPath);
  } else if (eventType === 'rename' && !fs.existsSync(skillPath)) {
    unloadSkill(skillPath);
  }
});

// API: get loaded skills
function getLoadedSkills() {
  return Array.from(loadedSkills.values());
}

module.exports = {
  getLoadedSkills,
  loadSkill,
  unloadSkill,
};
