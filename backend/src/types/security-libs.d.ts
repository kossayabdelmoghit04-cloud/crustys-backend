declare module 'hpp' {
  import { RequestHandler } from 'express';
  interface HppOptions {
    whitelist?: string | string[];
    checkBody?: boolean;
    checkBodyOnlyForContentType?: string;
    checkQuery?: boolean;
  }
  function hpp(options?: HppOptions): RequestHandler;
  export = hpp;
}

declare module 'geoip-lite' {
  interface GeoLookupResult {
    range: [number, number];
    country: string;
    region: string;
    eu: string;
    timezone: string;
    city: string;
    ll: [number, number];
    metro: number;
    area: number;
  }
  function lookup(ip: string): GeoLookupResult | null;
  export { lookup, GeoLookupResult };
}

declare module 'useragent' {
  interface Agent {
    family: string;
    major: string;
    minor: string;
    patch: string;
    os: {
      family: string;
      major: string;
      minor: string;
      patch: string;
      toString(): string;
    };
    device: {
      family: string;
      major: string;
      minor: string;
      patch: string;
      toString(): string;
    };
    toString(): string;
    toAgent(): string;
    toVersion(): string;
  }
  function parse(userAgent: string): Agent;
  function lookup(userAgent: string): Agent;
  function is(userAgent: string): { [key: string]: boolean };
}
