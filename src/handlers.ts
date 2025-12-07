import { LocalCoinSwapClient } from './api-client.js';
import type { ServerConfig } from './types.js';

// Tool response type
export interface ToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// Pending confirmation entry with bound parameters
interface PendingConfirmation {
  action: 'create_swap' | 'start_trade';
  params: Record<string, unknown>;
  expiresAt: number;
}

// Track pending confirmations for sensitive operations
const pendingConfirmations = new Map<string, PendingConfirmation>();

// Cleanup interval handle
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function generateConfirmationId(): string {
  return `confirm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Periodic cleanup of expired confirmations to prevent memory leaks
function cleanupExpiredConfirmations(): void {
  const now = Date.now();
  for (const [id, confirmation] of pendingConfirmations) {
    if (confirmation.expiresAt < now) {
      pendingConfirmations.delete(id);
    }
  }
}

// Start periodic cleanup (call once at server startup)
export function startConfirmationCleanup(intervalMs = 60000): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  cleanupInterval = setInterval(cleanupExpiredConfirmations, intervalMs);
}

// Stop cleanup (for testing)
export function stopConfirmationCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Export for testing
export function clearPendingConfirmations(): void {
  pendingConfirmations.clear();
}

export function getPendingConfirmation(id: string) {
  return pendingConfirmations.get(id);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Reusable API token validation
function requireApiToken(config: ServerConfig): ToolResponse | null {
  if (!config.apiToken) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: API token not configured. Set LCS_API_TOKEN environment variable.',
        },
      ],
      isError: true,
    };
  }
  return null;
}

// Currency symbol validation
const CURRENCY_SYMBOL_REGEX = /^[A-Z0-9]{2,10}$/;

function validateCurrencySymbol(symbol: string): string | null {
  const normalized = symbol.toUpperCase().trim();
  if (!CURRENCY_SYMBOL_REGEX.test(normalized)) {
    return `Invalid currency symbol: "${symbol}". Must be 2-10 alphanumeric characters.`;
  }
  return null;
}

// Amount validation
function validateAmount(amount: string): string | null {
  const trimmed = amount.trim();
  // Check for valid positive decimal number
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return `Invalid amount: "${amount}". Must be a positive number.`;
  }
  const numValue = parseFloat(trimmed);
  if (numValue <= 0) {
    return `Invalid amount: "${amount}". Must be greater than zero.`;
  }
  if (!isFinite(numValue)) {
    return `Invalid amount: "${amount}". Number is not finite.`;
  }
  return null;
}

// Validate confirmation and check parameter binding
function validateConfirmation(
  confirmationId: string,
  expectedAction: 'create_swap' | 'start_trade',
  expectedParams: Record<string, unknown>
): ToolResponse | null {
  const pending = pendingConfirmations.get(confirmationId);

  if (!pending) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Invalid or expired confirmation ID. Please start a new request.',
        },
      ],
      isError: true,
    };
  }

  if (pending.expiresAt < Date.now()) {
    pendingConfirmations.delete(confirmationId);
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Confirmation ID has expired. Please start a new request.',
        },
      ],
      isError: true,
    };
  }

  // Verify action type matches
  if (pending.action !== expectedAction) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Confirmation ID was issued for a different action (${pending.action}). Please start a new request.`,
        },
      ],
      isError: true,
    };
  }

  // Verify parameters match the original request (security: prevent token reuse for different operations)
  for (const [key, value] of Object.entries(expectedParams)) {
    if (pending.params[key] !== value) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Request parameters do not match the original confirmation. Parameter "${key}" differs. Please start a new request.`,
          },
        ],
        isError: true,
      };
    }
  }

  // Valid - remove from pending
  pendingConfirmations.delete(confirmationId);
  return null;
}

// ============================================================================
// CURRENCY HANDLERS
// ============================================================================

export async function handleListCurrencies(
  client: LocalCoinSwapClient,
  params: { type?: 'crypto' | 'fiat' | 'active' }
): Promise<ToolResponse> {
  try {
    let currencies;
    switch (params.type) {
      case 'fiat':
        currencies = await client.getFiatCurrencies();
        break;
      case 'active':
        currencies = await client.getActiveCryptos();
        break;
      case 'crypto':
      default:
        currencies = await client.getCryptoCurrencies();
    }

    const formatted = currencies.map((c) => ({
      symbol: c.symbol,
      name: c.title,
      network: c.network || 'native',
      active: c.is_active,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing currencies: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetCurrency(
  client: LocalCoinSwapClient,
  params: { symbol: string }
): Promise<ToolResponse> {
  try {
    // Validate input
    const symbolError = validateCurrencySymbol(params.symbol);
    if (symbolError) {
      return { content: [{ type: 'text', text: `Error: ${symbolError}` }], isError: true };
    }

    const currency = await client.getCurrency(params.symbol.toUpperCase());
    return {
      content: [{ type: 'text', text: JSON.stringify(currency, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting currency: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// OFFER HANDLERS
// ============================================================================

export async function handleSearchOffers(
  client: LocalCoinSwapClient,
  params: {
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
): Promise<ToolResponse> {
  try {
    // Validate currency symbols if provided
    if (params.coin_currency) {
      const error = validateCurrencySymbol(params.coin_currency);
      if (error) {
        return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
      }
    }
    if (params.fiat_currency) {
      const error = validateCurrencySymbol(params.fiat_currency);
      if (error) {
        return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
      }
    }

    // Validate amounts if provided
    if (params.min_amount !== undefined && params.min_amount < 0) {
      return {
        content: [{ type: 'text', text: 'Error: min_amount must be non-negative.' }],
        isError: true,
      };
    }
    if (params.max_amount !== undefined && params.max_amount < 0) {
      return {
        content: [{ type: 'text', text: 'Error: max_amount must be non-negative.' }],
        isError: true,
      };
    }

    const results = await client.searchOffers({
      coin_currency: params.coin_currency?.toUpperCase(),
      fiat_currency: params.fiat_currency?.toUpperCase(),
      trading_type: params.trading_type,
      payment_method: params.payment_method,
      country_code: params.country_code?.toUpperCase(),
      min_amount: params.min_amount,
      max_amount: params.max_amount,
      ordering: params.ordering,
      page: params.page,
      page_size: params.page_size,
    });

    const summary = {
      total_count: results.count,
      page_info: {
        has_next: !!results.next,
        has_previous: !!results.previous,
      },
      offers: results.results.map((offer) => ({
        uuid: offer.uuid,
        type: offer.trading_type,
        crypto: offer.coin_currency,
        fiat: offer.fiat_currency,
        payment_method: offer.payment_method?.name,
        price: offer.price,
        margin: offer.margin,
        min_trade: offer.min_trade_size,
        max_trade: offer.max_trade_size,
        trader: {
          username: offer.trader?.username,
          trades: offer.trader?.trades_count,
          feedback: offer.trader?.feedback_score,
        },
        headline: offer.headline,
      })),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching offers: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetOffer(
  client: LocalCoinSwapClient,
  params: { uuid: string }
): Promise<ToolResponse> {
  try {
    const offer = await client.getOffer(params.uuid);
    return {
      content: [{ type: 'text', text: JSON.stringify(offer, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting offer: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetFeaturedOffers(client: LocalCoinSwapClient): Promise<ToolResponse> {
  try {
    const offers = await client.getFeaturedOffers();
    return {
      content: [{ type: 'text', text: JSON.stringify(offers, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting featured offers: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetMyOffers(
  client: LocalCoinSwapClient,
  config: ServerConfig
): Promise<ToolResponse> {
  const tokenError = requireApiToken(config);
  if (tokenError) return tokenError;

  try {
    const results = await client.getMyOffers();
    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting your offers: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleListPaymentMethods(client: LocalCoinSwapClient): Promise<ToolResponse> {
  try {
    const methods = await client.getPaymentMethods();
    return {
      content: [{ type: 'text', text: JSON.stringify(methods, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing payment methods: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleListTradeTypes(client: LocalCoinSwapClient): Promise<ToolResponse> {
  try {
    const types = await client.getTradeTypes();
    return {
      content: [{ type: 'text', text: JSON.stringify(types, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing trade types: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// SWAP HANDLERS
// ============================================================================

export async function handleEstimateSwap(
  client: LocalCoinSwapClient,
  params: { from_currency: string; to_currency: string; amount: string }
): Promise<ToolResponse> {
  try {
    // Validate inputs
    const fromError = validateCurrencySymbol(params.from_currency);
    if (fromError) {
      return { content: [{ type: 'text', text: `Error: ${fromError}` }], isError: true };
    }
    const toError = validateCurrencySymbol(params.to_currency);
    if (toError) {
      return { content: [{ type: 'text', text: `Error: ${toError}` }], isError: true };
    }
    const amountError = validateAmount(params.amount);
    if (amountError) {
      return { content: [{ type: 'text', text: `Error: ${amountError}` }], isError: true };
    }

    const estimate = await client.estimateSwap(
      params.from_currency.toUpperCase(),
      params.to_currency.toUpperCase(),
      params.amount
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              from: `${estimate.from_amount} ${estimate.from_currency}`,
              to: `${estimate.to_amount} ${estimate.to_currency}`,
              rate: estimate.rate,
              fee: estimate.fee,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error estimating swap: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetMinSwapAmount(
  client: LocalCoinSwapClient,
  params: { from_currency: string; to_currency: string }
): Promise<ToolResponse> {
  try {
    // Validate inputs
    const fromError = validateCurrencySymbol(params.from_currency);
    if (fromError) {
      return { content: [{ type: 'text', text: `Error: ${fromError}` }], isError: true };
    }
    const toError = validateCurrencySymbol(params.to_currency);
    if (toError) {
      return { content: [{ type: 'text', text: `Error: ${toError}` }], isError: true };
    }

    const minAmount = await client.getMinSwapAmount(
      params.from_currency.toUpperCase(),
      params.to_currency.toUpperCase()
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(minAmount, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting minimum swap amount: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetMySwaps(
  client: LocalCoinSwapClient,
  config: ServerConfig,
  params: { status?: 'active' | 'past' | 'all' }
): Promise<ToolResponse> {
  const tokenError = requireApiToken(config);
  if (tokenError) return tokenError;

  try {
    let swaps;
    switch (params.status) {
      case 'active':
        swaps = await client.getActiveSwaps();
        break;
      case 'past':
        swaps = await client.getPastSwaps();
        break;
      default:
        swaps = await client.getSwaps();
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(swaps, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting swaps: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleCreateSwap(
  client: LocalCoinSwapClient,
  config: ServerConfig,
  params: {
    from_currency: string;
    to_currency: string;
    from_amount: string;
    confirm?: boolean;
    confirmation_id?: string;
  }
): Promise<ToolResponse> {
  const tokenError = requireApiToken(config);
  if (tokenError) return tokenError;

  try {
    // Validate inputs
    const fromError = validateCurrencySymbol(params.from_currency);
    if (fromError) {
      return { content: [{ type: 'text', text: `Error: ${fromError}` }], isError: true };
    }
    const toError = validateCurrencySymbol(params.to_currency);
    if (toError) {
      return { content: [{ type: 'text', text: `Error: ${toError}` }], isError: true };
    }
    const amountError = validateAmount(params.from_amount);
    if (amountError) {
      return { content: [{ type: 'text', text: `Error: ${amountError}` }], isError: true };
    }

    const normalizedParams = {
      from_currency: params.from_currency.toUpperCase(),
      to_currency: params.to_currency.toUpperCase(),
      from_amount: params.from_amount,
    };

    // Check if confirmation is required (use !== true to properly handle explicit false)
    if (config.requireConfirmation && params.confirm !== true && !params.confirmation_id) {
      // Generate confirmation ID and store pending action with bound parameters
      const confirmId = generateConfirmationId();
      pendingConfirmations.set(confirmId, {
        action: 'create_swap',
        params: normalizedParams,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      // Get estimate for display
      const estimate = await client.estimateSwap(
        normalizedParams.from_currency,
        normalizedParams.to_currency,
        normalizedParams.from_amount
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'confirmation_required',
                message:
                  'This swap requires confirmation before execution. Call create_swap again with confirm=true or use the confirmation_id with the SAME parameters.',
                confirmation_id: confirmId,
                expires_in: '5 minutes',
                swap_details: {
                  from: `${normalizedParams.from_amount} ${normalizedParams.from_currency}`,
                  to: `${estimate.to_amount} ${normalizedParams.to_currency}`,
                  rate: estimate.rate,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Validate confirmation ID if provided (with parameter binding check)
    if (params.confirmation_id) {
      const validationError = validateConfirmation(
        params.confirmation_id,
        'create_swap',
        normalizedParams
      );
      if (validationError) return validationError;
    }

    // Execute the swap
    const swap = await client.createSwap(normalizedParams);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'swap_created', swap }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating swap: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// TRADE HANDLERS
// ============================================================================

export async function handleStartTrade(
  client: LocalCoinSwapClient,
  config: ServerConfig,
  params: {
    offer_uuid: string;
    amount: string;
    confirm?: boolean;
    confirmation_id?: string;
  }
): Promise<ToolResponse> {
  const tokenError = requireApiToken(config);
  if (tokenError) return tokenError;

  try {
    // Validate amount
    const amountError = validateAmount(params.amount);
    if (amountError) {
      return { content: [{ type: 'text', text: `Error: ${amountError}` }], isError: true };
    }

    const normalizedParams = {
      offer_uuid: params.offer_uuid,
      amount: params.amount,
    };

    // Check if confirmation is required (use !== true to properly handle explicit false)
    if (config.requireConfirmation && params.confirm !== true && !params.confirmation_id) {
      // Get offer details for display
      const offer = await client.getOffer(params.offer_uuid);

      // Generate confirmation ID and store pending action with bound parameters
      const confirmId = generateConfirmationId();
      pendingConfirmations.set(confirmId, {
        action: 'start_trade',
        params: normalizedParams,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'confirmation_required',
                message:
                  'This trade requires confirmation before starting. Call start_trade again with confirm=true or use the confirmation_id with the SAME parameters.',
                confirmation_id: confirmId,
                expires_in: '5 minutes',
                trade_details: {
                  offer_uuid: params.offer_uuid,
                  amount: `${params.amount} ${offer.fiat_currency}`,
                  crypto: offer.coin_currency,
                  type: offer.trading_type,
                  trader: offer.trader?.username,
                  payment_method: offer.payment_method?.name,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Validate confirmation ID if provided (with parameter binding check)
    if (params.confirmation_id) {
      const validationError = validateConfirmation(
        params.confirmation_id,
        'start_trade',
        normalizedParams
      );
      if (validationError) return validationError;
    }

    // Execute the trade
    const trade = await client.startTrade(normalizedParams);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'trade_started', trade }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error starting trade: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetMyTrades(
  client: LocalCoinSwapClient,
  config: ServerConfig
): Promise<ToolResponse> {
  const tokenError = requireApiToken(config);
  if (tokenError) return tokenError;

  try {
    const trades = await client.getMyTrades();
    return {
      content: [{ type: 'text', text: JSON.stringify(trades, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting trades: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetTrade(
  client: LocalCoinSwapClient,
  config: ServerConfig,
  params: { uuid: string }
): Promise<ToolResponse> {
  const tokenError = requireApiToken(config);
  if (tokenError) return tokenError;

  try {
    const trade = await client.getTrade(params.uuid);
    return {
      content: [{ type: 'text', text: JSON.stringify(trade, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting trade: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
