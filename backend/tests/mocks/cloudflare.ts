import { vi } from 'vitest';

// Exportable mock function to allow assertions inside test suites
export const mockSend = vi.fn().mockResolvedValue({ delivered: true });

/**
 * Mock implementation of the Cloudflare SDK class for testing within the workerd runtime.
 */
export class Cloudflare {
  apiToken: string | null;

  constructor(opts?: { apiToken?: string }) {
    this.apiToken = opts?.apiToken ?? null;
  }

  emailSending = {
    send: mockSend
  };
}

export default Cloudflare;
