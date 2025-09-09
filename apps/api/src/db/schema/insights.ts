import { pgTable, serial, text, timestamp, integer, boolean, numeric } from 'drizzle-orm/pg-core'
import { contentProjects } from './projects'

export const insights = pgTable('insights', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => contentProjects.id),
  content: text('content').notNull(),
  quote: text('quote'),
  score: numeric('score', { precision: 3, scale: 2 }),
  isApproved: boolean('is_approved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})