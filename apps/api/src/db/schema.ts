import { sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    linkedinToken: text('linkedin_token'),
    linkedinId: text('linkedin_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    emailLowerUniqueIdx: uniqueIndex('users_email_lower_unique_idx').on(sql`lower(${t.email})`),
  }),
)

export const contentProjects = pgTable('content_projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  sourceUrl: text('source_url'),
  transcriptOriginal: text('transcript_original'),
  transcriptCleaned: text('transcript_cleaned'),
  currentStage: varchar('current_stage', { length: 50 }).notNull().default('processing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const insights = pgTable('insights', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => contentProjects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  quote: text('quote'),
  score: numeric('score', { precision: 3, scale: 2 }),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => contentProjects.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  platform: varchar('platform', { length: 50 }).notNull().default('LinkedIn'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  publishedAt: timestamp('published_at'),
  scheduledAt: timestamp('scheduled_at'),
  scheduleStatus: varchar('schedule_status', { length: 20 }),
  scheduleError: text('schedule_error'),
  scheduleAttemptedAt: timestamp('schedule_attempted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type ContentProject = typeof contentProjects.$inferSelect
export type NewContentProject = typeof contentProjects.$inferInsert
export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
