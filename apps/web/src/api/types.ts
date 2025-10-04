/**
 * Re-export commonly used types from generated schemas
 * This provides backward compatibility during migration
 */

// Post types - using the Get endpoint's Post structure as the canonical type
export type { PostsGet200Post as Post } from './generated.schemas'

// Post status - these are plain strings in OpenAPI, recreate as literal types
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'published' | 'scheduled' | 'failed'
export type PostScheduleStatus = 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled'

// Project types
export type { ProjectsList200ItemsItem as ContentProject } from './generated.schemas'
export type ProjectStage = 'processing' | 'posts' | 'ready'

// Hook/Framework types - these may not exist in the schema yet
// Using any for now until backend adds proper types
export type HookFramework = any
export type HookWorkbenchHook = any
export type PostTypePreset = any

// User types
export type { AuthMe200User as User } from './generated.schemas'

// Settings types - plain string in schema
export type WritingStyle = string
