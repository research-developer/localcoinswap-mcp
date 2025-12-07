# LocalCoinSwap MCP Server

An MCP (Model Context Protocol) server for conducting P2P cryptocurrency trading and swaps on [LocalCoinSwap](https://localcoinswap.com).

## Features

- **Search Offers**: Find P2P trading offers with comprehensive filtering and sorting
- **View Currencies**: List supported cryptocurrencies including USDT (TRC20, ERC20), BTC, ETH, and more
- **Estimate Swaps**: Get real-time exchange rate estimates before executing
- **Execute Swaps**: Swap between cryptocurrencies directly
- **Start Trades**: Initiate P2P trades on existing offers
- **Trade Management**: View your active and past trades
- **Safety First**: Optional confirmation requirement for money-sending operations (enabled by default)

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LCS_API_TOKEN` | Your LocalCoinSwap API token | (required for authenticated operations) |
| `LCS_REQUIRE_CONFIRMATION` | Require confirmation for swaps/trades | `true` |
| `LCS_API_URL` | API base URL | `https://api.localcoinswap.com` |

### Getting Your API Token

1. Log in to [LocalCoinSwap](https://localcoinswap.com)
2. Navigate to Settings → API tab
3. Click "Generate" to create your token
4. Copy the token to your `.env` file

**Important**: Keep your API token secure. Generating a new token invalidates previous tokens.

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "localcoinswap": {
      "command": "node",
      "args": ["/path/to/localcoinswap-mcp/dist/index.js"],
      "env": {
        "LCS_API_TOKEN": "your_token_here",
        "LCS_REQUIRE_CONFIRMATION": "true"
      }
    }
  }
}
```

Or run directly:

```bash
npm run build
node dist/index.js
```

## Available Tools

### Currency Tools

| Tool | Description |
|------|-------------|
| `list_currencies` | List cryptocurrencies (crypto, fiat, or active only) |
| `get_currency` | Get details about a specific currency |

### Offer Search Tools

| Tool | Description |
|------|-------------|
| `search_offers` | Search P2P offers with filters (currency, payment method, country, amount range, sorting) |
| `get_offer` | Get detailed info about a specific offer |
| `get_featured_offers` | Get featured offers |
| `get_my_offers` | View your own trading offers |
| `list_payment_methods` | List all available payment methods |
| `list_trade_types` | List trade type options |

### Swap Tools

| Tool | Description | Requires Confirmation |
|------|-------------|----------------------|
| `estimate_swap` | Get exchange rate estimate | No |
| `get_min_swap_amount` | Get minimum swap amount | No |
| `get_my_swaps` | View your swap history | No |
| `create_swap` | Execute a cryptocurrency swap | **Yes** (configurable) |

### Trade Tools

| Tool | Description | Requires Confirmation |
|------|-------------|----------------------|
| `start_trade` | Initiate a P2P trade | **Yes** (configurable) |
| `get_trade` | Get details of a specific trade | No |
| `get_my_trades` | View your trade history | No |

## Confirmation System

For safety, `create_swap` and `start_trade` require explicit confirmation by default. When you call these tools:

1. The tool returns a `confirmation_id` and swap/trade details
2. Review the details carefully
3. Call the tool again with `confirm: true` or include the `confirmation_id`

Confirmation IDs expire after 5 minutes.

To disable this safety feature (not recommended), set:

```bash
LCS_REQUIRE_CONFIRMATION=false
```

## Example Workflows

### Search for Bitcoin Offers

```
Search for BTC buy offers in the US with bank transfer, sorted by price
```

### Estimate and Execute a Swap

```
1. Estimate swapping 0.1 ETH to USDT
2. If the rate looks good, execute the swap with confirmation
```

### Start a P2P Trade

```
1. Search for USDT sell offers accepting PayPal
2. Get details of an interesting offer
3. Start a trade for $100 worth
4. Confirm the trade when prompted
```

## Supported Cryptocurrencies

LocalCoinSwap supports:

- **Non-custodial**: BTC, ETH, ERC-20 tokens (USDT, USDC, etc.), Kusama (KSM)
- **Custodial**: BTC, Dash

The platform supports multiple networks for tokens like USDT (TRC20, ERC20, etc.).

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
```

## License

MIT

## Resources

- [LocalCoinSwap](https://localcoinswap.com)
- [LocalCoinSwap API Docs](https://api.localcoinswap.com/api-docs/)
- [LocalCoinSwap API Examples](https://github.com/LocalCoinSwap/api-examples)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
