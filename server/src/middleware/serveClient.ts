import express, { Router } from 'express';
import path from 'node:path';

/**
 * Serves the built React app (client/dist) from the API server itself, so the whole app is one
 * process on one origin. Used by the single-container deployment (see the root Dockerfile); the
 * two-container setup serves the React app with nginx instead.
 *
 * Mount it AFTER the API routes. Anything under /api/ is left alone, so unknown API paths still
 * get the API's JSON 404.
 */
export function serveClient(distDir: string): Router {
  const root = path.resolve(distDir);
  const indexFile = path.join(root, 'index.html');
  const router = Router();

  // Files in /assets have a content hash in their name, so they can be cached for a year.
  router.use(
    '/assets',
    express.static(path.join(root, 'assets'), { maxAge: '1y', immutable: true }),
  );

  // Other static files (favicon, ...). `index: false`: the app shell is sent by the route below.
  router.use(express.static(root, { index: false }));

  // The React app handles its own routes (/readings, /reports, ...), so any other page request
  // gets index.html. Paths with a file extension are real files that do not exist: let those 404.
  // index.html is never cached, so a new deployment is picked up straight away.
  router.get(/^\/(?!api\/|assets\/)[^.]*$/, (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });

  return router;
}
