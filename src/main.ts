import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/assets/',
    wildcard: false,
  });

  app.setGlobalPrefix('api/v1');

  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.get('/', (_, reply) => {
    return reply.sendFile('index.html');
  });

  fastifyInstance.get('/*', (request, reply) => {
    const rawUrl = request.raw.url || '';
    if (rawUrl.startsWith('/api/v1') || rawUrl.startsWith('/assets/')) {
      return reply.callNotFound();
    }

    return reply.sendFile('index.html');
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('CMS API')
    .setDescription('Production-ready CMS API documentation')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('app.port');
  const host = '0.0.0.0';

  await app.listen({ port, host });
}

bootstrap();