import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LocalCoinSwapClient } from './api-client.js';
import type { ServerConfig } from './types.js';

// Track pending confirmations for sensitive operations
const pendingConfirmations = new Map<
  string,
  {
    action: string;
    params: Record<string, unknown>;
    expiresAt: number;
  }
>();

function generateConfirmationId(): string {
  return `confirm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Export for testing
export function clearPendingConfirmations(): void {
  pendingConfirmations.clear();
}

export function getPendingConfirmation(id: string) {
  return pendingConfirmations.get(id);
}

export function createServer(config: ServerConfig, client: LocalCoinSwapClient): McpServer {
  const server = new McpServer({
    name: 'localcoinswap',
    version: '1.0.0',
  });

  // ============================================================================
  // CURRENCY TOOLS
  // ============================================================================

  server.tool(
    'list_currencies',
    'List all available cryptocurrencies on LocalCoinSwap, including network information (e.g., USDT on TRC20, ERC20, etc.)',
    {
      type: z.enum(['crypto', 'fiat', 'active']).optional().describe('Type of currencies to list'),
    },
    async ({ type }) => {
      try {
        let currencies;
        switch (type) {
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
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error listing currencies: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_currency',
    'Get detailed information about a specific currency',
    {
      symbol: z.string().describe('Currency symbol (e.g., BTC, USDT, ETH)'),
    },
    async ({ symbol }) => {
      try {
        const currency = await client.getCurrency(symbol.toUpperCase());
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(currency, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting currency: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // OFFER SEARCH TOOLS
  // ============================================================================

  server.tool(
    'search_offers',
    'Search P2P trading offers on LocalCoinSwap with filtering and sorting options',
    {
      coin_currency: z
        .string()
        .optional()
        .describe('Cryptocurrency symbol (e.g., BTC, ETH, USDT)'),
      fiat_currency: z.string().optional().describe('Fiat currency code (e.g., USD, EUR, GBP)'),
      trading_type: z
        .enum(['buy', 'sell'])
        .optional()
        .describe('Type of trade: buy (you buy crypto) or sell (you sell crypto)'),
      payment_method: z
        .string()
        .optional()
        .describe('Payment method slug (e.g., bank-transfer, paypal)'),
      country_code: z.string().optional().describe('Country code (e.g., US, GB, DE)'),
      min_amount: z.number().optional().describe('Minimum trade amount in fiat'),
      max_amount: z.number().optional().describe('Maximum trade amount in fiat'),
      ordering: z
        .string()
        .optional()
        .describe('Sort order (e.g., price, -price, created_at, -created_at)'),
      page: z.number().optional().describe('Page number for pagination'),
      page_size: z.number().optional().describe('Number of results per page (default 20)'),
    },
    async (params) => {
      try {
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
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error searching offers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_offer',
    'Get detailed information about a specific offer by its UUID',
    {
      uuid: z.string().describe('The UUID of the offer'),
    },
    async ({ uuid }) => {
      try {
        const offer = await client.getOffer(uuid);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(offer, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting offer: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_featured_offers',
    'Get the list of featured offers on LocalCoinSwap',
    {},
    async () => {
      try {
        const offers = await client.getFeaturedOffers();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(offers, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting featured offers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_my_offers',
    'Get your own trading offers (requires authentication)',
    {},
    async () => {
      try {
        if (!config.apiToken) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: API token not configured. Set LCS_API_TOKEN environment variable.',
              },
            ],
            isError: true,
          };
        }

        const results = await client.getMyOffers();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting your offers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'list_payment_methods',
    'List all available payment methods on LocalCoinSwap',
    {},
    async () => {
      try {
        const methods = await client.getPaymentMethods();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(methods, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error listing payment methods: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'list_trade_types',
    'List all available trade types on LocalCoinSwap',
    {},
    async () => {
      try {
        const types = await client.getTradeTypes();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(types, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error listing trade types: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // SWAP TOOLS
  // ============================================================================

  server.tool(
    'estimate_swap',
    'Get an estimate for swapping one cryptocurrency to another',
    {
      from_currency: z.string().describe('Source currency symbol (e.g., BTC, ETH)'),
      to_currency: z.string().describe('Target currency symbol (e.g., USDT, BTC)'),
      amount: z.string().describe('Amount to swap (as string to preserve precision)'),
    },
    async ({ from_currency, to_currency, amount }) => {
      try {
        const estimate = await client.estimateSwap(
          from_currency.toUpperCase(),
          to_currency.toUpperCase(),
          amount
        );

        return {
          content: [
            {
              type: 'text' as const,
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
              type: 'text' as const,
              text: `Error estimating swap: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_min_swap_amount',
    'Get the minimum amount required for a swap between two currencies',
    {
      from_currency: z.string().describe('Source currency symbol (e.g., BTC, ETH)'),
      to_currency: z.string().describe('Target currency symbol (e.g., USDT, BTC)'),
    },
    async ({ from_currency, to_currency }) => {
      try {
        const minAmount = await client.getMinSwapAmount(
          from_currency.toUpperCase(),
          to_currency.toUpperCase()
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(minAmount, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting minimum swap amount: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_my_swaps',
    'Get your swap history (active and/or past swaps)',
    {
      status: z
        .enum(['active', 'past', 'all'])
        .optional()
        .describe('Filter by swap status (default: all)'),
    },
    async ({ status }) => {
      try {
        if (!config.apiToken) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: API token not configured. Set LCS_API_TOKEN environment variable.',
              },
            ],
            isError: true,
          };
        }

        let swaps;
        switch (status) {
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
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(swaps, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting swaps: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'create_swap',
    'Create a new cryptocurrency swap. IMPORTANT: This will execute a real swap if confirmed. By default, requires explicit confirmation.',
    {
      from_currency: z.string().describe('Source currency symbol (e.g., BTC, ETH)'),
      to_currency: z.string().describe('Target currency symbol (e.g., USDT, BTC)'),
      from_amount: z.string().describe('Amount to swap from (as string to preserve precision)'),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to confirm and execute the swap. If not set, returns a confirmation ID.'
        ),
      confirmation_id: z
        .string()
        .optional()
        .describe('Confirmation ID from a previous create_swap call to execute the swap'),
    },
    async ({ from_currency, to_currency, from_amount, confirm, confirmation_id }) => {
      try {
        if (!config.apiToken) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: API token not configured. Set LCS_API_TOKEN environment variable.',
              },
            ],
            isError: true,
          };
        }

        // Check if confirmation is required
        if (config.requireConfirmation && !confirm && !confirmation_id) {
          // Generate confirmation ID and store pending action
          const confirmId = generateConfirmationId();
          pendingConfirmations.set(confirmId, {
            action: 'create_swap',
            params: {
              from_currency: from_currency.toUpperCase(),
              to_currency: to_currency.toUpperCase(),
              from_amount,
            },
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          });

          // Get estimate for display
          const estimate = await client.estimateSwap(
            from_currency.toUpperCase(),
            to_currency.toUpperCase(),
            from_amount
          );

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    status: 'confirmation_required',
                    message:
                      'This swap requires confirmation before execution. Call create_swap again with confirm=true or use the confirmation_id.',
                    confirmation_id: confirmId,
                    expires_in: '5 minutes',
                    swap_details: {
                      from: `${from_amount} ${from_currency.toUpperCase()}`,
                      to: `${estimate.to_amount} ${to_currency.toUpperCase()}`,
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

        // Validate confirmation ID if provided
        if (confirmation_id) {
          const pending = pendingConfirmations.get(confirmation_id);
          if (!pending) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: Invalid or expired confirmation ID. Please start a new swap request.',
                },
              ],
              isError: true,
            };
          }
          if (pending.expiresAt < Date.now()) {
            pendingConfirmations.delete(confirmation_id);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: Confirmation ID has expired. Please start a new swap request.',
                },
              ],
              isError: true,
            };
          }
          pendingConfirmations.delete(confirmation_id);
        }

        // Execute the swap
        const swap = await client.createSwap({
          from_currency: from_currency.toUpperCase(),
          to_currency: to_currency.toUpperCase(),
          from_amount,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'swap_created',
                  swap,
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
              type: 'text' as const,
              text: `Error creating swap: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TRADE TOOLS
  // ============================================================================

  server.tool(
    'start_trade',
    'Start a P2P trade on an existing offer. IMPORTANT: This will initiate a real trade. By default, requires explicit confirmation.',
    {
      offer_uuid: z.string().describe('UUID of the offer to trade on'),
      amount: z.string().describe('Amount in fiat currency to trade'),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to confirm and start the trade. If not set, returns a confirmation ID.'
        ),
      confirmation_id: z
        .string()
        .optional()
        .describe('Confirmation ID from a previous start_trade call to execute the trade'),
    },
    async ({ offer_uuid, amount, confirm, confirmation_id }) => {
      try {
        if (!config.apiToken) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: API token not configured. Set LCS_API_TOKEN environment variable.',
              },
            ],
            isError: true,
          };
        }

        // Check if confirmation is required
        if (config.requireConfirmation && !confirm && !confirmation_id) {
          // Get offer details for display
          const offer = await client.getOffer(offer_uuid);

          // Generate confirmation ID and store pending action
          const confirmId = generateConfirmationId();
          pendingConfirmations.set(confirmId, {
            action: 'start_trade',
            params: { offer_uuid, amount },
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          });

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    status: 'confirmation_required',
                    message:
                      'This trade requires confirmation before starting. Call start_trade again with confirm=true or use the confirmation_id.',
                    confirmation_id: confirmId,
                    expires_in: '5 minutes',
                    trade_details: {
                      offer_uuid,
                      amount: `${amount} ${offer.fiat_currency}`,
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

        // Validate confirmation ID if provided
        if (confirmation_id) {
          const pending = pendingConfirmations.get(confirmation_id);
          if (!pending) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: Invalid or expired confirmation ID. Please start a new trade request.',
                },
              ],
              isError: true,
            };
          }
          if (pending.expiresAt < Date.now()) {
            pendingConfirmations.delete(confirmation_id);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: Confirmation ID has expired. Please start a new trade request.',
                },
              ],
              isError: true,
            };
          }
          pendingConfirmations.delete(confirmation_id);
        }

        // Execute the trade
        const trade = await client.startTrade({ offer_uuid, amount });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'trade_started',
                  trade,
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
              type: 'text' as const,
              text: `Error starting trade: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_my_trades',
    'Get your trade history',
    {},
    async () => {
      try {
        if (!config.apiToken) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: API token not configured. Set LCS_API_TOKEN environment variable.',
              },
            ],
            isError: true,
          };
        }

        const trades = await client.getMyTrades();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(trades, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting trades: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_trade',
    'Get details of a specific trade by UUID',
    {
      uuid: z.string().describe('The UUID of the trade'),
    },
    async ({ uuid }) => {
      try {
        if (!config.apiToken) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: API token not configured. Set LCS_API_TOKEN environment variable.',
              },
            ],
            isError: true,
          };
        }

        const trade = await client.getTrade(uuid);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(trade, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting trade: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
