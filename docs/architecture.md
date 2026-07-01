# DBS CMS Backend Architecture

## Backend Responsibilities

The DBS CMS Backend is a REST API server built with NestJS 11. It handles:

- **Authentication & Authorization** - JWT-based authentication with role-based access control
- **User Management** - CRUD operations for users with role assignments
- **Role Management** - Role definitions and permissions
- **Activity Logging** - Audit trail for all user actions
- **Health Monitoring** - Health check endpoint for monitoring
- **Static File Serving** - Uploads directory for media files
- **API Documentation** - Swagger/OpenAPI documentation

## Frontend Responsibilities

The frontend is split into two separate applications:

### Admin Panel (Next.js)
- CMS content management interface
- User and role administration
- Media library management
- Blog and page editing
- SEO configuration
- Runs at `/admin` on the frontend domain

### Public Website (Next.js)
- Public-facing website
- Content delivery from CMS
- SEO-optimized pages
- Blog display
- Runs at the root path on the frontend domain

## API Architecture

### Global Prefix
All API endpoints are prefixed with `/api/v1` except:
- `GET /` - Root endpoint returning API information
- `GET /health` - Health check endpoint

### Authentication Flow

1. **Registration**
   - POST `/api/v1/auth/register`
   - Creates user with hashed password (argon2)
   - Returns JWT token

2. **Login**
   - POST `/api/v1/auth/login`
   - Validates credentials
   - Returns JWT token

3. **Protected Routes**
   - JWT token sent in `Authorization: Bearer <token>` header
   - JwtAuthGuard validates token on protected routes
   - RolesGuard checks role permissions if required

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": null,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... }
}
```

## Folder Structure

```
src/
├── activity-logs/          # Activity logging module
├── auth/                   # Authentication module
│   ├── dto/               # Data transfer objects
│   ├── guards/            # JWT guard
│   └── strategies/        # JWT strategy
├── common/                # Shared utilities
│   ├── constants/         # Application constants
│   ├── decorators/        # Custom decorators
│   ├── enums/             # Enumerations
│   ├── filters/           # Exception filters
│   ├── guards/            # Common guards
│   ├── interceptors/      # Response interceptor
│   ├── pipes/             # Validation pipes
│   ├── storage/           # File storage utilities
│   ├── types/             # TypeScript types
│   └── utils/             # Helper functions
├── config/                # Configuration module
├── health/                # Health check module
├── prisma/                # Prisma ORM module
├── redis/                 # Redis caching module
├── roles/                 # Role management module
│   └── dto/               # Role DTOs
├── users/                 # User management module
│   └── dto/               # User DTOs
├── app.controller.ts      # Root controller
├── app.module.ts          # Root module
└── main.ts                # Application bootstrap
```

## Technology Stack

- **Framework**: NestJS 11 with Fastify adapter
- **Database**: MySQL with Prisma 7 ORM
- **Cache**: Redis (ioredis)
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **Security**: Helmet, rate limiting, CORS
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx
- **Node.js**: 25
- **Module System**: CommonJS

## Future CMS Architecture

When CMS features are implemented, they will be added as NestJS modules:

- **Blog Module** - Blog posts, categories, tags
- **Pages Module** - Static pages
- **Media Module** - File uploads and management
- **Menus Module** - Navigation menus
- **SEO Module** - SEO metadata
- **Settings Module** - Application settings
- **Sitemap Module** - XML sitemap generation
- **Redirects Module** - URL redirects

Each module will follow the same pattern:
- Controller (routes)
- Service (business logic)
- DTOs (validation)
- Module (configuration)

Modules will be registered in `app.module.ts` as they are implemented.
