import { repository as authRepository } from '../auth/repository';
import { db } from '../db';
import { fail } from '../lib/http';
import { gurusRepository } from './repository';

const now = () => Date.now();

export const gurusService = {
  list() {
    return gurusRepository.list();
  },

  setAdmin(actorId: string, ip: string, id: string, isAdmin: boolean) {
    const guru = gurusRepository.byId(id);
    if (!guru) throw fail(404, 'Guru tidak ditemukan');
    if (!guru.isActive) throw fail(400, 'Guru nonaktif tidak bisa diubah');
    if (id === actorId) throw fail(400, 'Tidak bisa mengubah role admin diri sendiri');
    // Jangan biarkan admin terakhir dicabut — minimal satu admin harus tersisa.
    const admins = gurusRepository.list().filter((row) => row.isAdmin && row.isActive && row.id !== id);
    if (!isAdmin && admins.length === 0) throw fail(400, 'Minimal harus ada satu guru admin');
    gurusRepository.setAdmin(id, isAdmin, now());
    authRepository.log(actorId, 'guru_admin_toggled', ip, { targetId: id, isAdmin });
    return gurusRepository.detail(id);
  },

  deactivate(actorId: string, ip: string, id: string) {
    const guru = gurusRepository.byId(id);
    if (!guru) throw fail(404, 'Guru tidak ditemukan');
    if (id === actorId) throw fail(400, 'Tidak bisa menonaktifkan diri sendiri');
    if (guru.isAdmin) {
      const otherAdmins = gurusRepository.list().filter((row) => row.isAdmin && row.isActive && row.id !== id);
      if (otherAdmins.length === 0) throw fail(400, 'Jadikan guru lain admin dulu sebelum menonaktifkan admin ini');
    }
    db.transaction(() => {
      gurusRepository.deactivate(id, now());
      authRepository.revokeAllForUser.run({ userId: id, now: now() });
      authRepository.log(actorId, 'guru_deactivated', ip, { targetId: id });
    });
  },
};
