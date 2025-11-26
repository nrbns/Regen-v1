/**
 * Skill Registry
 * Manages skills from GitHub-based registry and local installations
 */

import type { SkillMetadata, SkillInstallation, SkillReview } from './types';

const GITHUB_REGISTRY_URL = 'https://api.github.com/repos/regenbrowser/skills/contents';
const LOCAL_STORAGE_KEY = 'regen:skills:installed';
const LOCAL_STORAGE_REVIEWS = 'regen:skills:reviews';

class SkillRegistry {
  private installedSkills: Map<string, SkillInstallation> = new Map();
  private skillCache: Map<string, SkillMetadata> = new Map();

  constructor() {
    this.loadInstalledSkills();
  }

  /**
   * Load installed skills from localStorage
   */
  private loadInstalledSkills(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const skills = JSON.parse(stored) as SkillInstallation[];
        skills.forEach(skill => {
          this.installedSkills.set(skill.skillId, skill);
        });
      }
    } catch (error) {
      console.error('[SkillRegistry] Failed to load installed skills:', error);
    }
  }

  /**
   * Save installed skills to localStorage
   */
  private saveInstalledSkills(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      const skills = Array.from(this.installedSkills.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(skills));
    } catch (error) {
      console.error('[SkillRegistry] Failed to save installed skills:', error);
    }
  }

  /**
   * Fetch skills from GitHub registry
   */
  async fetchSkillsFromRegistry(category?: string): Promise<SkillMetadata[]> {
    try {
      // Try to fetch from GitHub API first
      try {
        const githubToken = import.meta.env.VITE_GITHUB_TOKEN || '';
        const headers: HeadersInit = {
          Accept: 'application/vnd.github.v3+json',
        };
        if (githubToken) {
          headers['Authorization'] = `token ${githubToken}`;
        }

        const response = await fetch(`${GITHUB_REGISTRY_URL}?ref=main`, { headers });

        if (response.ok) {
          const files = await response.json();
          const skillFiles = files.filter(
            (f: any) => f.type === 'file' && f.name.endsWith('.json') && f.name.startsWith('skill-')
          );

          const skills: SkillMetadata[] = [];
          for (const file of skillFiles.slice(0, 20)) {
            // Limit to 20 for performance
            try {
              const fileResponse = await fetch(file.download_url);
              if (fileResponse.ok) {
                const skillData = await fileResponse.json();
                skills.push({
                  id: skillData.id || file.name.replace('.json', ''),
                  name: skillData.name || 'Unnamed Skill',
                  description: skillData.description || '',
                  author: skillData.author || 'Community',
                  version: skillData.version || '1.0.0',
                  category: skillData.category || 'other',
                  tags: skillData.tags || [],
                  language: skillData.language || 'en',
                  rating: skillData.rating || 0,
                  reviewCount: skillData.reviewCount || 0,
                  downloadCount: skillData.downloadCount || 0,
                  createdAt: skillData.createdAt || Date.now(),
                  updatedAt: skillData.updatedAt || Date.now(),
                  compatibility: skillData.compatibility || { minVersion: '0.1.0' },
                });
              }
            } catch (error) {
              console.warn(`[SkillRegistry] Failed to fetch skill ${file.name}:`, error);
            }
          }

          if (skills.length > 0) {
            // Cache the skills
            skills.forEach(skill => this.skillCache.set(skill.id, skill));
            const filtered = category
              ? skills.filter(skill => skill.category === category)
              : skills;
            return filtered;
          }
        }
      } catch (error) {
        console.warn('[SkillRegistry] GitHub fetch failed, using fallback:', error);
      }

      // Fallback to mock data if GitHub fetch fails
      const mockSkills: SkillMetadata[] = [
        {
          id: 'resume-fixer',
          name: 'AI Resume Fixer',
          description: 'Automatically reformat and tailor your resume to any job description',
          author: 'RegenBrowser',
          version: '1.0.0',
          category: 'productivity',
          tags: ['resume', 'job', 'pdf', 'ai'],
          language: 'en',
          rating: 4.8,
          reviewCount: 234,
          downloadCount: 15234,
          createdAt: Date.now() - 86400000 * 30,
          updatedAt: Date.now() - 86400000 * 2,
          compatibility: { minVersion: '0.1.0' },
        },
        {
          id: 'form-filler',
          name: 'Government Form Filler',
          description: 'Auto-fill Indian government forms from Aadhaar photo',
          author: 'Community',
          version: '0.9.0',
          category: 'automation',
          tags: ['form', 'aadhaar', 'india', 'automation'],
          language: 'hi',
          rating: 4.9,
          reviewCount: 567,
          downloadCount: 89012,
          createdAt: Date.now() - 86400000 * 15,
          updatedAt: Date.now() - 86400000 * 1,
          compatibility: { minVersion: '0.1.0' },
        },
        {
          id: 'perplexity-clone',
          name: 'Perplexity Clone',
          description: 'Clone Perplexity-style research assistant with streaming answers',
          author: 'Community',
          version: '1.2.0',
          category: 'research',
          tags: ['research', 'ai', 'streaming', 'clone'],
          rating: 4.7,
          reviewCount: 1234,
          downloadCount: 45000,
          createdAt: Date.now() - 86400000 * 60,
          updatedAt: Date.now() - 86400000 * 5,
          compatibility: { minVersion: '0.1.0' },
        },
      ];

      // Filter by category if provided
      if (category) {
        return mockSkills.filter(skill => skill.category === category);
      }

      return mockSkills;
    } catch (error) {
      console.error('[SkillRegistry] Failed to fetch skills:', error);
      return [];
    }
  }

  /**
   * Get skill details by ID
   */
  async getSkillById(skillId: string): Promise<SkillMetadata | null> {
    // Check cache first
    if (this.skillCache.has(skillId)) {
      return this.skillCache.get(skillId)!;
    }

    // Fetch from registry
    const skills = await this.fetchSkillsFromRegistry();
    const skill = skills.find(s => s.id === skillId) || null;

    if (skill) {
      this.skillCache.set(skillId, skill);
    }

    return skill;
  }

  /**
   * Install a skill
   */
  async installSkill(skillId: string, config?: Record<string, any>): Promise<boolean> {
    try {
      const skill = await this.getSkillById(skillId);
      if (!skill) {
        throw new Error(`Skill ${skillId} not found`);
      }

      const installation: SkillInstallation = {
        skillId,
        installedAt: Date.now(),
        enabled: true,
        config,
      };

      this.installedSkills.set(skillId, installation);
      this.saveInstalledSkills();

      // In production, would download skill code/WASM from GitHub
      // For now, just mark as installed

      return true;
    } catch (error) {
      console.error(`[SkillRegistry] Failed to install skill ${skillId}:`, error);
      return false;
    }
  }

  /**
   * Uninstall a skill
   */
  uninstallSkill(skillId: string): boolean {
    try {
      this.installedSkills.delete(skillId);
      this.saveInstalledSkills();
      return true;
    } catch (error) {
      console.error(`[SkillRegistry] Failed to uninstall skill ${skillId}:`, error);
      return false;
    }
  }

  /**
   * Get all installed skills
   */
  getInstalledSkills(): SkillInstallation[] {
    return Array.from(this.installedSkills.values());
  }

  /**
   * Check if a skill is installed
   */
  isInstalled(skillId: string): boolean {
    return this.installedSkills.has(skillId);
  }

  /**
   * Enable/disable a skill
   */
  setSkillEnabled(skillId: string, enabled: boolean): boolean {
    const installation = this.installedSkills.get(skillId);
    if (!installation) {
      return false;
    }

    installation.enabled = enabled;
    this.installedSkills.set(skillId, installation);
    this.saveInstalledSkills();
    return true;
  }

  /**
   * Get skill reviews
   */
  async getSkillReviews(skillId: string): Promise<SkillReview[]> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }
      const stored = localStorage.getItem(`${LOCAL_STORAGE_REVIEWS}:${skillId}`);
      if (stored) {
        return JSON.parse(stored) as SkillReview[];
      }
      return [];
    } catch (error) {
      console.error('[SkillRegistry] Failed to load reviews:', error);
      return [];
    }
  }

  /**
   * Add a review for a skill
   */
  async addReview(review: SkillReview): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const reviews = await this.getSkillReviews(review.skillId);
      reviews.push(review);

      localStorage.setItem(`${LOCAL_STORAGE_REVIEWS}:${review.skillId}`, JSON.stringify(reviews));

      // Update skill rating (in production, this would sync with backend)
      const skill = await this.getSkillById(review.skillId);
      if (skill) {
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        skill.rating = totalRating / reviews.length;
        skill.reviewCount = reviews.length;
        this.skillCache.set(review.skillId, skill);
      }

      return true;
    } catch (error) {
      console.error('[SkillRegistry] Failed to add review:', error);
      return false;
    }
  }

  /**
   * Clone a skill from any AI tool (Perplexity, Claude, etc.)
   * User provides prompt/description, we generate skill
   */
  async cloneSkillFromPrompt(prompt: string, toolName: string): Promise<string | null> {
    try {
      // In production, this would:
      // 1. Use AI to generate skill code from prompt
      // 2. Create skill metadata
      // 3. Publish to registry
      // For now, return a skill ID

      const skillId = `clone-${toolName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      const newSkill: SkillMetadata = {
        id: skillId,
        name: `${toolName} Clone`,
        description: `Cloned from ${toolName}: ${prompt.slice(0, 100)}`,
        author: 'User Cloned',
        version: '1.0.0',
        category: 'custom',
        tags: ['clone', toolName.toLowerCase(), 'custom'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        compatibility: { minVersion: '0.1.0' },
      };

      this.skillCache.set(skillId, newSkill);

      // Auto-install cloned skill
      await this.installSkill(skillId);

      return skillId;
    } catch (error) {
      console.error('[SkillRegistry] Failed to clone skill:', error);
      return null;
    }
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistry();
