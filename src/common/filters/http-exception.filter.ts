import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      const message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse.message || 'Unexpected error';

      const errors = typeof exceptionResponse === 'object' && exceptionResponse.errors
        ? exceptionResponse.errors
        : {};

      response.status(status).send({
        success: false,
        message,
        errors,
      });
      return;
    }

    // Log unhandled server exceptions for debugging
    this.logger.error('Unhandled Exception', exception as any);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: 'Internal server error',
      errors: {},
    });
  }
}
