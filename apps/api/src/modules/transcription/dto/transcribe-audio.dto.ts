import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranscribeAudioDto {
  @ApiProperty({
    description: 'Audio file to transcribe',
    type: 'string',
    format: 'binary'
  })
  audio: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Audio format (e.g., opus, mp3, wav)',
    example: 'opus'
  })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    description: 'Audio sample rate in Hz',
    example: '16000'
  })
  @IsOptional()
  @IsNumberString()
  sample_rate?: string;

  @ApiPropertyOptional({
    description: 'Number of audio channels',
    example: '1'
  })
  @IsOptional()
  @IsNumberString()
  channels?: string;
}