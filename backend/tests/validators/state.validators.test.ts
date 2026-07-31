import { describe, it, expect } from 'vitest';
import { getHashSchema, getCountersSchema } from '../../src/validators/state.validators';

describe('State Validators', () => {
  it('should validate empty object for getHashSchema', () => {
    const result = getHashSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate empty object for getCountersSchema', () => {
    const result = getCountersSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
