import { XrfRepository } from './xrf.repository.js';
import { SampleRepository } from '../sample/sample.repository.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PasswordUtil } from '../auth/utils/password.util.js';
import { JwtUtil } from '../auth/utils/jwt.util.js';
import { AppError } from '../../common/errors/app-error.js';
import {
  XrfIngestionPayload,
  XrfAdminAuthInput,
  XrfQueryFilter,
  LinkSampleInput,
} from './xrf.types.js';

const XRF_SECRET_KEY = process.env.XRF_SECRET_KEY || 'xrf_secret_labmineral_2026';

export class XrfService {
  /**
   * Helper serialisasi BigInt untuk response JSON aman
   */
  private static serializeMeasurement(m: any) {
    if (!m) return null;
    return {
      ...m,
      timestampMs: m.timestampMs !== null && m.timestampMs !== undefined ? Number(m.timestampMs) : null,
    };
  }

  /**
   * Status API Receiver & Health Check
   */
  static getHealthStatus(host?: string) {
    return {
      status: 'online',
      service: 'XRF Explorer 7000 API Receiver (AISPEKTRA Engine)',
      mode: 'DATABASE_SAVING_ENABLED',
      message: 'API Receiver is ONLINE and listening for HTTP POST JSON requests from XRF Explorer 7000.',
      dashboard_url: host ? `http://${host}/api/v1/xrf/devices` : '/api/v1/xrf/devices',
    };
  }

  /**
   * Ingestion data spektrum XRF Explorer 7000 / Android App
   */
  static async processIngestion(payload: XrfIngestionPayload, clientIp?: string) {
    // 1. Verifikasi API Key
    const providedKey = payload.api_key;
    if (XRF_SECRET_KEY && providedKey !== XRF_SECRET_KEY) {
      throw AppError.unauthorized(
        `Akses ditolak: API Key XRF tidak valid dari IP ${clientIp || 'unknown'}`,
        'INVALID_XRF_API_KEY'
      );
    }

    const deviceId = payload.device_id.trim();

    // 2. Selalu perbarui detak jantung (heartbeat) perangkat
    await XrfRepository.upsertDevice({
      deviceId,
      deviceName: payload.device_name,
      deviceType: payload.device_type,
      ipAddress: clientIp,
    });

    // 3. Tangani permintaan ping / heartbeat murni tanpa data scan
    if (payload.db_source === 'ping' || payload.db_source === 'connection_test') {
      return {
        status: 'success',
        mode: 'heartbeat',
        message: 'Koneksi Wi-Fi XRF Explorer 7000 terverifikasi. Status perangkat diperbarui.',
        connection: {
          client_ip: clientIp || '127.0.0.1',
          device_id: deviceId,
          received_at: new Date().toISOString(),
          sample_name: payload.sample_name,
          db_source: payload.db_source,
          report_id: payload.report_id,
        },
      };
    }

    // 4. Auto-Matching dengan Kode Sampel LIMS (jika ada sampel yang cocok)
    let matchedSampleId: number | null = null;
    const existingSample = await SampleRepository.findSampleByKode(payload.sample_name.trim());
    if (existingSample) {
      matchedSampleId = existingSample.id;
    }

    // 5. Simpan data pengukuran dan rincian konsentrasi elemen
    const result = await XrfRepository.saveMeasurement(payload, matchedSampleId);

    // 6. Catat audit trail aktivitas
    await SampleRepository.logActivity({
      action: `XRF_INGESTION: #${deviceId} - ${payload.sample_name} (${payload.db_source}) [${result.action.toUpperCase()}]`,
      sampleId: matchedSampleId || undefined,
    });

    return {
      status: 'success',
      mode: 'database_saving_enabled',
      action: result.action,
      measurement_id: result.measurement.id,
      matched_sample_id: matchedSampleId,
      message: 'Data pengukuran XRF berhasil disimpan dan disinkronkan ke sistem AISPEKTRA.',
      measurement: this.serializeMeasurement(result.measurement),
    };
  }

