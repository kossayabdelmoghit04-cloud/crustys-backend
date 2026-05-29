export const mockCloudinary = {
  uploader: {
    upload_stream: jest.fn().mockImplementation((options, callback) => {
      const mockStream = {
        write: jest.fn(),
        end: jest.fn().mockImplementation(() => {
          if (callback) {
            callback(null, {
              public_id: 'test-public-id-' + Math.random().toString(36).substring(7),
              secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v12345/test-public-id.webp',
              format: 'webp',
              bytes: 1024,
              width: 800,
              height: 600,
            });
          }
        }),
      };
      return mockStream;
    }),
    destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
  },
};

jest.mock('../../src/config/cloudinary.config', () => ({
  cloudinary: mockCloudinary,
}));

jest.mock('@/config/cloudinary.config', () => ({
  cloudinary: mockCloudinary,
}));
