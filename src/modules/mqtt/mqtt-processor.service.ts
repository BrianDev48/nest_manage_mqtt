import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { mqttTopicMatch } from '../../common/utils/mqtt-topic-match';
import PQueue from 'p-queue';

@Injectable()
export class MqttProcessorService {
  private readonly logger = new Logger(MqttProcessorService.name);
  private readonly lastStates = new Map<string, any>();
  private readonly queue = new PQueue({ concurrency: 1 });
  private readonly apiUrl: string;
  
  private readonly noFilterTopics = [
    '/milesight/uplink/#',
    'mqtt/+/PublishEvent',
    'application/+/device/+/event/up',
    'camera/iasure/#',
    'camera/hanwha',
  ];

  constructor(private readonly configService: ConfigService) {
    // Obtenemos la URL de Laravel desde el ConfigService que configuramos en la Fase 1
    this.apiUrl = `${this.configService.get<string>('server.endpoint')}/procesar-mqtt`;
  }

  private topicShouldSkipDeduplication(topic: string): boolean {
    return this.noFilterTopics.some((pattern) => mqttTopicMatch(pattern, topic));
  }

  async sendToLaravel(topic: string, data: any) {
    /*
    const skipCheck = this.topicShouldSkipDeduplication(topic);

    if (skipCheck) {
      this.enqueuePost(topic, data);
      return;
    }*/

    if (data.devEUI && data.data) {
      const { devEUI, data: payload } = data;
      const last = this.lastStates.get(devEUI) || {};
      const changed: any = {};

      const keysToIgnore = [''];

      for (const key in payload) {

        if(keysToIgnore.includes(key)) {
          continue;
        }

        if (payload[key] !== last[key]) {
          changed[key] = payload[key];
        }
      }

      if (Object.keys(changed).length === 0) {
        this.logger.debug(`Sin cambios en ${devEUI}, no se reenvía.`);
        return;
      }

      this.lastStates.set(devEUI, { ...last, ...changed });
      this.enqueuePost(topic, { ...data, data: changed });
      return;
    }
  }

  private enqueuePost(topic: string, data: any) {
    this.queue.add(async () => {
      try {
        await axios.post(this.apiUrl, { topic, message: data }, { timeout: 5000 });
        this.logger.log(`Enviado a Laravel: ${JSON.stringify(data)}`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Error enviando mensaje a Laravel: ${message}`,
        );
      }
    });
  }
}