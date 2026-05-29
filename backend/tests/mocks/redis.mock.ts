import EventEmitter from 'events';

class MockRedis extends EventEmitter {
  public status = 'ready';

  constructor() {
    super();
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }

  public get = jest.fn().mockResolvedValue(null);
  public set = jest.fn().mockResolvedValue('OK');
  public del = jest.fn().mockResolvedValue(1);
  public incr = jest.fn().mockResolvedValue(1);
  public decr = jest.fn().mockResolvedValue(0);
  public keys = jest.fn().mockResolvedValue([]);
  public flushall = jest.fn().mockResolvedValue('OK');
  public quit = jest.fn().mockResolvedValue('OK');
  public disconnect = jest.fn();
  public ping = jest.fn().mockResolvedValue('PONG');
  public defineCommand = jest.fn();
}

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => new MockRedis());
});

class MockQueue {
  constructor(public name: string) {}
  public add = jest.fn().mockResolvedValue({ id: 'mock-job-id', name: 'email-job' });
  public getJob = jest.fn().mockImplementation((jobId: string) => {
    return Promise.resolve({
      id: jobId,
      getState: jest.fn().mockResolvedValue(jobId.includes('failed') ? 'failed' : 'completed'),
      progress: 100,
      failedReason: null,
      returnvalue: { url: 'https://cloudinary.com/image.png' },
      attemptsMade: 1,
      timestamp: Date.now(),
      retry: jest.fn().mockResolvedValue(undefined),
    });
  });
  public getJobCounts = jest.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  });
  public getWaitingCount = jest.fn().mockResolvedValue(0);
  public getActiveCount = jest.fn().mockResolvedValue(0);
  public getCompletedCount = jest.fn().mockResolvedValue(0);
  public getFailedCount = jest.fn().mockResolvedValue(0);
  public getDelayedCount = jest.fn().mockResolvedValue(0);
  public isPaused = jest.fn().mockResolvedValue(false);
  public getJobs = jest.fn().mockResolvedValue([]);
  public close = jest.fn().mockResolvedValue(undefined);
}

class MockWorker extends EventEmitter {
  constructor(public name: string) {
    super();
  }
  public close = jest.fn().mockResolvedValue(undefined);
}

class MockQueueEvents extends EventEmitter {
  constructor(public name: string) {
    super();
  }
  public close = jest.fn().mockResolvedValue(undefined);
}

jest.mock('bullmq', () => ({
  Queue: MockQueue,
  Worker: MockWorker,
  QueueEvents: MockQueueEvents,
}));

// Mock rate limiter redis adapter if needed
jest.mock('rate-limit-redis', () => {
  return jest.fn().mockImplementation(() => ({
    // Mock interface methods
  }));
});
