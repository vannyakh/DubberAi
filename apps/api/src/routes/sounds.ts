import { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * Freesound.org proxy, ported from OpenCut's Next.js /api/sounds/search
 * route. Requires FREESOUND_API_KEY (https://freesound.org/apiv2/apply).
 */

const searchParamsSchema = z.object({
  q: z.string().max(500, 'Query too long').optional(),
  type: z.enum(['effects', 'music']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  page_size: z.coerce.number().int().min(1).max(150).default(20),
  sort: z.enum(['downloads', 'rating', 'created', 'score']).default('downloads'),
  min_rating: z.coerce.number().min(0).max(5).default(3),
  commercial_only: z.coerce.boolean().default(true),
});

interface FreesoundResult {
  id: number;
  name: string;
  description: string;
  url: string;
  previews?: Record<string, string>;
  download?: string;
  duration: number;
  filesize: number;
  type: string;
  channels: number;
  bitrate: number;
  bitdepth: number;
  samplerate: number;
  username: string;
  tags: string[];
  license: string;
  created: string;
  num_downloads?: number;
  avg_rating?: number;
  num_ratings?: number;
}

function buildSortParameter({ query, sort }: { query?: string; sort: string }) {
  if (!query) return `${sort}_desc`;
  return sort === 'score' ? 'score' : `${sort}_desc`;
}

function applyEffectsFilters({
  params,
  min_rating,
  commercial_only,
}: {
  params: URLSearchParams;
  min_rating: number;
  commercial_only: boolean;
}) {
  params.append('filter', 'duration:[* TO 30.0]');
  params.append('filter', `avg_rating:[${min_rating} TO *]`);

  if (commercial_only) {
    params.append(
      'filter',
      'license:("Attribution" OR "Creative Commons 0" OR "Attribution Noncommercial" OR "Attribution Commercial")',
    );
  }

  params.append(
    'filter',
    'tag:sound-effect OR tag:sfx OR tag:foley OR tag:ambient OR tag:nature OR tag:mechanical OR tag:electronic OR tag:impact OR tag:whoosh OR tag:explosion',
  );
}

function transformFreesoundResult(result: FreesoundResult) {
  return {
    id: result.id,
    name: result.name,
    description: result.description,
    url: result.url,
    previewUrl:
      result.previews?.['preview-hq-mp3'] || result.previews?.['preview-lq-mp3'],
    downloadUrl: result.download,
    duration: result.duration,
    filesize: result.filesize,
    type: result.type,
    channels: result.channels,
    bitrate: result.bitrate,
    bitdepth: result.bitdepth,
    samplerate: result.samplerate,
    username: result.username,
    tags: result.tags,
    license: result.license,
    created: result.created,
    downloads: result.num_downloads || 0,
    rating: result.avg_rating || 0,
    ratingCount: result.num_ratings || 0,
  };
}

function applyMusicFilters({
  params,
  min_rating,
  commercial_only,
}: {
  params: URLSearchParams;
  min_rating: number;
  commercial_only: boolean;
}) {
  params.append('filter', 'duration:[30.0 TO 600.0]');
  params.append('filter', `avg_rating:[${min_rating} TO *]`);

  if (commercial_only) {
    params.append(
      'filter',
      'license:("Attribution" OR "Creative Commons 0" OR "Attribution Noncommercial" OR "Attribution Commercial")',
    );
  }

  params.append(
    'filter',
    'tag:music OR tag:soundtrack OR tag:loop OR tag:ambient OR tag:instrumental OR tag:cinematic OR tag:background-music OR tag:score',
  );
}

export async function soundRoutes(app: FastifyInstance) {
  app.get('/search', async (request, reply) => {
    const apiKey = process.env.FREESOUND_API_KEY || '';
    if (!apiKey) {
      return reply.status(503).send({
        error: 'Sound search is not configured',
        message:
          'Set FREESOUND_API_KEY in the root .env (get one at https://freesound.org/apiv2/apply).',
      });
    }

    const validation = searchParamsSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Invalid parameters',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const {
      q: query,
      type,
      page,
      page_size: pageSize,
      sort,
      min_rating,
      commercial_only,
    } = validation.data;

    const params = new URLSearchParams({
      query: query || '',
      token: apiKey,
      page: page.toString(),
      page_size: pageSize.toString(),
      sort: buildSortParameter({ query, sort }),
      fields:
        'id,name,description,url,previews,download,duration,filesize,type,channels,bitrate,bitdepth,samplerate,username,tags,license,created,num_downloads,avg_rating,num_ratings',
    });

    if (type === 'music') {
      applyMusicFilters({ params, min_rating, commercial_only });
    } else if (type === 'effects' || !type) {
      applyEffectsFilters({ params, min_rating, commercial_only });
    }

    const response = await fetch(
      `https://freesound.org/apiv2/search/text/?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      request.log.error(
        { status: response.status, body: errorText },
        'Freesound API error',
      );
      return reply
        .status(response.status)
        .send({ error: 'Failed to search sounds' });
    }

    const data = (await response.json()) as {
      count: number;
      next: string | null;
      previous: string | null;
      results: FreesoundResult[];
    };

    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results.map(transformFreesoundResult),
      query: query || '',
      type: type || 'effects',
      page,
      pageSize,
      sort,
      minRating: min_rating,
    };
  });
}
