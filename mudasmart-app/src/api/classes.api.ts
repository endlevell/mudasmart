import { api } from './client';
import type { Student } from './students.api';

export interface ClassRoom {
  id: number;
  name: string;
  gradeLevel: number;
  academicYear: string;
  homeroomTeacherId: string | null;
  isActive: boolean;
  studentCount: number;
}

export interface ClassDetail extends ClassRoom {
  students: Pick<Student, 'id' | 'fullName' | 'nis'>[];
}

export const classesApi = {
  list: () => api.get<{ data: ClassRoom[] }>('/api/classes'),
  detail: (id: number) => api.get<ClassDetail>(`/api/classes/${id}`),
  create: (input: { name: string; gradeLevel: number; academicYear: string }) =>
    api.post<ClassDetail>('/api/classes', input, true),
  update: (id: number, input: { name?: string; gradeLevel?: number; academicYear?: string; isActive?: boolean }) =>
    api.patch<ClassDetail>(`/api/classes/${id}`, input),
};
