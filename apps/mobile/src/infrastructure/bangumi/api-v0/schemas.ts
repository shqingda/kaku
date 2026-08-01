import { z } from 'zod';

const bangumiImagesSchema = z
  .object({
    common: z.string().optional(),
    large: z.string().optional(),
    medium: z.string().optional(),
    small: z.string().optional(),
  })
  .nullable()
  .optional();

const bangumiInfoboxValueSchema = z.union([
  z.string(),
  z.array(
    z.object({
      k: z.string().optional(),
      v: z.string(),
    }),
  ),
]);

const bangumiEntityDetailSchema = z.object({
  birth_day: z.number().nullable().optional(),
  birth_mon: z.number().nullable().optional(),
  birth_year: z.number().nullable().optional(),
  blood_type: z.number().nullable().optional(),
  career: z
    .array(
      z.enum([
        'producer',
        'mangaka',
        'artist',
        'seiyu',
        'writer',
        'illustrator',
        'actor',
      ]),
    )
    .optional(),
  gender: z.string().nullable().optional(),
  id: z.number(),
  images: bangumiImagesSchema,
  infobox: z
    .array(z.object({ key: z.string(), value: bangumiInfoboxValueSchema }))
    .optional(),
  name: z.string(),
  summary: z.string(),
  stat: z
    .object({
      collects: z.number(),
      comments: z.number(),
    })
    .optional(),
  type: z.number(),
});

export const bangumiCharacterSchema = bangumiEntityDetailSchema;
export const bangumiPersonSchema = bangumiEntityDetailSchema;

export const bangumiEntitySubjectsSchema = z.array(
  z.object({
    eps: z.string().optional(),
    id: z.number(),
    image: z.string().nullable().optional(),
    name: z.string(),
    name_cn: z.string(),
    staff: z.string(),
    type: z.number(),
  }),
);

export const bangumiEntityRelationsSchema = z.array(
  z.object({
    id: z.number(),
    images: bangumiImagesSchema,
    name: z.string(),
    staff: z.string(),
    subject_id: z.number(),
    subject_name: z.string(),
    subject_name_cn: z.string(),
    subject_type: z.number(),
    type: z.number(),
  }),
);

export const bangumiPublicUserSchema = z.object({
  avatar: z
    .object({
      large: z.string().optional(),
      medium: z.string().optional(),
      small: z.string().optional(),
    })
    .optional(),
  id: z.number(),
  nickname: z.string(),
  sign: z.string(),
  username: z.string(),
});

export const bangumiUserCollectionsSchema = z.object({
  data: z.array(
    z.object({
      ep_status: z.number(),
      rate: z.number(),
      subject: z.object({
        eps: z.number(),
        id: z.number(),
        images: bangumiImagesSchema,
        name: z.string(),
        name_cn: z.string(),
        rank: z.number(),
        score: z.number(),
      }),
      type: z.number(),
      updated_at: z.string(),
    }),
  ),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

const bangumiPublicSubjectSchema = z.object({
  date: z.string().nullable().optional(),
  id: z.number(),
  images: bangumiImagesSchema,
  name: z.string(),
  name_cn: z.string(),
  rating: z
    .object({
      score: z.number(),
      total: z.number(),
    })
    .optional(),
});

export const bangumiSubjectSchema = z.object({
  collection: z
    .object({
      collect: z.number(),
      doing: z.number(),
      dropped: z.number(),
      on_hold: z.number(),
      wish: z.number(),
    })
    .optional(),
  date: z.string().nullable().optional(),
  eps: z.number(),
  id: z.number(),
  images: bangumiImagesSchema,
  infobox: z
    .array(z.object({ key: z.string(), value: bangumiInfoboxValueSchema }))
    .optional(),
  meta_tags: z.array(z.string()).optional(),
  name: z.string(),
  name_cn: z.string(),
  platform: z.string().optional(),
  rating: z
    .object({
      count: z.record(z.string(), z.number()).optional(),
      rank: z.number(),
      score: z.number(),
      total: z.number(),
    })
    .optional(),
  summary: z.string(),
  tags: z
    .array(
      z.object({
        count: z.number(),
        name: z.string(),
      }),
    )
    .optional(),
  total_episodes: z.number(),
  type: z.number(),
});

export const bangumiEpisodeSchema = z.object({
  airdate: z.string().optional(),
  comment: z.number(),
  desc: z.string(),
  duration: z.string().optional(),
  ep: z.number(),
  id: z.number(),
  name: z.string(),
  name_cn: z.string(),
});

export const bangumiEpisodePageSchema = z.object({
  data: z.array(bangumiEpisodeSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

export const bangumiSubjectStaffSchema = z.array(
  z.object({
    eps: z.string().nullable().optional(),
    id: z.number(),
    images: z
      .object({
        medium: z.string().optional(),
        small: z.string().optional(),
      })
      .optional(),
    name: z.string(),
    relation: z.string(),
    type: z.number(),
  }),
);

export const bangumiSubjectCharactersSchema = z.array(
  z.object({
    actors: z.array(
      z.object({
        id: z.number(),
        images: bangumiImagesSchema,
        name: z.string(),
      }),
    ),
    id: z.number(),
    images: bangumiImagesSchema,
    name: z.string(),
    relation: z.string(),
    summary: z.string(),
  }),
);

export const bangumiSubjectRelationsSchema = z.array(
  z.object({
    id: z.number(),
    images: bangumiImagesSchema,
    name: z.string(),
    name_cn: z.string(),
    relation: z.string(),
    type: z.number(),
  }),
);

export const bangumiCalendarSchema = z.array(
  z.object({
    items: z.array(
      bangumiPublicSubjectSchema.extend({
        air_date: z.string().optional(),
      }),
    ),
    weekday: z.object({
      cn: z.string(),
      id: z.number(),
    }),
  }),
);

export const bangumiSubjectSearchSchema = z.object({
  data: z.array(bangumiPublicSubjectSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

export type BangumiSubjectResponse = z.infer<typeof bangumiSubjectSchema>;
export type BangumiEpisodeResponse = z.infer<typeof bangumiEpisodeSchema>;
export type BangumiSubjectStaffResponse = z.infer<
  typeof bangumiSubjectStaffSchema
>;
export type BangumiSubjectCharactersResponse = z.infer<
  typeof bangumiSubjectCharactersSchema
>;
export type BangumiSubjectRelationsResponse = z.infer<
  typeof bangumiSubjectRelationsSchema
>;
export type BangumiCalendarResponse = z.infer<typeof bangumiCalendarSchema>;
export type BangumiSubjectSearchResponse = z.infer<
  typeof bangumiSubjectSearchSchema
>;
export type BangumiEntityDetailResponse = z.infer<
  typeof bangumiEntityDetailSchema
>;
export type BangumiEntitySubjectsResponse = z.infer<
  typeof bangumiEntitySubjectsSchema
>;
export type BangumiEntityRelationsResponse = z.infer<
  typeof bangumiEntityRelationsSchema
>;
export type BangumiPublicUserResponse = z.infer<
  typeof bangumiPublicUserSchema
>;
export type BangumiUserCollectionsResponse = z.infer<
  typeof bangumiUserCollectionsSchema
>;
