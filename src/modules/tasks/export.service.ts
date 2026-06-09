import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { generateParquetFile, generateExcelFile, ReportType } from '../../common/helpers';

@Injectable()
export class ExportService {
  // Inyectamos el pool de PostgreSQL que creamos en el DatabaseModule
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  async exportCdrwithAnnex(type: string, startTime: string, endTime: string, format: string = 'excel') {
    const taskId = uuidv4();
    const tableName = 'cdr_with_annex';

    const client = await this.pool.connect();
    let result;
    try {
      let query;
      let params;

      if (type) {
        query = `
          SELECT calldate_fmt AS calldate, src_name, src, dst_name, dst, lastapp, disposition, duration
          FROM ${tableName}
          WHERE lastapp = $1 AND calldate BETWEEN $2 AND $3;
        `;
        params = [type, startTime, endTime];
      } else {
        query = `
          SELECT calldate_fmt AS calldate, src_name, src, dst_name, dst, lastapp, disposition, duration
          FROM ${tableName}
          WHERE calldate BETWEEN $1 AND $2;
        `;
        params = [startTime, endTime];
      }
      result = await client.query(query, params);
    } catch (error) {
      return { success: false, message: 'Error al consultar la base de datos', error: this.getErrorMessage(error) };
    } finally {
      client.release();
    }

    if (!result.rows.length) {
      return { success: false, message: 'No hay datos registrados en ese rango.' };
    }

    const exportRows = result.rows;
    let filePath;
    if (format === 'excel') {
      filePath = await generateExcelFile(taskId, exportRows, 'cdr');
    } else {
      filePath = await generateParquetFile(taskId, exportRows, 'cdr');
    }

    return {
      success: true,
      taskId,
      file: filePath,
      format,
      message: `Exportación ${format.toUpperCase()} completada.`,
    };
  }

  async exportAlerts(type: string, startTime: string, endTime: string, format: string = 'excel') {
    const taskId = uuidv4();
    const tableName = 'history_alerts';

    const client = await this.pool.connect();
    let result;
    try {
      let query;
      let params;

      if (type) {
        query = `
          SELECT type, device_name, attribute_name, value, sede_name, TO_CHAR(alerted_at, 'YYYY-MM-DD HH24:MI:SS') AS alerted_at
          FROM ${tableName}
          WHERE type = $1 AND alerted_at BETWEEN $2 AND $3;
        `;
        params = [type, startTime, endTime];
      } else {
        query = `
          SELECT type, device_name, attribute_name, value, sede_name, TO_CHAR(alerted_at, 'YYYY-MM-DD HH24:MI:SS') AS alerted_at
          FROM ${tableName}
          WHERE alerted_at BETWEEN $1 AND $2;
        `;
        params = [startTime, endTime];
      }
      result = await client.query(query, params);
    } catch (error) {
      return { success: false, message: 'Error al consultar la base de datos', error: this.getErrorMessage(error) };
    } finally {
      client.release();
    }

    if (!result.rows.length) {
      return { success: false, message: 'No hay datos registrados en ese rango.' };
    }

    const exportRows = result.rows;
    let filePath;
    if (format === 'excel') {
      filePath = await generateExcelFile(taskId, exportRows, 'alerts');
    } else {
      filePath = await generateParquetFile(taskId, exportRows, 'alerts');
    }

    return { success: true, taskId, file: filePath, format, message: `Exportación ${format.toUpperCase()} completada.` };
  }

  async exportDeviceBySerial(serial: string, metric_id: string, startTime: string, endTime: string, format: string = 'excel') {
    const taskId = uuidv4();
    const tableName = 'device_readings_view';

    const client = await this.pool.connect();
    let result;
    try {
      const query = `
        SELECT sede_name, device_name, device_serial, attribute, value, TO_CHAR(time, 'YYYY-MM-DD HH24:MI:SS') AS time
        FROM ${tableName}
        WHERE device_serial = $1 AND id_attribute = $2 AND time BETWEEN $3 AND $4;
      `;
      result = await client.query(query, [serial, metric_id, startTime, endTime]);
    } catch (error) {
      return { success: false, message: 'Error al consultar la base de datos', error: this.getErrorMessage(error) };
    } finally {
      client.release();
    }

    if (!result.rows.length) {
      return { success: false, message: 'No hay datos registrados en ese rango.' };
    }

    const exportRows = result.rows;
    let filePath;
    if (format === 'excel') {
      filePath = await generateExcelFile(taskId, exportRows, 'device');
    } else {
      filePath = await generateParquetFile(taskId, exportRows, 'device');
    }

    return { success: true, taskId, file: filePath, format, message: `Exportación ${format.toUpperCase()} completada.` };
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : String(error);
  }
}