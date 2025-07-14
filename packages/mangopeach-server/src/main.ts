import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(5000);
  console.log('MangoPeach API Server is running on http://localhost:5000');
}
bootstrap();
