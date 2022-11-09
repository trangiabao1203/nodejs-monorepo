import { Transport } from '@nestjs/microservices';
import { IMicroserviceConfig } from '../../interfaces/base.config.interface';

export class UserMicroserviceConfig implements IMicroserviceConfig {
  public name = 'Jobhopin.UserMicroservice';
  public microserviceOptions = {
    options: {
      urls: [process.env.USER_SERVICE_RABITMQ_URL],
      queue: process.env.USER_SERVICE_RABITMQ_QUEUE,
      queueOptions: {
        durable: false,
      },
    },
    transport: Transport.RMQ,
  } as any;
}
