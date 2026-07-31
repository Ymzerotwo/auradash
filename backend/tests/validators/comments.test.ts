import { describe, it, expect } from 'vitest';
import { createPublicCommentSchema, replyCommentSchema } from '../../src/validators/comments.validators';

describe('Validators: Comments - createPublicCommentSchema', () => {
  it('should reject comment if content is empty', () => {
    const result = createPublicCommentSchema.safeParse({
      article_id: '123',
      user_name: 'Ahmed',
      user_email: 'ahmed@example.com',
      content: '   '
    });
    expect(result.success).toBe(false);
  });

  it('should reject comment if name exceeds 100 characters (DoS Prevention)', () => {
    const longName = 'a'.repeat(101);
    const result = createPublicCommentSchema.safeParse({
      article_id: '123',
      user_name: longName,
      user_email: 'ahmed@example.com',
      content: 'Great article!'
    });
    expect(result.success).toBe(false);
  });

  it('should reject comment if content exceeds 3000 characters (DoS Prevention)', () => {
    const longContent = 'a'.repeat(3001);
    const result = createPublicCommentSchema.safeParse({
      article_id: '123',
      user_name: 'Ahmed',
      user_email: 'ahmed@example.com',
      content: longContent
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email formats', () => {
    const result = createPublicCommentSchema.safeParse({
      article_id: '123',
      user_name: 'Ahmed',
      user_email: 'invalid-email',
      content: 'Great article!'
    });
    expect(result.success).toBe(false);
  });

  it('should sanitize HTML from inputs (XSS Prevention)', () => {
    const result = createPublicCommentSchema.safeParse({
      article_id: '123',
      user_name: '<script>alert("name")</script>',
      user_email: 'ahmed@example.com',
      content: 'Look at this: <b>bold</b> and <img src=x onerror=alert(1)>'
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user_name).not.toContain('<script>');
      expect(result.data.content).not.toContain('<img>');
    }
  });

  it('should accept valid inputs safely', () => {
    const result = createPublicCommentSchema.safeParse({
      article_id: '123',
      user_name: 'Ahmed',
      user_email: 'ahmed@example.com',
      content: 'This is a valid, clean comment.'
    });
    expect(result.success).toBe(true);
  });
});

describe('Validators: Comments - replyCommentSchema', () => {
  it('should reject reply if content is empty', () => {
    const result = replyCommentSchema.safeParse({
      content: '   '
    });
    expect(result.success).toBe(false);
  });

  it('should reject reply if content exceeds 3000 characters (DoS Prevention)', () => {
    const longContent = 'a'.repeat(3001);
    const result = replyCommentSchema.safeParse({
      content: longContent
    });
    expect(result.success).toBe(false);
  });

  it('should sanitize HTML from reply inputs (XSS Prevention)', () => {
    const result = replyCommentSchema.safeParse({
      content: 'Hello <script>alert("reply XSS")</script>'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).not.toContain('<script>');
      expect(result.data.content).toContain('&lt;script&gt;');
    }
  });

  it('should accept valid reply content', () => {
    const result = replyCommentSchema.safeParse({
      content: 'This is a valid reply comment.'
    });
    expect(result.success).toBe(true);
  });
});

