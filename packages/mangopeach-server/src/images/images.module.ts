import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { LibrariesService } from '../libraries/libraries.service';

@Module({
  controllers: [ImagesController],
  providers: [LibrariesService],
})
export class ImagesModule {}
