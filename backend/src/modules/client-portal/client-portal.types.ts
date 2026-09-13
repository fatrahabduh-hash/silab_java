export type SampleLifecycleStage =
  | 'PENGAJUAN_SSF'
  | 'PENERIMAAN'
  | 'WORK_ORDER'
  | 'PREPARASI'
  | 'PENGUJIAN'
  | 'QUALITY_CONTROL'
  | 'SELESAI';

export interface SampleProgressItem {
  id: number;
  kodeSampel: string;
  jenisMaterial: string;
  status: string;
  currentStage: SampleLifecycleStage;
  progressPct: number;
  hasWorkOrder: boolean;
  hasPreparation: boolean;
  hasTestResult: boolean;
  hasQc: boolean;
  resultsCount: number;
}

export interface ClientTrackResult {
  kodeAkses: string;
  klien: string;
  submission?: {
    id: number;
    nomorSubmission: string;
    tanggalSubmit: Date;
    status: string;
    totalItemSampel: number;
  } | null;
  receipt?: {
    id: number;
    nomorPenerimaan: string;
    tanggalTerima: Date;
    jumlahSampel: number;
    status: string;
  } | null;
  samples: SampleProgressItem[];
  overallStatus: string;
  overallProgress: number;
}
