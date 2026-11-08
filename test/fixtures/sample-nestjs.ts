// Sample NestJS Service using ConfigService
class DatabaseService {
  constructor(private readonly configService: any) {}

  getDbConfig() {
    const dbUrl = this.configService.get<string>('NEST_DATABASE_URL');
    const port = this.configService.getOrThrow<number>('NEST_PORT');
    const secret = this.configService.get('NEST_JWT_SECRET');
    return { dbUrl, port, secret };
  }
}

function bootstrap(config: any) {
  const redis = config.get('NEST_REDIS_HOST');
  return redis;
}

export { DatabaseService, bootstrap };
