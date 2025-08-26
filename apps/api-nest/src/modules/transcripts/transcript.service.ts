import { Injectable } from '@nestjs/common';
import { TranscriptRepository } from './transcript.repository';
import { CreateTranscriptDto, UpdateTranscriptDto, TranscriptFilterDto } from './dto';
import { TranscriptEntity } from './entities/transcript.entity';

@Injectable()
export class TranscriptService {
  constructor(private readonly transcriptRepository: TranscriptRepository) {}

  async findAll(filters?: TranscriptFilterDto): Promise<TranscriptEntity[]> {
    return this.transcriptRepository.findAll(filters);
  }

  async findById(id: string): Promise<TranscriptEntity> {
    return this.transcriptRepository.findById(id);
  }

  async create(data: CreateTranscriptDto): Promise<TranscriptEntity> {
    return this.transcriptRepository.create(data);
  }

  async update(id: string, data: UpdateTranscriptDto): Promise<TranscriptEntity> {
    return this.transcriptRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.transcriptRepository.delete(id);
  }

  async getStats() {
    const totalCount = await this.transcriptRepository.count();
    const rawCount = await this.transcriptRepository.count({ status: 'raw' } as TranscriptFilterDto);
    const processedCount = await this.transcriptRepository.count({ status: 'cleaned' } as TranscriptFilterDto);
    const errorCount = await this.transcriptRepository.count({ status: 'error' } as TranscriptFilterDto);

    return {
      total: totalCount,
      raw: rawCount,
      processed: processedCount,
      error: errorCount,
    };
  }
}