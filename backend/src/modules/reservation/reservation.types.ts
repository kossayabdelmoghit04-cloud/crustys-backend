import { ReservationStatus } from '@prisma/client';

export interface CreateReservationDTO {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  reservationDate: string; // ISO String ou Date String YYYY-MM-DD
  reservationTime: string; // "HH:MM"
  guestsCount: number;
  notes?: string | null;
}

export interface UpdateReservationDTO {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  reservationDate?: string;
  reservationTime?: string;
  guestsCount?: number;
  status?: ReservationStatus;
  notes?: string | null;
}

export interface ReservationQueryFilters {
  page?: string | number;
  limit?: string | number;
  status?: ReservationStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
