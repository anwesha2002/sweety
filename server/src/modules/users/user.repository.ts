import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, type User } from '../../db/schema.js';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

/** Callers pass an already normalized (trimmed, lowercase) email. */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function createUser(data: CreateUserData): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  if (!user) throw new Error('Creating the user returned no row.');
  return user;
}
