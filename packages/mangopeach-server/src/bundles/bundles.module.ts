import { Module } from '@nestjs/common';
import { BundlesController } from './bundles.controller';
import { LibrariesService } from '../libraries/libraries.service';

@Module({
  controllers: [BundlesController],
  providers: [LibrariesService],
})
export class BundlesModule {}
