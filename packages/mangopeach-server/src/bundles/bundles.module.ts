import { Module } from '@nestjs/common';
import { BundlesController } from './bundles.controller';

@Module({
  controllers: [BundlesController],
})
export class BundlesModule {}
