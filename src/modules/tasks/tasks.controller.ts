import { Controller, Post, Get, Body, Param, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ExportService } from './export.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly exportService: ExportService,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted
  async startExport(@Body('type') type: string) {
    const result = await this.tasksService.initiateExport(type);
    if (!result.success) {
      throw new NotFoundException(result.message); // Retornará un 404 limpio
    }
    return result;
  }

  @Post('start-sensor')
  @HttpCode(HttpStatus.OK)
  async startExportByDeveui(@Body() body: any) {
    const { type, deveui, attribute_id, startTime, endTime, format } = body;
    const validFormat = format === 'excel' ? 'excel' : 'parquet';
    
    const result = await this.tasksService.exportByDeveui(type, deveui, attribute_id, startTime, endTime, validFormat);
    if (!result.success) throw new NotFoundException(result);
    return result;
  }

  @Post('start-cdr')
  @HttpCode(HttpStatus.OK)
  async startExportCdr(@Body() body: any) {
    const { type, startTime, endTime, format } = body;
    const validFormat = format === 'excel' ? 'excel' : 'parquet';
    
    const result = await this.exportService.exportCdrwithAnnex(type, startTime, endTime, validFormat);
    if (!result.success) throw new NotFoundException(result);
    return result;
  }

  @Post('start-alerts')
  @HttpCode(HttpStatus.OK)
  async startExportAlerts(@Body() body: any) {
    const { type, startTime, endTime, format } = body;
    const validFormat = format === 'excel' ? 'excel' : 'parquet';
    
    const result = await this.exportService.exportAlerts(type, startTime, endTime, validFormat);
    if (!result.success) throw new NotFoundException(result);
    return result;
  }

  @Post('start-device')
  @HttpCode(HttpStatus.OK)
  async startExportDeviceSerial(@Body() body: any) {
    const { serial, metric_id, startTime, endTime, format } = body;
    const validFormat = format === 'excel' ? 'excel' : 'parquet';
    
    const result = await this.exportService.exportDeviceBySerial(serial, metric_id, startTime, endTime, validFormat);
    if (!result.success) throw new NotFoundException(result);
    return result;
  }

  @Get('status/:taskId')
  async getTaskStatus(@Param('taskId') taskId: string) {
    const taskStatus = await this.tasksService.getTaskStatus(taskId);
    if (!taskStatus) {
      throw new NotFoundException({ success: false, message: 'Tarea no encontrada' });
    }
    return { success: true, taskId, ...taskStatus };
  }
}