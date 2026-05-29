const mockResend = {
  emails: {
    send: jest.fn().mockResolvedValue({ data: { id: 'mock-resend-id' }, error: null }),
  },
};

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => mockResend),
  };
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-mail-id' }),
  }),
}));
