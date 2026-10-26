import { z } from 'zod';
import { COLLECTION_STATUSES } from './index.ts';

const episodeIds = z.array(z.number().int().positive()).max(5000);

export const personalCollectionUpdateSchema = z.object({
  collectionStatus: z.enum(COLLECTION_STATUSES).nullable().optional(),
  comment: z.string().max(1000).optional(),
  isPrivate: z.boolean().optional(),
  readChapterCount: z.number().int().nonnegative().optional(),
  readVolumeCount: z.number().int().nonnegative().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string().min(1).regex(/^\S+$/)).optional(),
  watchedEpisodeNumbers: z.array(z.number().positive()).max(5000).optional(),
  expectedWatchedEpisodeIds: episodeIds.optional(),
  episodeChanges: z.array(z.object({
    episodeId: z.number().int().positive(),
    watched: z.boolean(),
  })).min(1).max(5000).optional(),
}).refine(value => !(value.episodeChanges && value.watchedEpisodeNumbers), {
  message: '章节增量与批量覆盖不能同时提交',
}).refine(value => !value.episodeChanges || new Set(value.episodeChanges.map(change => change.episodeId)).size === value.episodeChanges.length, {
  message: '章节变更不能包含重复编号',
});

export type PersonalCollectionUpdate = z.infer<typeof personalCollectionUpdateSchema>;

export const personalCollectionSchema = z.object({
  collectionStatus: z.enum(COLLECTION_STATUSES),
  comment: z.string(),
  isPrivate: z.boolean(),
  readChapterCount: z.number().int().nonnegative().optional(),
  readVolumeCount: z.number().int().nonnegative().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  subjectId: z.number().int().positive(),
  tags: z.array(z.string()),
  watchedEpisodeNumbers: z.array(z.number().positive()),
  watchedEpisodeIds: episodeIds,
});

export type PersonalCollection = z.infer<typeof personalCollectionSchema>;
