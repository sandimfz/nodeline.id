import { LoggerService } from '@nestjs/common';
import pino from 'pino';

/**
 * Pino-based logger that implements NestJS LoggerService.
 * Injects as the application-wide logger via app.useLogger().
 *
 * - Production: structured JSON logs (no pino-pretty)
 * - Development: colorized pretty-print
 */
export class PinoLoggerService implements LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const env = process.env.NODE_ENV;
    const isProduction = env === 'production';
    const isTest = env === 'test';

    // Silent during tests to keep test output clean
    if (isTest) {
      this.logger = pino({ level: 'silent' });
      return;
    }

    this.logger = pino({
      level: 'info',
      ...(isProduction
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            },
          }),
    });
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, typeof message === 'string' ? message : JSON.stringify(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, typeof message === 'string' ? message : JSON.stringify(message));
  }
}
