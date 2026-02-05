import { jsonResponse, withCors } from '../_share';

function buildSpec(requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  return {
    openapi: '3.1.0',
    info: {
      title: 'OST Builder Share API',
      version: '1.0.0',
      description: 'Create shareable OST links from Markdown or OST JSON payloads.',
    },
    servers: [{ url: origin }],
    paths: {
      '/api/share/markdown': {
        post: {
          summary: 'Create a share link from Markdown',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    markdown: { type: 'string' },
                    name: { type: 'string' },
                    baseUrl: { type: 'string' },
                  },
                  required: ['markdown'],
                },
              },
              'text/plain': {
                schema: { type: 'string' },
              },
              'text/markdown': {
                schema: { type: 'string' },
              },
            },
          },
          parameters: [
            {
              name: 'name',
              in: 'query',
              schema: { type: 'string' },
              description: 'Optional project name when sending raw text.',
            },
            {
              name: 'baseUrl',
              in: 'query',
              schema: { type: 'string' },
              description: 'Override base URL used in share link.',
            },
          ],
          responses: {
            '200': {
              description: 'Share link created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      link: { type: 'string' },
                      fragment: { type: 'string' },
                      name: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing markdown content' },
          },
        },
      },
      '/api/share/json': {
        post: {
          summary: 'Create a share link from OST JSON',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tree: { type: 'object' },
                    name: { type: 'string' },
                    baseUrl: { type: 'string' },
                  },
                  required: ['tree'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Share link created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      link: { type: 'string' },
                      fragment: { type: 'string' },
                      name: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing OST tree data' },
          },
        },
      },
      '/api/openapi.json': {
        get: {
          summary: 'OpenAPI document (JSON)',
          responses: {
            '200': {
              description: 'OpenAPI document',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  };
}

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: withCors() });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  return jsonResponse(buildSpec(request.url));
}
