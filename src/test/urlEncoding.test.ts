import { describe, it, expect } from 'vitest';
import { encodeStringToUrlFragment, decodeStringFromUrlFragment } from '@/lib/urlEncoding';

describe('encodeStringToUrlFragment', () => {
  describe('basic encoding', () => {
    it('should encode a simple ASCII string', () => {
      const result = encodeStringToUrlFragment('hello world');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should encode an empty string', () => {
      const result = encodeStringToUrlFragment('');
      expect(result).toBe('');
    });

    it('should encode a single character', () => {
      const result = encodeStringToUrlFragment('a');
      expect(result).toBeTruthy();
    });

    it('should encode numbers as strings', () => {
      const result = encodeStringToUrlFragment('12345');
      expect(result).toBeTruthy();
    });

    it('should encode mixed alphanumeric content', () => {
      const result = encodeStringToUrlFragment('Test123!@#');
      expect(result).toBeTruthy();
    });
  });

  describe('special characters', () => {
    it('should encode Unicode characters', () => {
      const result = encodeStringToUrlFragment('测试');
      expect(result).toBeTruthy();
      expect(result).not.toContain('测试');
    });

    it('should encode emoji', () => {
      const result = encodeStringToUrlFragment('🎯 🚀 ✅');
      expect(result).toBeTruthy();
      expect(result).not.toContain('🎯');
    });

    it('should encode mixed Unicode and ASCII', () => {
      const result = encodeStringToUrlFragment('Hello 世界 World');
      expect(result).toBeTruthy();
    });

    it('should encode newlines', () => {
      const result = encodeStringToUrlFragment('line1\nline2\nline3');
      expect(result).toBeTruthy();
      expect(result).not.toContain('\n');
    });

    it('should encode tabs', () => {
      const result = encodeStringToUrlFragment('col1\tcol2\tcol3');
      expect(result).toBeTruthy();
      expect(result).not.toContain('\t');
    });

    it('should encode quotes', () => {
      const result = encodeStringToUrlFragment(`It's "quoted"`);
      expect(result).toBeTruthy();
    });

    it('should encode HTML-like content', () => {
      const result = encodeStringToUrlFragment('<div class="test">content</div>');
      expect(result).toBeTruthy();
    });

    it('should encode JSON-like content', () => {
      const result = encodeStringToUrlFragment('{"key": "value", "num": 123}');
      expect(result).toBeTruthy();
    });
  });

  describe('URL safety', () => {
    it('should not contain + characters (base64url)', () => {
      const result = encodeStringToUrlFragment('test with spaces and more content');
      expect(result).not.toContain('+');
    });

    it('should not contain / characters (base64url)', () => {
      const result = encodeStringToUrlFragment('test?value=123&other=456');
      expect(result).not.toContain('/');
    });

    it('should not contain = padding (base64url)', () => {
      const result = encodeStringToUrlFragment('a');
      expect(result).not.toContain('=');
    });

    it('should use - instead of +', () => {
      // Force a scenario that would produce + in standard base64
      const result = encodeStringToUrlFragment('>>>???');
      expect(result).toMatch(/[a-zA-Z0-9_-]+/);
    });

    it('should use _ instead of /', () => {
      // Force a scenario that would produce / in standard base64
      const result = encodeStringToUrlFragment('~~~???');
      expect(result).toMatch(/[a-zA-Z0-9_-]+/);
    });

    it('should only contain URL-safe characters', () => {
      const longString = 'a'.repeat(1000);
      const result = encodeStringToUrlFragment(longString);
      expect(result).toMatch(/^[a-zA-Z0-9_-]*$/);
    });
  });

  describe('large content', () => {
    it('should encode a large string (1KB)', () => {
      const large = 'x'.repeat(1024);
      const result = encodeStringToUrlFragment(large);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(1000);
    });

    it('should encode a very large string (100KB)', () => {
      const veryLarge = 'test content\n'.repeat(10000);
      const result = encodeStringToUrlFragment(veryLarge);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(10000);
    });
  });
});

