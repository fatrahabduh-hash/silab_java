import { prisma } from '../../config/database.js';
import { XrfDevice, XrfMeasurement, Prisma } from '@prisma/client';
import { XrfIngestionPayload, XrfQueryFilter } from './xrf.types.js';

export class XrfRepository {
  /**
   * Registrasi atau perbarui detak jantung (heartbeat) perangkat XRF
   */
  static async upsertDevice(
    payload: {
      deviceId: string;
      deviceName?: string;
      deviceType?: string;
      ipAddress?: string;
    }
  ): Promise<XrfDevice> {
    const now = new Date();
    return prisma.xrfDevice.upsert({
      where: { deviceId: payload.deviceId },
      update: {
        lastSeenAt: now,
        ipAddress: payload.ipAddress || undefined,
        deviceType: payload.deviceType || undefined,
      },
      create: {
        deviceId: payload.deviceId,
        deviceName: payload.deviceName || `Alat XRF - ${payload.deviceId}`,
        deviceType: payload.deviceType || 'XRF Explorer',
        ipAddress: payload.ipAddress || null,
        lastSeenAt: now,
      },
    });
  }

  /**
   * Ambil daftar seluruh instrumen XRF yang terdaftar
   */
  static async findAllDevices() {
    return prisma.xrfDevice.findMany({
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Cari instrumen XRF berdasarkan deviceId
   */
  static async findDeviceById(deviceId: string): Promise<XrfDevice | null> {
    return prisma.xrfDevice.findUnique({
      where: { deviceId },
    });
  }

  /**
   * Cari duplikasi pengukuran berdasarkan device, db_source, report_id, dan timestamp_ms
   */
  static async findExistingMeasurement(
    deviceId: string,
    dbSource: string,
    reportId: number,
    timestampMs?: bigint | null
  ): Promise<XrfMeasurement | null> {
    if (timestampMs !== undefined && timestampMs !== null) {
      return prisma.xrfMeasurement.findFirst({
        where: {
          deviceId,
          dbSource,
          reportId,
          timestampMs,
        },
      });
    }

    return prisma.xrfMeasurement.findFirst({
      where: {
        deviceId,
        dbSource,
        reportId,
      },
    });
  }

  /**
   * Ingestion data spektrum pengukuran XRF secara atomik
   */
  static async saveMeasurement(
    data: XrfIngestionPayload,
    sampleId?: number | null
  ): Promise<{ action: 'inserted' | 'updated'; measurement: any }> {
    const timestampMsVal = data.timestamp_ms ? BigInt(data.timestamp_ms) : null;
    const testDateVal = data.test_date ? new Date(data.test_date) : new Date();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.xrfMeasurement.findFirst({
        where: {
          deviceId: data.device_id,
          dbSource: data.db_source,
          reportId: data.report_id,
          ...(timestampMsVal !== null ? { timestampMs: timestampMsVal } : {}),
        },
      });

      let measurementId: number;
      let action: 'inserted' | 'updated';

      if (existing) {
        measurementId = existing.id;
        action = 'updated';

        await tx.xrfMeasurement.update({
          where: { id: measurementId },
          data: {
            sampleName: data.sample_name,
            sampleSupplier: data.sample_supplier || null,
            testDate: testDateVal,
            timestampMs: timestampMsVal,
            testTime: data.test_time ?? null,
            tubVoltage: data.tub_voltage ?? null,
            tubCurrent: data.tub_current ?? null,
            workCurveName: data.work_curve_name || null,
            grade: data.grade || null,
            operator: data.operator || null,
            gps: data.gps || '(0.0,0.0)',
            longitude: data.longitude ?? 0,
            latitude: data.latitude ?? 0,
            altitude: data.altitude ?? 0,
            cps: data.cps ?? 0,
            counts: data.counts ?? 0,
            temperature: data.temperature ?? 0,
            ...(sampleId ? { sampleId } : {}),
          },
        });

        // Hapus elemen lama untuk diganti dengan hasil sync terbaru
        await tx.xrfMeasurementElement.deleteMany({
          where: { measurementId },
        });
      } else {
        action = 'inserted';
        const created = await tx.xrfMeasurement.create({
          data: {
            deviceId: data.device_id,
            dbSource: data.db_source,
            reportId: data.report_id,
            sampleName: data.sample_name,
            sampleSupplier: data.sample_supplier || null,
            testDate: testDateVal,
            timestampMs: timestampMsVal,
            testTime: data.test_time ?? null,
            tubVoltage: data.tub_voltage ?? null,
            tubCurrent: data.tub_current ?? null,
            workCurveName: data.work_curve_name || null,
            grade: data.grade || null,
            operator: data.operator || null,
            gps: data.gps || '(0.0,0.0)',
            longitude: data.longitude ?? 0,
            latitude: data.latitude ?? 0,
            altitude: data.altitude ?? 0,
            cps: data.cps ?? 0,
            counts: data.counts ?? 0,
            temperature: data.temperature ?? 0,
            sampleId: sampleId || null,
          },
        });
        measurementId = created.id;
      }

      // Masukkan elemen konsentrasi
      if (data.elements && data.elements.length > 0) {
        await tx.xrfMeasurementElement.createMany({
          data: data.elements.map((elm) => ({
            measurementId,
            elementName: elm.name.trim(),
            concentration: Number(elm.concentration) || 0,
            elementError: Number(elm.error) || 0,
            unit: elm.unit?.trim() || '%',
          })),
        });
      }

      const fullMeasurement = await tx.xrfMeasurement.findUnique({
        where: { id: measurementId },
        include: {
          elements: true,
          sample: {
            select: { id: true, kodeSampel: true, jenisMaterial: true, klien: true },
          },
        },
      });

      return {
        action,
        measurement: fullMeasurement,
      };
    });
  }

  /**
   * Ambil daftar pengukuran XRF dengan filter & pagination
   */
  static async findAllMeasurements(filters: XrfQueryFilter) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.XrfMeasurementWhereInput = {};

    if (filters.deviceId) {
      where.deviceId = filters.deviceId;
    }

    if (filters.dbSource) {
      where.dbSource = filters.dbSource;
    }

    if (filters.workCurve) {
      where.workCurveName = { contains: filters.workCurve };
    }

    if (filters.sampleId) {
      where.sampleId = Number(filters.sampleId);
    }

    if (filters.startDate || filters.endDate) {
      where.testDate = {};
      if (filters.startDate) {
        where.testDate.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        where.testDate.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
      }
    }

    if (filters.search) {
      where.OR = [
        { sampleName: { contains: filters.search } },
        { operator: { contains: filters.search } },
        { grade: { contains: filters.search } },
        { workCurveName: { contains: filters.search } },
        { deviceId: { contains: filters.search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.xrfMeasurement.count({ where }),
      prisma.xrfMeasurement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          elements: {
            orderBy: { concentration: 'desc' },
          },
          sample: {
            select: { id: true, kodeSampel: true, jenisMaterial: true, klien: true },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Ambil detail spesifik pengukuran XRF
   */
  static async findMeasurementById(id: number) {
    return prisma.xrfMeasurement.findUnique({
      where: { id },
      include: {
        elements: {
          orderBy: { concentration: 'desc' },
        },
        sample: {
          include: {
            receipt: {
              select: { id: true, nomorPenerimaan: true, klien: true },
            },
          },
        },
      },
    });
  }

  /**
   * Tautkan hasil scan XRF ke sampel laboratorium
   */
  static async linkSample(measurementId: number, sampleId: number) {
    return prisma.xrfMeasurement.update({
      where: { id: measurementId },
      data: { sampleId },
      include: {
        elements: true,
        sample: true,
      },
    });
  }

  /**
   * Catat audit otentikasi admin XRF
   */
  static async logAdminAuth(params: {
    penggunaId?: number | null;
    username: string;
    role?: string | null;
    deviceId?: string;
    ipAddress?: string;
    status: string;
    message?: string;
  }): Promise<void> {
    try {
      await prisma.xrfAdminLog.create({
        data: {
          penggunaId: params.penggunaId || null,
          username: params.username,
          role: params.role || null,
          deviceId: params.deviceId || null,
          ipAddress: params.ipAddress || null,
          status: params.status,
          message: params.message || null,
        },
      });
    } catch (error) {
      console.error('[XrfRepository.logAdminAuth Error]:', error);
    }
  }

  /**
   * Hitung total pengukuran yang tersimpan
   */
  static async countTotalMeasurements(): Promise<number> {
    return prisma.xrfMeasurement.count();
  }
}
