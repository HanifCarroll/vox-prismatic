"use client";

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
  const columns = getColumns(onAction, loadingStates);

  const handleRowSelectionChange = (selectedRows: TranscriptView[]) => {
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
  };

  // Transform transcripts to include selection state for the table
  const transcriptsWithSelection = transcripts.map(transcript => ({
    ...transcript,
    isSelected: selectedTranscripts.includes(transcript.id)
  }));

  return (
    <DataTable
      columns={columns}
      data={transcriptsWithSelection}
      onRowSelectionChange={handleRowSelectionChange}
    />
  );
}