export interface XrfElementPayload {
  name: string;
  concentration: number;
  error?: number;
  unit?: string;
}

export interface XrfIngestionPayload {
  api_key?: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
  db_source: string;
  report_id: number;
  sample_name: string;
  sample_supplier?: string;
  test_date?: string | Date;
  timestamp_ms?: number;
  test_time?: number;
  tub_voltage?: number;
  tub_current?: number;
  work_curve_name?: string;
  grade?: string;
  operator?: string;
  gps?: string;
  longitude?: number;
  latitude?: number;
  altitude?: number;
  cps?: number;
  counts?: number;
  temperature?: number;
  elements?: XrfElementPayload[];
}

export interface XrfAdminAuthInput {
  username: string;
  password: string;
  device_id?: string;
}

export interface XrfQueryFilter {
  page?: number;
  limit?: number;
  search?: string;
  deviceId?: string;
  dbSource?: string;
  workCurve?: string;
  startDate?: string;
  endDate?: string;
  sampleId?: number;
}

export interface LinkSampleInput {
  sampleId?: number;
  kodeSampel?: string;
}
