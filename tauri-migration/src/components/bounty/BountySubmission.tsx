/**
 * Bounty Submission System
 * Allows users to submit viral demo videos for bounties
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Users,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  submitBounty,
  verifyVideoViews,
  getLeaderboard,
  type BountyLeaderboardEntry,
} from '../../services/bountyService';

interface BountySubmission {
  id?: string;
  title: string;
  videoUrl: string;
  platform: 'youtube' | 'x' | 'tiktok' | 'reels' | 'other';
  description: string;
  upiId: string;
  views: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submittedAt?: number;
}

export function BountySubmission() {
  const [submission, setSubmission] = useState<BountySubmission>({
    title: '',
    videoUrl: '',
    platform: 'youtube',
    description: '',
    upiId: '',
    views: 0,
    status: 'pending',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<BountyLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const data = await getLeaderboard(10);
      setLeaderboard(data);
    } catch (error) {
      console.error('[Bounty] Failed to load leaderboard:', error);
      // Use mock data if API fails
      setLeaderboard([
        {
          userId: 'user1',
          userName: 'TechGuru',
          totalViews: 2500000,
          totalEarned: 12500,
          submissionCount: 5,
          rank: 1,
        },
        {
          userId: 'user2',
          userName: 'AIBrowser',
          totalViews: 1800000,
          totalEarned: 9000,
          submissionCount: 4,
          rank: 2,
        },
        {
          userId: 'user3',
          userName: 'DemoMaster',
          totalViews: 1200000,
          totalEarned: 6000,
          submissionCount: 3,
          rank: 3,
        },
      ]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!submission.title || !submission.videoUrl || !submission.upiId) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitBounty(submission);

      setSubmitted(true);
      toast.success(
        result.message || 'Bounty submission received! We will verify and process payment.'
      );

      // Reload leaderboard to show updated stats
      await loadLeaderboard();

      // Reset form after delay
      setTimeout(() => {
        setSubmission({
          title: '',
          videoUrl: '',
          platform: 'youtube',
          description: '',
          upiId: '',
          views: 0,
          status: 'pending',
        });
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('[Bounty] Submission failed:', error);
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyViews = async () => {
    if (!submission.videoUrl || !submission.platform) {
      toast.error('Please enter video URL and select platform');
      return;
    }

    const loadingToast = toast.loading('Verifying views...');
    try {
      const result = await verifyVideoViews(submission.videoUrl, submission.platform);
      setSubmission(prev => ({ ...prev, views: result.views }));
      toast.success(`Views verified: ${result.views.toLocaleString()}`, { id: loadingToast });
    } catch (error) {
      console.error('[Bounty] Verification failed:', error);
      toast.error('Failed to verify views. Please try again.', { id: loadingToast });
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">Viral Demo Bounties</h1>
        </div>
        <p className="text-slate-400">
          Create a viral demo video and earn ₹500 when it hits 50K+ views
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* How it works */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              How It Works
            </h3>
            <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
              <li>Record a demo video showing RegenBrowser features</li>
              <li>Post on YouTube, X, TikTok, or Instagram Reels</li>
              <li>Hit 50,000+ views</li>
              <li>Submit your video link and UPI ID</li>
              <li>Get ₹500 credited to your account</li>
            </ul>
          </div>

          {/* Submission Form */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Submit Your Demo</h2>

            {submitted ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Submission Received!</h3>
                <p className="text-slate-400">
                  We'll verify your video and process payment within 48 hours.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Video Title *
                  </label>
                  <input
                    type="text"
                    value={submission.title}
                    onChange={e => setSubmission({ ...submission, title: e.target.value })}
                    placeholder="e.g., RegenBrowser AI Resume Fixer Demo"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Video URL *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={submission.platform}
                      onChange={e =>
                        setSubmission({
                          ...submission,
                          platform: e.target.value as any,
                        })
                      }
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="x">X (Twitter)</option>
                      <option value="tiktok">TikTok</option>
                      <option value="reels">Instagram Reels</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="url"
                      value={submission.videoUrl}
                      onChange={e => setSubmission({ ...submission, videoUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {submission.videoUrl && (
                      <button
                        onClick={verifyViews}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                      >
                        Verify Views
                      </button>
                    )}
                  </div>
                  {submission.views > 0 && (
                    <p className="mt-2 text-sm text-emerald-400 flex items-center gap-1">
                      <Eye size={14} />
                      {submission.views.toLocaleString()} views verified
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={submission.description}
                    onChange={e => setSubmission({ ...submission, description: e.target.value })}
                    placeholder="Brief description of what your video demonstrates..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    UPI ID (for payment) *
                  </label>
                  <input
                    type="text"
                    value={submission.upiId}
                    onChange={e => setSubmission({ ...submission, upiId: e.target.value })}
                    placeholder="yourname@upi or phone@paytm"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Payments are processed via UPI within 48 hours of verification
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || submission.views < 50000}
                  className="w-full px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <DollarSign size={18} />
                      Submit for Bounty
                    </>
                  )}
                </button>

                {submission.views > 0 && submission.views < 50000 && (
                  <p className="text-sm text-amber-400 text-center">
                    Need {50000 - submission.views} more views to qualify
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-6">
          {/* Bounty Stats */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp size={18} />
              Bounty Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Paid</span>
                <span className="text-white font-semibold">
                  ₹{leaderboard.reduce((sum, c) => sum + c.totalEarned, 0).toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Creators</span>
                <span className="text-white font-semibold">{leaderboard.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Views</span>
                <span className="text-white font-semibold">
                  {(() => {
                    const total = leaderboard.reduce((sum, c) => sum + c.totalViews, 0);
                    return total >= 1000000
                      ? `${(total / 1000000).toFixed(1)}M+`
                      : total >= 1000
                        ? `${(total / 1000).toFixed(0)}K+`
                        : total || '0';
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Users size={18} />
              Top Creators
            </h3>
            <div className="space-y-2">
              {leaderboardLoading ? (
                <div className="text-center py-4 text-slate-400">Loading...</div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-4 text-slate-400">No creators yet</div>
              ) : (
                leaderboard.map(creator => (
                  <div
                    key={creator.rank}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold">#{creator.rank}</span>
                      <span className="text-white">{creator.userName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">
                        {creator.totalViews >= 1000000
                          ? `${(creator.totalViews / 1000000).toFixed(1)}M`
                          : creator.totalViews >= 1000
                            ? `${(creator.totalViews / 1000).toFixed(1)}K`
                            : creator.totalViews}{' '}
                        views
                      </div>
                      <div className="text-sm text-emerald-400">
                        ₹{creator.totalEarned.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="font-semibold text-white mb-2">Tips for Viral Demos</h3>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Show a clear problem being solved</li>
              <li>Keep it under 60 seconds</li>
              <li>Use catchy titles and thumbnails</li>
              <li>Post during peak hours (evening)</li>
              <li>Share in relevant communities</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
