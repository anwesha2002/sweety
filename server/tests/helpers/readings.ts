import request from 'supertest';
import { app } from '../../src/app.js';

/** GET /readings with an optional query string such as "from=2026-11-01&pageSize=2". */
export function getReadings(cookie: string[], query = ''): request.Test {
  return request(app)
    .get(`/api/v1/readings${query ? `?${query}` : ''}`)
    .set('Cookie', cookie);
}

/** GET /readings/:id as the user who owns `cookie`. */
export function getReadingById(cookie: string[], id: string): request.Test {
  return request(app).get(`/api/v1/readings/${id}`).set('Cookie', cookie);
}

/** PUT /readings/:id as the user who owns `cookie`. */
export function putReading(cookie: string[], id: string, body: object): request.Test {
  return request(app).put(`/api/v1/readings/${id}`).set('Cookie', cookie).send(body);
}

/** DELETE /readings/:id as the user who owns `cookie`. */
export function removeReading(cookie: string[], id: string): request.Test {
  return request(app).delete(`/api/v1/readings/${id}`).set('Cookie', cookie);
}

/** POST /readings as the user who owns `cookie`. */
export function postReading(cookie: string[], body: object): request.Test {
  return request(app).post('/api/v1/readings').set('Cookie', cookie).send(body);
}
