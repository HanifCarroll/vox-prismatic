'use client';

import { useState, useMemo, useRef } from 'react';
import { TranscriptView } from '@content-creation/shared';

const statusConfig = {
  raw: { label: 'Raw', color: 'bg-gray-100 text-gray-800', icon: '📄' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: '⚡' },
  cleaned: { label: 'Cleaned', color: 'bg-blue-100 text-blue-800', icon: '✨' },
  insights_generated: { label: 'Ready', color: 'bg-green-100 text-green-800', icon: '🎯' },
  posts_created: { label: 'Posted', color: 'bg-emerald-100 text-emerald-800', icon: '📱' },
  error: { label: 'Error', color: 'bg-red-100 text-red-800', icon: '❌' }
};

const filterTabs = [
  { key: 'all', label: 'All Transcripts', count: (transcripts: TranscriptView[]) => transcripts.length },
  { key: 'raw', label: 'Need Cleaning', count: (transcripts: TranscriptView[]) => transcripts.filter(t => t.status === 'raw').length },
  { key: 'cleaned', label: 'Ready to Process', count: (transcripts: TranscriptView[]) => transcripts.filter(t => t.status === 'cleaned').length },
  { key: 'processing', label: 'Processing', count: (transcripts: TranscriptView[]) => transcripts.filter(t => t.status === 'processing').length },
  { key: 'completed', label: 'Completed', count: (transcripts: TranscriptView[]) => transcripts.filter(t => ['insights_generated', 'posts_created'].includes(t.status)).length }
];

