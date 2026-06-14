declare module 'express-prom-bundle' {
  import { RequestHandler } from 'express';
  import client from 'prom-client';

  interface Opts {
    includeMethod?: boolean;
    includePath?: boolean;
    includeStatusCode?: boolean;
    normalizePath?: Array<[string | RegExp, string]> | ((path: string) => string);
    promClient?: {
      collectDefaultMetrics?: client.DefaultMetricsCollectorConfiguration;
    };
    [key: string]: unknown;
  }

  function promBundle(opts?: Opts): RequestHandler & {
    promClient: typeof client;
  };

  export = promBundle;
}
