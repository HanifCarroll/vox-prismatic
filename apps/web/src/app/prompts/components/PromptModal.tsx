"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Check,
  Clock,
  Save,
  Variable,
  Edit3,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateTimeDisplay } from "@/components/date";
import { useUpdatePrompt } from "@/app/prompts/hooks/usePromptQueries";

interface PromptData {
  name: string;
  content: string;
  variables?: string[];
  title: string;
  description: string;
  lastModified: string;
  exists: boolean;
  size: number;
}

interface PromptModalProps {
  promptName: string | null;
  promptData: PromptData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PromptModal({
  promptName,
  promptData: initialPromptData,
  isOpen,
  onClose,
  onUpdate,
}: PromptModalProps) {
  const [promptData, setPromptData] = useState<PromptData | null>(initialPromptData);
  const [editedContent, setEditedContent] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const updatePromptMutation = useUpdatePrompt();

  // Update local state when props change
  useEffect(() => {
    if (isOpen && initialPromptData) {
      setPromptData(initialPromptData);
      setEditedContent(initialPromptData.content || "");
      setIsEditMode(false);
    } else if (!isOpen) {
      setPromptData(null);
      setEditedContent("");
      setIsEditMode(false);
      setHasChanges(false);
      setSaveSuccess(false);
    }
  }, [isOpen, initialPromptData]);

  // Track changes
  useEffect(() => {
    if (promptData && promptData.content) {
      setHasChanges(editedContent !== promptData.content);
    }
  }, [editedContent, promptData]);

  const extractVariables = useCallback((content: string | undefined | null): string[] => {
    if (!content || typeof content !== 'string') return [];
    const matches = content.match(/{{(\w+)}}/g);
    if (!matches) return [];
    return [...new Set(matches.map((match) => match.replace(/[{}]/g, "")))];
  }, []);

  const handleSave = async () => {
    if (!hasChanges || !promptName) return;

    try {
      await updatePromptMutation.mutateAsync({
        name: promptName,
        content: editedContent,
      });

      setSaveSuccess(true);
      setHasChanges(false);
      if (promptData) {
        setPromptData({
          ...promptData,
          content: editedContent,
          variables: extractVariables(editedContent),
        });
      }
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditMode(false);
      }, 2000);
      onUpdate();
    } catch (error) {
      console.error("Failed to save prompt:", error);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }
    setIsEditMode(false);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmed) return;
    }
    setEditedContent(promptData?.content || "");
    setHasChanges(false);
    setIsEditMode(false);
  };

  const currentVariables = extractVariables(editedContent);
  const addedVariables = currentVariables.filter(
    (v) => !promptData?.variables?.includes(v)
  );
  const removedVariables =
    promptData?.variables?.filter((v) => !currentVariables.includes(v)) || [];

  // Get prompt category for visual distinction
  const getPromptCategory = (name: string): { label: string; color: string } => {
    if (name.includes("transcript"))
      return {
        label: "Processing",
        color: "bg-blue-100 text-blue-700",
      };
    if (name.includes("insight"))
      return {
        label: "Analysis",
        color: "bg-purple-100 text-purple-700",
      };
    if (name.includes("post"))
      return {
        label: "Generation",
        color: "bg-green-100 text-green-700",
      };
    return {
      label: "General",
      color: "bg-gray-100 text-gray-700",
    };
  };

  const category = promptName ? getPromptCategory(promptName) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col mx-2 sm:mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">
                {isEditMode ? 'Edit Template' : promptData?.title || promptName || "Loading..."}
              </DialogTitle>
              {category && (
                <Badge 
                  variant="outline"
                  className={`${category.color} border-none`}
                >
                  {category.label}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription>
            {isEditMode 
              ? 'Modify the prompt template below. Use {{VARIABLE_NAME}} syntax for variables.'
              : promptData?.description || 'View and manage this prompt template'
            }
          </DialogDescription>
          {promptData?.lastModified && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <Clock className="h-3 w-3" />
              Last modified: <DateTimeDisplay date={promptData.lastModified} />
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 p-1">
          {!promptData ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500">No prompt data available</div>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {updatePromptMutation.isError && (
                <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {updatePromptMutation.error?.message || "Failed to save prompt"}
                </div>
              )}

              {/* Main Content Area */}
              <div className="px-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Content
                </label>
                {isEditMode ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full min-h-[400px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                    placeholder="Enter your prompt template here..."
                    spellCheck={false}
                    disabled={updatePromptMutation.isPending}
                    rows={20}
                  />
                ) : (
                  <div className="w-full min-h-[400px] p-4 bg-gray-50 rounded-lg border">
                    <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {promptData?.content || "No content available"}
                    </pre>
                  </div>
                )}
              </div>

              {/* Variables Section */}
              <div className="px-4 pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Variable className="h-4 w-4 inline mr-1" />
                  Variables
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Variables */}
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Current Variables
                    </h4>
                    {currentVariables.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentVariables.map((variable) => (
                          <code
                            key={variable}
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono ${
                              addedVariables.includes(variable)
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}
                          >
                            {`{{${variable}}}`}
                          </code>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No variables defined</p>
                    )}
                  </div>

                  {/* Common Variables Reference */}
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Common Variables
                    </h4>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        {'{{TRANSCRIPT_CONTENT}}'}
                      </code>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        {'{{INSIGHT_TITLE}}'}
                      </code>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        {'{{POST_TYPE}}'}
                      </code>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        {'{{SUMMARY}}'}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Warning for removed variables */}
                {isEditMode && removedVariables.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-amber-800">
                        Warning: {removedVariables.length} variable{removedVariables.length > 1 ? 's' : ''} removed
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {removedVariables.map((variable) => (
                          <code key={variable} className="bg-amber-100 px-1 py-0.5 rounded">
                            {`{{${variable}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {promptData && (
          isEditMode ? (
            <DialogFooter className="border-t pt-4">
              <div className="flex justify-between w-full">
                {hasChanges && (
                  <span className="text-sm text-amber-600 self-center">
                    Unsaved changes
                  </span>
                )}
                {!hasChanges && <div />}
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={updatePromptMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || updatePromptMutation.isPending}
                    className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {updatePromptMutation.isPending ? "Saving..." : "Save Changes"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          ) : (
            <DialogFooter className="border-t pt-4">
              <Button
                onClick={() => setIsEditMode(true)}
                className="w-full sm:w-auto"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
            </DialogFooter>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}