import type {
  Currency,
  PaymentMethod,
  TradeType,
  Offer,
  OfferSearchParams,
  PaginatedResponse,
  SwapEstimate,
  MinSwapAmount,
  Swap,
  CreateSwapParams,
  Trade,
  StartTradeParams,
  ApiError,
} from './types.js';

export class LocalCoinSwapClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorBody: ApiError;
      try {
        errorBody = (await response.json()) as ApiError;
      } catch {
        errorBody = { detail: response.statusText };
      }
      throw new Error(
        `API Error (${response.status}): ${
          errorBody.detail || errorBody.error || errorBody.message || JSON.stringify(errorBody)
        }`
      );
    }

    return (await response.json()) as T;
  }

  // Currency endpoints
  async getActiveCryptos(): Promise<Currency[]> {
    return this.request<Currency[]>('/api/v2/currencies/active-cryptos/');
  }

  async getCryptoCurrencies(): Promise<Currency[]> {
    return this.request<Currency[]>('/api/v2/currencies/crypto-currencies/');
  }

  async getFiatCurrencies(): Promise<Currency[]> {
    return this.request<Currency[]>('/api/v2/currencies/fiat-currencies/');
  }

  async getCurrency(symbol: string): Promise<Currency> {
    return this.request<Currency>(`/api/v2/currencies/${symbol}/`);
  }

  // Offer endpoints
  async searchOffers(params: OfferSearchParams = {}): Promise<PaginatedResponse<Offer>> {
    const queryParams = new URLSearchParams();

    if (params.coin_currency) queryParams.set('coin_currency', params.coin_currency);
    if (params.fiat_currency) queryParams.set('fiat_currency', params.fiat_currency);
    if (params.trading_type) queryParams.set('trading_type', params.trading_type);
    if (params.payment_method) queryParams.set('payment_method', params.payment_method);
    if (params.country_code) queryParams.set('country_code', params.country_code);
    if (params.min_amount) queryParams.set('min_amount', params.min_amount.toString());
    if (params.max_amount) queryParams.set('max_amount', params.max_amount.toString());
    if (params.ordering) queryParams.set('ordering', params.ordering);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.page_size) queryParams.set('page_size', params.page_size.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/v2/offers/search/${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<Offer>>(endpoint);
  }

  async getMyOffers(): Promise<PaginatedResponse<Offer>> {
    return this.request<PaginatedResponse<Offer>>('/api/v2/offers/');
  }

  async getOffer(uuid: string): Promise<Offer> {
    return this.request<Offer>(`/api/v2/offers/${uuid}/`);
  }

  async getFeaturedOffers(): Promise<Offer[]> {
    return this.request<Offer[]>('/api/v2/offers/featured/');
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.request<PaymentMethod[]>('/api/v2/offers/payment-methods/');
  }

  async getTradeTypes(): Promise<TradeType[]> {
    return this.request<TradeType[]>('/api/v2/offers/trade-types/');
  }

  // Swap endpoints
  async estimateSwap(
    fromCurrency: string,
    toCurrency: string,
    amount: string
  ): Promise<SwapEstimate> {
    return this.request<SwapEstimate>('/api/v2/swaps/estimate-swap-amount/', {
      method: 'POST',
      body: JSON.stringify({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: amount,
      }),
    });
  }

  async getMinSwapAmount(fromCurrency: string, toCurrency: string): Promise<MinSwapAmount> {
    return this.request<MinSwapAmount>(
      `/api/v2/swaps/min-swap-amount/${fromCurrency}/${toCurrency}/`
    );
  }

  async getActiveSwaps(): Promise<PaginatedResponse<Swap>> {
    return this.request<PaginatedResponse<Swap>>('/api/v2/swaps/active-swaps/');
  }

  async getPastSwaps(): Promise<PaginatedResponse<Swap>> {
    return this.request<PaginatedResponse<Swap>>('/api/v2/swaps/past-swaps/');
  }

  async getSwaps(): Promise<PaginatedResponse<Swap>> {
    return this.request<PaginatedResponse<Swap>>('/api/v2/swaps/');
  }

  async createSwap(params: CreateSwapParams): Promise<Swap> {
    return this.request<Swap>('/api/v2/swaps/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Trade endpoints
  async startTrade(params: StartTradeParams): Promise<Trade> {
    return this.request<Trade>('/api/v2/trades/', {
      method: 'POST',
      body: JSON.stringify({
        offer: params.offer_uuid,
        fiat_amount: params.amount,
      }),
    });
  }

  async getTrade(uuid: string): Promise<Trade> {
    return this.request<Trade>(`/api/v2/trades/${uuid}/`);
  }

  async getMyTrades(): Promise<PaginatedResponse<Trade>> {
    return this.request<PaginatedResponse<Trade>>('/api/v2/trades/');
  }
}
