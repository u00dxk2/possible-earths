import { defineCollection, z } from 'astro:content';

const mapSet = z.object({
  terrain: z.string(),
  satellite: z.string(),
  koppen: z.string(),
  temperature: z.string().optional(),
});

const scenarios = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    tagline: z.string(),
    era: z.string(),
    scenarioType: z.enum(['counterfactual', 'paleo', 'projection']),
    status: z.enum(['draft', 'published']),
    publishedAt: z.coerce.date(),
    cover: z.string(),
    heightmapInput: z.string(),
    maps: z.object({
      before: mapSet,
      after: mapSet,
    }),
    sources: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url(),
        }),
      )
      .default([]),
    caveats: z.string().optional(),
  }),
});

export const collections = { scenarios };
