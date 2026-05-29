import supertest from 'supertest';
import app from '../../src/app';

export const request = supertest(app);

/**
 * Creates a pre-authenticated request wrapper for Supertest.
 * Usage: authRequest(token).get('/api/v1/profile').expect(...)
 */
export function authRequest(token: string) {
  const agent = supertest(app);
  
  // Intercept all requests and add authorization header
  const wrap = (method: 'get' | 'post' | 'put' | 'patch' | 'delete') => {
    return (url: string) => {
      return agent[method](url).set('Authorization', `Bearer ${token}`);
    };
  };

  return {
    get: wrap('get'),
    post: wrap('post'),
    put: wrap('put'),
    patch: wrap('patch'),
    delete: wrap('delete'),
  };
}
