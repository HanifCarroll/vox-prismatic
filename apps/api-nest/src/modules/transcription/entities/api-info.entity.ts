import { ApiProperty } from '@nestjs/swagger';

export class ApiInfoEntity {
  @ApiProperty({
    description: 'The API endpoint path',
    example: '/api/transcription'
  })
  endpoint: string;

  @ApiProperty({
    description: 'HTTP method for the endpoint',
    example: 'POST'
  })
  method: string;

  @ApiProperty({
    description: 'Description of the API functionality',
    example: 'Stream audio files to Deepgram for transcription via NestJS API server'
  })
  description: string;

  @ApiProperty({
    description: 'List of supported audio formats',
    example: ['opus', 'mp3', 'wav']
  })
  supported_formats: string[];

  @ApiProperty({
    description: 'List of required form fields',
    example: ['audio']
  })
  required_fields: string[];

  @ApiProperty({
    description: 'List of optional form fields',
    example: ['format', 'sample_rate', 'channels']
  })
  optional_fields: string[];

  @ApiProperty({
    description: 'Server framework name',
    example: 'nestjs'
  })
  server: string;

  @ApiProperty({
    description: 'API version',
    example: '1.0.0'
  })
  version: string;

  @ApiProperty({
    description: 'Example cURL command for testing',
    example: 'curl -X POST http://localhost:3001/api/transcription...'
  })
  example_curl: string;
}