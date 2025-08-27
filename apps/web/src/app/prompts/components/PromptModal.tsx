"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Check,
  Clock,
  Code2,
  FileText,
  Save,
  Variable,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateTimeDisplay } from "@/components/date";

interface PromptData {
  name: string;
  content: string;
  variables: string[];
  title: string;
  description: string;
  lastModified?: string;
}

interface PromptModalProps {
  promptName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PromptModal({
  promptName,
  isOpen,
  onClose,
  onUpdate,
}: PromptModalProps) {
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch prompt content when modal opens
  useEffect(() => {
    if (isOpen && promptName) {
      fetchPromptContent();
    } else {
      // Reset state when modal closes
      setPromptData(null);
      setEditedContent("");
      setHasChanges(false);
      setSaveSuccess(false);
      setError(null);
    }
  }, [isOpen, promptName]);

  // Track changes
  useEffect(() => {
    if (promptData) {
      setHasChanges(editedContent !== promptData.content);
    }
  }, [editedContent, promptData]);

  const fetchPromptContent = async () => {
    if (!promptName) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/prompts/${promptName}`);
      const result = await response.json();
      if (result.success) {
        setPromptData(result.data);
        setEditedContent(result.data.content);
      } else {
        setError(result.error || "Failed to load prompt");
      }
    } catch (error) {
      setError("Failed to fetch prompt content");
      console.error("Failed to fetch prompt:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = useCallback((content: string): string[] => {
    const matches = content.match(/{{(\w+)}}/g);
    if (!matches) return [];
    return [...new Set(matches.map((match) => match.replace(/[{}]/g, "")))];
  }, []);

  const handleSave = async () => {
    if (!hasChanges || !promptName) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/prompts/${promptName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: editedContent }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveSuccess(true);
        setHasChanges(false);
        if (promptData) {
          setPromptData({
            ...promptData,
            content: editedContent,
            variables: extractVariables(editedContent),
          });
        }
        setTimeout(() => setSaveSuccess(false), 3000);
        onUpdate();
      } else {
        setError(result.error || "Failed to save prompt");
      }
    } catch (error) {
      setError("Failed to save prompt");
      console.error("Failed to save prompt:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const currentVariables = extractVariables(editedContent);
  const addedVariables = currentVariables.filter(
    (v) => !promptData?.variables.includes(v)
  );
  const removedVariables =
    promptData?.variables.filter((v) => !currentVariables.includes(v)) || [];

  // Get prompt category for visual distinction
  const getPromptCategory = (name: string): { label: string; color: string } => {
    if (name.includes("transcript"))
      return {
        label: "Processing",
        color: "bg-blue-50 text-blue-700 border-blue-200",
      };
    if (name.includes("insight"))
      return {
        label: "Analysis",
        color: "bg-purple-50 text-purple-700 border-purple-200",
      };
    if (name.includes("post"))
      return {
        label: "Generation",
        color: "bg-green-50 text-green-700 border-green-200",
      };
    return {
      label: "General",
      color: "bg-gray-50 text-gray-700 border-gray-200",
    };
  };

  const category = promptName ? getPromptCategory(promptName) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {promptData?.title || promptName || "Loading..."}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2">
                {category && (
                  <Badge className={`${category.color} border font-medium`}>
                    {category.label}
                  </Badge>
                )}
                {promptData?.lastModified && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <DateTimeDisplay date={promptData.lastModified} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500">Loading prompt...</div>
            </div>
          ) : error && !promptData ? (
            <div className="flex flex-col items-center justify-center h-96">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <div className="text-red-600">{error}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
              {/* Main Content Area */}
              <div className="lg:col-span-3 p-6 border-r">
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-5 w-5" />
                      Prompt Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="relative">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-[500px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                        placeholder="Enter your prompt template here..."
                        spellCheck={false}
                        disabled={saving}
                      />
                      {hasChanges && (
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 border-yellow-300"
                          >
                            Unsaved changes
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Tip:</strong> Use {`{{VARIABLE_NAME}}`} syntax to
                        create template variables. These will be replaced with actual
                        values when the prompt is used.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 p-6 bg-gray-50/50">
                <div className="sticky top-0">
                  <Card className="border-0 shadow-none bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Variable className="h-5 w-5" />
                        Variables
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentVariables.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No variables detected in the template
                          </p>
                        ) : (
                          <>
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Current Variables
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {currentVariables.map((variable) => (
                                  <Badge
                                    key={variable}
                                    variant={
                                      addedVariables.includes(variable)
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      addedVariables.includes(variable)
                                        ? "bg-green-100 text-green-800 border-green-300"
                                        : "bg-gray-100 text-gray-700"
                                    }
                                  >
                                    <Code2 className="h-3 w-3 mr-1" />
                                    {`{{${variable}}}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {removedVariables.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2 text-red-600">
                                  Removed Variables
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {removedVariables.map((variable) => (
                                    <Badge
                                      key={variable}
                                      variant="destructive"
                                      className="bg-red-100 text-red-800 border-red-300"
                                    >
                                      <Code2 className="h-3 w-3 mr-1" />
                                      {`{{${variable}}}`}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-xs text-red-600 mt-2">
                                  These variables were removed and may break existing
                                  workflows
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">
                            Common Variables
                          </h4>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div>
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                TRANSCRIPT_CONTENT
                              </code>
                              <span className="ml-2">Raw transcript text</span>
                            </div>
                            <div>
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                INSIGHT_TITLE
                              </code>
                              <span className="ml-2">Title of the insight</span>
                            </div>
                            <div>
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                POST_TYPE
                              </code>
                              <span className="ml-2">Type of post</span>
                            </div>
                            <div>
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                SUMMARY
                              </code>
                              <span className="ml-2">Content summary</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && promptData && (
          <div className="px-6 py-4 border-t bg-gray-50/50 flex items-center justify-between">
            <div>
              {hasChanges && (
                <span className="text-sm text-amber-600">
                  You have unsaved changes
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
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
                    {saving ? "Saving..." : "Save Changes"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}