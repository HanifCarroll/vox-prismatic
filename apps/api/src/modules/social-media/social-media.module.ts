import { Module } from '@nestjs/common';
import { SocialMediaController } from './social-media.controller';
import { SocialMediaService } from './social-media.service';
import { LinkedInModule } from '../linkedin';
import { XModule } from '../x';

@Module({
  imports: [LinkedInModule, XModule],
  controllers: [SocialMediaController],
  providers: [SocialMediaService],
  exports: [SocialMediaService],
})
export class SocialMediaModule {}