import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OcrQueueService } from './ocr-queue.service.js';
import { OcrJobResult } from './ocr.types.js';

@Resolver()
export class OcrResolver {
  constructor(private readonly ocrQueue: OcrQueueService) {}

  @Mutation(() => OcrJobResult)
  async requestOcr(@Args('imageBase64') imageBase64: string): Promise<OcrJobResult> {
    const clean = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const jobId = await this.ocrQueue.add(clean);
    return { jobId, status: 'waiting', awb_number: null, error: null, result: null };
  }

  @Query(() => OcrJobResult)
  async ocrResult(@Args('jobId') jobId: string): Promise<OcrJobResult> {
    const snapshot = await this.ocrQueue.snapshot(jobId);
    if (!snapshot) return { jobId, status: 'failed', awb_number: null, error: 'Job not found', result: null };
    return snapshot;
  }
}
