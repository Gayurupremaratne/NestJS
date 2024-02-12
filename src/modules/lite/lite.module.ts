import { Module } from '@nestjs/common';
import { LiteStageModule } from './stages/lite-stage.module';

@Module({
  imports: [LiteStageModule],
})
export class LiteModule {}
