"use client";

import { useState, useMemo, useCallback } from "react";
import { TranscriptsActionBar } from "@/components/ItemActionBar/TranscriptsActionBar";
import { TranscriptsStatusTabs } from "@/components/StatusTabs/TranscriptsStatusTabs";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { TranscriptView } from "@/types/database";
import { TranscriptsDataTable } from "./TranscriptsDataTable";
import TranscriptInputModal from "@/app/transcripts/components/TranscriptInputModal";
import TranscriptModal from "@/app/transcripts/components/TranscriptModal";
import { 
  useCreateTranscript, 
  useUpdateTranscript, 
  useBulkUpdateTranscripts 
} from "@/app/transcripts/hooks/useTranscriptQueries";
import { SmartSelection } from "@/components/SmartSelection";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";

interface TranscriptsViewProps {
  transcripts: TranscriptView[];
  isLoading: boolean;
}

export default function TranscriptsView({ transcripts, isLoading }: TranscriptsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  
  // Mutations
  const createTranscriptMutation = useCreateTranscript();
  const updateTranscriptMutation = useUpdateTranscript();
  const bulkUpdateMutation = useBulkUpdateTranscripts();
  
  // Local UI state
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [showInputModal, setShowInputModal] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptView | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");

  // Parse sorting
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"];

  // Client-side filtering
  const filteredTranscripts = useMemo(() => {
    let filtered = [...transcripts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (transcript) =>
          transcript.title.toLowerCase().includes(query) ||
          transcript.rawContent.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    switch (activeFilter) {
      case "raw":
        filtered = filtered.filter((t) => t.status === "raw");
        break;
      case "cleaned":
        filtered = filtered.filter((t) => t.status === "cleaned");
        break;
      case "processing":
        filtered = filtered.filter((t) => t.status === "processing");
        break;
      case "completed":
        filtered = filtered.filter((t) =>
          ["insights_generated", "posts_created"].includes(t.status)
        );
        break;
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof TranscriptView];
      let bVal: any = b[sortField as keyof TranscriptView];

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [transcripts, activeFilter, searchQuery, sortField, sortOrder]);

  // Handler for individual actions
  const handleAction = useCallback(async (action: string, transcript: TranscriptView) => {
    try {
      if (action === "view") {
        setSelectedTranscript(transcript);
        setModalMode("view");
        setShowTranscriptModal(true);
      } else if (action === "edit") {
        setSelectedTranscript(transcript);
        setModalMode("edit");
        setShowTranscriptModal(true);
      } else if (action === "clean") {
        updateTranscriptMutation.mutate({
          id: transcript.id,
          status: 'processing',
        });

        const response = await apiClient.post(`/api/transcripts/${transcript.id}/clean`, {});
        if (!response.success) {
          throw new Error(response.error || 'Failed to clean transcript');
        }
        toast.success('Transcript cleaning started');
      } else if (action === "process") {
        updateTranscriptMutation.mutate({
          id: transcript.id,
          status: 'processing',
        });

        const response = await apiClient.post(`/api/transcripts/${transcript.id}/process`, {});
        if (!response.success) {
          throw new Error(response.error || 'Failed to process transcript');
        }
        toast.success('Insight extraction started');
      } else if (action === "generate_posts") {
        const response = await apiClient.post(`/api/transcripts/${transcript.id}/generate-posts`, {});
        if (!response.success) {
          throw new Error(response.error || 'Failed to generate posts');
        }
        toast.success('Post generation started');
      } else if (action === "delete") {
        const confirmed = await confirm({
          title: "Delete Transcript",
          description: `Are you sure you want to delete "${transcript.title}"? This action cannot be undone.`,
          confirmText: "Delete",
          variant: "destructive",
        });

        if (confirmed) {
          const response = await apiClient.delete(`/api/transcripts/${transcript.id}`);
          if (!response.success) {
            throw new Error(response.error || 'Failed to delete transcript');
          }
          toast.success('Transcript deleted');
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} transcript:`, error);
      toast.error(`Failed to ${action} transcript`);
    }
  }, [updateTranscriptMutation, toast, confirm]);

  // Handler for bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedTranscripts.length === 0) return;
    
    bulkUpdateMutation.mutate({
      action,
      transcriptIds: selectedTranscripts
    }, {
      onSuccess: () => {
        setSelectedTranscripts([]);
        toast.success(`Successfully ${action}ed ${selectedTranscripts.length} transcripts`);
      },
      onError: () => {
        toast.error(`Failed to ${action} transcripts`);
      }
    });
  }, [selectedTranscripts, bulkUpdateMutation, toast]);

  // Selection handlers
  const handleSelect = useCallback((id: string, selected: boolean) => {
    if (selected) {
      setSelectedTranscripts(prev => [...prev, id]);
    } else {
      setSelectedTranscripts(prev => prev.filter(selectedId => selectedId !== id));
    }
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedTranscripts(transcripts.map(t => t.id));
    } else {
      setSelectedTranscripts([]);
    }
  }, [transcripts]);

  // Smart selection handlers
  const handleSelectFiltered = () => {
    setSelectedTranscripts(filteredTranscripts.map(t => t.id));
  };

  const handleSelectByStatus = (status: string) => {
    const statusTranscripts = transcripts.filter(t => t.status === status);
    setSelectedTranscripts(statusTranscripts.map(t => t.id));
  };

  const handleInvertSelection = () => {
    const currentSelected = new Set(selectedTranscripts);
    const inverted = transcripts
      .filter(t => !currentSelected.has(t.id))
      .map(t => t.id);
    setSelectedTranscripts(inverted);
  };

  const handleSelectDateRange = (start: Date, end: Date) => {
    const rangeTranscripts = transcripts.filter(t => {
      const date = new Date(t.createdAt);
      return date >= start && date <= end;
    });
    setSelectedTranscripts(rangeTranscripts.map(t => t.id));
  };

  // Modal handlers
  const handleSaveTranscript = useCallback((updatedTranscript: TranscriptView) => {
    updateTranscriptMutation.mutate({
      id: updatedTranscript.id,
      title: updatedTranscript.title,
      rawContent: updatedTranscript.rawContent,
      cleanedContent: updatedTranscript.cleanedContent,
    }, {
      onSuccess: () => {
        setShowTranscriptModal(false);
        setSelectedTranscript(null);
        toast.success('Transcript updated');
      }
    });
  }, [updateTranscriptMutation, toast]);

  const handleInputTranscript = useCallback((formData: {
    title: string;
    content: string;
    fileName?: string;
  }) => {
    createTranscriptMutation.mutate({
      title: formData.title,
      rawContent: formData.content,
      sourceType: formData.fileName ? "upload" : "manual",
      fileName: formData.fileName,
      metadata: formData.fileName ? { originalFileName: formData.fileName } : undefined,
    }, {
      onSuccess: () => {
        setShowInputModal(false);
        toast.success('Transcript created');
      }
    });
  }, [createTranscriptMutation, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading transcripts...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <TranscriptsActionBar
        onAddTranscript={() => setShowInputModal(true)}
        selectedTranscripts={selectedTranscripts}
        onBulkAction={handleBulkAction}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <SmartSelection
          totalItems={transcripts.length}
          selectedCount={selectedTranscripts.length}
          filteredCount={filteredTranscripts.length}
          onSelectAll={handleSelectAll}
          onSelectFiltered={handleSelectFiltered}
          onSelectByStatus={handleSelectByStatus}
          onInvertSelection={handleInvertSelection}
          onSelectDateRange={handleSelectDateRange}
          statuses={["raw", "cleaned", "processing", "insights_generated"]}
        />
      </TranscriptsActionBar>

      {/* Status Tabs */}
      <TranscriptsStatusTabs
        transcripts={transcripts}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Data Table or Empty State */}
      {filteredTranscripts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? "No matching transcripts" : "No transcripts found"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? "Try adjusting your search terms or filters"
              : "Get started by adding your first transcript"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowInputModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transcript
            </Button>
          )}
        </div>
      ) : (
        <TranscriptsDataTable
          transcripts={filteredTranscripts}
          selectedTranscripts={selectedTranscripts}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onAction={handleAction}
        />
      )}

      {/* Modals */}
      <TranscriptInputModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        onSubmit={handleInputTranscript}
      />

      <TranscriptModal
        transcript={selectedTranscript}
        isOpen={showTranscriptModal}
        onClose={() => {
          setShowTranscriptModal(false);
          setSelectedTranscript(null);
        }}
        onSave={handleSaveTranscript}
        initialMode={modalMode}
      />

      <ConfirmationDialog {...confirmationProps} />
    </div>
  );
}