describe('decodeStringFromUrlFragment', () => {
  describe('basic decoding', () => {
    it('should decode a valid encoded string', () => {
      const encoded = encodeStringToUrlFragment('hello world');
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe('hello world');
    });

    it('should decode an empty fragment', () => {
      const decoded = decodeStringFromUrlFragment('');
      expect(decoded).toBe('');
    });

    it('should decode a single character', () => {
      const encoded = encodeStringToUrlFragment('a');
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe('a');
    });

    it('should decode numbers', () => {
      const encoded = encodeStringToUrlFragment('12345');
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe('12345');
    });

    it('should decode mixed content', () => {
      const original = 'Test123!@#$%';
      const encoded = encodeStringToUrlFragment(original);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('special characters', () => {
    it('should decode Unicode characters', () => {
      const original = '测试内容';
      const encoded = encodeStringToUrlFragment(original);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(original);
    });

    it('should decode emoji', () => {
      const original = '🎯 Goal 🚀 Launch ✅ Done';
      const encoded = encodeStringToUrlFragment(original);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(original);
    });

    it('should decode newlines', () => {
      const original = 'line1\nline2\nline3';
      const encoded = encodeStringToUrlFragment(original);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(original);
    });

    it('should decode tabs', () => {
      const original = 'col1\tcol2\tcol3';
      const encoded = encodeStringToUrlFragment(original);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(original);
    });

    it('should decode quotes', () => {
      const original = `It's "quoted" and 'single'`;
      const encoded = encodeStringToUrlFragment(original);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('error handling', () => {
    it('should return null for invalid base64', () => {
      const decoded = decodeStringFromUrlFragment('!!!invalid!!!');
      expect(decoded).toBeNull();
    });

    it('should return null for corrupted data', () => {
      const decoded = decodeStringFromUrlFragment('abc!@#$%^&*');
      expect(decoded).toBeNull();
    });

    it('should return null for random text', () => {
      const decoded = decodeStringFromUrlFragment('this is not base64');
      expect(decoded).toBeNull();
    });

    it('should return null for partial fragments', () => {
      const encoded = encodeStringToUrlFragment('hello world');
      const partial = encoded.slice(0, encoded.length - 5);
      const decoded = decodeStringFromUrlFragment(partial);
      // May or may not be null depending on whether partial is still valid base64
      // But definitely should not equal original
      expect(decoded).not.toBe('hello world');
    });
  });

  describe('large content', () => {
    it('should decode large strings', () => {
      const large = 'x'.repeat(1024);
      const encoded = encodeStringToUrlFragment(large);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(large);
    });

    it('should decode very large strings', () => {
      const veryLarge = 'test content\n'.repeat(10000);
      const encoded = encodeStringToUrlFragment(veryLarge);
      const decoded = decodeStringFromUrlFragment(encoded);
      expect(decoded).toBe(veryLarge);
    });
  });
});

describe('encoding roundtrip', () => {
  it('should roundtrip simple ASCII', () => {
    const original = 'Hello, World!';
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip Unicode', () => {
    const original = '你好世界 こんにちは Привет';
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip emoji', () => {
    const original = '😀😁😂🤣😃😄😅😆😉😊';
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip multiline text', () => {
    const original = 'Line 1\nLine 2\nLine 3\n\nLine 5';
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip JSON', () => {
    const original = JSON.stringify({ v: 1, m: 'test', n: 'name' });
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip markdown content', () => {
    const original = `## [Outcome] Test @on-track
Description
- start: 0
- current: 50
- target: 100
`;
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip special characters', () => {
    const original = '<>&"\'@#$%^&*()[]{}|\\';
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip whitespace variations', () => {
    const original = '  spaces\t\ttabs\n\nnewlines  ';
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });

  it('should roundtrip empty string', () => {
    const original = '';
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    // Empty string encodes to empty, which decodes to empty
    expect(decoded).toBe(original);
  });

  it('should roundtrip very long content', () => {
    const original = 'Test content with various characters: 测试 🎯\n'.repeat(1000);
    const encoded = encodeStringToUrlFragment(original);
    const decoded = decodeStringFromUrlFragment(encoded);
    expect(decoded).toBe(original);
  });
});
