import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { repository as authRepository } from '../auth/repository';
import { fail } from '../lib/http';
import { studentsRepository } from '../students/repository';
import { leavesRepository } from './repository';

const now = () => Date.now();
// Dibaca lazily agar test bisa mengarahkan ke direktori sementara.
const uploadDir = () => process.env.UPLOAD_DIR ?? './data/uploads';
const ALLOWED_IMAGE = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface CreateLeaveInput {
  studentId?: string;
  date: string;
  type: 'sakit' | 'izin';
  reason: string;
}

export const leavesService = {
  async create(
    actor: { id: string; role: 'murid' | 'guru'; isAdmin: boolean },
    ip: string,
    input: CreateLeaveInput,
    image?: { mimeType: string; bytes: Uint8Array },
  ) {
    // Murid selalu untuk dirinya sendiri; guru boleh menunjuk murid mana pun
    // dan pengajuannya otomatis disetujui (keputusan kewenangan guru).
    const studentId = actor.role === 'murid' ? actor.id : input.studentId ?? '';
    if (!studentId) throw fail(400, 'Murid wajib ditentukan');
    if (!studentsRepository.existsMurid(studentId)) throw fail(404, 'Murid tidak ditemukan');
    if (leavesRepository.byStudentAndDate(studentId, input.date)) {
      throw fail(409, 'Sudah ada pengajuan izin untuk murid pada tanggal itu');
    }

    let imagePath: string | null = null;
    if (image) {
      const ext = ALLOWED_IMAGE.get(image.mimeType);
      if (!ext) throw fail(400, 'Lampiran harus JPG/PNG/WebP');
      if (image.bytes.byteLength > MAX_IMAGE_BYTES) throw fail(400, 'Ukuran lampiran maksimal 5MB');
      mkdirSync(uploadDir(), { recursive: true });
      imagePath = `${randomUUID()}${ext}`;
      writeFileSync(join(uploadDir(), imagePath), image.bytes);
    }

    const approved = actor.role === 'guru';
    const id = leavesRepository.insert({
      studentId,
      date: input.date,
      type: input.type,
      reason: input.reason,
      imagePath,
      status: approved ? 'approved' : 'pending',
      createdBy: actor.id,
      reviewedBy: approved ? actor.id : null,
      reviewedAt: approved ? now() : null,
      createdAt: now(),
      updatedAt: now(),
    }).id;
    authRepository.log(actor.id, 'leave_created', ip, { leaveId: id, studentId, date: input.date, type: input.type, status: approved ? 'approved' : 'pending' });
    return { id, status: approved ? 'approved' : 'pending' };
  },

  mine(studentId: string) {
    return leavesRepository.mine(studentId);
  },

  list(status?: 'pending' | 'approved' | 'rejected') {
    return leavesRepository.list(status);
  },

  review(actorId: string, ip: string, id: number, status: 'approved' | 'rejected') {
    const leave = leavesRepository.byId(id);
    if (!leave) throw fail(404, 'Pengajuan izin tidak ditemukan');
    if (leave.status !== 'pending') throw fail(409, 'Pengajuan ini sudah diputuskan');
    leavesRepository.review(id, status, actorId, now());
    authRepository.log(actorId, 'leave_reviewed', ip, { leaveId: id, studentId: leave.studentId, date: leave.date, status });
    return { id, status };
  },

  canViewImage(requester: { id: string; role: string }, leave: { studentId: string }) {
    return requester.role === 'guru' || requester.id === leave.studentId;
  },

  imageOf(id: number) {
    return leavesRepository.byId(id) ?? null;
  },
};
