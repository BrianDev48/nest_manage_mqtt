import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorMessage = exception.message || 'Internal Server Error';

    this.logger.error(
      `Error en ${request.method} ${request.url} - ${errorMessage}`, 
      exception.stack, 
      'HttpExceptionFilter'
    );

    response.status(status).json({
      success: false,
      message: status === HttpStatus.INTERNAL_SERVER_ERROR ? "Internal Server Error" : errorMessage,
      error: errorMessage,
    });
  }
}