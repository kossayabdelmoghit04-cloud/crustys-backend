export const mockStripe = {
  paymentIntents: {
    create: jest.fn().mockImplementation((params: any) => Promise.resolve({
      id: 'pi_test_' + Math.random().toString(36).substring(7),
      client_secret: 'seti_test_secret_' + Math.random().toString(36).substring(7),
      amount: params.amount,
      currency: params.currency || 'cad',
      metadata: params.metadata || {},
    })),
  },
  refunds: {
    create: jest.fn().mockImplementation((params: any) => Promise.resolve({
      id: 're_test_' + Math.random().toString(36).substring(7),
      amount: params.amount,
      payment_intent: params.payment_intent,
      status: 'succeeded',
    })),
  },
  webhooks: {
    constructEvent: jest.fn().mockImplementation((rawBody, signature, secret) => {
      console.error('--- STRIPE MOCK DEBUGLOG START ---');
      console.error('rawBody isBuffer:', Buffer.isBuffer(rawBody));
      console.error('rawBody type:', typeof rawBody);
      console.error('rawBody keys:', rawBody ? Object.keys(rawBody) : 'null');
      console.error('rawBody content:', JSON.stringify(rawBody));
      
      let eventData;
      if (Buffer.isBuffer(rawBody)) {
        eventData = JSON.parse(rawBody.toString());
      } else if (rawBody && rawBody.type === 'Buffer' && Array.isArray(rawBody.data)) {
        const buf = Buffer.from(rawBody.data);
        eventData = JSON.parse(buf.toString());
      } else if (typeof rawBody === 'string') {
        eventData = JSON.parse(rawBody);
      } else {
        eventData = rawBody;
      }
      
      console.error('eventData:', JSON.stringify(eventData));
      console.error('--- STRIPE MOCK DEBUGLOG END ---');
      return {
        id: 'evt_test_' + Math.random().toString(36).substring(7),
        type: eventData.type || 'payment_intent.succeeded',
        data: {
          object: eventData.data?.object || {
            id: eventData.id || 'pi_test_123',
            metadata: eventData.metadata || {},
            payment_intent: eventData.payment_intent || 'pi_test_123',
          },
        },
      };
    }),
  },
};

jest.mock('../../src/utils/stripe', () => ({
  stripe: mockStripe,
}));

jest.mock('@/utils/stripe', () => ({
  stripe: mockStripe,
}));
