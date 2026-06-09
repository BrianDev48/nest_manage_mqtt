import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const dbConfig = configService.get('database');

        const pool = new Pool({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.name,
          max: 50,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });

        try {
          const client = await pool.connect();
          logger.log('Conexión a la base de datos PostgreSQL exitosa');
          client.release();
        } catch (error) {
          if (error instanceof Error){
            logger.error(error.message, error.stack);
          }
          throw error;
        }

        return pool;
      },
    },
  ],
  exports: ['DATABASE_POOL'], 
})
export class DatabaseModule {}