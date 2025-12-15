/**
 * Autofill Skill UI Component
 * UI for managing autofill profiles and filling forms
 */

import { useState, useEffect } from 'react';
import { FileText, Loader2, Plus, Trash2, Star, X } from 'lucide-react';
import { getAutofillSkill } from '../../services/skills/autofill/skill';
import { AUTOFILL_SKILL_MANIFEST } from '../../services/skills/autofill/skill';
import { getAutofillStorage } from '../../services/skills/autofill/storage';
import { detectForms } from '../../services/skills/autofill/formDetector';
import {
  getAllTemplates,
  createProfileFromTemplate,
  type AutofillTemplate,
} from '../../services/skills/autofill/templates';
import type { AutofillProfile, DetectedForm } from '../../services/skills/autofill/types';
import { toast } from '../../utils/toast';
import { useMobileDetection } from '../../mobile';

interface AutofillSkillUIProps {
  onClose?: () => void;
}

export function AutofillSkillUI({ onClose }: AutofillSkillUIProps) {
  const { isMobile } = useMobileDetection();
  const [profiles, setProfiles] = useState<AutofillProfile[]>([]);
  const [forms, setForms] = useState<DetectedForm[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AutofillTemplate | null>(null);

  const autofillSkill = getAutofillSkill();
  const storage = getAutofillStorage();

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      await autofillSkill.initialize();
      await loadProfiles();
      await detectPageForms();

      // Set default profile
      const defaultProfile = await storage.getDefaultProfile();
      if (defaultProfile) {
        setSelectedProfile(defaultProfile.id);
      } else if (profiles.length > 0) {
        setSelectedProfile(profiles[0].id);
      }
    } catch (error) {
      console.error('Failed to initialize autofill:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const allProfiles = await storage.getAllProfiles();
      setProfiles(allProfiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const detectPageForms = async () => {
    setIsDetecting(true);
    try {
      const detected = detectForms();
      setForms(detected);
    } catch (error) {
      console.error('Failed to detect forms:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim() || !selectedTemplate) {
      toast.error('Please enter a name and select a template');
      return;
    }

    try {
      const profile = createProfileFromTemplate(selectedTemplate.id, {});
      if (!profile) {
        toast.error('Failed to create profile');
        return;
      }

      profile.name = newProfileName.trim();
      await storage.saveProfile(profile);
      await loadProfiles();

      setNewProfileName('');
      setSelectedTemplate(null);
      setShowCreateProfile(false);
      toast.success('Profile created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create profile');
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      await storage.deleteProfile(profileId);
      await loadProfiles();

      if (selectedProfile === profileId) {
        setSelectedProfile(profiles.find(p => p.id !== profileId)?.id || null);
      }
      toast.success('Profile deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete profile');
    }
  };

  const handleSetDefault = async (profileId: string) => {
    try {
      await storage.setDefaultProfile(profileId);
      await loadProfiles();
      setSelectedProfile(profileId);
      toast.success('Default profile updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set default profile');
    }
  };

  const handleFillForm = async (_formIndex: number) => {
    if (!selectedProfile) {
      toast.error('Please select a profile');
      return;
    }

    setIsFilling(true);
    try {
      const result = await autofillSkill.autofillForm(
        {
          skillId: AUTOFILL_SKILL_MANIFEST.id,
          pageUrl: window.location.href,
          permissions: [],
        },
        { profileId: selectedProfile }
      );

      if (result.success) {
        toast.success(result.message || 'Form filled successfully');
      } else {
        toast.error(result.error || 'Failed to fill form');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fill form');
    } finally {
      setIsFilling(false);
    }
  };

  if (showCreateProfile) {
    const templates = getAllTemplates();

    return (
      <div
        className={`${isMobile ? 'p-4' : 'p-6'} w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Create Profile</h3>
          <button
            onClick={() => setShowCreateProfile(false)}
            className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Profile Name</label>
            <input
              type="text"
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              placeholder="My Profile"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Template</label>
            <div className="space-y-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium text-white">{template.name}</div>
                  <div className="text-sm text-gray-400">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateProfile}
              className="min-h-[44px] flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Create Profile
            </button>
            <button
              onClick={() => setShowCreateProfile(false)}
              className="min-h-[44px] rounded-lg bg-gray-700 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isMobile ? 'p-4' : 'p-6'} w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Autofill Forms</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Profiles */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Profiles</h4>
          <button
            onClick={() => setShowCreateProfile(true)}
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
          >
            <Plus className="h-4 w-4" />
            New Profile
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <p className="mb-4">No profiles yet</p>
            <button
              onClick={() => setShowCreateProfile(true)}
              className="text-indigo-400 hover:text-indigo-300"
            >
              Create your first profile
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map(profile => (
              <div
                key={profile.id}
                className={`rounded-lg border p-3 ${
                  selectedProfile === profile.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {profile.isDefault && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    <span className="font-medium text-white">{profile.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!profile.isDefault && (
                      <button
                        onClick={() => handleSetDefault(profile.id)}
                        className="text-gray-400 transition-colors hover:text-yellow-400"
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedProfile(profile.id)}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      {selectedProfile === profile.id ? 'Selected' : 'Select'}
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="text-red-400 transition-colors hover:text-red-300"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detected Forms */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Detected Forms</h4>
          <button
            onClick={detectPageForms}
            disabled={isDetecting}
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        {forms.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-400">
            No forms detected on this page
          </div>
        ) : (
          <div className="space-y-2">
            {forms.map((form, index) => (
              <div key={index} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">Form {index + 1}</div>
                    <div className="text-sm text-gray-400">{form.fields.length} fields</div>
                  </div>
                  <button
                    onClick={() => handleFillForm(index)}
                    disabled={!selectedProfile || isFilling}
                    className="min-h-[36px] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFilling ? (
                      <>
                        <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                        Filling...
                      </>
                    ) : (
                      'Fill Form'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
