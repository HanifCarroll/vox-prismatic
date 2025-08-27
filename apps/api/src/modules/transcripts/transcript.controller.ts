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

@ApiTags('Transcripts')
@ApiBearerAuth()
@Controller('transcripts')
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  @Get()
  @ApiOperation({ summary: 'Get all transcripts with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of transcripts retrieved successfully',
    type: [TranscriptEntity],
  })
  async findAll(@Query() filters: TranscriptFilterDto) {
    const result = await this.transcriptService.findAllWithMetadata(filters);

    return {
      success: true,
      data: result.data,
      meta: {
        pagination: result.metadata.pagination,
        counts: result.metadata.counts
      }
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
    return {
      success: true,
      data: transcript,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new transcript' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transcript created successfully',
    type: TranscriptEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createTranscriptDto: CreateTranscriptDto) {
    const transcript = await this.transcriptService.create(createTranscriptDto);
    return {
      success: true,
      data: transcript,
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