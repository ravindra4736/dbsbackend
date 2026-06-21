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
  },
});