'use client';

import { useState, useMemo } from 'react';
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
  onSubmit: (data: { title: string; content: string; author?: string; description?: string; tags?: string[] }) => void 
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    description: '',
    tags: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      content: formData.content.trim(),
      author: formData.author.trim() || undefined,
      description: formData.description.trim() || undefined,
      tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined
    });

    // Reset form
    setFormData({ title: '', content: '', author: '', description: '', tags: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Input Transcript</h2>
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
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter transcript title..."
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Transcript Content *
              </label>
              <textarea
                id="content"
                required
                rows={12}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Paste your transcript content here..."
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
              disabled={!formData.title.trim() || !formData.content.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Save Transcript
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getSourceIcon()}</span>
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {transcript.title}
              </h3>
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
    // TODO: Implement actual actions
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on ${selectedTranscripts.length} transcripts`);
    // TODO: Implement bulk actions
  };

  const handleInputTranscript = async (formData: { title: string; content: string; author?: string; description?: string; tags?: string[] }) => {
    try {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          rawContent: formData.content,
          sourceType: 'manual',
          metadata: {
            author: formData.author,
            description: formData.description,
            tags: formData.tags || []
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Transcript
            </button>
            <button 
              onClick={() => setShowInputModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Input Transcript
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
                : 'Get started by uploading or pasting your first transcript'
              }
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowInputModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Transcript
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