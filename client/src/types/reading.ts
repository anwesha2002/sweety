export type ReadingSlot = 'MORNING' | 'AFTER_BREAKFAST' | 'AFTER_LUNCH' | 'AFTER_DINNER';

/** A reading as returned by the API (see docs/api.md). `date` is YYYY-MM-DD. */
export interface Reading {
  id: string;
  date: string;
  slot: ReadingSlot;
  value: number; // mg/dl
  createdAt: string; // ISO timestamp
}

/** What the API needs to create (or partly update) a reading. */
export interface ReadingInput {
  date: string; // YYYY-MM-DD
  slot: ReadingSlot;
  value: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ReadingsPage {
  items: Reading[];
  pagination: Pagination;
}

/** Query parameters of GET /readings. Leave a field out to use the server default. */
export interface ReadingsQuery {
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
  page?: number;
  pageSize?: number;
}
