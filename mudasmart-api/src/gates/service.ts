import { randomBytes } from 'node:crypto';
import { repository as authRepository } from '../auth/repository';
import { fail } from '../lib/http';
import { gatesRepository } from './repository';

const now = () => Date.now();
// Nilai QR acak — keamanan absensi tidak bergantung pada kerahasiaannya (device binding + validasi server), tapi tetap unik per gerbang.
const newQrValue = () => `gate-${randomBytes(12).toString('base64url')}`;

export const gatesService = {
  list() {
    return gatesRepository.list();
  },

  detail(id: number) {
    const gate = gatesRepository.byId(id);
    if (!gate) throw fail(404, 'Gerbang tidak ditemukan');
    return gate;
  },

  create(actorId: string, ip: string, input: { name: string; latitude?: number; longitude?: number; radiusMeters?: number }) {
    const created = gatesRepository.create({ ...input, qrCodeValue: newQrValue() }, now());
    authRepository.log(actorId, 'gate_created', ip, { gateId: created!.id, name: input.name });
    return this.detail(created!.id);
  },

  update(actorId: string, ip: string, id: number, input: Record<string, unknown> & { regenerateQr?: boolean }) {
    if (!gatesRepository.byId(id)) throw fail(404, 'Gerbang tidak ditemukan');
    const { regenerateQr, ...values } = input;
    if (regenerateQr) values.qrCodeValue = newQrValue();
    gatesRepository.update(id, values, now());
    authRepository.log(actorId, 'gate_updated', ip, { gateId: id, regenerated: regenerateQr === true });
    return this.detail(id);
  },
};
