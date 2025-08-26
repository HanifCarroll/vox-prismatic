import { 
  Controller, 
  Post, 
  Get, 
  UploadedFile, 
  UseInterceptors, 
  Logger,
  Body
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TranscriptionService } from './transcription.service';
import { TranscriptionResponseEntity, ApiInfoEntity } from './entities';
import { TranscribeAudioDto } from './dto';

@ApiTags('transcription')
@Controller('transcription')
export class TranscriptionController {
  private readonly logger = new Logger(TranscriptionController.name);

  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post()
  @UseInterceptors(FileInterceptor('audio'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Transcribe audio to text',
    description: 'Stream audio files to Deepgram for transcription. Accepts various audio formats and automatically generates titles and saves transcripts to the database.'
  })
  @ApiBody({
    description: 'Audio file with optional transcription parameters',
    type: TranscribeAudioDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Audio transcribed successfully',
    type: TranscriptionResponseEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid audio file or parameters'
  })
  @ApiResponse({
    status: 500,
    description: 'Transcription service error'
  })
  async transcribeAudio(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() audioDto: TranscribeAudioDto
  ): Promise<TranscriptionResponseEntity> {
    this.logger.log(`Transcribing audio file: ${audioFile?.originalname}`);
    
    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    return await this.transcriptionService.transcribeAudio(audioFile, audioDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get API information',
    description: 'Returns information about the transcription API including supported formats, required fields, and usage examples.'
  })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully',
    type: ApiInfoEntity
  })
  getApiInfo(): ApiInfoEntity {
    this.logger.log('Getting transcription API information');
    return this.transcriptionService.getApiInfo();
  }
}