/**
 * Resume Fixer Component
 * AI-powered resume optimization and reformatting
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  RefreshCw,
  Sparkles,
  Briefcase,
  TrendingUp,
  FileCheck,
  X,
} from 'lucide-react';
import {
  parseResumeFile,
  analyzeResume,
  type ResumeData,
  type ResumeIssues,
} from '../../services/resumeService';
import {
  reformatResume,
  matchToJobDescription,
  type ReformatResult,
  type JobMatchResult,
} from '../../agents/resumeAgent';
import { exportResearchToPDF, downloadPDF } from '../../utils/pdfExport';
import { toast } from '../../utils/toast';

export function ResumeFixer() {
  const [, setUploadedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [issues, setIssues] = useState<ResumeIssues | null>(null);
  const [reformattedResume, setReformattedResume] = useState<ReformatResult | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobMatch, setJobMatch] = useState<JobMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.docx'))
    ) {
      await handleFileUpload(file);
    } else {
      toast.error('Please upload a PDF or DOCX file');
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      toast.loading('Parsing resume...');
      const data = await parseResumeFile(file);
      setUploadedFile(file);
      setResumeData(data);

      // Analyze resume
      const analyzed = analyzeResume(data);
      setIssues(analyzed);

      toast.success('Resume parsed successfully!');
    } catch (error) {
      console.error('[ResumeFixer] Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse resume');
    } finally {
      setLoading(false);
    }
  };

  const handleReformat = async () => {
    if (!resumeData) return;

    setLoading(true);
    try {
      toast.loading('Reformatting resume with AI...');
      const format = issues?.format === 'unknown' ? 'ats-friendly' : issues?.format;
      const result = await reformatResume(resumeData, {
        format: format || 'ats-friendly',
        jobDescription: jobDescription || undefined,
        includeKeywords: jobMatch?.missingKeywords.slice(0, 10),
      });

      setReformattedResume(result);
      setShowComparison(true);
      toast.success('Resume reformatted successfully!');
    } catch (error) {
      console.error('[ResumeFixer] Reformat failed:', error);
      toast.error('Failed to reformat resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchJob = async () => {
    if (!resumeData || !jobDescription.trim()) return;

    setLoading(true);
    try {
      toast.loading('Analyzing job match...');
      const result = await matchToJobDescription(resumeData, jobDescription);
      setJobMatch(result);

      if (result.matchScore >= 70) {
        toast.success(`Match score: ${result.matchScore}% - Great match!`);
      } else if (result.matchScore >= 50) {
        toast.success(`Match score: ${result.matchScore}% - Good, but could improve`);
      } else {
        toast.success(`Match score: ${result.matchScore}% - Needs improvement`);
      }
    } catch (error) {
      console.error('[ResumeFixer] Job match failed:', error);
      toast.error('Failed to analyze job match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!reformattedResume || !resumeData) return;

    try {
      toast.loading('Exporting resume...');
      const pdfBlob = await exportResearchToPDF({
        query: 'Resume Optimization',
        summary: reformattedResume.formattedText,
        citations: [],
        sources: [],
      });
      await downloadPDF(pdfBlob, `resume-optimized-${Date.now()}.pdf`);
      toast.success('Resume exported successfully!');
    } catch (error) {
      console.error('[ResumeFixer] Export failed:', error);
      toast.error('Failed to export resume');
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setResumeData(null);
    setIssues(null);
    setReformattedResume(null);
    setJobDescription('');
    setJobMatch(null);
    setShowComparison(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">AI Resume Fixer</h1>
          </div>
          <p className="text-slate-400">
            Upload your resume and get AI-powered optimization, formatting, and job matching
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            {!resumeData ? (
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-12 text-center transition ${
                  isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-white mb-2">Drop your resume here</h3>
                <p className="text-sm text-slate-400 mb-4">PDF or DOCX format</p>
                <label className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer text-white font-medium">
                  Select File
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            ) : (
              <>
                {/* Uploaded File Info */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-400" />
                      <div>
                        <div className="font-semibold text-white">
                          {resumeData.metadata.fileName}
                        </div>
                        <div className="text-sm text-slate-400">
                          {resumeData.metadata.wordCount} words •{' '}
                          {resumeData.metadata.fileType.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleReset}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Issues Display */}
                {issues && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <FileCheck className="w-5 h-5 text-amber-400" />
                      <h3 className="font-semibold text-white">Resume Analysis</h3>
                      <span
                        className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                          issues.format === 'ats-friendly'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {issues.format.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>

                    {issues.issues.length > 0 ? (
                      <div className="space-y-2">
                        {issues.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              issue.severity === 'error'
                                ? 'bg-red-500/10 border-red-500/30'
                                : issue.severity === 'warning'
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : 'bg-blue-500/10 border-blue-500/30'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle
                                className={`w-4 h-4 mt-0.5 ${
                                  issue.severity === 'error'
                                    ? 'text-red-400'
                                    : issue.severity === 'warning'
                                      ? 'text-amber-400'
                                      : 'text-blue-400'
                                }`}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">
                                  {issue.message}
                                </div>
                                {issue.suggestion && (
                                  <div className="text-xs text-slate-400 mt-1">
                                    {issue.suggestion}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 size={18} />
                        <span className="text-sm">No major issues detected!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Job Description Matching */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">Job Description Matching</h3>
                  </div>
                  <textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste job description here for keyword matching and tailoring..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleMatchJob}
                      disabled={!jobDescription.trim() || loading}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium text-sm"
                    >
                      Analyze Match
                    </button>
                    {jobMatch && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">
                          {jobMatch.matchScore}% Match
                        </span>
                      </div>
                    )}
                  </div>

                  {jobMatch && (
                    <div className="mt-4 space-y-2">
                      {jobMatch.matchedKeywords.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Matched Keywords:</div>
                          <div className="flex flex-wrap gap-1">
                            {jobMatch.matchedKeywords.slice(0, 10).map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {jobMatch.missingKeywords.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Missing Keywords:</div>
                          <div className="flex flex-wrap gap-1">
                            {jobMatch.missingKeywords.slice(0, 10).map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {jobMatch.suggestions.length > 0 && (
                        <div className="pt-2 border-t border-slate-700">
                          <div className="text-xs font-medium text-slate-300 mb-2">
                            Suggestions:
                          </div>
                          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            {jobMatch.suggestions.map((suggestion, idx) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reformat Button */}
                <button
                  onClick={handleReformat}
                  disabled={loading}
                  className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Optimizing Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Optimize Resume with AI
                    </>
                  )}
                </button>

                {/* Before/After Comparison */}
                <AnimatePresence>
                  {showComparison && reformattedResume && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white">Optimization Results</h3>
                        <button
                          onClick={handleExport}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-2"
                        >
                          <Download size={16} />
                          Export PDF
                        </button>
                      </div>

                      {/* Improvements */}
                      {reformattedResume.improvements.length > 0 && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <div className="text-sm font-medium text-emerald-400 mb-2">
                            Improvements:
                          </div>
                          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                            {reformattedResume.improvements.map((imp, idx) => (
                              <li key={idx}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Preview */}
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-slate-400 mb-2">Optimized Resume:</div>
                          <div className="p-4 rounded-lg bg-slate-800 text-sm text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                            {reformattedResume.formattedText}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Right Column - Stats & Tips */}
          <div className="space-y-6">
            {/* Stats Card */}
            {resumeData && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="font-semibold text-white mb-3">Resume Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Word Count</span>
                    <span className="text-white font-medium">{resumeData.metadata.wordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sections</span>
                    <span className="text-white font-medium">{resumeData.sections.length}</span>
                  </div>
                  {jobMatch && (
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Job Match</span>
                      <span className="text-white font-medium">{jobMatch.matchScore}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tips Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="font-semibold text-white mb-3">Tips for Better Resumes</h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                <li>Use ATS-friendly formatting</li>
                <li>Include quantifiable achievements</li>
                <li>Tailor keywords to job description</li>
                <li>Keep length to 1-2 pages</li>
                <li>Use action verbs</li>
                <li>Highlight relevant skills</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
