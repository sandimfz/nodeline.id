import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { ClassSerializerInterceptor, ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PinoLoggerService } from './common/logger/pino-logger.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Use Pino as the application-wide logger
  app.useLogger(new PinoLoggerService());
  const logger = new Logger('Bootstrap');

  // CORS harus PALING ATAS sebelum middleware lain
  // Baca langsung dari process.env untuk menghindari issue ConfigService nested get
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  logger.log(`CORS origins (raw env): ${JSON.stringify(corsOrigins)}`);
  logger.log(`CORS_ORIGINS env value: "${process.env.CORS_ORIGINS}"`);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, etc.)
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) {
        return callback(null, origin);
      }
      logger.warn(`CORS blocked origin: "${origin}" | allowed: ${JSON.stringify(corsOrigins)}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // drop unknown fields
      forbidNonWhitelisted: true, // error on unknown fields
      transform: true, // auto-cast payload to DTO instances / types
      forbidUnknownValues: true,
    }),
  );

  // ClassSerializerInterceptor: honors @Exclude() on response objects so we
  // never accidentally leak password hashes etc.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // RolesGuard is registered at the controller level (alongside JwtAuthGuard)
  // to ensure JwtAuthGuard authenticates the request FIRST before role-checking.

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  logger.log(`nodeline-api listening on :${port} (prefix /api/v1)`);
}
void bootstrap();
