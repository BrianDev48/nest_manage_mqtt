import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { generateParquetFile, ReportType } from '../../common/helpers';
import { getErrorMessage, isAxiosError } from '../../common/utils/error.utils';

@Processor('exportQueue')
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);
  private readonly apiUrl: string;

  constructor(
    @Inject('DATABASE_POOL') private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {
    const apiUrl = this.configService.get<string>('server.endpoint');
    if (!apiUrl) {
      throw new Error('La variable de entorno LARAVEL_API_URL no está definida.');
    }
    this.apiUrl = apiUrl;
  }

  private async sendToLaravelWs(taskId: string, status: string) {
    try {
      const url = `${this.apiUrl}/update-state-backup`;
      await axios.post(url, { uuid: taskId, status }, { timeout: 5000 });
      this.logger.log(`Estado enviado a Laravel: Tarea ${taskId} - ${status}`);
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        if (error.response) {
          this.logger.error(`Error en la respuesta de Laravel (${error.response.status}):`, error.response.data);
        }else if (error.request) {
          this.logger.error('No se recibió respuesta de Laravel:', error.request);
        } else {
          this.logger.error('Error al enviar el estado a Laravel:', error.message,);
        }
      } else {
        this.logger.error('Error al enciar el estado a Laravel:', getErrorMessage(error),);
      }
    }
  }

  private async updateTaskStatus(taskId: string, status: string, filePath: string | null = null) {
    const client = await this.pool.connect();
    try {
      if (filePath) {
        await client.query('UPDATE backup_readings SET status = $1, file_path = $2 WHERE uuid = $3', [status, filePath, taskId]);
      } else {
        await client.query('UPDATE backup_readings SET status = $1 WHERE uuid = $2', [status, taskId]);
      }
      await this.sendToLaravelWs(taskId, status);
    } catch (error) {
      this.logger.error(`Error al actualizar el estado de la tarea ${taskId}:`, getErrorMessage(error));
    } finally {
      client.release();
    }
  }

  @Process()
  async handleExportJob(job: Job<{ taskId: string; type: ReportType }>) {
    const { taskId, type } = job.data;
    this.logger.log(`Iniciando procesamiento de tarea: ${taskId}`);

    const client = await this.pool.connect();
    try {
      const viewMapping: Record<string, string> = {
        sensor: 'sensor_readings_view',
        camera: 'camera_readings_view',
      };

      const viewName = viewMapping[type];
      if (!viewName) {
        throw new Error(`Tipo inválido: ${type}. No se puede procesar la tarea.`);
      }

      const query = `SELECT * FROM ${viewName};`;
      const result = await client.query(query);
      const data = result.rows;

      const filePath = await generateParquetFile(taskId, data, type);

      this.logger.log(`Tarea completada: ${taskId}. Archivo generado en: ${filePath}`);
      await this.updateTaskStatus(taskId, 'completado', filePath);
    } catch (error) {
      this.logger.error(`Error al procesar la tarea ${taskId}:`, getErrorMessage(error));
      await this.updateTaskStatus(taskId, 'fallido');
    } finally {
      client.release();
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Tarea ${job.id} falló con el error:`, getErrorMessage(err));
  }
}