import { IJobModel } from '../job.model';
import { JobQueue } from '../job.queue';
import { JobProcessor } from './job.processor';

export abstract class JobBatchProcessor<I, O> extends JobProcessor<I, O> {
  protected constructor(protected configKey: string) {
    super(configKey);
  }

  async process(items: I[], job?: IJobModel): Promise<O[]> {
    if (!items.length) return [];
    return await this.batchExec(items, async data => await this.batchProcess(data, job), this.getConfig());
  }

  private async batchExec<I, O>(
    data: I[],
    eachBatch: (data: I[]) => Promise<O[]>,
    opts?: { concurrent?: number; batchSize?: number; maxRetries?: number; retryTimeout?: number },
  ): Promise<O[]> {
    const res: O[] = [];
    const queue = new JobQueue<I>(
      {
        consume: async (d: I[]) => {
          const out = await eachBatch(d);
          res.push(...out);
        },
        concurrent: opts.concurrent,
        batchSize: opts.batchSize,
        maxRetries: opts.maxRetries,
        retryTimeout: opts.retryTimeout,
      },
      this.logService,
    );

    await queue.pushAndWaitForCompleted(data);
    // await queue.kill();
    return res;
  }

  protected abstract batchProcess(data: I[], job?: IJobModel): Promise<O[]>;
}
