import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { generateParquetFile, generateExcelFile } from '../../common/helpers';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  //private exportQueue: Bull.Queue;

  constructor(
    @Inject('DATABASE_POOL') private readonly pool: Pool,
    @InjectQueue('exportQueue') private readonly exportQueue: Queue,
  ) {
    // Inicializamos la cola de Bull
    /*this.exportQueue = new Bull('exportQueue', {
      redis: {
        host: '127.0.0.1',
        port: 6379
      },
    });*/
  }

  private async registerTaskInDatabase(taskId: string, type: string, status: string) {
    const query = `
      INSERT INTO backup_readings (uuid, type, status, created_at)
      VALUES ($1, $2, $3, $4)
    `;
    const client = await this.pool.connect();
    try {
      await client.query(query, [taskId, type, status, new Date()]);
      this.logger.log(`Tarea ${taskId} registrada con estado: ${status}`);
    } catch (error: unknown) {
      const err =
        error instanceof Error
          ? error
          : new Error(String(error));
      this.logger.error(
        `Error al registrar la tarea ${taskId}:`,
        err.stack,
      );
      throw err;
    } finally {
      client.release();
    }
  }

  async initiateExport(type: string) {
    if (!['sensor', 'camera'].includes(type)) {
      throw new Error("Tipo inválido. Debe ser 'sensor' o 'camera'.");
    }

    const taskId = uuidv4();
    const client = await this.pool.connect();
    
    try {
      const viewMapping: Record<string, string> = {
        sensor: 'sensor_readings_view',
        camera: 'camera_readings_view',
      };
      const viewName = viewMapping[type];

      const result = await client.query(`SELECT COUNT(*) AS count FROM ${viewName};`);
      const recordCount = parseInt(result.rows[0].count, 10);

      if (recordCount === 0) {
        return { success: false, message: `No se encontraron datos para exportar del tipo ${type}.` };
      }

      await this.registerTaskInDatabase(taskId, type, 'pendiente');
      await this.exportQueue.add({ taskId, type });

      return { success: true, taskId, message: `Exportación iniciada para el tipo ${type}.` };
    } finally {
      client.release();
    }
  }

  async exportByDeveui(type: string, deveui: string, attribute_id: string, startTime: string, endTime: string, format: string = 'parquet') {
    const taskId = uuidv4();
    let tableName: string;

    if (type === 'A') tableName = 'sensor_readings_view';
    else if (type === 'C') tableName = 'sensor_readings_view_pusr';
    else return { success: false, message: `Tipo '${type}' no es válido. Debe ser 'A' o 'C'.` };

    const client = await this.pool.connect();
    let result;
    try {
      const query = `
        SELECT sede_name, sensor_name, sensor_deveui, attribute_name, value, time
        FROM ${tableName} 
        WHERE sensor_deveui = $1 AND id_attribute = $2 AND time BETWEEN $3 AND $4;
      `;
      result = await client.query(query, [deveui, attribute_id, startTime, endTime]);
    } catch (error) {
      return {
        success: false,
        message: 'Error al consultar la base de datos',
        error: error instanceof Error 
          ? error.message : 
          String(error),
    };
    } finally {
      client.release();
    }

    if (!result.rows.length) {
      return { success: false, message: `No hay datos para ${deveui} en ese rango.` };
    }

    let exportRows = result.rows;
    if (format === 'excel') {
      exportRows = result.rows.map((row) => ({
        ...row,
        time: new Date(row.time).toISOString().replace('T', ' ').slice(0, 19),
      }));
    }

    const filePath = format === 'excel' 
      ? await generateExcelFile(taskId, exportRows, 'sensor')
      : await generateParquetFile(taskId, exportRows, 'sensor');

    return { success: true, taskId, file: filePath, format, message: `Exportación ${format.toUpperCase()} completada para ${deveui}.` };
  }

  async getTaskStatus(taskId: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT status FROM backup_readings WHERE uuid = $1;', [taskId]);
      if (result.rows.length === 0) return null;
      return { status: result.rows[0].status };
    } finally {
      client.release();
    }
  }
}