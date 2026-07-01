import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'DBS CMS Backend API',
      version: '1.0.0',
      status: 'running',
    };
  }
}