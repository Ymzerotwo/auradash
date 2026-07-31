import { describe, it, expect } from 'vitest';
import { updateMediaSchema } from '../../src/validators/media.validators';

describe('Media Validators', () => {
  describe('updateMediaSchema', () => {
    it('should validate successfully with valid fields', () => {
      const data = {
        file_name: 'test.jpg',
        alt_text: 'Test image',
        folder: 'avatars'
      };
      const result = updateMediaSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail if file_name is empty', () => {
      const data = { file_name: '' };
      const result = updateMediaSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('file_name_empty');
      }
    });

    it('should sanitize alt_text for DB', () => {
      const data = { alt_text: '<script>alert("xss")</script>' };
      const result = updateMediaSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alt_text).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      }
    });

    it('should reject folder paths containing ".." (Path Traversal)', () => {
      const data = { folder: '../../hacked' };
      const result = updateMediaSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('invalid_folder_path');
      }
    });

    it('should accept valid folder paths', () => {
      const data = { folder: 'users/avatars' };
      const result = updateMediaSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.folder).toBe('users/avatars');
      }
    });
  });
});
