// Mock data for testing

import type {
  Currency,
  PaymentMethod,
  TradeType,
  Offer,
  PaginatedResponse,
  SwapEstimate,
  MinSwapAmount,
  Swap,
  Trade,
  UserProfile,
} from '../src/types.js';

export const mockCurrencies: Currency[] = [
  {
    symbol: 'BTC',
    title: 'Bitcoin',
    is_crypto: true,
    is_active: true,
    network: 'bitcoin',
    decimals: 8,
  },
  {
    symbol: 'ETH',
    title: 'Ethereum',
    is_crypto: true,
    is_active: true,
    network: 'ethereum',
    decimals: 18,
  },
  {
    symbol: 'USDT',
    title: 'Tether',
    is_crypto: true,
    is_active: true,
    network: 'trc20',
    contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
  },
];

export const mockFiatCurrencies: Currency[] = [
  {
    symbol: 'USD',
    title: 'US Dollar',
    is_crypto: false,
    is_active: true,
  },
  {
    symbol: 'EUR',
    title: 'Euro',
    is_crypto: false,
    is_active: true,
  },
];

export const mockPaymentMethods: PaymentMethod[] = [
  { id: 1, name: 'Bank Transfer', slug: 'bank-transfer' },
  { id: 2, name: 'PayPal', slug: 'paypal' },
  { id: 3, name: 'Cash Deposit', slug: 'cash-deposit' },
];

export const mockTradeTypes: TradeType[] = [
  { slug: 'buy', name: 'Buy' },
  { slug: 'sell', name: 'Sell' },
];

export const mockTrader: UserProfile = {
  username: 'testtrader',
  uuid: 'user-uuid-123',
  trades_count: 150,
  feedback_score: 98.5,
  last_seen: '2025-12-07T10:00:00Z',
};

export const mockOffer: Offer = {
  uuid: 'offer-uuid-456',
  trading_type: 'sell',
  coin_currency: 'BTC',
  fiat_currency: 'USD',
  payment_method: mockPaymentMethods[0],
  headline: 'Fast and reliable BTC seller',
  min_trade_size: '50',
  max_trade_size: '5000',
  trading_conditions: 'Must have verified account',
  price: '43250.00',
  margin: '2.5',
  is_active: true,
  trader: mockTrader,
  created_at: '2025-12-01T12:00:00Z',
  updated_at: '2025-12-07T08:00:00Z',
};

export const mockOffers: Offer[] = [
  mockOffer,
  {
    ...mockOffer,
    uuid: 'offer-uuid-789',
    trading_type: 'buy',
    price: '42800.00',
    margin: '1.5',
    trader: { ...mockTrader, username: 'anothertrader' },
  },
];

export const mockPaginatedOffers: PaginatedResponse<Offer> = {
  count: 2,
  next: null,
  previous: null,
  results: mockOffers,
};

export const mockSwapEstimate: SwapEstimate = {
  from_currency: 'ETH',
  to_currency: 'USDT',
  from_amount: '1.0',
  to_amount: '2150.00',
  rate: '2150.00',
  fee: '0.5%',
};

export const mockMinSwapAmount: MinSwapAmount = {
  from_currency: 'ETH',
  to_currency: 'USDT',
  min_amount: '0.01',
};

export const mockSwap: Swap = {
  uuid: 'swap-uuid-abc',
  from_currency: 'ETH',
  to_currency: 'USDT',
  from_amount: '1.0',
  to_amount: '2150.00',
  status: 'completed',
  created_at: '2025-12-07T09:00:00Z',
  completed_at: '2025-12-07T09:05:00Z',
  transaction_hash: '0x123abc...',
};

export const mockPaginatedSwaps: PaginatedResponse<Swap> = {
  count: 1,
  next: null,
  previous: null,
  results: [mockSwap],
};

export const mockTrade: Trade = {
  uuid: 'trade-uuid-def',
  offer: mockOffer,
  amount: '500',
  status: 'active',
  created_at: '2025-12-07T10:00:00Z',
  buyer: { ...mockTrader, username: 'buyer123' },
  seller: mockTrader,
};

export const mockPaginatedTrades: PaginatedResponse<Trade> = {
  count: 1,
  next: null,
  previous: null,
  results: [mockTrade],
};

// Helper to create a mock fetch response
export function createMockResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => createMockResponse(data, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify(data),
  } as Response;
}

// Helper to create mock fetch function
export function createMockFetch(responses: Map<string, Response>): typeof fetch {
  return async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    // Find matching response
    for (const [pattern, response] of responses) {
      if (url.includes(pattern)) {
        return response;
      }
    }

    // Default 404 response
    return createMockResponse({ detail: 'Not found' }, 404);
  };
}
