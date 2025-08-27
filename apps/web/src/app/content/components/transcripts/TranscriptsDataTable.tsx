"use client";

import { useMemo, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { getColumns } from "./columns";
import type { TranscriptView } from "@/types/database";

interface TranscriptsDataTableProps {
  transcripts: TranscriptView[];
  selectedTranscripts: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onAction: (action: string, transcript: TranscriptView) => void;
  loadingStates?: Record<string, boolean>;
}

export function TranscriptsDataTable({
  transcripts,
  selectedTranscripts,
  onSelect,
  onSelectAll,
  onAction,
  loadingStates = {},
}: TranscriptsDataTableProps) {
  // Memoize columns to prevent recreation on every render
  const columns = useMemo(() => getColumns(onAction, loadingStates), [onAction, loadingStates]);

  // Memoize the row selection handler to prevent infinite re-renders
  const handleRowSelectionChange = useCallback((selectedRows: TranscriptView[]) => {
    // Clear current selection
    const currentSelected = new Set(selectedTranscripts);
    transcripts.forEach(transcript => {
      if (currentSelected.has(transcript.id) && !selectedRows.some(row => row.id === transcript.id)) {
        onSelect(transcript.id, false);
      }
    });

    // Add new selections
    selectedRows.forEach(row => {
      if (!currentSelected.has(row.id)) {
        onSelect(row.id, true);
      }
    });
  }, [selectedTranscripts, transcripts, onSelect]);

  // Memoize transformed data to prevent unnecessary recalculations
  const transcriptsWithSelection = useMemo(() => 
    transcripts.map(transcript => ({
      ...transcript,
      isSelected: selectedTranscripts.includes(transcript.id)
    })), [transcripts, selectedTranscripts]
  );

  return (
    <DataTable
      columns={columns}
      data={transcriptsWithSelection}
      onRowSelectionChange={handleRowSelectionChange}
      hideColumnSelector={true}
    />
  );
}