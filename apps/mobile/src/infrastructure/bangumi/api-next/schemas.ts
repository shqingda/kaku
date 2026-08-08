import { z } from 'zod';

const bangumiUserSchema = z.object({
  avatar: z
    .object({
      large: z.string().optional(),
      medium: z.string().optional(),
      small: z.string().optional(),
    })
    .optional(),
  id: z.number(),
  nickname: z.string(),
  username: z.string(),
});

export const bangumiDiscussionReplySchema: z.ZodType<BangumiDiscussionReply> =
  z.lazy(() =>
    z.object({
      content: z.string(),
      createdAt: z.number(),
      creator: bangumiUserSchema.optional(),
      creatorID: z.number(),
      id: z.number(),
      relatedID: z.number().optional(),
      replies: z.array(bangumiDiscussionReplySchema).optional(),
      user: bangumiUserSchema.optional(),
    }),
  );

export const bangumiSubjectTopicSummarySchema = z.object({
  createdAt: z.number(),
  creator: bangumiUserSchema.optional(),
  creatorID: z.number(),
  id: z.number(),
  parentID: z.number(),
  replyCount: z.number(),
  title: z.string(),
  updatedAt: z.number(),
});

export const bangumiSubjectTopicPageSchema = z.object({
  data: z.array(bangumiSubjectTopicSummarySchema),
  total: z.number(),
});

export const bangumiSubjectTopicSchema =
  bangumiSubjectTopicSummarySchema.extend({
    replies: z.array(bangumiDiscussionReplySchema),
  });

export const bangumiEpisodeCommentsSchema = z.array(
  bangumiDiscussionReplySchema,
);

export const bangumiSubjectCommentsSchema = z.object({
  data: z.array(
    z.object({
      comment: z.string(),
      id: z.number(),
      rate: z.number(),
      updatedAt: z.number(),
      user: bangumiUserSchema,
    }),
  ),
  total: z.number(),
});

export const bangumiSubjectReviewsSchema = z.object({
  data: z.array(
    z.object({
      entry: z.object({
        createdAt: z.number(),
        id: z.number(),
        replies: z.number(),
        summary: z.string(),
        title: z.string(),
      }),
      id: z.number(),
      user: bangumiUserSchema,
    }),
  ),
  total: z.number(),
});

export const bangumiUserBlogsSchema = z.object({
  data: z.array(
    z.object({
      createdAt: z.number(),
      id: z.number(),
      public: z.boolean(),
      replies: z.number(),
      summary: z.string(),
      title: z.string(),
      updatedAt: z.number(),
    }),
  ),
  total: z.number(),
});

const bangumiSlimIndexSchema = z.object({
  id: z.number(),
  title: z.string(),
  total: z.number(),
  updatedAt: z.number(),
  user: bangumiUserSchema.optional(),
});

export const bangumiIndexPageSchema = z.object({
  data: z.array(bangumiSlimIndexSchema),
  total: z.number(),
});

const bangumiSubjectCharacterNameSchema = z.object({
  id: z.number(),
  nameCN: z.string(),
});

export const bangumiSubjectCharacterNamesSchema = z.object({
  data: z.array(
    z.object({
      character: bangumiSubjectCharacterNameSchema,
    }),
  ),
  total: z.number(),
});

export type BangumiSubjectCharacterName = z.infer<
  typeof bangumiSubjectCharacterNameSchema
>;

export const bangumiIndexSchema = bangumiSlimIndexSchema.extend({
  collects: z.number(),
  desc: z.string(),
  replies: z.number(),
});

export const bangumiIndexRelatedSchema = z.object({
  data: z.array(
    z.object({
      comment: z.string(),
      subject: z
        .object({
          id: z.number(),
          images: z
            .object({
              common: z.string().optional(),
              medium: z.string().optional(),
              small: z.string().optional(),
            })
            .optional(),
          name: z.string(),
          nameCN: z.string(),
          rating: z
            .object({
              score: z.number(),
            })
            .optional(),
          type: z.number(),
        })
        .optional(),
    }),
  ),
  total: z.number(),
});

