import { z } from "zod";

export const slugRe = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;
export const routeRe = /^\/[A-Za-z0-9._/-]+$/;

export const projectIndexEntrySchema = z.object({
  slug: z.string().regex(slugRe),
  path: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  runtime: z.enum(["static", "dynamic"]),
  visibility: z.enum(["private", "public"]),
  entry: z.string().min(1),
  route: z.string().regex(routeRe),
  updatedAt: z.string().datetime({ offset: true })
}).strict();

export const projectsIndexSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().datetime({ offset: true }),
  projects: z.array(projectIndexEntrySchema)
}).strict();

export const projectJsonSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().trim().min(1).max(120),
  slug: z.string().regex(slugRe),
  description: z.string().max(500),
  runtime: z.enum(["static", "dynamic"]),
  entry: z.string().min(1),
  route: z.string().regex(routeRe),
  visibility: z.enum(["private", "public"]),
  tags: z.array(z.string().min(1).max(32)).max(16),
  latestVersion: z.string().min(1).max(64),
  mainLanguage: z.string().min(1).max(32),
  framework: z.string().min(1).max(32),
  owner: z.string().min(1).max(64),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
}).strict();

export type ProjectIndexEntry = z.infer<typeof projectIndexEntrySchema>;
export type ProjectsIndex = z.infer<typeof projectsIndexSchema>;
export type ManagedProject = z.infer<typeof projectJsonSchema>;
