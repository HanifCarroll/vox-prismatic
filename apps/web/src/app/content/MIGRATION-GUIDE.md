# Content State Management Refactoring - Migration Guide

## Overview

This refactoring replaces the complex, monolithic state management system with a modular, context-based architecture that separates concerns and improves maintainability.

## Before vs After

### Before (ContentClient.tsx - 925 lines)
- Single massive reducer with 20+ action types
- All state mixed together (UI, business, modal)
- Complex prop drilling through component tree
- Duplicate logic across content types
- Hard to test and debug

### After (Modular State Management)
- Separate state managers for each content type
- Context-based architecture eliminates prop drilling
- Dedicated modal manager
- Reusable patterns and better separation of concerns
- Much easier to test and extend

## New Architecture

### 1. Content-Specific State Managers

Each content type now has its own focused state manager:

```typescript
// Transcript state
import { useTranscriptState } from './state/transcript-state';

const transcripts = useTranscriptState({
  statusFilter: 'raw', // optional initial state
});

// Access state and actions
transcripts.state.selectedItems
transcripts.actions.setStatusFilter('cleaned')
transcripts.selectionHandlers.handleSelectAll(true, allTranscripts)
```

### 2. Modal Management

Dedicated modal manager handles all modal states:

```typescript
import { useModalManager, ModalType } from './state/modal-manager';

const modals = useModalManager();

// Show/hide modals
modals.actions.showTranscriptModal(transcript, 'edit');
modals.actions.hideTranscriptModal();

// Check modal state
modals.modalState.isTranscriptModalOpen
modals.modalState.selectedTranscript
```

### 3. Context-Based Architecture

The `ContentProvider` wraps your component tree and provides access to all state:

```typescript
import { ContentProvider, useContentContext } from './state/content-providers';

function App() {
  return (
    <ContentProvider initialView="transcripts">
      <ContentDisplay />
    </ContentProvider>
  );
}

function ContentDisplay() {
  const { 
    searchQuery, 
    activeView, 
    setActiveView,
    transcripts,
    insights,
    posts,
    modals 
  } = useContentContext();
  
  // No more prop drilling!
}
```

## Migration Steps

### Step 1: Replace useContentViewState

**Before:**
```typescript
const { state, dispatch, handlers, actions } = useContentViewState(
  initialView,
  initialSearch,
  initialFilters,
  initialSort
);
```

**After:**
```typescript
// In your component tree root:
<ContentProvider
  initialView={initialView}
  initialSearch={initialSearch}
  initialFilters={initialFilters}
>
  <YourComponent />
</ContentProvider>

// In your component:
const { transcripts, insights, posts } = useContentContext();
```

### Step 2: Update Component Props

**Before:**
```typescript
<TranscriptsView 
  transcripts={transcripts}
  selectedItems={selectedItems}
  onSelectionChange={actions.setSelectedItems}
  statusFilter={filters.transcripts.statusFilter}
  onStatusFilterChange={(filter) => dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: filter })}
  // ... many more props
/>
```

**After:**
```typescript
<TranscriptsView 
  transcripts={transcripts}
  selectedItems={transcriptState.state.selectedItems}
  onSelectionChange={transcriptState.actions.setSelectedItems}
  statusFilter={transcriptState.state.statusFilter}
  onStatusFilterChange={transcriptState.actions.setStatusFilter}
  // Much cleaner!
/>
```

### Step 3: Update Modal Handling

**Before:**
```typescript
const [modals, setModals] = useState({
  showTranscriptModal: false,
  selectedTranscript: null,
  // ... complex modal state
});

const handleShowTranscript = (transcript) => {
  setModals(prev => ({
    ...prev,
    showTranscriptModal: true,
    selectedTranscript: transcript
  }));
};
```

**After:**
```typescript
const { modals } = useContentContext();

const handleShowTranscript = (transcript) => {
  modals.actions.showTranscriptModal(transcript, 'view');
};

// In JSX:
<TranscriptModal
  isOpen={modals.modalState.isTranscriptModalOpen}
  transcript={modals.modalState.selectedTranscript}
  onClose={modals.actions.hideTranscriptModal}
/>
```

### Step 4: Simplify Filter Handling

**Before:**
```typescript
const handleFilterChange = useCallback((filterKey: string, value: string) => {
  switch (activeView) {
    case 'transcripts':
      if (filterKey === 'status') {
        dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: value });
      }
      // ... complex switch logic
      break;
    // ... more cases
  }
}, [activeView, dispatch]);
```

**After:**
```typescript
const handleFilterChange = useCallback((filterKey: string, value: string) => {
  switch (activeView) {
    case 'transcripts':
      if (filterKey === 'status') transcriptState.actions.setStatusFilter(value);
      break;
    case 'insights':
      if (filterKey === 'status') insightState.actions.setStatusFilter(value);
      break;
    case 'posts':
      if (filterKey === 'status') postState.actions.setStatusFilter(value);
      break;
  }
}, [activeView, transcriptState.actions, insightState.actions, postState.actions]);
```

## Advanced Usage

### Using Active Content State

Get the current active content state based on the view:

```typescript
const activeContent = useActiveContentState();

// This automatically switches between transcript/insight/post state
// based on the current view
activeContent.state.selectedItems
activeContent.actions.clearSelection()
activeContent.selectionHandlers.handleSelectAll(true, items)
```

### Content-Specific Operations

Use the operations hook for common patterns:

```typescript
const transcriptOps = useContentOperations('transcripts');

transcriptOps.clearAllFilters()
transcriptOps.hasActiveFilters()
transcriptOps.selectedCount
transcriptOps.clearSelection()
```

### Higher-Order Component Pattern

For components that need access to content state:

```typescript
import { withContentState } from './state/content-providers';

const MyComponent = withContentState(({ contentContext, ...props }) => {
  const { transcripts, modals } = contentContext;
  // Use the context
});
```

## Testing

The new architecture is much easier to test:

```typescript
import { useTranscriptState } from './state/transcript-state';
import { renderHook, act } from '@testing-library/react';

test('transcript state management', () => {
  const { result } = renderHook(() => useTranscriptState());
  
  act(() => {
    result.current.actions.setStatusFilter('raw');
  });
  
  expect(result.current.state.statusFilter).toBe('raw');
});
```

## Benefits

1. **Reduced Complexity**: 925 lines → ~300 lines for main component
2. **Better Separation**: Each state manager has a single responsibility
3. **No More Prop Drilling**: Context provides state at any level
4. **Easier Testing**: Individual state managers can be tested in isolation
5. **Better Developer Experience**: Clear, typed APIs for all operations
6. **Extensibility**: Adding new content types is now straightforward

## Rollback Plan

If issues arise, you can gradually migrate by:

1. Keep the old `ContentClient.tsx` as `ContentClientLegacy.tsx`
2. Use the new system for new features only
3. Migrate existing features one at a time
4. Use feature flags to toggle between old and new systems

## Performance Considerations

The new architecture should be faster because:

- Less prop drilling means fewer re-renders
- Individual state managers prevent unnecessary updates
- Better memoization opportunities
- Smaller bundle size due to code elimination