const bangumiGroupSchema = z.object({
  accessible: z.boolean(),
  createdAt: z.number(),
  icon: z.object({
    large: z.string(),
    medium: z.string(),
    small: z.string(),
  }),
  id: z.number(),
  members: z.number(),
  name: z.string(),
  nsfw: z.boolean(),
  title: z.string(),
});

const bangumiGroupTopicSummarySchema = z.object({
  createdAt: z.number(),
  creator: bangumiUserSchema.optional(),
  creatorID: z.number(),
  group: bangumiGroupSchema.optional(),
  id: z.number(),
  parentID: z.number(),
  replyCount: z.number(),
  title: z.string(),
  updatedAt: z.number(),
});

export const bangumiGroupPageSchema = z.object({
  data: z.array(bangumiGroupSchema),
  total: z.number(),
});

export const bangumiGroupDetailSchema = bangumiGroupSchema.extend({
  creator: bangumiUserSchema.optional(),
  description: z.string(),
  posts: z.number(),
  topics: z.number(),
});

export const bangumiGroupTopicPageSchema = z.object({
  data: z.array(bangumiGroupTopicSummarySchema),
  total: z.number(),
});

export const bangumiGroupTopicSchema =
  bangumiGroupTopicSummarySchema.extend({
    group: bangumiGroupSchema,
    replies: z.array(bangumiDiscussionReplySchema),
  });

export const bangumiUserFriendsSchema = z.object({
  data: z.array(bangumiUserSchema),
  total: z.number(),
});

export const bangumiUserTimelineSchema = z.array(
  z.object({
    createdAt: z.number(),
    id: z.number(),
    memo: z
      .object({
        subject: z
          .array(
            z.object({
              subject: z.object({
                id: z.number(),
                name: z.string(),
                nameCN: z.string(),
              }),
            }),
          )
          .optional(),
      })
      .passthrough(),
  }),
);

export const bangumiBlogSchema = z.object({
  content: z.string(),
  createdAt: z.number(),
  id: z.number(),
  replies: z.number(),
  title: z.string(),
  updatedAt: z.number(),
  user: bangumiUserSchema,
});

export const bangumiBlogCommentsSchema = z.array(
  bangumiDiscussionReplySchema,
);

export type BangumiDiscussionReply = {
  content: string;
  createdAt: number;
  creator?: z.infer<typeof bangumiUserSchema>;
  creatorID: number;
  id: number;
  relatedID?: number;
  replies?: BangumiDiscussionReply[];
  user?: z.infer<typeof bangumiUserSchema>;
};

export type BangumiSubjectTopicSummary = z.infer<
  typeof bangumiSubjectTopicSummarySchema
>;
export type BangumiSubjectTopicPage = z.infer<
  typeof bangumiSubjectTopicPageSchema
>;
export type BangumiSubjectTopic = z.infer<typeof bangumiSubjectTopicSchema>;
export type BangumiSubjectComments = z.infer<
  typeof bangumiSubjectCommentsSchema
>;
export type BangumiSubjectReviews = z.infer<
  typeof bangumiSubjectReviewsSchema
>;
export type BangumiBlog = z.infer<typeof bangumiBlogSchema>;
export type BangumiBlogComments = z.infer<typeof bangumiBlogCommentsSchema>;
export type BangumiUserBlogs = z.infer<typeof bangumiUserBlogsSchema>;
export type BangumiIndexPage = z.infer<typeof bangumiIndexPageSchema>;
export type BangumiIndex = z.infer<typeof bangumiIndexSchema>;
export type BangumiIndexRelated = z.infer<typeof bangumiIndexRelatedSchema>;
export type BangumiGroupPage = z.infer<typeof bangumiGroupPageSchema>;
export type BangumiGroupDetail = z.infer<typeof bangumiGroupDetailSchema>;
export type BangumiGroupTopicPage = z.infer<
  typeof bangumiGroupTopicPageSchema
>;
export type BangumiGroupTopic = z.infer<typeof bangumiGroupTopicSchema>;
export type BangumiUserFriends = z.infer<typeof bangumiUserFriendsSchema>;
export type BangumiUserTimeline = z.infer<typeof bangumiUserTimelineSchema>;
