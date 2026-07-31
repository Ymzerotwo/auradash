import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '../../src/services/email.services';
import * as cloudflareModule from 'cloudflare';

const sendMock = vi.fn().mockResolvedValue({ delivered: true });

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(cloudflareModule, 'default').mockImplementation(class {
      emailSending = {
        send: sendMock
      };
    } as any);
  });

  it('should return false if API token is missing', async () => {
    const result = await EmailService.sendAutoReply(undefined, 'user@test.com', 'User');
    expect(result).toBe(false);
  });

  it('should send email successfully when token is provided', async () => {
    const result = await EmailService.sendAutoReply('token', 'user@test.com', 'User');
    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalled();
  });

  it('should return false and log error on exception', async () => {
    sendMock.mockRejectedValueOnce(new Error('Send API error'));

    const result = await EmailService.sendAutoReply('token', 'user@test.com', 'User');
    expect(result).toBe(false);
  });
});
