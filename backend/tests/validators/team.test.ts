import { describe, it, expect } from 'vitest';
import { createTeamMemberSchema, updateTeamMemberSchema, toggleStatusSchema } from '../../src/validators/team.validators';

describe('Validators: Team - createTeamMemberSchema', () => {
  const validPayload = {
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    username: 'johndoe',
    password: 'securePassword123',
    role: 'User' as const,
    job_title: 'Developer',
    photo_url: 'https://example.com/photo.jpg',
    permissions: { view_reports: true }
  };

  it('should accept valid team member payload and sanitize input fields', () => {
    const result = createTeamMemberSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe('John Doe');
      expect(result.data.email).toBe('john.doe@example.com');
      expect(result.data.username).toBe('johndoe');
      expect(result.data.role).toBe('User');
      expect(result.data.job_title).toBe('Developer');
      expect(result.data.photo_url).toBe('https://example.com/photo.jpg');
      expect(result.data.permissions).toEqual({ view_reports: true });
    }
  });

  it('should sanitize HTML from full_name, username, job_title, and photo_url', () => {
    const payload = {
      ...validPayload,
      full_name: '<b>John</b> Doe',
      username: '<script>alert(1)</script>johndoe',
      job_title: '<i>Developer</i>',
      photo_url: 'https://example.com/photo.jpg?x=<img src=1>'
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe('&lt;b&gt;John&lt;/b&gt; Doe');
      expect(result.data.username).toBe('&lt;script&gt;alert(1)&lt;/script&gt;johndoe');
      expect(result.data.job_title).toBe('&lt;i&gt;Developer&lt;/i&gt;');
      expect(result.data.photo_url).toBe('https://example.com/photo.jpg?x=&lt;img src=1&gt;');
    }
  });

  it('should normalize email and username to lowercase and trim them', () => {
    const payload = {
      ...validPayload,
      email: '  JOHN.DOE@EXAMPLE.COM  ',
      username: '  JOHNdoe  '
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('john.doe@example.com');
      expect(result.data.username).toBe('johndoe');
    }
  });

  it('should reject email missing correct format', () => {
    const payload = {
      ...validPayload,
      email: 'invalid-email'
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject password that is too short', () => {
    const payload = {
      ...validPayload,
      password: '123'
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject full_name that is too short', () => {
    const payload = {
      ...validPayload,
      full_name: 'A'
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject username that is too short', () => {
    const payload = {
      ...validPayload,
      username: 'ab'
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject invalid role', () => {
    const payload = {
      ...validPayload,
      role: 'SuperAdmin' as any
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject invalid URL for photo_url', () => {
    const payload = {
      ...validPayload,
      photo_url: 'not-a-url'
    };
    const result = createTeamMemberSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('Validators: Team - updateTeamMemberSchema', () => {
  it('should accept partial payloads for updates', () => {
    const result = updateTeamMemberSchema.safeParse({
      full_name: 'Jane Doe'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe('Jane Doe');
      expect(result.data.email).toBeUndefined();
    }
  });

  it('should accept empty string for password updates', () => {
    const result = updateTeamMemberSchema.safeParse({
      password: ''
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe('');
    }
  });

  it('should reject invalid email in update payload', () => {
    const result = updateTeamMemberSchema.safeParse({
      email: 'not-an-email'
    });
    expect(result.success).toBe(false);
  });
});

describe('Validators: Team - toggleStatusSchema', () => {
  it('should accept toggle flags with is_banned', () => {
    const result = toggleStatusSchema.safeParse({
      is_banned: true
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_banned).toBe(true);
    }
  });

  it('should accept empty object since is_banned is optional', () => {
    const result = toggleStatusSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
