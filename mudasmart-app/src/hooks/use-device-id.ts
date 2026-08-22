import { getOrCreateDeviceId } from '@/utils/secure-storage';

// UUID perangkat dibuat sekali, disimpan aman, dipakai ulang untuk login/refresh/scan.
export const useDeviceId = getOrCreateDeviceId;