function TranscriptInputModal({ isOpen, onClose, onSubmit }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: { title: string; content: string; author?: string; description?: string; tags?: string[]; fileName?: string }) => void 
}) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    description: '',
    tags: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      let content = formData.content;
      let fileName = undefined;
      let title = formData.title.trim();

      // If upload tab is active and file is selected, read the file
      if (activeTab === 'upload' && selectedFile) {
        content = await readFileContent(selectedFile);
        fileName = selectedFile.name;
        
        // Auto-generate title from filename if not provided
        if (!title) {
          title = selectedFile.name.replace(/\.[^/.]+$/, '');
        }
      }

      if (!content || !content.trim()) {
        alert('Please provide transcript content');
        setIsProcessing(false);
        return;
      }

      // Use filename as title if still empty (for paste mode)
      if (!title) {
        title = 'Untitled Transcript';
      }

      const tags = formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined;
      
      onSubmit({
        title,
        content: content.trim(),
        author: formData.author.trim() || undefined,
        description: formData.description.trim() || undefined,
        tags,
        fileName
      });

      // Reset form
      setFormData({ title: '', content: '', author: '', description: '', tags: '' });
      setSelectedFile(null);
      setActiveTab('paste');
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Only accept text files
      if (!file.type.startsWith('text/') && !file.name.endsWith('.txt')) {
        alert('Please select a text file (.txt)');
        return;
      }
      setSelectedFile(file);
      
      // Auto-fill title from filename if empty
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '')
        }));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('text/') || file.name.endsWith('.txt'))) {
      setSelectedFile(file);
      setActiveTab('upload');
      
      // Auto-fill title from filename if empty
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '')
        }));
      }
    } else if (file) {
      alert('Please drop a text file (.txt)');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Import Transcript</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-hidden flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'paste'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <span className="mr-2">📋</span>
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'upload'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <span className="mr-2">📁</span>
              Upload File
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              {/* Content Input Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`relative ${
                  dragActive ? 'bg-blue-50 border-blue-400' : ''
                }`}
              >
                {activeTab === 'paste' ? (
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                      Transcript Content *
                    </label>
                    <textarea
                      id="content"
                      required={activeTab === 'paste'}
                      rows={12}
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Paste your transcript content here..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload File *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,text/plain"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {selectedFile ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center">
                            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Choose a file
                            </button>
                            <span className="text-gray-500"> or drag and drop</span>
                          </div>
                          <p className="text-xs text-gray-500">Text files only (.txt)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Drag overlay */}
                {dragActive && (
                  <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <svg className="mx-auto w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-blue-600 font-medium">Drop your file here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Title field (optional) */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title (optional - will be auto-generated if blank)
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter transcript title or leave blank for auto-generation..."
                />
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Author name..."
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tag1, tag2, tag3..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Brief description of the content..."
              />
            </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || (activeTab === 'paste' ? !formData.content.trim() : !selectedFile)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Import Transcript'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TranscriptCard({ transcript, onAction }: { transcript: TranscriptView; onAction: (action: string, transcript: TranscriptView) => void }) {
  const status = statusConfig[transcript.status];
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(transcript.title);

  const getActionButton = () => {
    switch (transcript.status) {
      case 'raw':
        return (
          <button
            onClick={() => onAction('clean', transcript)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Clean Transcript
          </button>
        );
      case 'cleaned':
        return (
          <button
            onClick={() => onAction('process', transcript)}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
          >
            Extract Insights
          </button>
        );
      case 'insights_generated':
        return (
          <button
            onClick={() => onAction('generate_posts', transcript)}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            Generate Posts
          </button>
        );
      case 'processing':
        return (
          <button
            disabled
            className="px-3 py-1 bg-gray-300 text-gray-600 text-sm rounded cursor-not-allowed"
          >
            Processing...
          </button>
        );
      default:
        return (
          <button
            onClick={() => onAction('view', transcript)}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            View Details
          </button>
        );
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getSourceIcon = () => {
    switch (transcript.sourceType) {
      case 'recording': return '🎙️';
      case 'upload': return '📁';
      case 'manual': return '✏️';
      default: return '📄';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== transcript.title) {
      try {
        const response = await fetch(`/api/transcripts?id=${transcript.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editedTitle.trim() })
        });
        
        if (response.ok) {
          // Update the title in the parent component
          onAction('updateTitle', { ...transcript, title: editedTitle.trim() });
        }
      } catch (error) {
        console.error('Failed to update title:', error);
        setEditedTitle(transcript.title); // Revert on error
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(transcript.title);
    setIsEditingTitle(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getSourceIcon()}</span>
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') handleTitleCancel();
                    }}
                    className="flex-1 px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleSave}
                    className="text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    onClick={handleTitleCancel}
                    className="text-red-600 hover:text-red-700"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {transcript.title}
                  </h3>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Edit title"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                <span className="mr-1">{status.icon}</span>
                {status.label}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span>{transcript.wordCount.toLocaleString()} words</span>
              {formatDuration(transcript.duration) && (
                <span>{formatDuration(transcript.duration)}</span>
              )}
              <span>{formatDate(transcript.createdAt)}</span>
              {transcript.metadata?.author && (
                <span>by {transcript.metadata.author}</span>
              )}
            </div>

            {transcript.metadata?.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {transcript.metadata.description}
              </p>
            )}

            {transcript.metadata?.tags && (
              <div className="flex flex-wrap gap-1 mb-3">
                {transcript.metadata.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {transcript.metadata.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{transcript.metadata.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {getActionButton()}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Source Information</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><strong>Type:</strong> {transcript.sourceType}</li>
                  {transcript.sourceUrl && (
                    <li><strong>URL:</strong> <a href={transcript.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{transcript.sourceUrl}</a></li>
                  )}
                  {transcript.fileName && (
                    <li><strong>File:</strong> {transcript.fileName}</li>
                  )}
                  <li><strong>Updated:</strong> {formatDate(transcript.updatedAt)}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Content Preview</h4>
                <div className="bg-gray-50 p-3 rounded text-xs">
                  <p className="line-clamp-4">
                    {transcript.cleanedContent || transcript.rawContent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TranscriptsClientProps {
  initialTranscripts: TranscriptView[];
}

export default function TranscriptsClient({ initialTranscripts }: TranscriptsClientProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptView[]>(initialTranscripts);
  const [showInputModal, setShowInputModal] = useState(false);

  const filteredTranscripts = useMemo(() => {
    let filtered = transcripts;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(transcript =>
        transcript.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transcript.metadata?.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transcript.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    switch (activeFilter) {
      case 'raw':
        return filtered.filter(t => t.status === 'raw');
      case 'cleaned':
        return filtered.filter(t => t.status === 'cleaned');
      case 'processing':
        return filtered.filter(t => t.status === 'processing');
      case 'completed':
        return filtered.filter(t => ['insights_generated', 'posts_created'].includes(t.status));
      default:
        return filtered;
    }
  }, [transcripts, activeFilter, searchQuery]);

  const handleAction = (action: string, transcript: TranscriptView) => {
    console.log(`Action: ${action} on transcript: ${transcript.title}`);
    
    // Handle title update
    if (action === 'updateTitle') {
      setTranscripts(prev => prev.map(t => 
        t.id === transcript.id ? transcript : t
      ));
      return;
    }
    
    // TODO: Implement other actions
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on ${selectedTranscripts.length} transcripts`);
    // TODO: Implement bulk actions
  };

  const handleInputTranscript = async (formData: { title: string; content: string; author?: string; description?: string; tags?: string[]; fileName?: string }) => {
    try {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          rawContent: formData.content,
          sourceType: formData.fileName ? 'upload' : 'manual',
          fileName: formData.fileName,
          metadata: {
            author: formData.author,
            description: formData.description,
            tags: formData.tags || [],
            originalFileName: formData.fileName
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Add the new transcript to the list
          const newTranscript: TranscriptView = {
            ...result.data,
            createdAt: new Date(result.data.createdAt),
            updatedAt: new Date(result.data.updatedAt)
          };
          setTranscripts(prev => [newTranscript, ...prev]);
          setShowInputModal(false);
        } else {
          console.error('Failed to save transcript:', result.error);
        }
      } else {
        console.error('Failed to save transcript');
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transcripts</h1>
        <p className="mt-2 text-gray-600">
          Manage your content pipeline from raw transcripts to published posts
        </p>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => setShowInputModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Transcript
            </button>
            {selectedTranscripts.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBulkAction('clean')}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Clean Selected ({selectedTranscripts.length})
                </button>
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeFilter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count(transcripts)}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Transcripts Grid */}
      <div className="space-y-4">
        {filteredTranscripts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matching transcripts' : 'No transcripts found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms or filters'
                : 'Get started by adding your first transcript'
              }
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowInputModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                + Add Transcript
              </button>
            )}
          </div>
        ) : (
          filteredTranscripts.map((transcript) => (
            <TranscriptCard
              key={transcript.id}
              transcript={transcript}
              onAction={handleAction}
            />
          ))
        )}
      </div>

      {/* Transcript Input Modal */}
      <TranscriptInputModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        onSubmit={handleInputTranscript}
      />
    </div>
  );
}