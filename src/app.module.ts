import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { WorkerModule } from './modules/worker/worker.module'; 
import { DatabaseModule } from './config/database/database.module';

import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true, load: [configuration]}), 
    MqttModule, 
    TasksModule, 
    WorkerModule, 
    DatabaseModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
