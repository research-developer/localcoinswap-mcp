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

    it('should execute swap with valid confirmation_id', async () => {
      // First call to get confirmation ID
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      // Second call with confirmation ID
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
      // First call to get confirmation ID
      const firstResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      const { confirmation_id } = JSON.parse(firstResult.content[0].text);

      // Manually expire the confirmation
      const pending = getPendingConfirmation(confirmation_id);
      if (pending) {
        pending.expiresAt = Date.now() - 1000; // Set to past
      }

      // Try to use expired confirmation
      const secondResult = await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirmation_id,
      });

      expect(secondResult.isError).toBe(true);
      expect(secondResult.content[0].text).toContain('expired');
    });

    it('should cleanup expired confirmations', async () => {
      // First call to get confirmation ID
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

      // Try to use expired confirmation
      await handleCreateSwap(mockClient, config, {
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
        confirmation_id,
      });

      // Confirmation should be deleted
      expect(getPendingConfirmation(confirmation_id)).toBeUndefined();
    });
  });
});
