import { Controller, Get } from '@nestjs/common';
import { SitemapService } from './sitemap.service';

@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get()
  async sitemap() {
    const xml = await this.sitemapService.generateXml();
    return {
      success: true,
      message: 'Sitemap generated successfully',
      data: xml,
    };
  }
}
