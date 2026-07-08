import { BadRequestException, RequestMethod, ValidationPipe } from '@nestjs/common';
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

  // Enable graceful shutdown hooks as soon as the Nest app is created.
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  // Secure HTTP Headers using Helmet (configurable)
  const helmetEnabled = configService.get<boolean>('app.helmetEnabled') ?? true;
  if (helmetEnabled) {
    await app.register(helmet, {
      contentSecurityPolicy: false,
    });
  }

  // Global Rate Limiting (configurable)
  const rateLimitMax = configService.get<number>('app.rateLimitMax') ?? 100;
  const rateLimitWindow = configService.get<string>('app.rateLimitWindow') ?? '1 minute';
  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: rateLimitWindow,
  });

  // CORS Configuration
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Static Assets Folder (uploads/)
  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'uploads'),
    prefix: '/uploads/',
    wildcard: false,
  });

  // Global Route Prefix for API endpoints
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
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

  // Swagger Setup (configurable)
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled') ?? false;
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('DBS CMS API')
      .setDescription('DBS CMS Backend Production API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // HTTPS Enforcement (configurable)
  const httpsEnabled = configService.get<boolean>('app.httpsEnabled') ?? false;
  if (httpsEnabled) {
    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook('onRequest', (request, reply, done) => {
      const protocol = request.headers['x-forwarded-proto'] || 'http';
      if (protocol !== 'https') {
        const httpsUrl = `https://${request.headers.host}${request.url}`;
        return reply.redirect(httpsUrl);
      }
      done();
    });
  }

  // Bind to Port
  const port = configService.get<number>('app.port');
  const host = '0.0.0.0';

  await app.listen({ port, host });
}

bootstrap();