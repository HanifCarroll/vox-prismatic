import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * Users table - stores authentication and user profile data
 * Note: Password should ALWAYS be hashed before storage using bcrypt
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(), // Store hashed password, never plain text
    name: varchar('name', { length: 255 }).notNull(),
    linkedinToken: text('linkedin_token'),
    linkedinId: text('linkedin_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    // Enforce case-insensitive uniqueness at the DB level
    emailLowerUniqueIdx: uniqueIndex('users_email_lower_unique_idx').on(
      sql`lower(${t.email})`,
    ),
  }),
)

/**
 * Content Projects table - represents the main workflow entity
 */
export const contentProjects = pgTable('content_projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // Delete projects when user is deleted
  title: varchar('title', { length: 255 }).notNull(),
  sourceUrl: text('source_url'),
  transcriptOriginal: text('transcript_original'),
  transcriptCleaned: text('transcript_cleaned'),
  currentStage: varchar('current_stage', { length: 50 }).notNull().default('processing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * Insights table - AI-extracted insights from project content
 */
export const insights = pgTable('insights', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => contentProjects.id, { onDelete: 'cascade' }), // Delete insights when project is deleted
  content: text('content').notNull(),
  quote: text('quote'),
  score: numeric('score', { precision: 3, scale: 2 }),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(), // Added for audit trail
})

/**
 * Posts table - Generated social media posts
 */
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => contentProjects.id, { onDelete: 'cascade' }), // Delete posts when project is deleted
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'set null' }), // Keep post even if insight is deleted
  content: text('content').notNull(),
  platform: varchar('platform', { length: 50 }).notNull().default('LinkedIn'),
  isApproved: boolean('is_approved').default(false).notNull(),
  publishedAt: timestamp('published_at'), // Track when post was published
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(), // Added for audit trail
})

// Type exports for use in application code
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type ContentProject = typeof contentProjects.$inferSelect
export type NewContentProject = typeof contentProjects.$inferInsert
export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
