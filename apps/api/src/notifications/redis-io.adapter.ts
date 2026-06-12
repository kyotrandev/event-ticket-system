import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    app: any,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get('redis.host', { infer: true });
    const redisPort = this.configService.get('redis.port', { infer: true });
    const pubClient = createClient({
      url: `redis://${redisHost}:${redisPort}`,
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
