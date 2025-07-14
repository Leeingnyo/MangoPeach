import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LibrariesModule } from './libraries/libraries.module';
import { BundlesModule } from './bundles/bundles.module';
import { ImagesModule } from './images/images.module';

@Module({
  imports: [LibrariesModule, BundlesModule, ImagesModule],
  controllers: [AppController],
})
export class AppModule {}
