import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttController } from './mqtt.controller';
import { MqttService } from './mqtt.service';
import { MqttProcessorService } from './mqtt-processor.service';
import { MqttListenerService } from './mqtt-listener.service';

@Module({
  imports: [ConfigModule],
  controllers: [MqttController],
  providers: [MqttService, MqttProcessorService, MqttListenerService],
  exports: [MqttService], // Exportamos por si otros módulos necesitan publicar mensajes
})
export class MqttModule {}