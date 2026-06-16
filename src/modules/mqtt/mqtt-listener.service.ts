import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MqttProcessorService } from './mqtt-processor.service';

@Injectable()
export class MqttListenerService implements OnModuleInit {
  private readonly logger = new Logger(MqttListenerService.name);

  private readonly topicsToListen = [
    '/milesight/uplink/#',
    'mqtt/+/PublishEvent',
    'application/+/device/+/event/up',
    '/UploadTopic/#',
    'camera/iasure/#',
    'camera/hanwha',
  ];

  constructor(
    private readonly mqttService: MqttService,
    private readonly processorService: MqttProcessorService,
  ) {}

  onModuleInit() {
    this.startMqttListener();
  }

  private processMessage = (topic: string, message: string) => {
    this.logger.log(`Mensaje crudo recibido en [${topic}]: ${message.substring(0, 100)}...`);

    try {
      const data = JSON.parse(message);
      this.processorService.sendToLaravel(topic, data);
    } catch (error: unknown) {
      const errorMessage = 
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error al procesar JSON de [${topic}]: ${errorMessage}`,
      );

    }
  };

  private startMqttListener() {
    // Configura los tópicos forzados en el servicio
    const forcedTopics = this.topicsToListen.map((t) => ({
      topic: t,
      handler: this.processMessage,
    }));
    
    this.mqttService.setForcedTopics(forcedTopics);
    this.logger.log('Tópicos MQTT configurados para escucha...');

  }
}