  /**
   * Autentikasi Admin/Supervisor untuk membuka kunci aplikasi XRF (Explorer 7000 / Android)
   */
  static async authenticateAdmin(input: XrfAdminAuthInput, clientIp?: string) {
    const username = input.username.trim();
    const deviceId = input.device_id?.trim() || 'XRF-7000';

    // 1. Cari pengguna di database
    const user = await AuthRepository.findByIdentifier(username);
    if (!user) {
      await XrfRepository.logAdminAuth({
        username,
        deviceId,
        ipAddress: clientIp,
        status: 'FAILED_USER',
        message: 'Percobaan login dengan username tidak terdaftar',
      });
      throw AppError.unauthorized('Username atau Password salah', 'INVALID_CREDENTIALS');
    }

    // 2. Verifikasi Password (dengan dukungan format bcrypt $2y$ dan $2b$)
    const verification = await PasswordUtil.verifyAndCheckRehash(input.password, user.password);
    if (!verification.isValid) {
      await XrfRepository.logAdminAuth({
        penggunaId: user.id,
        username,
        role: user.role,
        deviceId,
        ipAddress: clientIp,
        status: 'FAILED_PASSWORD',
        message: 'Password tidak cocok',
      });
      throw AppError.unauthorized('Username atau Password salah', 'INVALID_CREDENTIALS');
    }

    // 3. Validasi Otorisasi Role: HANYA Admin dan Supervisor yang diizinkan!
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      await XrfRepository.logAdminAuth({
        penggunaId: user.id,
        username,
        role: user.role,
        deviceId,
        ipAddress: clientIp,
        status: 'FAILED_ROLE',
        message: `Percobaan akses oleh role '${user.role}' ditolak`,
      });
      throw AppError.forbidden(
        `Akses ditolak: Hanya Administrator atau Supervisor yang memiliki wewenang membuka perangkat XRF`,
        'XRF_ADMIN_ROLE_FORBIDDEN'
      );
    }

    // 4. Catat riwayat otentikasi sukses
    await XrfRepository.logAdminAuth({
      penggunaId: user.id,
      username,
      role: user.role,
      deviceId,
      ipAddress: clientIp,
      status: 'SUCCESS',
      message: 'Otorisasi unlock XRF berhasil',
    });

    // 5. Terbitkan Token Sesi
    const tokens = JwtUtil.generateAuthTokens({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      status: 'success',
      message: `Akses XRF diberikan untuk ${user.nama} (${user.role})`,
      token: tokens.accessToken,
      user: {
        id: user.id,
        nama: user.nama,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Ambil status seluruh instrumen XRF dan status heartbeat
   */
  static async getDevices() {
    const devices = await XrfRepository.findAllDevices();
    const totalMeasurements = await XrfRepository.countTotalMeasurements();
    const now = Date.now();

    // Ambang batas online: heartbeat diterima dalam 5 menit terakhir (300.000 ms)
    const formatted = devices.map((d) => {
      const diffMs = d.lastSeenAt ? now - new Date(d.lastSeenAt).getTime() : Infinity;
      const isOnline = diffMs <= 5 * 60 * 1000;
      return {
        ...d,
        is_online: isOnline,
        status: isOnline ? 'online' : 'offline',
      };
    });

    return {
      devices: formatted,
      total_measurements: totalMeasurements,
      server_time: Math.floor(now / 1000),
    };
  }

  /**
   * Ambil daftar riwayat pengukuran XRF
   */
  static async getMeasurements(filters: XrfQueryFilter) {
    const result = await XrfRepository.findAllMeasurements(filters);
    return {
      ...result,
      data: result.data.map((m) => this.serializeMeasurement(m)),
    };
  }

  /**
   * Ambil detail pengukuran XRF
   */
  static async getMeasurementById(id: number) {
    const m = await XrfRepository.findMeasurementById(id);
    if (!m) {
      throw AppError.notFound(`Data pengukuran XRF dengan ID ${id} tidak ditemukan`, 'MEASUREMENT_NOT_FOUND');
    }
    return this.serializeMeasurement(m);
  }

  /**
   * Tautkan hasil scan XRF ke sampel laboratorium
   */
  static async linkSample(measurementId: number, input: LinkSampleInput) {
    const measurement = await XrfRepository.findMeasurementById(measurementId);
    if (!measurement) {
      throw AppError.notFound(`Data pengukuran XRF dengan ID ${measurementId} tidak ditemukan`, 'MEASUREMENT_NOT_FOUND');
    }

    let targetSampleId = input.sampleId;
    if (!targetSampleId && input.kodeSampel) {
      const sample = await SampleRepository.findSampleByKode(input.kodeSampel.trim());
      if (!sample) {
        throw AppError.notFound(`Sampel dengan kode '${input.kodeSampel}' tidak ditemukan`, 'SAMPLE_NOT_FOUND');
      }
      targetSampleId = sample.id;
    }

    if (!targetSampleId) {
      throw AppError.badRequest('ID sampel atau kode sampel wajib disertakan', 'SAMPLE_IDENTIFIER_REQUIRED');
    }

    const updated = await XrfRepository.linkSample(measurementId, targetSampleId);

    await SampleRepository.logActivity({
      action: `XRF_LINKED: Pengukuran #${measurementId} ditautkan ke Sampel #${targetSampleId}`,
      sampleId: targetSampleId,
    });

    return this.serializeMeasurement(updated);
  }
}
