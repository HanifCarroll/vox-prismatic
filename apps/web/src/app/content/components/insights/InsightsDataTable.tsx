"use client";

import { useMemo, useCallback } from "react";
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
  // Memoize columns to prevent recreation on every render
  const columns = useMemo(() => getColumns(onAction, loadingStates), [onAction, loadingStates]);

  // Memoize the row selection handler to prevent infinite re-renders
  const handleRowSelectionChange = useCallback((selectedRows: InsightView[]) => {
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
  }, [selectedInsights, insights, onSelect]);

  // Memoize transformed data to prevent unnecessary recalculations
  const insightsWithSelection = useMemo(() => 
    insights.map(insight => ({
      ...insight,
      isSelected: selectedInsights.includes(insight.id)
    })), [insights, selectedInsights]
  );

  return (
    <DataTable
      columns={columns}
      data={insightsWithSelection}
      onRowSelectionChange={handleRowSelectionChange}
      hideColumnSelector={true}
    />
  );
}