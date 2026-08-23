import { repository as authRepository } from '../auth/repository';
import { fail } from '../lib/http';
import { codesRepository } from './repository';

const now = () => Date.now();

export const codesService = {
  list() {
    return codesRepository.list();
  },

  create(actorId: string, ip: string, input: { code: string; roleAllowed: 'murid' | 'guru'; maxUses?: number; expiresAt?: string }) {
    if (codesRepository.byCode(input.code)) throw fail(409, 'Kode sudah dipakai');
    codesRepository.create(input, now());
    authRepository.log(actorId, 'code_created', ip, { code: input.code, role: input.roleAllowed });
    return this.detail(input.code);
  },

  detail(code: string) {
    const codeRow = codesRepository.byCode(code);
    if (!codeRow) throw fail(404, 'Kode tidak ditemukan');
    return codeRow;
  },

  update(actorId: string, ip: string, code: string, input: Record<string, unknown>) {
    if (!codesRepository.byCode(code)) throw fail(404, 'Kode tidak ditemukan');
    // expiresAt dikonversi ke epoch ms bila diganti.
    const values = { ...input } as Record<string, unknown>;
    if (typeof values.expiresAt === 'string') values.expiresAt = Date.parse(`${values.expiresAt}T23:59:59+07:00`);
    codesRepository.update(code, values, now());
    authRepository.log(actorId, 'code_updated', ip, { code });
    return this.detail(code);
  },
};
