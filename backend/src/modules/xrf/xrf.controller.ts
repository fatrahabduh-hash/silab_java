import { Request, Response } from 'express';
import { XrfService } from './xrf.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';

export class XrfController {
  /**
   * GET /api/v1/xrf/health
   * Endpoint dokumentasi & status receiver XRF
   */
  static async health(req: Request, res: Response): Promise<Response> {
    const status = XrfService.getHealthStatus(req.get('host'));
    return res.status(200).json(status);
  }

  /**
   * POST /api/v1/xrf/receive
   * Ingestion data spektrum XRF Explorer 7000 / Android App
   */
  static async receive(req: Request, res: Response): Promise<Response> {
    const clientIp = req.ip || req.socket.remoteAddress;
    const result = await XrfService.processIngestion(req.body, clientIp);
    return res.status(200).json(result);
  }

  /**
   * POST /api/v1/xrf/auth
   * Autentikasi Admin/Supervisor untuk membuka kunci XRF
   */
  static async auth(req: Request, res: Response): Promise<Response> {
    const clientIp = req.ip || req.socket.remoteAddress;
    const result = await XrfService.authenticateAdmin(req.body, clientIp);
    return res.status(200).json(result);
  }

  /**
   * GET /api/v1/xrf/devices
   * Status perangkat & heartbeat realtime
   */
  static async getDevices(req: Request, res: Response): Promise<Response> {
    const result = await XrfService.getDevices();
    return ApiResponse.success(res, 'Status perangkat XRF berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/xrf/measurements
   * Daftar hasil pengukuran XRF
   */
  static async getMeasurements(req: Request, res: Response): Promise<Response> {
    const result = await XrfService.getMeasurements(req.query);
    return ApiResponse.success(res, 'Daftar pengukuran XRF berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/xrf/measurements/:id
   * Detail hasil pengukuran XRF
   */
  static async getMeasurementById(req: Request, res: Response): Promise<Response> {
    const id = Number(req.params.id);
    const result = await XrfService.getMeasurementById(id);
    return ApiResponse.success(res, 'Detail pengukuran XRF berhasil diambil', result, 200);
  }

  /**
   * POST /api/v1/xrf/measurements/:id/link
   * Tautkan hasil pengukuran XRF ke sampel laboratorium
   */
  static async linkSample(req: Request, res: Response): Promise<Response> {
    const id = Number(req.params.id);
    const result = await XrfService.linkSample(id, req.body);
    return ApiResponse.success(res, 'Pengukuran XRF berhasil ditautkan ke sampel', result, 200);
  }
}
