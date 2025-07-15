import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { LibrariesModule } from './libraries/libraries.module';
import { BundlesModule } from './bundles/bundles.module';
import { ImagesModule } from './images/images.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LibrariesModule, 
    BundlesModule, 
    ImagesModule
  ],
  controllers: [AppController],
})
export class AppModule {}
