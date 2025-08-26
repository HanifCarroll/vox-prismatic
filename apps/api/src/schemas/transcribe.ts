import { z } from 'zod';

// Schema for transcription form data
export const TranscribeFormSchema = z.object({
  audio: z.instanceof(File).refine(
    (file) => file.size > 0,
    { message: 'Audio file is required' }
  ),
  format: z.enum(['opus', 'wav', 'mp3', 'mp4', 'webm']).default('opus'),
  sample_rate: z.coerce.number().int().positive().default(16000),
  channels: z.coerce.number().int().positive().max(2).default(1),
});