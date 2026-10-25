import { z } from 'zod';

export const notificationTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.number().int().positive(),
    kind: z.literal('group-topic'),
    replyId: z.number().int().positive().optional(),
  }),
  z.object({
    id: z.number().int().positive(),
    kind: z.literal('subject-topic'),
    replyId: z.number().int().positive().optional(),
  }),
  z.object({
    id: z.number().int().positive(),
    kind: z.literal('character'),
    replyId: z.number().int().positive().optional(),
  }),
  z.object({
    id: z.number().int().positive(),
    kind: z.literal('person'),
    replyId: z.number().int().positive().optional(),
  }),
  z.object({
    id: z.number().int().positive(),
    kind: z.literal('blog'),
    replyId: z.number().int().positive().optional(),
  }),
  z.object({ kind: z.literal('user'), username: z.string() }),
]);

export const userNotificationSchema = z.object({
  action: z.string(),
  createdAt: z.number().int(),
  id: z.number().int().positive(),
  sender: z.object({
    avatarUrl: z.string().url().optional(),
    nickname: z.string(),
    username: z.string(),
  }),
  target: notificationTargetSchema.optional(),
  title: z.string(),
  unread: z.boolean(),
});

export const notificationListSchema = z.object({
  items: z.array(userNotificationSchema),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationTarget = z.infer<typeof notificationTargetSchema>;
export type UserNotification = z.infer<typeof userNotificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
