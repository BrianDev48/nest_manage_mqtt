import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ExportService } from './export.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'exportQueue' }),
  ],
  controllers: [TasksController],
  providers: [TasksService, ExportService],
})

export class TasksModule {}