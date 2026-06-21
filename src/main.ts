import { BadRequestException, ValidationPipe } from '@nestjs/common';
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

  // Secure HTTP Headers using Helmet
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Global Rate Limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // CORS Configuration
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Static Assets Folder
  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/assets/',
    wildcard: false,
  });

  // Global Route Prefix
  app.setGlobalPrefix('api/v1');

  // Basic Fastify Fallback Routing
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.get('/', (_, reply) => {
    return reply.send({ success: true, message: 'DBS CMS API Foundation' });
  });

  // Global Interceptors & Exception Filters
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation Pipe with custom payload transformation for validation failures
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (validationErrors = []) => {
        const errors: Record<string, string[]> = {};
        validationErrors.forEach((err) => {
          errors[err.property] = Object.values(err.constraints || {});
        });
        return new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      },
    }),
  );

  // Environment-based Swagger Setup
  const env = configService.get<string>('app.env') || 'local';
  if (env === 'local' || env === 'staging') {
    const config = new DocumentBuilder()
      .setTitle('DBS CMS API')
      .setDescription('DBS CMS Backend Production API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Bind to Port
  const port = configService.get<number>('app.port');
  const host = '0.0.0.0';

  await app.listen({ port, host });
}

bootstrap();