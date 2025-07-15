import { Module, Global } from '@nestjs/common';
import { LibrariesController } from './libraries.controller';
import { LibrariesService } from './libraries.service';

@Global()
@Module({
  controllers: [LibrariesController],
  providers: [LibrariesService],
  exports: [LibrariesService],
})
export class LibrariesModule {}
