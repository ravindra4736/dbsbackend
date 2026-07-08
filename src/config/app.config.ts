export default () => ({
  app: {
    name: process.env.APP_NAME || 'CMS',
    env: process.env.APP_ENV || 'local',
    url: process.env.APP_URL || 'http://localhost:3001',
    port: parseInt(process.env.PORT || '3001', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    uploadDriver: process.env.UPLOAD_DRIVER || 'local',
    uploadPath: process.env.UPLOAD_PATH || 'uploads',
    logLevel: process.env.LOG_LEVEL || 'info',
    swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
    httpsEnabled: process.env.HTTPS_ENABLED === 'true',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    helmetEnabled: process.env.HELMET_ENABLED !== 'false',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },
});