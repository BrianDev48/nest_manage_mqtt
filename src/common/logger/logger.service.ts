import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logFilePath = path.resolve('logfile.log');

  log(message: any, context?: string) {
    this.writeToFile(`[INFO] [${context || 'App'}] ${message}`);
    console.log(`[INFO] [${context || 'App'}] ${message}`);
  }

  error(message: any, trace?: string, context?: string) {
    this.writeToFile(`[ERROR] [${context || 'App'}] ${message} - ${trace || ''}`);
    console.error(`[ERROR] [${context || 'App'}] ${message}`, trace);
  }

  warn(message: any, context?: string) {
    this.writeToFile(`[WARN] [${context || 'App'}] ${message}`);
    console.warn(`[WARN] [${context || 'App'}] ${message}`);
  }

  private writeToFile(message: string) {
    const logEntry = `${new Date().toISOString()} - ${message}\n`;
    fs.appendFile(this.logFilePath, logEntry, (err) => {
      if (err) {
        console.error('Error escribiendo en el archivo de registro:', err);
      }
    });
  }
}