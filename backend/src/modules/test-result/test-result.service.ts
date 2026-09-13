import { TestResultRepository } from './test-result.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreateTestResultInput,
  CreateBatchTestResultInput,
  UpdateTestResultInput,
  TestResultQueryFilter,
} from './test-result.types.js';

export class TestResultService {
  /**
   * Input hasil uji tunggal
   */
  static async createTestResult(input: CreateTestResultInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki wewenang menginput hasil uji laboratorium',
        'FORBIDDEN_TEST_RESULT_CREATION'
      );
    }

    // Verifikasi keberadaan sampel
    const sample = await prisma.sample.findUnique({
      where: { id: input.sampelId },
    });

    if (!sample) {
      throw AppError.notFound(
        `Sampel dengan ID ${input.sampelId} tidak ditemukan di sistem`,
        'SAMPLE_NOT_FOUND'
      );
    }

    return TestResultRepository.createTestResult(input, user.sub);
  }

  /**
   * Input hasil uji batch kolektif
   */
  static async createBatchTestResults(input: CreateBatchTestResultInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki wewenang menginput hasil uji laboratorium',
        'FORBIDDEN_TEST_RESULT_CREATION'
      );
    }

    const sampleIds = Array.from(new Set(input.rows.map((r) => r.sampelId)));
    const existingSamples = await prisma.sample.findMany({
      where: { id: { in: sampleIds } },
      select: { id: true },
    });

    if (existingSamples.length !== sampleIds.length) {
      throw AppError.notFound(
        'Satu atau lebih ID sampel dalam baris pengujian tidak ditemukan di sistem',
        'SAMPLE_NOT_FOUND'
      );
    }

    return TestResultRepository.createBatchTestResults(input, user.sub);
  }

  /**
   * Mengambil daftar hasil uji laboratorium dengan pagination dan filter
   */
  static async getTestResults(query: TestResultQueryFilter, user: JwtUserPayload) {
    let clientFilter: string | undefined;

    if (user.role === 'client' || user.role === 'klien') {
      clientFilter = user.username;
    }

    return TestResultRepository.findTestResults(query, clientFilter);
  }

  /**
   * Mengambil detail hasil uji berdasarkan ID
   */
  static async getTestResultById(id: number, user: JwtUserPayload) {
    const result = await TestResultRepository.findTestResultById(id);

    if (!result) {
      throw AppError.notFound(
        `Hasil uji dengan ID ${id} tidak ditemukan`,
        'TEST_RESULT_NOT_FOUND'
      );
    }

    // Isolasi multi-tenant Klien
    if (user.role === 'client' || user.role === 'klien') {
      if (result.sample.klien !== user.username) {
        throw AppError.forbidden(
          'Akses ditolak: Anda tidak memiliki izin melihat data hasil pengujian sampel ini',
          'FORBIDDEN_CLIENT_TEST_ACCESS'
        );
      }
    }

    return result;
  }

  /**
   * Memperbarui data hasil uji laboratorium
   */
  static async updateTestResult(
    id: number,
    input: UpdateTestResultInput,
    user: JwtUserPayload
  ) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin memperbarui hasil uji laboratorium',
        'FORBIDDEN_TEST_RESULT_UPDATE'
      );
    }

    const existing = await TestResultRepository.findTestResultById(id);
    if (!existing) {
      throw AppError.notFound(
        `Hasil uji dengan ID ${id} tidak ditemukan`,
        'TEST_RESULT_NOT_FOUND'
      );
    }

    return TestResultRepository.updateTestResult(id, input, user.sub);
  }

  /**
   * Menghapus catatan hasil uji laboratorium
   */
  static async deleteTestResult(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden(
        'Akses ditolak: Hanya Admin atau Supervisor yang berwenang menghapus hasil uji laboratorium',
        'FORBIDDEN_TEST_RESULT_DELETE'
      );
    }

    const existing = await TestResultRepository.findTestResultById(id);
    if (!existing) {
      throw AppError.notFound(
        `Hasil uji dengan ID ${id} tidak ditemukan`,
        'TEST_RESULT_NOT_FOUND'
      );
    }

    return TestResultRepository.deleteTestResult(id, user.sub);
  }
}
