"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, BarChart3, Building2, Target, Brain, FileText, Edit, Save, X, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { DateTimeDisplay } from "@/components/date";
import { insightsAPI } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { getErrorMessage } from "@/app/content/hooks/use-server-actions";
import { useRelatedDataPrefetch } from "@/hooks/useRelatedDataPrefetch";
import type { InsightView } from "@/types";
import { InsightStatus, Platform, EntityType, ContentView } from "@content-creation/types";
import { JobProgressIndicator } from "@/components/workflow";

interface InsightModalProps {
  insightId?: string;
  insight?: InsightView | null; // Optional: can still pass data directly
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  initialMode?: "view" | "edit";
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

export default function InsightModal({
  insightId,
  insight: externalInsight,
  isOpen,
  onClose,
  onUpdate,
  initialMode = "view",
}: InsightModalProps) {
  const [insight, setInsight] = useState<InsightView | null>(externalInsight || null);
  const [isLoading, setIsLoading] = useState(!externalInsight);
  const [isEditing, setIsEditing] = useState(initialMode === "edit");
  const [editedData, setEditedData] = useState({
    title: "",
    summary: "",
    category: "",
    postType: "Problem" as InsightView['postType'],
    status: "needs_review" as InsightView['status'],
  });
  const [isSaving, startTransition] = useTransition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const toast = useToast();
  
  // Set up related data prefetching for insights
  const { prefetchWorkflowNext, prefetchRelatedData } = useRelatedDataPrefetch({
    entityType: EntityType.INSIGHT,
    entityId: insightId,
    currentView: ContentView.INSIGHTS,
    autoMode: true,
    respectConnection: true,
    disabled: !isOpen || isLoading,
  });

  // Fetch insight if ID is provided and no external data
  useEffect(() => {
    // Skip if modal is not open or we already have data
    if (!isOpen || !insightId || externalInsight) {
      if (externalInsight && isOpen) {
        setInsight(externalInsight);
        setEditedData({
          title: externalInsight.title,
          summary: externalInsight.summary,
          category: externalInsight.category,
          postType: externalInsight.postType,
          status: externalInsight.status,
        });
      }
      return;
    }
    
    // Prevent multiple fetches for the same ID
    let cancelled = false;
    
    setIsLoading(true);
    insightsAPI.getInsight(insightId).then(result => {
      if (cancelled) return;
      
      if (result.success && result.data) {
        setInsight(result.data);
        setEditedData({
          title: result.data.title,
          summary: result.data.summary,
          category: result.data.category,
          postType: result.data.postType,
          status: result.data.status,
        });
      } else {
        toast.error('Failed to load insight');
        onClose();
      }
      setIsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      toast.error('Failed to load insight');
      setIsLoading(false);
      onClose();
    });
    
    return () => {
      cancelled = true;
    };
  }, [insightId, externalInsight, isOpen]); // Remove unstable dependencies

  const handleSave = async () => {
    if (!insight) return;
    
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('title', editedData.title);
        formData.append('summary', editedData.summary);
        formData.append('category', editedData.category);
        formData.append('postType', editedData.postType);
        formData.append('status', editedData.status);
        
        const result = await insightsAPI.updateInsightFromForm(insight.id, formData);
        
        if (result.success) {
          toast.success('Insight updated successfully');
          setIsEditing(false);
          onUpdate();
          // Update local state with new data
          if (result.data) {
            setInsight(result.data);
          }
        } else {
          toast.error('Failed to update insight');
        }
      } catch (error) {
        toast.error('Failed to save insight');
      }
    });
  };

  const handleCancel = () => {
    if (insight) {
      setEditedData({
        title: insight.title,
        summary: insight.summary,
        category: insight.category,
        postType: insight.postType,
        status: insight.status,
      });
    }
    setIsEditing(false);
  };

  const handleApprove = async () => {
    if (!insight) return;
    
    setIsProcessing(true);
    try {
      const result = await insightsAPI.approveInsight(insight.id);
      if (result.success) {
        toast.success('Insight approved');
        if (result.data) {
          setInsight(result.data);
        }
        onUpdate();
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to approve insight'));
      }
    } catch (error) {
      toast.error('Failed to approve insight');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!insight) return;
    
    setIsProcessing(true);
    try {
      const result = await insightsAPI.rejectInsight(insight.id);
      if (result.success) {
        toast.success('Insight rejected');
        if (result.data) {
          setInsight(result.data);
        }
        onUpdate();
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to reject insight'));
      }
    } catch (error) {
      toast.error('Failed to reject insight');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePosts = async () => {
    if (!insight) return;
    
    setIsProcessing(true);
    try {
      const result = await insightsAPI.generatePostsFromInsight(insight.id, [Platform.LINKEDIN, Platform.X]);
      if (result.success) {
        toast.success('Post generation started');
        // If this is a workflow job, track it
        if (result.data?.type === 'workflow_job' && result.data?.jobId) {
          setActiveJobId(result.data.jobId);
        }
        onUpdate();
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to generate posts'));
      }
    } catch (error) {
      toast.error('Failed to start post generation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJobComplete = () => {
    setActiveJobId(null);
    onUpdate();
    // Refresh insight data
    if (insightId) {
      insightsAPI.getInsight(insightId).then(result => {
        if (result.success && result.data) {
          setInsight(result.data);
        }
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      needs_review: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      archived: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.draft}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          {isLoading ? (
            <>
              <DialogTitle>Loading Insight</DialogTitle>
              <DialogDescription className="sr-only">
                Loading insight details
              </DialogDescription>
            </>
          ) : insight ? (
            <>
              <DialogTitle className="text-xl pr-8">
                {isEditing ? "Edit Insight" : insight.title}
              </DialogTitle>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{insight.category}</span>
                  <span>{insight.postType}</span>
                </div>
                {getStatusBadge(insight.status)}
              </div>
            </>
          ) : (
            <>
              <DialogTitle>No Insight Available</DialogTitle>
              <DialogDescription className="sr-only">
                No insight data could be loaded
              </DialogDescription>
            </>
          )}
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : insight ? (
          <>

            {/* Job Progress Indicator */}
            {activeJobId && (
              <div className="mx-6 mt-4">
                <JobProgressIndicator
                  jobId={activeJobId}
                  title="Generating Posts"
                  compact={false}
                  showControls={true}
                  onComplete={handleJobComplete}
                  onError={handleJobComplete}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={editedData.title}
                      onChange={(e) =>
                        setEditedData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Enter insight title"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Post Type</label>
                      <Select
                        value={editedData.postType}
                        onValueChange={(value) =>
                          setEditedData((prev) => ({
                            ...prev,
                            postType: value as InsightView['postType'],
                          }))
                        }
                        disabled={isSaving}
                      >
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
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Input
                        value={editedData.category}
                        onChange={(e) =>
                          setEditedData((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder="Category"
                        disabled={isSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={editedData.status}
                        onValueChange={(value) =>
                          setEditedData((prev) => ({
                            ...prev,
                            status: value as InsightView['status'],
                          }))
                        }
                        disabled={isSaving}
                      >
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
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Summary</label>
                    <textarea
                      value={editedData.summary}
                      onChange={(e) =>
                        setEditedData((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                      placeholder="Enter insight summary"
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[200px] font-mono text-sm"
                      disabled={isSaving}
                      rows={8}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Scores */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">AI Scores</h3>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${getScoreColor(insight.totalScore)}`}>
                          {insight.totalScore}
                        </div>
                        <div className="mt-2 text-sm font-medium">Total</div>
                      </div>
                      <div className="text-center">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.urgencyScore)}`}>
                          {insight.urgencyScore}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">Urgency</div>
                      </div>
                      <div className="text-center">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.relatabilityScore)}`}>
                          {insight.relatabilityScore}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">Relatability</div>
                      </div>
                      <div className="text-center">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.specificityScore)}`}>
                          {insight.specificityScore}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">Specificity</div>
                      </div>
                      <div className="text-center">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center font-semibold ${getScoreColor(insight.authorityScore)}`}>
                          {insight.authorityScore}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">Authority</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Summary</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 leading-relaxed">{insight.summary}</p>
                    </div>
                  </div>

                  {insight.verbatimQuote && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Verbatim Quote</h3>
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-200">
                        <p className="text-gray-700 italic leading-relaxed">
                          "{insight.verbatimQuote}"
                        </p>
                      </div>
                    </div>
                  )}

                  {insight.transcriptTitle && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Source Transcript</h3>
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <span className="text-blue-600 font-medium">
                          {insight.transcriptTitle}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Created: </span>
                      <DateTimeDisplay date={insight.createdAt} />
                    </div>
                    <div>
                      <span className="font-medium">Updated: </span>
                      <DateTimeDisplay date={insight.updatedAt} />
                    </div>
                    {insight.processingDurationMs && (
                      <div>
                        <span className="font-medium">Processing: </span>
                        {Math.round(insight.processingDurationMs / 1000)}s
                      </div>
                    )}
                    {insight.estimatedTokens && (
                      <div>
                        <span className="font-medium">Est. Tokens: </span>
                        ~{insight.estimatedTokens.toLocaleString()}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  disabled={insight.status === "archived"}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Insight
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No insight data available</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}