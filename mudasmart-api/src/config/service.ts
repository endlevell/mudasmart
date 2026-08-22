import { repository as authRepository } from '../auth/repository';
import { fail } from '../lib/http';
import { hhmmToMinutes } from '../lib/time';
import { configRepository } from './repository';

const now = () => Date.now();
const DEFAULTS = { checkInStart: '06:00', onTimeCutoff: '07:00', checkInEnd: '08:00' };

export const configService = {
  get() {
    return configRepository.latest() ?? this.createDefaults(null, 'system-init');
  },

  createDefaults(actorId: string | null, ip: string) {
    const created = configRepository.create(DEFAULTS, now());
    authRepository.log(actorId, 'config_updated', ip, { source: 'default', configId: created!.id });
    return configRepository.latest()!;
  },

  update(actorId: string, ip: string, input: { checkInStart: string; onTimeCutoff: string; checkInEnd: string }) {
    const start = hhmmToMinutes(input.checkInStart);
    const cutoff = hhmmToMinutes(input.onTimeCutoff);
    const end = hhmmToMinutes(input.checkInEnd);
    if (!(start <= cutoff && cutoff <= end)) throw fail(400, 'Urutan jam tidak valid (mulai ≤ batas telat ≤ akhir)');
    const existing = configRepository.latest();
    if (!existing) {
      configRepository.create({ ...input, updatedBy: actorId }, now());
    } else {
      configRepository.update(existing.id, { ...input, updatedBy: actorId }, now());
    }
    authRepository.log(actorId, 'config_updated', ip, { ...input });
    return configRepository.latest()!;
  },
};
