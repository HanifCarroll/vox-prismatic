import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TranscriptService } from './transcript.service';
import { CreateTranscriptDto, UpdateTranscriptDto, TranscriptFilterDto } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';
import { ContentProcessingService } from '../content-processing/content-processing.service';
import { JobStatusHelper } from '../content-processing/job-status.helper';

@ApiTags('Transcripts')
@ApiBearerAuth()
@Controller('transcripts')
export class TranscriptController {
  private readonly logger = new Logger(TranscriptController.name);
  
  constructor(
    private readonly transcriptService: TranscriptService,
    private readonly contentProcessingService: ContentProcessingService,
    private readonly jobStatusHelper: JobStatusHelper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all transcripts with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of transcripts retrieved successfully',
    type: [TranscriptEntity],
  })
  async findAll(@Query() filters: TranscriptFilterDto) {
    const result = await this.transcriptService.findAllWithMetadata(filters);
    
    // Attach job status to transcripts that have queueJobId
    const transcriptsWithJobStatus = await this.jobStatusHelper.attachJobStatusToMany(result.data);

    return {
      success: true,
      data: transcriptsWithJobStatus,
      meta: result.metadata
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
    description: 'Creates a new transcript and automatically starts the content processing pipeline (cleaning → insight extraction)'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transcript created successfully and processing pipeline started',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { 
          type: 'object',
          description: 'The created transcript'
        },
        processing: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'Queue job ID for tracking processing' },
            status: { type: 'string', enum: ['started', 'failed'], description: 'Processing trigger status' },
            message: { type: 'string', description: 'Processing status message' },
            error: { type: 'string', description: 'Error message if processing failed to start' }
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
    
    // Auto-trigger content processing pipeline
    try {
      const processingResult = await this.contentProcessingService.triggerTranscriptCleaning(transcript.id);
      return {
        success: true,
        data: transcript,
        processing: {
          jobId: processingResult.jobId,
          status: 'started',
          message: 'Content processing pipeline started automatically'
        }
      };
    } catch (processingError) {
      // Log error but don't fail transcript creation
      this.logger.error(`Failed to auto-trigger content processing for transcript ${transcript.id}:`, processingError);
      return {
        success: true,
        data: transcript,
        processing: {
          status: 'failed',
          message: 'Transcript created successfully, but automatic processing failed. You can manually trigger processing later.',
          error: processingError.message
        }
      };
    }
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