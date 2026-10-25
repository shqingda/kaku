import { z } from 'zod';

export const friendTimelineItemSchema = z.object({
  blogId: z.number().int().positive().optional(),
  blogTitle: z.string().optional(),
  createdAt: z.number().int(),
  entityId: z.number().int().positive().optional(),
  entityKind: z.enum(['character', 'person']).optional(),
  entityTitle: z.string().optional(),
  id: z.number().int().positive(),
  leadingText: z.string().optional(),
  replies: z.number().int().nonnegative(),
  subjectId: z.number().int().positive().optional(),
  subjectTitle: z.string().optional(),
  text: z.string(),
  trailingText: z.string().optional(),
  user: z.object({
    avatarUrl: z.string().url().optional(),
    nickname: z.string(),
    username: z.string(),
  }),
  userMentions: z
    .array(z.object({ nickname: z.string(), username: z.string() }))
    .optional(),
});

export const friendTimelinePageSchema = z.object({
  items: z.array(friendTimelineItemSchema),
  nextUntil: z.number().int().positive().optional(),
});

export type FriendTimelineItem = z.infer<typeof friendTimelineItemSchema>;
export type FriendTimelinePage = z.infer<typeof friendTimelinePageSchema>;
