import { z } from 'zod';

/**
 * PiBooru Database Schema & Types
 * Defined via Zod for runtime validation and type inference.
 */

// --- Posts ---

export const PostRatingSchema = z.enum(['s', 'q', 'e']);
export type PostRating = z.infer<typeof PostRatingSchema>;

export const PostSchema = z.object({
  id: z.number().int().positive(),
  parent_id: z.number().int().positive().nullable(), // For alt versions/children
  has_children: z.boolean().default(false), // Optimization flag
  hash: z.string().min(32), // MD5 or SHA256
  extension: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration: z.number().nonnegative().nullable(), // For videos
  rating: PostRatingSchema.default('s'),
  source: z.string().url().or(z.string().length(0)).nullable(),
  user_id: z.number().int().positive().nullable(),
  created_at: z.string(), // ISO 8601 string from SQLite
});

export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = PostSchema.omit({ 
  id: true, 
  created_at: true 
}).extend({
  has_children: z.boolean().optional().default(false),
});
export type CreatePost = z.infer<typeof CreatePostSchema>;

// --- Tags ---

export const TagNamespaceSchema = z.enum(['general', 'artist', 'character', 'copyright', 'meta']);
export type TagNamespace = z.infer<typeof TagNamespaceSchema>;

export const TagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  namespace: TagNamespaceSchema.default('general'),
  post_count: z.number().int().nonnegative().default(0),
});

export type Tag = z.infer<typeof TagSchema>;

export const CreateTagSchema = TagSchema.omit({ 
  id: true,
  post_count: true 
});
export type CreateTag = z.infer<typeof CreateTagSchema>;

// --- Post Tags (Junction) ---

export const PostTagSchema = z.object({
  post_id: z.number().int().positive(),
  tag_id: z.number().int().positive(),
});

export type PostTag = z.infer<typeof PostTagSchema>;

// --- Tag Aliases ---

export const TagAliasSchema = z.object({
  id: z.number().int().positive(),
  alias_name: z.string().min(1),
  target_tag_id: z.number().int().positive(),
});

export type TagAlias = z.infer<typeof TagAliasSchema>;

// --- Tag Implications ---

export const TagImplicationSchema = z.object({
  id: z.number().int().positive(),
  source_tag_id: z.number().int().positive(),
  target_tag_id: z.number().int().positive(),
});

export type TagImplication = z.infer<typeof TagImplicationSchema>;

// --- Users (Future-proofing) ---

export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(32),
  password_hash: z.string().min(1),
  api_key: z.string().nullable().optional(),
  created_at: z.string(),
});

export type User = z.infer<typeof UserSchema>;

// --- Audio Overlays (Future-proofing) ---

export const AudioOverlaySchema = z.object({
  id: z.number().int().positive(),
  post_id: z.number().int().positive(),
  file_path: z.string().min(1),
  start_ms: z.number().int().nonnegative().default(0),
  duration_ms: z.number().int().positive().nullable(),
});

export type AudioOverlay = z.infer<typeof AudioOverlaySchema>;
