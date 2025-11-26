/**
 * Bounty Admin Dashboard
 * Admin interface for managing bounty submissions, verifying views, and processing payouts
 */

import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, Clock, DollarSign, Eye, Video, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLeaderboard, verifyVideoViews } from '../../services/bountyService';

interface BountySubmission {
  id: string;
  title: string;
  videoUrl: string;
  platform: 'youtube' | 'x' | 'tiktok' | 'reels' | 'other';
  userName: string;
  upiId: string;
  views: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submittedAt: number;
  description?: string;
}

export function BountyAdminDashboard() {
  const [submissions, setSubmissions] = useState<BountySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const leaderboard = await getLeaderboard();
      // Convert leaderboard entries to submission format
      const allSubmissions: BountySubmission[] = leaderboard.flatMap(entry =>
        entry.submissions.map(sub => ({
          id: sub.id,
          title: sub.title || 'Untitled',
          videoUrl: sub.videoUrl,
          platform: sub.platform,
          userName: entry.userName,
          upiId: sub.upiId || '',
          views: sub.views || 0,
          status: sub.status || 'pending',
          submittedAt: sub.submittedAt || Date.now(),
          description: sub.description,
        }))
      );
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('[AdminDashboard] Failed to load submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (submissionId: string) => {
    try {
      toast.loading('Verifying views...');
      const result = await verifyVideoViews(submissionId);
      toast.dismiss();
      if (result.verified) {
        toast.success(`Views verified: ${result.views}`);
        await loadSubmissions();
      } else {
        toast.error('Verification failed');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to verify views');
      console.error('[AdminDashboard] Verification error:', error);
    }
  };

  const handleApprove = async (_submissionId: string) => {
    // TODO: Implement approve endpoint
    toast.success('Submission approved');
    await loadSubmissions();
  };

  const handleReject = async (_submissionId: string) => {
    // TODO: Implement reject endpoint
    toast.success('Submission rejected');
    await loadSubmissions();
  };

  const handlePayout = async (_submissionId: string) => {
    // TODO: Implement payout endpoint
    toast.success('Payout processed');
    await loadSubmissions();
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch =
      searchQuery === '' ||
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.videoUrl.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    paid: submissions.filter(s => s.status === 'paid').length,
    totalViews: submissions.reduce((sum, s) => sum + s.views, 0),
    totalEarnings: submissions
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + Math.floor(s.views / 10000) * 10000, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Bounty Admin Dashboard</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm text-slate-400 mb-1">Total Submissions</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm text-slate-400 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm text-slate-400 mb-1">Total Views</div>
            <div className="text-2xl font-bold text-green-400">
              {(stats.totalViews / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm text-slate-400 mb-1">Total Payouts</div>
            <div className="text-2xl font-bold text-emerald-400">₹{stats.totalEarnings}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by title, user, or URL..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected', 'paid'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Earnings
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map(submission => {
                    const earnings = Math.floor(submission.views / 10000) * 10000;
                    const statusColors = {
                      pending: 'bg-amber-500/20 text-amber-300',
                      approved: 'bg-green-500/20 text-green-300',
                      rejected: 'bg-red-500/20 text-red-300',
                      paid: 'bg-blue-500/20 text-blue-300',
                    };

                    return (
                      <tr key={submission.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                              statusColors[submission.status] || 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {submission.status === 'pending' && <Clock size={12} />}
                            {submission.status === 'approved' && <CheckCircle2 size={12} />}
                            {submission.status === 'rejected' && <XCircle size={12} />}
                            {submission.status === 'paid' && <DollarSign size={12} />}
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{submission.title}</div>
                          {submission.description && (
                            <div className="text-xs text-slate-400 mt-1 truncate max-w-xs">
                              {submission.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{submission.userName}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 uppercase">
                          {submission.platform}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-slate-300">
                            <Eye size={14} />
                            {submission.views.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-400">
                          ₹{earnings.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(submission.videoUrl, '_blank')}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                              title="View video"
                            >
                              <Video size={16} />
                            </button>
                            {submission.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleVerify(submission.id)}
                                  className="p-1.5 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300"
                                  title="Verify views"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => handleApprove(submission.id)}
                                  className="px-2 py-1 rounded text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(submission.id)}
                                  className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {submission.status === 'approved' && (
                              <button
                                onClick={() => handlePayout(submission.id)}
                                className="px-2 py-1 rounded text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Process Payout
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
