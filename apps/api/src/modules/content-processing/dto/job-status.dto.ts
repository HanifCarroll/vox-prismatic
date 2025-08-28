import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QueueJobStatus } from '@content-creation/types';

export class JobErrorDto {
  @ApiProperty({ description: 'Error message', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Error stack trace', required: false })
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiProperty({ description: 'Error code', required: false })
  @IsOptional()
  @IsString()
  code?: string;
}

export class JobTimestampsDto {
  @ApiProperty({ description: 'Job creation time' })
  created: Date;

  @ApiProperty({ description: 'Job processing start time', required: false })
  @IsOptional()
  processed?: Date;

  @ApiProperty({ description: 'Job completion time', required: false })
  @IsOptional()
  completed?: Date;

  @ApiProperty({ description: 'Job failure time', required: false })
  @IsOptional()
  failed?: Date;
}

export class JobStatusDto {
  @ApiProperty({ description: 'Job ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Queue name' })
  @IsString()
  queueName: string;

  @ApiProperty({ 
    description: 'Job status',
    enum: QueueJobStatus 
  })
  @IsEnum(QueueJobStatus)
  status: QueueJobStatus;

  @ApiProperty({ 
    description: 'Job progress percentage',
    minimum: 0,
    maximum: 100 
  })
  @IsNumber()
  progress: number;

  @ApiProperty({ 
    description: 'Error details if job failed',
    type: JobErrorDto,
    required: false 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobErrorDto)
  error?: JobErrorDto;

  @ApiProperty({ description: 'Number of attempts made' })
  @IsNumber()
  attemptsMade: number;

  @ApiProperty({ description: 'Maximum number of attempts allowed' })
  @IsNumber()
  maxAttempts: number;

  @ApiProperty({ description: 'Job data', required: false })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: 'Job result', required: false })
  @IsOptional()
  result?: any;

  @ApiProperty({ 
    description: 'Job timestamps',
    type: JobTimestampsDto 
  })
  @ValidateNested()
  @Type(() => JobTimestampsDto)
  timestamps: JobTimestampsDto;
}

export class BulkJobStatusRequestDto {
  @ApiProperty({ 
    description: 'Array of job IDs to check status',
    type: [String],
    example: ['clean-transcript-123', 'extract-insights-456']
  })
  @IsArray()
  @IsString({ each: true })
  jobIds: string[];
}

export class BulkJobStatusResponseDto {
  @ApiProperty({ 
    description: 'Map of job ID to job status',
    type: 'object',
    additionalProperties: {
      type: 'object',
      $ref: '#/components/schemas/JobStatusDto'
    }
  })
  jobs: Record<string, JobStatusDto>;
}

export class RetryJobResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'New job ID after retry' })
  @IsString()
  newJobId: string;

  @ApiProperty({ description: 'Response message' })
  @IsString()
  message: string;
}

export class CleanupStaleJobsResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Number of stale job references cleaned' })
  @IsNumber()
  cleanedCount: number;

  @ApiProperty({ description: 'Response message' })
  @IsString()
  message: string;
}