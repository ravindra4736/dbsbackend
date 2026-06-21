import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { ActivitiesModule } from './activities/activities.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { BlogModule } from './blog/blog.module';
import { PagesModule } from './pages/pages.module';
import { MediaModule } from './media/media.module';
import { SeoModule } from './seo/seo.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { RobotsModule } from './robots/robots.module';
import { RedirectsModule } from './redirects/redirects.module';
import { MenusModule } from './menus/menus.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SearchModule } from './search/search.module';
import { ScriptsModule } from './scripts/scripts.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,

    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,

    SettingsModule,
    AuditModule,
    ActivitiesModule,
    HealthModule,
    RedisModule,

    BlogModule,
    PagesModule,
    MediaModule,
    SeoModule,
    SitemapModule,
    RobotsModule,
    RedirectsModule,
    MenusModule,
    ScriptsModule,

    DashboardModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


