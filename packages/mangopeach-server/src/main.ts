import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(4000);
  console.log('MangoPeach API Server is running on http://localhost:4000');
}
bootstrap();
