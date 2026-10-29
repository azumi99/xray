import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { buildOllamaBody, parseOllamaResponse, OcrExtraction, OcrResult } from './ocr.types.js';

const QUEUE_NAME = 'ocr';

@Injectable()
export class OcrQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(OcrQueueService.name);
  private readonly connection = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null });
  readonly queue = new Queue(QUEUE_NAME, { connection: this.connection });
  readonly worker = new Worker<{ imageBase64: string }, OcrResult>(
    QUEUE_NAME,
    async (job) => {
      const body = buildOllamaBody(job.data.imageBase64);
      const response = await fetch(process.env.OLLAMA_OCR_URL ?? 'https://model-ocr.visions.biz.id/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`Ollama responded ${response.status}: ${await response.text()}`);
      }
      const result = parseOllamaResponse(await response.json());
      this.logger.log(`OCR job ${job.id} done: ${JSON.stringify(result)}`);
      return result;
    },
    {
      connection: this.connection.duplicate(),
      concurrency: 2,
    },
  );

  constructor() {
    this.worker.on('failed', (job, error) => {
      this.logger.error(`OCR job ${job?.id} failed: ${error.message}`);
    });
  }

  async add(imageBase64: string): Promise<string> {
    const job = await this.queue.add('ocr', { imageBase64 }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    } satisfies JobsOptions);
    return job.id ?? '';
  }

  async status(jobId: string) {
    return this.queue.getJob(jobId);
  }

  async snapshot(jobId: string): Promise<{
    jobId: string;
    status: 'waiting' | 'active' | 'completed' | 'failed';
    awb_number: string | null;
    result: OcrExtraction | null;
    error: string | null;
  } | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const raw = await job.getState();
    const status = raw === 'completed' || raw === 'failed' || raw === 'active' ? raw : 'waiting';
    const value = job.returnvalue as OcrResult | undefined;
    return {
      jobId,
      status,
      awb_number: status === 'completed' ? (value?.awb_number ?? null) : null,
      result: status === 'completed' ? (value?.result ?? null) : null,
      error: job.failedReason || null,
    };
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
    this.connection.disconnect();
  }
}
