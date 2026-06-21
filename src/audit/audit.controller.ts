import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 25) {
    return this.auditService.findAll(Number(page), Number(pageSize));
  }
}
