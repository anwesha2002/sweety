import express from 'express';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { serveClient } from '../src/middleware/serveClient.js';

const INDEX_HTML = '<!doctype html><title>Sweety</title><div id="root"></div>';

let distDir: string;
let app: express.Express;

beforeAll(() => {
  // A tiny stand-in for client/dist
  distDir = mkdtempSync(path.join(tmpdir(), 'sweety-client-'));
  mkdirSync(path.join(distDir, 'assets'));
  writeFileSync(path.join(distDir, 'index.html'), INDEX_HTML);
  writeFileSync(path.join(distDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), 'console.log("app")');

  // The same order as app.ts: API first, then the client, then the 404 and error handlers.
  app = express();
  app.get('/api/v1/ping', (_req, res) => res.json({ success: true, message: 'pong' }));
  app.use(serveClient(distDir));
  app.use(notFoundHandler);
  app.use(errorHandler);
});

afterAll(() => {
  rmSync(distDir, { recursive: true, force: true });
});

describe('serveClient', () => {
  it('serves index.html at / and never caches it', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe(INDEX_HTML);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('serves index.html for app routes such as /readings (deep links and reloads)', async () => {
    for (const route of ['/readings', '/reports', '/login', '/dashboard']) {
      const response = await request(app).get(route);

      expect(response.status).toBe(200);
      expect(response.text).toBe(INDEX_HTML);
    }
  });

  it('serves hashed assets with a one-year immutable cache', async () => {
    const response = await request(app).get('/assets/app-abc123.js');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=31536000');
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('serves other static files such as the favicon', async () => {
    const response = await request(app).get('/favicon.svg');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
  });

  it('leaves the API alone: API routes answer, unknown API paths give the JSON 404', async () => {
    const ping = await request(app).get('/api/v1/ping');
    const unknown = await request(app).get('/api/v1/nope');

    expect(ping.body).toEqual({ success: true, message: 'pong' });
    expect(unknown.status).toBe(404);
    expect(unknown.body.success).toBe(false);
    expect(unknown.text).not.toContain('<title>');
  });

  it('gives a JSON 404, not index.html, for missing files', async () => {
    const asset = await request(app).get('/assets/missing.js');
    const file = await request(app).get('/missing.png');

    for (const response of [asset, file]) {
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    }
  });

  it('only serves the app shell for GET requests', async () => {
    const response = await request(app).post('/readings').send({});

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
