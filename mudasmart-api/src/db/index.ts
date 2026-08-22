import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { env } from '../config/env';
import * as schema from './schema';

const file = env.DATABASE_URL.replace(/^file:/, '');
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
export const sqlite = new Database(file);
sqlite.exec('PRAGMA foreign_keys = ON');
export const db = drizzle(sqlite, { schema });
