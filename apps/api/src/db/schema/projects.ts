import { pgTable, serial, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core'
import { users } from './users'

export const contentProjects = pgTable('content_projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  sourceUrl: text('source_url'),
  transcript: text('transcript'),
  currentStage: varchar('current_stage', { length: 50 })
    .notNull()
    .default('processing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})