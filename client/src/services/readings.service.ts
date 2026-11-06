import type { ApiSuccess } from '../types/api';
import type { Reading, ReadingInput, ReadingsPage, ReadingsQuery } from '../types/reading';
import { api } from './api';

interface ReadingPayload {
  reading: Reading;
}

export async function listReadings(query: ReadingsQuery = {}): Promise<ReadingsPage> {
  // Axios leaves out params that are undefined.
  const { data } = await api.get<ApiSuccess<ReadingsPage>>('/readings', { params: query });
  return data.data;
}

export async function createReading(input: ReadingInput): Promise<Reading> {
  const { data } = await api.post<ApiSuccess<ReadingPayload>>('/readings', input);
  return data.data.reading;
}

export async function updateReading(id: string, input: Partial<ReadingInput>): Promise<Reading> {
  const { data } = await api.put<ApiSuccess<ReadingPayload>>(`/readings/${id}`, input);
  return data.data.reading;
}

export async function deleteReading(id: string): Promise<void> {
  await api.delete(`/readings/${id}`);
}
