'use client';

import React, { useState } from 'react';
import { InsightView } from './InsightCard';

interface InsightModalProps {
  insight: InsightView | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedInsight: Partial<InsightView>) => Promise<void>;
}

const postTypeOptions = [
  { value: 'Problem', label: '⚠️ Problem' },
  { value: 'Proof', label: '📊 Proof' },
  { value: 'Framework', label: '🏗️ Framework' },
  { value: 'Contrarian Take', label: '🎯 Contrarian Take' },
  { value: 'Mental Model', label: '🧠 Mental Model' }
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' }
];

export default function InsightModal({ insight, isOpen, onClose, onSave }: InsightModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    summary: '',
    category: '',
    postType: 'Problem' as InsightView['postType'],
    status: 'needs_review' as InsightView['status']
  });

  // Initialize edit data when insight changes
  React.useEffect(() => {
    if (insight) {
      setEditData({
        title: insight.title,
        summary: insight.summary,
        category: insight.category,
        postType: insight.postType,
        status: insight.status
      });
    }
  }, [insight]);

  if (!isOpen || !insight) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title: editData.title,
        summary: editData.summary,
        category: editData.category,
        postType: editData.postType,
        status: editData.status
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save insight:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      title: insight.title,
      summary: insight.summary,
      category: insight.category,
      postType: insight.postType,
      status: insight.status
    });
    setIsEditing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Insight' : 'Insight Details'}
              </h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                insight.status === 'approved' ? 'bg-green-100 text-green-800' :
                insight.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' :
                insight.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {insight.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
              )}
            </div>

            {/* Metadata Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Post Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post Type
                </label>
                {isEditing ? (
                  <select
                    value={editData.postType}
                    onChange={(e) => setEditData(prev => ({ ...prev, postType: e.target.value as InsightView['postType'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {postTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 border rounded-md text-sm font-medium bg-purple-50 text-purple-700 border-purple-200">
                    {postTypeOptions.find(opt => opt.value === insight.postType)?.label || insight.postType}
                  </span>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.category}
                    onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm font-medium">
                    {insight.category}
                  </span>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                {isEditing ? (
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as InsightView['status'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                    {insight.status.replace('_', ' ').charAt(0).toUpperCase() + insight.status.replace('_', ' ').slice(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Scores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AI Scores
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${getScoreColor(insight.scores.total)}`}>
                    {insight.scores.total}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">Total</div>
                </div>
                <div className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.scores.urgency)}`}>
                    {insight.scores.urgency}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Urgency</div>
                </div>
                <div className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.scores.relatability)}`}>
                    {insight.scores.relatability}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Relatability</div>
                </div>
                <div className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.scores.specificity)}`}>
                    {insight.scores.specificity}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Specificity</div>
                </div>
                <div className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.scores.authority)}`}>
                    {insight.scores.authority}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Authority</div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summary
              </label>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={editData.summary}
                  onChange={(e) => setEditData(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">{insight.summary}</p>
                </div>
              )}
            </div>

            {/* Verbatim Quote */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verbatim Quote
              </label>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-200">
                <p className="text-gray-700 italic leading-relaxed">
                  "{insight.verbatimQuote}"
                </p>
              </div>
            </div>

            {/* Source Transcript */}
            {insight.transcriptTitle && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Transcript
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    {insight.transcriptTitle}
                  </button>
                </div>
              </div>
            )}

            {/* Processing Metadata */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span>
                  <div>{formatDate(insight.createdAt)}</div>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <div>{formatDate(insight.updatedAt)}</div>
                </div>
                {insight.processingDurationMs && (
                  <div>
                    <span className="font-medium">Processing:</span>
                    <div>{Math.round(insight.processingDurationMs / 1000)}s</div>
                  </div>
                )}
                {insight.estimatedTokens && (
                  <div>
                    <span className="font-medium">Est. Tokens:</span>
                    <div>~{insight.estimatedTokens.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editData.title.trim() || !editData.summary.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}