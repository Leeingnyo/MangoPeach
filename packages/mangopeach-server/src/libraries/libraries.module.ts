import { Module } from '@nestjs/common';
import { LibrariesController } from './libraries.controller';
import { LibrariesService } from './libraries.service';

@Module({
  controllers: [LibrariesController],
  providers: [LibrariesService],
})
export class LibrariesModule {}
