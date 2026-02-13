import { jsonResponse, withCors } from '../_share';

function buildSpec(requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  return {
    openapi: '3.1.0',
    info: {
      title: 'OST Builder Share API',
      version: '2.0.0',
      description:
        'Create local fragment share links or opt in to account-backed Cloudflare-stored links with TTL and ownership controls.',
    },
    servers: [{ url: origin }],
    paths: {
      '/api/auth/login': {
        get: {
          summary: 'Start OAuth login flow',
          parameters: [
            {
              name: 'provider',
              in: 'query',
              required: true,
              schema: { type: 'string', enum: ['github'] },
            },
            {
              name: 'returnTo',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '302': { description: 'Redirect to OAuth provider' },
          },
        },
      },
      '/api/auth/callback': {
        get: {
          summary: 'OAuth callback endpoint',
          responses: {
            '302': { description: 'Session established and redirected' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Get current session user',
          responses: {
            '200': {
              description: 'Session info',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      featureEnabled: { type: 'boolean' },
                      user: {
                        type: ['object', 'null'],
                        properties: {
                          sub: { type: 'string' },
                          provider: { type: 'string', enum: ['github'] },
                          name: { type: 'string' },
                          email: { type: 'string' },
                          avatarUrl: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          summary: 'Clear current session',
          responses: {
            '200': { description: 'Logged out' },
          },
        },
      },
      '/api/auth/token': {
        post: {
          summary: 'Mint bearer token from session or one-time CLI code',
          responses: {
            '200': { description: 'Bearer token issued' },
            '400': { description: 'Invalid code' },
            '401': { description: 'Authentication required' },
          },
        },
      },
      '/api/auth/cli/callback': {
        get: {
          summary: 'CLI OAuth callback bridge',
          responses: {
            '302': { description: 'Redirects to localhost callback with one-time code' },
          },
        },
      },
      '/api/share/store': {
        post: {
          summary: 'Create account-backed stored share',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    markdown: { type: 'string' },
                    name: { type: 'string' },
                    visibility: { type: 'string', enum: ['public', 'private'] },
                    ttlDays: { type: 'integer', enum: [1, 7, 30, 90] },
                    settings: { type: 'object' },
                    collapsedIds: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['markdown', 'visibility', 'ttlDays'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'Stored share created' },
            '401': { description: 'Authentication required' },
          },
        },
        get: {
          summary: 'List owner shares',
          responses: {
            '200': { description: 'Owner shares list' },
            '401': { description: 'Authentication required' },
          },
        },
      },
      '/api/share/store/{id}': {
        get: {
          summary: 'Get stored share content by ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Stored share payload' },
            '401': { description: 'Private share requires owner auth' },
            '404': { description: 'Not found / expired / deleted' },
          },
        },
        patch: {
          summary: 'Update stored share content or visibility',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Share updated' },
            '401': { description: 'Authentication required' },
            '403': { description: 'Not owner' },
          },
        },
        delete: {
          summary: 'Delete stored share permanently',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Deleted' },
            '401': { description: 'Authentication required' },
            '403': { description: 'Not owner' },
          },
        },
      },
      '/api/share/store/{id}/extend': {
        post: {
          summary: 'Extend stored share TTL from now',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'TTL extended' },
            '401': { description: 'Authentication required' },
            '403': { description: 'Not owner' },
          },
        },
      },
      '/api/share/markdown': {
        post: {
          summary: 'Create a local hash-fragment share link from Markdown',
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
            },
          },
          responses: {
            '200': {
              description: 'Hash-fragment share link created',
            },
          },
        },
      },
      '/api/share/json': {
        post: {
          summary: 'Create a local hash-fragment share link from OST JSON',
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
              description: 'Hash-fragment share link created',
            },
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
