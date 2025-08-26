import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExchangeTokenDto {
  @ApiProperty({
    description: 'Authorization code received from OAuth callback',
    example: 'AQTfH3VJkL5iHw...'
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}