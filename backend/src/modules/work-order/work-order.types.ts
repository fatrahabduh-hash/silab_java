import { WorkOrderPriority, WorkOrderStatus, EquipmentStatus } from '@prisma/client';

export { WorkOrderPriority, WorkOrderStatus, EquipmentStatus };

export interface CreateWorkOrderInput {
  nomorWo?: string;
  mode?: 'batch' | 'single';
  penerimaanId?: number | null;
  sampelIds?: number[];
  analisId?: number | null;
  peralatanId?: number | null;
  parameter?: string;
  metode?: string;
  prioritas?: WorkOrderPriority;
  jadwalMulai?: string | Date;
  jadwalSelesai?: string | Date;
  statusAwal?: 'draft' | 'aktif';
  catatan?: string;
}

export interface UpdateWorkOrderStatusInput {
  status: 'aktif' | 'selesai' | 'dibatalkan';
  catatan?: string;
}

export interface WorkOrderQueryFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkOrderStatus;
  prioritas?: WorkOrderPriority;
  analisId?: number;
  penerimaanId?: number;
}
