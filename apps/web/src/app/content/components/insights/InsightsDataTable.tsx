"use client";

import { DataTable } from "@/components/ui/data-table";
import { getColumns } from "./columns";
import type { InsightView } from "@/types";

interface InsightsDataTableProps {
  insights: InsightView[];
  selectedInsights: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onAction: (action: string, insight: InsightView) => void;
  loadingStates?: Record<string, boolean>;
}

export function InsightsDataTable({
  insights,
  selectedInsights,
  onSelect,
  onSelectAll,
  onAction,
  loadingStates = {},
}: InsightsDataTableProps) {
  const columns = getColumns(onAction, loadingStates);

  const handleRowSelectionChange = (selectedRows: InsightView[]) => {
    // Clear current selection
    const currentSelected = new Set(selectedInsights);
    insights.forEach(insight => {
      if (currentSelected.has(insight.id) && !selectedRows.some(row => row.id === insight.id)) {
        onSelect(insight.id, false);
      }
    });

    // Add new selections
    selectedRows.forEach(row => {
      if (!currentSelected.has(row.id)) {
        onSelect(row.id, true);
      }
    });
  };

  // Transform insights to include selection state for the table
  const insightsWithSelection = insights.map(insight => ({
    ...insight,
    isSelected: selectedInsights.includes(insight.id)
  }));

  return (
    <DataTable
      columns={columns}
      data={insightsWithSelection}
      onRowSelectionChange={handleRowSelectionChange}
    />
  );
}