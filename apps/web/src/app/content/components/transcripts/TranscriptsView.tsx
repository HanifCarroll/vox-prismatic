"use client";

import { useMemo, useCallback } from "react";
import { TranscriptsStatusTabs } from "../status-tabs/TranscriptsStatusTabs";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { TranscriptView } from "@/types/database";
import { TranscriptsDataTable } from "./TranscriptsDataTable";
import TranscriptInputModal from "../modals/TranscriptInputModal";
import TranscriptModal from "../modals/TranscriptModal";
import { 
  useCreateTranscript, 
  useUpdateTranscript, 
  useBulkUpdateTranscripts 
} from "../../hooks/useTranscriptQueries";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";

interface TranscriptsViewProps {
  transcripts: TranscriptView[];
  isLoading: boolean;
  searchQuery: string;
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  statusFilter: string;
  sortBy: string;
  onStatusFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onShowTranscriptInputModal: () => void;
  onShowTranscriptModal: (transcript: TranscriptView, mode: 'view' | 'edit') => void;
}

export default function TranscriptsView({ 
  transcripts, 
  isLoading, 
  searchQuery,
  selectedItems,
  onSelectionChange,
  statusFilter,
  sortBy,
  onStatusFilterChange,
  onSortChange,
  onShowTranscriptInputModal,
  onShowTranscriptModal
}: TranscriptsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  
  // Mutations
  const createTranscriptMutation = useCreateTranscript();
  const updateTranscriptMutation = useUpdateTranscript();
  const bulkUpdateMutation = useBulkUpdateTranscripts();
  
  // No local UI state needed - all managed by ContentClient

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
    if (statusFilter !== "all") {
      switch (statusFilter) {
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
  }, [transcripts, statusFilter, searchQuery, sortField, sortOrder]);

  // Handler for individual actions
  const handleAction = useCallback(async (action: string, transcript: TranscriptView) => {
    try {
      if (action === "view") {
        onShowTranscriptModal(transcript, "view");
      } else if (action === "edit") {
        onShowTranscriptModal(transcript, "edit");
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
  }, [updateTranscriptMutation, toast, confirm, onShowTranscriptModal]);

  // Handler for bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedItems.length === 0) return;
    
    bulkUpdateMutation.mutate({
      action,
      transcriptIds: selectedItems
    }, {
      onSuccess: () => {
        onSelectionChange([]);
        toast.success(`Successfully ${action}ed ${selectedItems.length} transcripts`);
      },
      onError: () => {
        toast.error(`Failed to ${action} transcripts`);
      }
    });
  }, [selectedItems, bulkUpdateMutation, toast, onSelectionChange]);

  // Selection handlers - delegated to parent
  const handleSelect = useCallback((id: string, selected: boolean) => {
    if (selected) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(selectedId => selectedId !== id));
    }
  }, [selectedItems, onSelectionChange]);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      onSelectionChange(transcripts.map(t => t.id));
    } else {
      onSelectionChange([]);
    }
  }, [transcripts, onSelectionChange]);

  // Export bulk action handler for parent
  const exportedBulkActionHandler = useCallback((action: string) => {
    handleBulkAction(action);
  }, [handleBulkAction]);

  // Expose bulk action handler to parent via callback ref or prop
  // This will be handled by the parent component

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
      {/* Status Tabs */}
      <TranscriptsStatusTabs
        transcripts={transcripts}
        activeFilter={statusFilter}
        onFilterChange={onStatusFilterChange}
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
            <Button onClick={onShowTranscriptInputModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transcript
            </Button>
          )}
        </div>
      ) : (
        <TranscriptsDataTable
          transcripts={filteredTranscripts}
          selectedTranscripts={selectedItems}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onAction={handleAction}
        />
      )}

      <ConfirmationDialog {...confirmationProps} />
    </div>
  );
}