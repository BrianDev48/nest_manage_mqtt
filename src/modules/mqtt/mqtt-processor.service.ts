import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { mqttTopicMatch } from '../../common/utils/mqtt-topic-match';
import PQueue from 'p-queue';

@Injectable()
export class MqttProcessorService {
  private readonly logger = new Logger(MqttProcessorService.name);
  //private readonly lastStates = new Map<string, any>();
  private readonly lastStates = new Map<string, { data: any; timestamp: number }>();
  private readonly queue = new PQueue({ concurrency: 1 });
  private readonly apiUrl: string;
  private readonly EXPIRATION_TIME_MS = 60 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = `${this.configService.get<string>('server.endpoint')}/procesar-mqtt`;
  }
  
  async sendToLaravel(topic: string, data: any) {

    if (data.devEUI && data.data) {
      const { devEUI, data: payload } = data;
      const now = Date.now();
      const record = this.lastStates.get(devEUI);
      let last = {};

      if (record) {
        const timePassed = now - record.timestamp;

        if (timePassed > this.EXPIRATION_TIME_MS) {
          this.logger.debug(`El historial de ${devEUI} expiró tras ${timePassed}ms. Tratando como nuevo.`);
        } else {
          last = record.data;
        }
      }
      const changed: any = {};

      const keysToIgnore = ['time', 'time_msec'];

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
        if (record) {
          this.lastStates.set(devEUI, { data: last, timestamp: now });
        }
        return;
      }

      this.lastStates.set(devEUI, { 
        data: { ...last, ...changed }, 
        timestamp: now 
      });

      this.enqueuePost(topic, { ...data, data: changed });

      return;
    }

    this.enqueuePost(topic, data);

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