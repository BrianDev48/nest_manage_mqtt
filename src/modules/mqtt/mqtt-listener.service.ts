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
    try {
      const data = JSON.parse(message);
      this.logger.log(`Mensaje recibido en [${topic}]`);
      this.processorService.sendToLaravel(topic, data);
    } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Error al procesar mensaje de [${topic}]: ${message}`,
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

    // Se suscribe a los tópicos
    this.topicsToListen.forEach((topic) => {
      this.mqttService.subscribe(topic, this.processMessage);
    });

    this.logger.log('Escuchando topics MQTT...');
  }
}