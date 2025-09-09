import { pgTable, serial, text, timestamp, integer, boolean, varchar } from 'drizzle-orm/pg-core'
import { contentProjects } from './projects'
import { insights } from './insights'

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => contentProjects.id),
  insightId: integer('insight_id')
    .references(() => insights.id),
  content: text('content').notNull(),
  platform: varchar('platform', { length: 50 }).notNull().default('LinkedIn'),
  isApproved: boolean('is_approved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})