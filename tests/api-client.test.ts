import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalCoinSwapClient } from '../src/api-client.js';
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
  createMockResponse,
} from './mocks.js';

describe('LocalCoinSwapClient', () => {
  let client: LocalCoinSwapClient;
  const baseUrl = 'https://api.localcoinswap.com';
  const token = 'test-api-token';

  beforeEach(() => {
    client = new LocalCoinSwapClient(baseUrl, token);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new LocalCoinSwapClient('https://api.test.com/', token);
      // Access private property for testing
      expect((clientWithSlash as unknown as { baseUrl: string }).baseUrl).toBe(
        'https://api.test.com'
      );
    });

    it('should store the API token', () => {
      expect((client as unknown as { token: string }).token).toBe(token);
    });
  });

  describe('Currency endpoints', () => {
    it('getActiveCryptos should fetch active cryptocurrencies', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockCurrencies));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getActiveCryptos();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/currencies/active-cryptos/`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Token ${token}`,
          }),
        })
      );
      expect(result).toEqual(mockCurrencies);
    });

    it('getCryptoCurrencies should fetch all cryptocurrencies', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockCurrencies));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getCryptoCurrencies();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/currencies/crypto-currencies/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockCurrencies);
    });

    it('getFiatCurrencies should fetch fiat currencies', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockFiatCurrencies));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getFiatCurrencies();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/currencies/fiat-currencies/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockFiatCurrencies);
    });

    it('getCurrency should fetch a specific currency', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockCurrencies[0]));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getCurrency('BTC');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/currencies/BTC/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockCurrencies[0]);
    });
  });

  describe('Offer endpoints', () => {
    it('searchOffers should search with no params', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaginatedOffers));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.searchOffers();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/offers/search/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockPaginatedOffers);
    });

    it('searchOffers should include query parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaginatedOffers));
      vi.stubGlobal('fetch', mockFetch);

      await client.searchOffers({
        coin_currency: 'BTC',
        fiat_currency: 'USD',
        trading_type: 'buy',
        payment_method: 'bank-transfer',
        country_code: 'US',
        min_amount: 100,
        max_amount: 1000,
        ordering: '-price',
        page: 1,
        page_size: 20,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('coin_currency=BTC'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fiat_currency=USD'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('trading_type=buy'),
        expect.any(Object)
      );
    });

    it('getOffer should fetch a specific offer', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockOffer));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getOffer('offer-uuid-456');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/offers/offer-uuid-456/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockOffer);
    });

    it('getMyOffers should fetch user offers', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaginatedOffers));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getMyOffers();

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v2/offers/`, expect.any(Object));
      expect(result).toEqual(mockPaginatedOffers);
    });

    it('getFeaturedOffers should fetch featured offers', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse([mockOffer]));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getFeaturedOffers();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/offers/featured/`,
        expect.any(Object)
      );
      expect(result).toEqual([mockOffer]);
    });

    it('getPaymentMethods should fetch payment methods', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaymentMethods));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getPaymentMethods();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/offers/payment-methods/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockPaymentMethods);
    });

    it('getTradeTypes should fetch trade types', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockTradeTypes));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getTradeTypes();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/offers/trade-types/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockTradeTypes);
    });
  });

  describe('Swap endpoints', () => {
    it('estimateSwap should post swap estimation request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockSwapEstimate));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.estimateSwap('ETH', 'USDT', '1.0');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/swaps/estimate-swap-amount/`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            from_currency: 'ETH',
            to_currency: 'USDT',
            from_amount: '1.0',
          }),
        })
      );
      expect(result).toEqual(mockSwapEstimate);
    });

    it('getMinSwapAmount should fetch minimum swap amount', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockMinSwapAmount));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getMinSwapAmount('ETH', 'USDT');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/swaps/min-swap-amount/ETH/USDT/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockMinSwapAmount);
    });

    it('getActiveSwaps should fetch active swaps', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaginatedSwaps));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getActiveSwaps();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/swaps/active-swaps/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockPaginatedSwaps);
    });

    it('getPastSwaps should fetch past swaps', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaginatedSwaps));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getPastSwaps();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/swaps/past-swaps/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockPaginatedSwaps);
    });

    it('getSwaps should fetch all swaps', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaginatedSwaps));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getSwaps();

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v2/swaps/`, expect.any(Object));
      expect(result).toEqual(mockPaginatedSwaps);
    });

    it('createSwap should post swap creation request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockSwap));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.createSwap({
        from_currency: 'ETH',
        to_currency: 'USDT',
        from_amount: '1.0',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/swaps/`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            from_currency: 'ETH',
            to_currency: 'USDT',
            from_amount: '1.0',
          }),
        })
      );
      expect(result).toEqual(mockSwap);
    });
  });

  describe('Trade endpoints', () => {
    it('startTrade should post trade start request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockTrade));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.startTrade({
        offer_uuid: 'offer-uuid-456',
        amount: '500',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/trades/`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            offer: 'offer-uuid-456',
            fiat_amount: '500',
          }),
        })
      );
      expect(result).toEqual(mockTrade);
    });

    it('getTrade should fetch a specific trade', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockTrade));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getTrade('trade-uuid-def');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v2/trades/trade-uuid-def/`,
        expect.any(Object)
      );
      expect(result).toEqual(mockTrade);
    });

    it('getMyTrades should fetch user trades', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockPaginatedTrades));
      vi.stubGlobal('fetch', mockFetch);

      const result = await client.getMyTrades();

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v2/trades/`, expect.any(Object));
      expect(result).toEqual(mockPaginatedTrades);
    });
  });

  describe('Error handling', () => {
    it('should throw error on API error response', async () => {
      const errorResponse = createMockResponse({ detail: 'Unauthorized' }, 401);
      const mockFetch = vi.fn().mockResolvedValue(errorResponse);
      vi.stubGlobal('fetch', mockFetch);

      await expect(client.getActiveCryptos()).rejects.toThrow('API Error (401): Unauthorized');
    });

    it('should handle error response with different error field', async () => {
      const errorResponse = createMockResponse({ error: 'Bad request' }, 400);
      const mockFetch = vi.fn().mockResolvedValue(errorResponse);
      vi.stubGlobal('fetch', mockFetch);

      await expect(client.getActiveCryptos()).rejects.toThrow('API Error (400): Bad request');
    });

    it('should handle error response with message field', async () => {
      const errorResponse = createMockResponse({ message: 'Server error' }, 500);
      const mockFetch = vi.fn().mockResolvedValue(errorResponse);
      vi.stubGlobal('fetch', mockFetch);

      await expect(client.getActiveCryptos()).rejects.toThrow('API Error (500): Server error');
    });

    it('should handle non-JSON error response', async () => {
      const errorResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response;
      const mockFetch = vi.fn().mockResolvedValue(errorResponse);
      vi.stubGlobal('fetch', mockFetch);

      await expect(client.getActiveCryptos()).rejects.toThrow(
        'API Error (503): Service Unavailable'
      );
    });
  });

  describe('Authentication', () => {
    it('should include Authorization header when token is set', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockCurrencies));
      vi.stubGlobal('fetch', mockFetch);

      await client.getActiveCryptos();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should work without token for public endpoints', async () => {
      const clientNoToken = new LocalCoinSwapClient(baseUrl, '');
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(mockCurrencies));
      vi.stubGlobal('fetch', mockFetch);

      await clientNoToken.getActiveCryptos();

      // Should not include Authorization header when token is empty
      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBeUndefined();
    });
  });
});
