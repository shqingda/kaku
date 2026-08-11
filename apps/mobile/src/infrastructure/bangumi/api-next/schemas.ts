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

export const bangumiEntityCommentsSchema = z.array(
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

const bangumiIndexImageSchema = z
  .object({
    common: z.string().optional(),
    grid: z.string().optional(),
    large: z.string().optional(),
    medium: z.string().optional(),
    small: z.string().optional(),
  })
  .optional();

const bangumiIndexSubjectSchema = z.object({
  id: z.number(),
  images: bangumiIndexImageSchema,
  name: z.string(),
  nameCN: z.string(),
  rating: z
    .object({
      score: z.number(),
    })
    .optional(),
  type: z.number(),
});

const bangumiIndexPersonSchema = z.object({
  id: z.number(),
  images: bangumiIndexImageSchema,
  name: z.string(),
  nameCN: z.string(),
});

export const bangumiIndexRelatedSchema = z.object({
  data: z.array(
    z.object({
      blog: z
        .object({
          icon: z.string().optional(),
          id: z.number(),
          title: z.string(),
        })
        .optional(),
      cat: z.number(),
      character: bangumiIndexPersonSchema.optional(),
      comment: z.string(),
      episode: z
        .object({
          id: z.number(),
          name: z.string(),
          nameCN: z.string(),
          sort: z.number(),
          subject: bangumiIndexSubjectSchema.optional(),
          subjectID: z.number(),
        })
        .optional(),
      groupTopic: z
        .object({
          group: z
            .object({
              icon: bangumiIndexImageSchema,
              name: z.string(),
            })
            .optional(),
          id: z.number(),
          title: z.string(),
        })
        .optional(),
      person: bangumiIndexPersonSchema.optional(),
      subject: bangumiIndexSubjectSchema.optional(),
      subjectTopic: z
        .object({
          id: z.number(),
          parentID: z.number(),
          subject: bangumiIndexSubjectSchema.optional(),
          title: z.string(),
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

const bangumiTimelineSubjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  nameCN: z.string().optional(),
  type: z.number().default(0),
});

const bangumiTimelineEntitySchema = z.object({
  id: z.number(),
  name: z.string(),
  nameCN: z.string().optional(),
});

export const bangumiUserTimelineSchema = z.array(
  z.object({
    batch: z.boolean().default(false),
    cat: z.number().default(0),
    createdAt: z.number(),
    id: z.number(),
    memo: z
      .object({
        blog: z.object({ title: z.string() }).optional(),
        daily: z
          .object({ users: z.array(bangumiUserSchema).optional() })
          .optional(),
        index: z.object({ title: z.string() }).optional(),
        mono: z
          .object({
            characters: z.array(bangumiTimelineEntitySchema).default([]),
            persons: z.array(bangumiTimelineEntitySchema).default([]),
          })
          .optional(),
        progress: z
          .object({
            batch: z
              .object({
                epsTotal: z.string(),
                epsUpdate: z.number().optional(),
                subject: bangumiTimelineSubjectSchema,
                volsTotal: z.string(),
                volsUpdate: z.number().optional(),
              })
              .optional(),
            single: z
              .object({
                episode: z.object({ sort: z.number() }),
                subject: bangumiTimelineSubjectSchema,
              })
              .optional(),
          })
          .optional(),
        status: z
          .object({
            nickname: z
              .object({ after: z.string(), before: z.string() })
              .optional(),
            sign: z.string().optional(),
            tsukkomi: z.string().optional(),
          })
          .optional(),
        subject: z
          .array(
            z.object({
              comment: z.string().default(''),
              subject: bangumiTimelineSubjectSchema,
            }),
          )
          .optional(),
        wiki: z
          .object({ subject: bangumiTimelineSubjectSchema.optional() })
          .optional(),
      })
      .passthrough(),
    type: z.number().default(0),
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
