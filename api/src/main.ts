import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: config.get<string[]>('cors.origins'),
    credentials: true,
  });

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

  console.log(`nodeline-api listening on :${port} (prefix /api/v1)`);
}
void bootstrap();
