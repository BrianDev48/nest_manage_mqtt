import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { mqttTopicMatch } from '../../common/utils/mqtt-topic-match';

type QoS = 0 | 1 | 2;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client!: mqtt.MqttClient;
  private readonly topicHandlers = new Map<string, (topic: string, message: string) => void>();
  private forcedTopics: { topic: string; handler: (topic: string, message: string) => void }[] = [];

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private connect() {
    const host = process.env.MQTT_HOST; // Idealmente leer del ConfigService si lo agregas allí
    const port = process.env.MQTT_PORT;

    this.client = mqtt.connect({
      host,
      port: Number(port),
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: process.env.MQTT_CLIENT_ID,
      connectTimeout: 4000,
      keepalive: 60,
      clean: true,
    });

    this.client.on('connect', () => {
      this.logger.log('MQTT conectado con éxito al broker');
      this.resetSubscriptions();
    });

    this.client.on('error', (error) => this.logger.error('Error de conexión MQTT:', error.stack));
    this.client.on('reconnect', () => this.logger.warn('Intentando reconectar a MQTT...'));
    this.client.on('offline', () => this.logger.warn('MQTT está desconectado.'));

    this.client.on('message', (topic, message) => {
      let handled = false;
      for (const [pattern, handler] of this.topicHandlers.entries()) {
        if (mqttTopicMatch(pattern, topic)) {
          handler(topic, message.toString());
          handled = true;
          break;
        }
      }
      if (!handled) {
        this.logger.warn(`No hay handler para el topic: ${topic}`);
      }
    });
  }

  setForcedTopics(topics: { topic: string; handler: (topic: string, message: string) => void }[]) {
    this.forcedTopics = topics;
  }

  private resetSubscriptions() {
    this.logger.log('Reiniciando suscripciones MQTT...');
    if (this.topicHandlers.size > 0) {
      const topicsToUnsubscribe = Array.from(this.topicHandlers.keys());
      this.client.unsubscribe(topicsToUnsubscribe, (err) => {
        if (err) this.logger.error('Error al desuscribirse:', err.stack);
        else this.logger.log('Desuscripción exitosa de los tópicos antiguos');
      });
      this.topicHandlers.clear();
    }

    this.forcedTopics.forEach(({ topic, handler }) => {
      this.subscribe(topic, handler);
    });
  }

  subscribe(topicPattern: string, callback: (topic: string, message: string) => void) {
    if (!this.topicHandlers.has(topicPattern)) {
      this.client.subscribe(topicPattern, { qos: 0 }, (error) => {
        if (error) {
          this.logger.error(`Error al suscribirse a ${topicPattern}:`, error.stack);
        } else {
          this.logger.log(`Suscrito a: ${topicPattern}`);
          this.topicHandlers.set(topicPattern, callback);
        }
      });
    } else {
      this.logger.log(`Ya estás suscrito a: ${topicPattern}`);
    }
  }

  publish(topic: string, message: string | Buffer, qos: QoS = 0) {
    this.client.publish(topic, message, { qos, retain: false }, (error) => {
      if (error) {
        this.logger.error(`Error publicando en [${topic}]:`, error.stack);
      } else {
        this.logger.log(`Mensaje publicado en [${topic}]: ${message}`);
      }
    });
  }
}