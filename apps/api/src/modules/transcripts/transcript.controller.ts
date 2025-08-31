import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TranscriptService } from './transcript.service';
import { CreateTranscriptDto, UpdateTranscriptDto } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';
import { JobStatusHelper } from '../job-status/job-status.helper';

@ApiTags('Transcripts')
@ApiBearerAuth()
@Controller('transcripts')
export class TranscriptController {
  private readonly logger = new Logger(TranscriptController.name);
  
  constructor(
    private readonly transcriptService: TranscriptService,
    private readonly jobStatusHelper: JobStatusHelper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all transcripts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all transcripts',
    type: [TranscriptEntity],
  })
  async findAll() {
    const transcripts = await this.transcriptService.findAll();
    
    // Attach job status to transcripts that have queueJobId
    const transcriptsWithJobStatus = await this.jobStatusHelper.attachJobStatusToMany(transcripts);

    return {
      success: true,
      data: transcriptsWithJobStatus,
      // No meta/pagination needed
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transcript statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcript statistics retrieved successfully',
  })
  async getStats() {
    const stats = await this.transcriptService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transcript by ID' })
  @ApiParam({ name: 'id', description: 'Transcript ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcript retrieved successfully',
    type: TranscriptEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transcript not found',
  })
  async findById(@Param('id') id: string) {
    const transcript = await this.transcriptService.findById(id);
    
    // Attach job status if transcript has queueJobId
    const transcriptWithJobStatus = await this.jobStatusHelper.attachJobStatus(transcript);
    
    return {
      success: true,
      data: transcriptWithJobStatus,
    };
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create a new transcript with automatic processing', 
    description: 'Creates a new transcript and automatically triggers the processing pipeline via events. The workflow (cleaning → insight extraction) starts immediately without blocking the API response.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transcript created successfully. Processing pipeline started automatically via events.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          $ref: '#/components/schemas/TranscriptEntity',
          description: 'The created transcript with status "raw"'
        },
        processing: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'started', description: 'Processing pipeline status' },
            message: { type: 'string', example: 'Processing pipeline started automatically via events', description: 'Processing status message' },
            workflow: { type: 'string', example: 'transcript.uploaded event → cleaning → transcript.processing.completed event → insight extraction', description: 'Expected workflow' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createTranscriptDto: CreateTranscriptDto) {
    const transcript = await this.transcriptService.create(createTranscriptDto);
    
    this.logger.log(`Transcript ${transcript.id} created successfully. Processing pipeline started automatically via events.`);
    
    return {
      success: true,
      data: transcript,
      processing: {
        status: 'started',
        message: 'Processing pipeline started automatically via events',
        workflow: 'transcript.uploaded event → cleaning → transcript.processing.completed event → insight extraction'
      }
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transcript by ID' })
  @ApiParam({ name: 'id', description: 'Transcript ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcript updated successfully',
    type: TranscriptEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transcript not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTranscriptDto: UpdateTranscriptDto,
  ) {
    const transcript = await this.transcriptService.update(id, updateTranscriptDto);
    return {
      success: true,
      data: transcript,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transcript by ID' })
  @ApiParam({ name: 'id', description: 'Transcript ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcript deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transcript not found',
  })
  async delete(@Param('id') id: string) {
    await this.transcriptService.delete(id);
    return {
      success: true,
      message: `Transcript ${id} deleted successfully`,
    };
  }
}