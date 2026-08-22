import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env';

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ttl = env.ACCESS_TOKEN_TTL;
export type Role = 'murid' | 'guru';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const id = (): string => randomUUID();
export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id });
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);
export const signAccessToken = (user: { id: string; role: Role }) => new SignJWT({ role: user.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setJti(id()).setIssuedAt().setExpirationTime(ttl).sign(secret);
export const verifyAccessToken = async (token: string) => { const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] }); if (typeof payload.sub !== 'string' || (payload.role !== 'murid' && payload.role !== 'guru')) throw new Error('invalid token'); return { id: payload.sub, role: payload.role as Role }; };
