// LocalCoinSwap API Types

export interface Currency {
  symbol: string;
  title: string;
  is_crypto: boolean;
  is_active: boolean;
  network?: string;
  contract_address?: string;
  decimals?: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  slug: string;
}

export interface TradeType {
  slug: string;
  name: string;
}

export interface UserProfile {
  username: string;
  uuid: string;
  trades_count?: number;
  feedback_score?: number;
  last_seen?: string;
}

export interface Offer {
  uuid: string;
  trading_type: string;
  coin_currency: string;
  fiat_currency: string;
  payment_method: PaymentMethod;
  headline?: string;
  min_trade_size: string;
  max_trade_size: string;
  trading_conditions?: string;
  price?: string;
  margin?: string;
  is_active: boolean;
  trader: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface OfferSearchParams {
  coin_currency?: string;
  fiat_currency?: string;
  trading_type?: 'buy' | 'sell';
  payment_method?: string;
  country_code?: string;
  min_amount?: number;
  max_amount?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SwapEstimate {
  from_currency: string;
  to_currency: string;
  from_amount: string;
  to_amount: string;
  rate: string;
  fee?: string;
}

export interface MinSwapAmount {
  from_currency: string;
  to_currency: string;
  min_amount: string;
}

export interface Swap {
  uuid: string;
  from_currency: string;
  to_currency: string;
  from_amount: string;
  to_amount: string;
  status: string;
  created_at: string;
  completed_at?: string;
  transaction_hash?: string;
}

export interface CreateSwapParams {
  from_currency: string;
  to_currency: string;
  from_amount: string;
}

export interface Trade {
  uuid: string;
  offer: Offer;
  amount: string;
  status: string;
  created_at: string;
  buyer?: UserProfile;
  seller?: UserProfile;
}

export interface StartTradeParams {
  offer_uuid: string;
  amount: string;
}

export interface ApiError {
  detail?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

// Configuration
export interface ServerConfig {
  apiToken: string;
  apiUrl: string;
  requireConfirmation: boolean;
}
