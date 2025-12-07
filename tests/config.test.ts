import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig } from '../src/index.js';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should use default values when env vars are not set', () => {
      delete process.env.LCS_API_TOKEN;
      delete process.env.LCS_API_URL;
      delete process.env.LCS_REQUIRE_CONFIRMATION;

      const config = loadConfig();

      expect(config.apiToken).toBe('');
      expect(config.apiUrl).toBe('https://api.localcoinswap.com');
      expect(config.requireConfirmation).toBe(true);
    });

    it('should use LCS_API_TOKEN when set', () => {
      process.env.LCS_API_TOKEN = 'my-test-token';

      const config = loadConfig();

      expect(config.apiToken).toBe('my-test-token');
    });

    it('should use LCS_API_URL when set', () => {
      process.env.LCS_API_URL = 'https://custom.api.com';

      const config = loadConfig();

      expect(config.apiUrl).toBe('https://custom.api.com');
    });

    it('should set requireConfirmation to false when LCS_REQUIRE_CONFIRMATION is "false"', () => {
      process.env.LCS_REQUIRE_CONFIRMATION = 'false';

      const config = loadConfig();

      expect(config.requireConfirmation).toBe(false);
    });

    it('should set requireConfirmation to true for any other value', () => {
      process.env.LCS_REQUIRE_CONFIRMATION = 'true';
      expect(loadConfig().requireConfirmation).toBe(true);

      process.env.LCS_REQUIRE_CONFIRMATION = 'yes';
      expect(loadConfig().requireConfirmation).toBe(true);

      process.env.LCS_REQUIRE_CONFIRMATION = '1';
      expect(loadConfig().requireConfirmation).toBe(true);

      process.env.LCS_REQUIRE_CONFIRMATION = '';
      expect(loadConfig().requireConfirmation).toBe(true);
    });

    it('should load all config values together', () => {
      process.env.LCS_API_TOKEN = 'full-test-token';
      process.env.LCS_API_URL = 'https://staging.api.com';
      process.env.LCS_REQUIRE_CONFIRMATION = 'false';

      const config = loadConfig();

      expect(config).toEqual({
        apiToken: 'full-test-token',
        apiUrl: 'https://staging.api.com',
        requireConfirmation: false,
      });
    });
  });
});
