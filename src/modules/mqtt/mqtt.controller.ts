import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { MqttService } from './mqtt.service';
//import { QoS } from 'mqtt';
import type { IClientPublishOptions } from 'mqtt'

type QoS = IClientPublishOptions['qos'];

@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  publishMessage(@Body() body: { topic: string; message: string; qos?: QoS }
  ) {
    const { topic, message, qos } = body;

    if (!topic || !message) {
      throw new BadRequestException('Faltan parámetros topic o message');
    }

    // Convertimos el mensaje a string si viene como JSON
    const payload = typeof message === 'object' ? JSON.stringify(message) : message;

    this.mqttService.publish(topic, payload, qos || 0);

    return {
      success: true,
      message: `Mensaje enviado al topic [${topic}]`,
    };
  }
}