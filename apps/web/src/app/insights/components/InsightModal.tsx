'use client';

import React, { useState } from 'react';
import { InsightView } from '@/types';
import { dateUtils } from '@/lib/utils';
import { AlertTriangle, BarChart3, Building2, Target, Brain, FileText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InsightModalProps {
  insight: InsightView | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedInsight: Partial<InsightView>) => Promise<void>;
}

const postTypeOptions = [
  { value: 'Problem', label: 'Problem', icon: AlertTriangle },
  { value: 'Proof', label: 'Proof', icon: BarChart3 },
  { value: 'Framework', label: 'Framework', icon: Building2 },
  { value: 'Contrarian Take', label: 'Contrarian Take', icon: Target },
  { value: 'Mental Model', label: 'Mental Model', icon: Brain }
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

  // Use dateUtils.formatDetailed for modal display

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">
                {isEditing ? 'Edit Insight' : 'Insight Details'}
              </DialogTitle>
              <Badge variant={insight.status === 'approved' ? 'default' : insight.status === 'needs_review' ? 'secondary' : insight.status === 'rejected' ? 'destructive' : 'outline'}>
                {insight.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
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
                  <Select value={editData.postType} onValueChange={(value) => setEditData(prev => ({ ...prev, postType: value as InsightView['postType'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {postTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="gap-2">
                    {postTypeOptions.find(opt => opt.value === insight.postType)?.label || insight.postType}
                  </Badge>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    value={editData.category}
                    onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                  />
                ) : (
                  <Badge variant="secondary">
                    {insight.category}
                  </Badge>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value as InsightView['status'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="default">
                    {insight.status.replace('_', ' ').charAt(0).toUpperCase() + insight.status.replace('_', ' ').slice(1)}
                  </Badge>
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
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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
                  <FileText className="h-5 w-5 text-gray-500" />
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
                  <div>{dateUtils.formatDetailed(insight.createdAt)}</div>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <div>{dateUtils.formatDetailed(insight.updatedAt)}</div>
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
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !editData.title.trim() || !editData.summary.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}