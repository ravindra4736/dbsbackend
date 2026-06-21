import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Post()
  upsert(@Body() body: { key: string; value: unknown; group?: string; label?: string; description?: string }) {
    return this.settingsService.upsert(body.key, body.value, body.group, body.label, body.description);
  }

  @Put(':key')
  update(@Param('key') key: string, @Body() body: { value: unknown; group?: string; label?: string; description?: string }) {
    return this.settingsService.upsert(key, body.value, body.group, body.label, body.description);
  }

  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.settingsService.remove(key);
  }
}
