import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleListCurrencies,
  handleGetCurrency,
  handleSearchOffers,
  handleGetOffer,
  handleGetFeaturedOffers,
  handleGetMyOffers,
  handleListPaymentMethods,
  handleListTradeTypes,
  handleEstimateSwap,
  handleGetMinSwapAmount,
  handleGetMySwaps,
  handleCreateSwap,
  handleStartTrade,
  handleGetMyTrades,
  handleGetTrade,
  clearPendingConfirmations,
  getPendingConfirmation,
  startConfirmationCleanup,
  stopConfirmationCleanup,
} from '../src/handlers.js';
import { LocalCoinSwapClient } from '../src/api-client.js';
import type { ServerConfig } from '../src/types.js';
import {
  mockCurrencies,
  mockFiatCurrencies,
  mockPaymentMethods,
  mockTradeTypes,
  mockOffer,
  mockPaginatedOffers,
  mockSwapEstimate,
  mockMinSwapAmount,
  mockSwap,
  mockPaginatedSwaps,
  mockTrade,
  mockPaginatedTrades,
} from './mocks.js';

describe('Tool Handlers', () => {
  let mockClient: LocalCoinSwapClient;
  let config: ServerConfig;

  beforeEach(() => {
    mockClient = {
      getActiveCryptos: vi.fn().mockResolvedValue(mockCurrencies),
      getCryptoCurrencies: vi.fn().mockResolvedValue(mockCurrencies),
      getFiatCurrencies: vi.fn().mockResolvedValue(mockFiatCurrencies),
      getCurrency: vi.fn().mockResolvedValue(mockCurrencies[0]),
      searchOffers: vi.fn().mockResolvedValue(mockPaginatedOffers),
      getOffer: vi.fn().mockResolvedValue(mockOffer),
      getFeaturedOffers: vi.fn().mockResolvedValue([mockOffer]),
      getMyOffers: vi.fn().mockResolvedValue(mockPaginatedOffers),
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      getTradeTypes: vi.fn().mockResolvedValue(mockTradeTypes),
      estimateSwap: vi.fn().mockResolvedValue(mockSwapEstimate),
      getMinSwapAmount: vi.fn().mockResolvedValue(mockMinSwapAmount),
      getActiveSwaps: vi.fn().mockResolvedValue(mockPaginatedSwaps),
      getPastSwaps: vi.fn().mockResolvedValue(mockPaginatedSwaps),
      getSwaps: vi.fn().mockResolvedValue(mockPaginatedSwaps),
      createSwap: vi.fn().mockResolvedValue(mockSwap),
      startTrade: vi.fn().mockResolvedValue(mockTrade),
      getTrade: vi.fn().mockResolvedValue(mockTrade),
      getMyTrades: vi.fn().mockResolvedValue(mockPaginatedTrades),
    } as unknown as LocalCoinSwapClient;

    config = {
      apiToken: 'test-token',
      apiUrl: 'https://api.test.com',
      requireConfirmation: true,
    };

    clearPendingConfirmations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearPendingConfirmations();
  });

  describe('Currency handlers', () => {
    it('handleListCurrencies should return crypto currencies by default', async () => {
      const result = await handleListCurrencies(mockClient, {});

      expect(mockClient.getCryptoCurrencies).toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].symbol).toBe('BTC');
    });

    it('handleListCurrencies should return fiat currencies when type is fiat', async () => {
      await handleListCurrencies(mockClient, { type: 'fiat' });
      expect(mockClient.getFiatCurrencies).toHaveBeenCalled();
    });

    it('handleListCurrencies should return active cryptos when type is active', async () => {
      await handleListCurrencies(mockClient, { type: 'active' });
      expect(mockClient.getActiveCryptos).toHaveBeenCalled();
    });

    it('handleGetCurrency should fetch specific currency', async () => {
      await handleGetCurrency(mockClient, { symbol: 'btc' });
      expect(mockClient.getCurrency).toHaveBeenCalledWith('BTC');
    });

    it('handleListCurrencies should handle errors', async () => {
      (mockClient.getCryptoCurrencies as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await handleListCurrencies(mockClient, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing currencies');
    });
  });

  describe('Offer handlers', () => {
    it('handleSearchOffers should search with provided params', async () => {
      const result = await handleSearchOffers(mockClient, {
        coin_currency: 'btc',
        fiat_currency: 'usd',
        trading_type: 'buy',
      });

      expect(mockClient.searchOffers).toHaveBeenCalledWith({
        coin_currency: 'BTC',
        fiat_currency: 'USD',
        trading_type: 'buy',
        payment_method: undefined,
        country_code: undefined,
        min_amount: undefined,
        max_amount: undefined,
        ordering: undefined,
        page: undefined,
        page_size: undefined,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_count).toBe(2);
    });

    it('handleGetOffer should fetch specific offer', async () => {
      await handleGetOffer(mockClient, { uuid: 'offer-uuid-456' });
      expect(mockClient.getOffer).toHaveBeenCalledWith('offer-uuid-456');
    });

    it('handleGetFeaturedOffers should fetch featured offers', async () => {
      await handleGetFeaturedOffers(mockClient);
      expect(mockClient.getFeaturedOffers).toHaveBeenCalled();
    });

    it('handleGetMyOffers should require API token', async () => {
      const noTokenConfig = { ...config, apiToken: '' };
      const result = await handleGetMyOffers(mockClient, noTokenConfig);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API token not configured');
    });

    it('handleGetMyOffers should fetch offers when authenticated', async () => {
      await handleGetMyOffers(mockClient, config);
      expect(mockClient.getMyOffers).toHaveBeenCalled();
    });

    it('handleListPaymentMethods should fetch payment methods', async () => {
      await handleListPaymentMethods(mockClient);
      expect(mockClient.getPaymentMethods).toHaveBeenCalled();
    });

    it('handleListTradeTypes should fetch trade types', async () => {
      await handleListTradeTypes(mockClient);
      expect(mockClient.getTradeTypes).toHaveBeenCalled();
    });
  });

  describe('Swap handlers', () => {
    it('handleEstimateSwap should estimate swap', async () => {
      const result = await handleEstimateSwap(mockClient, {
        from_currency: 'eth',
        to_currency: 'usdt',
        amount: '1.0',
      });

      expect(mockClient.estimateSwap).toHaveBeenCalledWith('ETH', 'USDT', '1.0');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.rate).toBe('2150.00');
    });

    it('handleGetMinSwapAmount should fetch minimum amount', async () => {
      await handleGetMinSwapAmount(mockClient, {
        from_currency: 'eth',
        to_currency: 'usdt',
      });

      expect(mockClient.getMinSwapAmount).toHaveBeenCalledWith('ETH', 'USDT');
    });

    it('handleGetMySwaps should fetch all swaps by default', async () => {
      await handleGetMySwaps(mockClient, config, {});
      expect(mockClient.getSwaps).toHaveBeenCalled();
    });

    it('handleGetMySwaps should fetch active swaps when status is active', async () => {
      await handleGetMySwaps(mockClient, config, { status: 'active' });
      expect(mockClient.getActiveSwaps).toHaveBeenCalled();
    });

    it('handleGetMySwaps should fetch past swaps when status is past', async () => {
      await handleGetMySwaps(mockClient, config, { status: 'past' });
      expect(mockClient.getPastSwaps).toHaveBeenCalled();
    });

    it('handleGetMySwaps should require API token', async () => {
      const noTokenConfig = { ...config, apiToken: '' };
      const result = await handleGetMySwaps(mockClient, noTokenConfig, {});
      expect(result.isError).toBe(true);
    });
  });

  describe('Trade handlers', () => {
    it('handleGetMyTrades should fetch trades', async () => {
      await handleGetMyTrades(mockClient, config);
      expect(mockClient.getMyTrades).toHaveBeenCalled();
    });

    it('handleGetTrade should fetch specific trade', async () => {
      await handleGetTrade(mockClient, config, { uuid: 'trade-uuid-def' });
      expect(mockClient.getTrade).toHaveBeenCalledWith('trade-uuid-def');
    });

    it('handleGetMyTrades should require API token', async () => {
      const noTokenConfig = { ...config, apiToken: '' };
      const result = await handleGetMyTrades(mockClient, noTokenConfig);
      expect(result.isError).toBe(true);
    });

    it('handleGetTrade should require API token', async () => {
      const noTokenConfig = { ...config, apiToken: '' };
      const result = await handleGetTrade(mockClient, noTokenConfig, { uuid: 'test' });
      expect(result.isError).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      (mockClient.getCryptoCurrencies as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await handleListCurrencies(mockClient, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing currencies');
      expect(result.content[0].text).toContain('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      (mockClient.getCryptoCurrencies as ReturnType<typeof vi.fn>).mockRejectedValue(
        'String error'
      );

      const result = await handleListCurrencies(mockClient, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('String error');
    });
  });
});

describe('Input Validation', () => {
  let mockClient: LocalCoinSwapClient;
  let config: ServerConfig;

  beforeEach(() => {
    mockClient = {
      getCurrency: vi.fn().mockResolvedValue(mockCurrencies[0]),
      searchOffers: vi.fn().mockResolvedValue(mockPaginatedOffers),
      estimateSwap: vi.fn().mockResolvedValue(mockSwapEstimate),
      getMinSwapAmount: vi.fn().mockResolvedValue(mockMinSwapAmount),
      createSwap: vi.fn().mockResolvedValue(mockSwap),
      startTrade: vi.fn().mockResolvedValue(mockTrade),
      getOffer: vi.fn().mockResolvedValue(mockOffer),
    } as unknown as LocalCoinSwapClient;

    config = {
      apiToken: 'test-token',
      apiUrl: 'https://api.test.com',
      requireConfirmation: false,
    };

    clearPendingConfirmations();
  });

  describe('Currency symbol validation', () => {
    it('should reject invalid currency symbol (too short)', async () => {
      const result = await handleGetCurrency(mockClient, { symbol: 'X' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid currency symbol');
    });

    it('should reject invalid currency symbol (too long)', async () => {
      const result = await handleGetCurrency(mockClient, { symbol: 'VERYLONGCURRENCY' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid currency symbol');
    });

    it('should reject invalid currency symbol (special chars)', async () => {
      const result = await handleGetCurrency(mockClient, { symbol: 'BT@C' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid currency symbol');
    });

    it('should accept valid currency symbols', async () => {
      const result = await handleGetCurrency(mockClient, { symbol: 'USDT' });
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Amount validation', () => {
    it('should reject negative amounts', async () => {
      const result = await handleEstimateSwap(mockClient, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        amount: '-1.0',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid amount');
    });

    it('should reject zero amounts', async () => {
      const result = await handleEstimateSwap(mockClient, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        amount: '0',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid amount');
    });

    it('should reject non-numeric amounts', async () => {
      const result = await handleEstimateSwap(mockClient, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        amount: 'abc',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid amount');
    });

    it('should accept valid amounts', async () => {
      const result = await handleEstimateSwap(mockClient, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        amount: '1.5',
      });
      expect(result.isError).toBeUndefined();
    });

    it('should accept integer amounts', async () => {
      const result = await handleEstimateSwap(mockClient, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        amount: '100',
      });
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Search offers validation', () => {
    it('should reject invalid coin_currency', async () => {
      const result = await handleSearchOffers(mockClient, {
        coin_currency: '@invalid',
      });
      expect(result.isError).toBe(true);
    });

    it('should reject negative min_amount', async () => {
      const result = await handleSearchOffers(mockClient, {
        min_amount: -100,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('min_amount must be non-negative');
    });

    it('should reject negative max_amount', async () => {
      const result = await handleSearchOffers(mockClient, {
        max_amount: -100,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('max_amount must be non-negative');
    });
  });

  describe('Create swap validation', () => {
    it('should validate all swap parameters', async () => {
      const result = await handleCreateSwap(mockClient, config, {
        from_currency: '@',
        to_currency: 'USDT',
        from_amount: '1.0',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('Start trade validation', () => {
    it('should validate amount parameter', async () => {
      const result = await handleStartTrade(mockClient, config, {
        offer_uuid: 'offer-123',
        amount: '-500',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid amount');
    });
  });
});

describe('Confirmation System', () => {
  let mockClient: LocalCoinSwapClient;
  let config: ServerConfig;

  beforeEach(() => {
    mockClient = {
      getActiveCryptos: vi.fn().mockResolvedValue(mockCurrencies),
      getCryptoCurrencies: vi.fn().mockResolvedValue(mockCurrencies),
      getFiatCurrencies: vi.fn().mockResolvedValue(mockFiatCurrencies),
      getCurrency: vi.fn().mockResolvedValue(mockCurrencies[0]),
      searchOffers: vi.fn().mockResolvedValue(mockPaginatedOffers),
      getOffer: vi.fn().mockResolvedValue(mockOffer),
      getFeaturedOffers: vi.fn().mockResolvedValue([mockOffer]),
      getMyOffers: vi.fn().mockResolvedValue(mockPaginatedOffers),
      getPaymentMethods: vi.fn().mockResolvedValue(mockPaymentMethods),
      getTradeTypes: vi.fn().mockResolvedValue(mockTradeTypes),
      estimateSwap: vi.fn().mockResolvedValue(mockSwapEstimate),
      getMinSwapAmount: vi.fn().mockResolvedValue(mockMinSwapAmount),
      getActiveSwaps: vi.fn().mockResolvedValue(mockPaginatedSwaps),
      getPastSwaps: vi.fn().mockResolvedValue(mockPaginatedSwaps),
      getSwaps: vi.fn().mockResolvedValue(mockPaginatedSwaps),
      createSwap: vi.fn().mockResolvedValue(mockSwap),
      startTrade: vi.fn().mockResolvedValue(mockTrade),
      getTrade: vi.fn().mockResolvedValue(mockTrade),
      getMyTrades: vi.fn().mockResolvedValue(mockPaginatedTrades),
    } as unknown as LocalCoinSwapClient;

    config = {
      apiToken: 'test-token',
      apiUrl: 'https://api.test.com',
      requireConfirmation: true,
    };

    clearPendingConfirmations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearPendingConfirmations();
    stopConfirmationCleanup();
  });

  describe('handleCreateSwap confirmation', () => {
    it('should require confirmation when requireConfirmation is true', async () => {
      const result = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('confirmation_required');
      expect(parsed.confirmation_id).toMatch(/^confirm_\d+_[a-z0-9]+$/);
      expect(parsed.swap_details).toBeDefined();
      expect(mockClient.createSwap).not.toHaveBeenCalled();
    });

    it('should execute swap when confirm is true', async () => {
      const result = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirm: true,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('swap_created');
      expect(mockClient.createSwap).toHaveBeenCalled();
    });

    it('should require confirmation when confirm is explicitly false', async () => {
      const result = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirm: false,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('confirmation_required');
      expect(mockClient.createSwap).not.toHaveBeenCalled();
    });

    it('should execute swap with valid confirmation_id and matching params', async () => {
      // First call to get confirmation ID
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      // Second call with confirmation ID and SAME params
      const secondResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirmation_id,
      });

      const parsed = JSON.parse(secondResult.content[0].text);
      expect(parsed.status).toBe('swap_created');
      expect(mockClient.createSwap).toHaveBeenCalled();
    });

    it('should reject confirmation_id with changed from_currency', async () => {
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      // Try with different from_currency
      const secondResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'BTC', // CHANGED
        to_currency: 'USDT',
        from_amount: '1.0',
        confirmation_id,
      });

      expect(secondResult.isError).toBe(true);
      expect(secondResult.content[0].text).toContain('parameters do not match');
    });

    it('should reject confirmation_id with changed to_currency', async () => {
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      const secondResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'BTC', // CHANGED
        from_amount: '1.0',
        confirmation_id,
      });

      expect(secondResult.isError).toBe(true);
      expect(secondResult.content[0].text).toContain('parameters do not match');
    });

    it('should reject confirmation_id with changed amount', async () => {
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      const secondResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '999.0', // CHANGED
        confirmation_id,
      });

      expect(secondResult.isError).toBe(true);
      expect(secondResult.content[0].text).toContain('parameters do not match');
    });

    it('should reject invalid confirmation_id', async () => {
      const result = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirmation_id: 'invalid_id',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid or expired confirmation ID');
    });

    it('should skip confirmation when requireConfirmation is false', async () => {
      const noConfirmConfig = { ...config, requireConfirmation: false };
      const result = await handleCreateSwap(mockClient, noConfirmConfig, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('swap_created');
      expect(mockClient.createSwap).toHaveBeenCalled();
    });

    it('should require API token', async () => {
      const noTokenConfig = { ...config, apiToken: '' };
      const result = await handleCreateSwap(mockClient, noTokenConfig, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('handleStartTrade confirmation', () => {
    it('should require confirmation when requireConfirmation is true', async () => {
      const result = await handleStartTrade(mockClient, config, {
        offer_uuid: 'offer-uuid-456',
        amount: '500',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('confirmation_required');
      expect(parsed.confirmation_id).toBeDefined();
      expect(parsed.trade_details).toBeDefined();
      expect(mockClient.startTrade).not.toHaveBeenCalled();
    });

    it('should execute trade when confirm is true', async () => {
      const result = await handleStartTrade(mockClient, config, {
        offer_uuid: 'offer-uuid-456',
        amount: '500',
        confirm: true,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('trade_started');
      expect(mockClient.startTrade).toHaveBeenCalled();
    });

    it('should reject confirmation_id with changed offer_uuid', async () => {
      const firstResult = await handleStartTrade(mockClient, config, {
        offer_uuid: 'offer-uuid-456',
        amount: '500',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      const secondResult = await handleStartTrade(mockClient, config, {
        offer_uuid: 'different-offer', // CHANGED
        amount: '500',
        confirmation_id,
      });

      expect(secondResult.isError).toBe(true);
      expect(secondResult.content[0].text).toContain('parameters do not match');
    });

    it('should reject confirmation_id with changed amount', async () => {
      const firstResult = await handleStartTrade(mockClient, config, {
        offer_uuid: 'offer-uuid-456',
        amount: '500',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      const secondResult = await handleStartTrade(mockClient, config, {
        offer_uuid: 'offer-uuid-456',
        amount: '9999', // CHANGED
        confirmation_id,
      });

      expect(secondResult.isError).toBe(true);
      expect(secondResult.content[0].text).toContain('parameters do not match');
    });

    it('should reject swap confirmation_id for trade action', async () => {
      // Get a swap confirmation ID
      const swapResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(swapResult.content[0].text);

      // Try to use it for a trade
      const tradeResult = await handleStartTrade(mockClient, config, {
        offer_uuid: 'offer-uuid-456',
        amount: '500',
        confirmation_id,
      });

      expect(tradeResult.isError).toBe(true);
      expect(tradeResult.content[0].text).toContain('different action');
    });

    it('should skip confirmation when requireConfirmation is false', async () => {
      const noConfirmConfig = { ...config, requireConfirmation: false };
      const result = await handleStartTrade(mockClient, noConfirmConfig, {
        offer_uuid: 'offer-uuid-456',
        amount: '500',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('trade_started');
      expect(mockClient.startTrade).toHaveBeenCalled();
    });

    it('should require API token', async () => {
      const noTokenConfig = { ...config, apiToken: '' };
      const result = await handleStartTrade(mockClient, noTokenConfig, {
        offer_uuid: 'offer-uuid-456',
        amount: '500',
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Confirmation expiration', () => {
    it('should reject expired confirmation IDs', async () => {
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      // Manually expire the confirmation
      const pending = getPendingConfirmation(confirmation_id);
      if (pending) {
        pending.expiresAt = Date.now() - 1000;
      }

      const secondResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirmation_id,
      });

      expect(secondResult.isError).toBe(true);
      expect(secondResult.content[0].text).toContain('expired');
    });

    it('should cleanup expired confirmations on use', async () => {
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      const pending = getPendingConfirmation(confirmation_id);
      if (pending) {
        pending.expiresAt = Date.now() - 1000;
      }

      await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirmation_id,
      });

      expect(getPendingConfirmation(confirmation_id)).toBeUndefined();
    });
  });

  describe('Cleanup functions', () => {
    it('startConfirmationCleanup and stopConfirmationCleanup should work', () => {
      // Should not throw
      startConfirmationCleanup(1000);
      stopConfirmationCleanup();
    });

    it('startConfirmationCleanup should replace existing interval', () => {
      startConfirmationCleanup(1000);
      startConfirmationCleanup(2000); // Should replace, not add
      stopConfirmationCleanup();
    });
  });
});
