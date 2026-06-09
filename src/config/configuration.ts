
export default () => ({
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '192.168.20.122',
    endpoint: process.env.LARAVEL_API_URL,
  },
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'postgres',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  }
});