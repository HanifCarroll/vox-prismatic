'use client';

import { useState, useMemo } from 'react';
import { TranscriptView } from '@content-creation/shared';

// Mock data for development - replace with actual API calls
const mockTranscripts: TranscriptView[] = [
  {
    id: '1',
    title: 'The Future of AI in Software Development',
    status: 'raw',
    sourceType: 'upload',
    sourceUrl: 'https://youtube.com/watch?v=example',
    rawContent: 'This is a sample transcript about AI in software development...',
    wordCount: 2500,
    duration: 1800, // 30 minutes
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    metadata: {
      author: 'Tech Conference',
      publishedAt: new Date('2024-01-10'),
      tags: ['AI', 'Software Development', 'Future'],
      description: 'A deep dive into how AI is transforming software development'
    }
  },
  {
    id: '2',
    title: 'Building Scalable React Applications',
    status: 'cleaned',
    sourceType: 'upload',
    sourceUrl: 'https://podcast.example.com/episode-42',
    rawContent: 'Original transcript content...',
    cleanedContent: 'Cleaned and formatted transcript content...',
    wordCount: 3200,
    duration: 2400, // 40 minutes
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-14'),
    metadata: {
      author: 'React Weekly Podcast',
      tags: ['React', 'Scalability', 'Performance'],
      description: 'Best practices for building large-scale React applications'
    }
  },
  {
    id: '3',
    title: 'Remote Work Productivity Strategies',
    status: 'insights_generated',
    sourceType: 'manual',
    rawContent: 'Article content about remote work...',
    cleanedContent: 'Processed article content...',
    wordCount: 1800,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-13'),
    metadata: {
      author: 'Productivity Blog',
      tags: ['Remote Work', 'Productivity', 'Management'],
      description: 'Proven strategies for maintaining productivity while working remotely'
    }
  },
  {
    id: '4',
    title: 'Database Design Patterns',
    status: 'processing',
    sourceType: 'upload',
    fileName: 'database-webinar.txt',
    rawContent: 'Webinar transcript about database patterns...',
    cleanedContent: 'Cleaned webinar content...',
    wordCount: 4100,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-11'),
    metadata: {
      author: 'Database Academy',
      tags: ['Database', 'Architecture', 'Patterns'],
      description: 'Advanced database design patterns for modern applications'
    }
  }
];

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
              <span>{transcript.createdAt.toLocaleDateString()}</span>
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
                  <li><strong>Updated:</strong> {transcript.updatedAt.toLocaleDateString()}</li>
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

export default function TranscriptsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTranscripts = useMemo(() => {
    let filtered = mockTranscripts;

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
  }, [activeFilter, searchQuery]);

  const handleAction = (action: string, transcript: TranscriptView) => {
    console.log(`Action: ${action} on transcript: ${transcript.title}`);
    // TODO: Implement actual actions
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on ${selectedTranscripts.length} transcripts`);
    // TODO: Implement bulk actions
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
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Upload Transcript
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Import from URL
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
                  {tab.count(mockTranscripts)}
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
                : 'Get started by uploading your first transcript or importing from a URL'
              }
            </p>
            {!searchQuery && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
    </div>
  );
}