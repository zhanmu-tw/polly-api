# Polly Paper Trading API: AI Agent Guide

Welcome, Agent. This document contains the instructions and schemas necessary for you to interact with the Polly API to execute and track paper trades on prediction markets.

## Base Configuration

- **Base URL:** `https://polly.internal.uuddlrlrba.uk/api`
- **Authentication:** All requests MUST include an `X-API-Key` header. Two key types exist:
  - **Full access key** (`API_KEY`): Required for all write operations (POST, PATCH). Also works for GET requests.
  - **Read-only key** (`GET_API_KEY`): Only valid for GET endpoints (portfolio, trade listings). Will be rejected on write operations.
- **Content-Type:** All POST and PATCH requests MUST include the `Content-Type: application/json` header.

---

## 1. Open a New Trade

**Endpoint:** `POST /trades`

Use this endpoint to record the entry of a new paper trade.

### Request Body (JSON)

| Field                | Type     | Required | Description                                                                           |
| -------------------- | -------- | -------- | ------------------------------------------------------------------------------------- |
| `marketId`           | `string` | **Yes**  | The unique identifier of the prediction market.                                       |
| `marketName`         | `string` | No       | Human-readable name of the market.                                                    |
| `slug`               | `string` | **Yes**  | The market's URL slug (e.g. `"will-ai-pass-the-turing-test-by-2030"`). Required for linking back to the market on Polymarket. |
| `tokenId`            | `string` | No       | Specific token ID for the outcome (if applicable).                                    |
| `conditionId`        | `string` | No       | Conditional ID for the market (if applicable).                                        |
| `strategy`           | `string` | No       | The name or ID of the strategy driving this trade.                                    |
| `direction`          | `enum`   | **Yes**  | Must be exactly `"YES"` or `"NO"`.                                                    |
| `quantity`           | `number` | **Yes**  | Number of shares bought. Must be > 0.                                                 |
| `entryPrice`         | `number` | **Yes**  | The price per share. Must be between 0 and 1.                                         |
| `probabilityAtEntry` | `number` | No       | The implied probability at the time of entry (0 to 1).                                |
| `reasoning`          | `string` | No       | Your rationale for taking the trade. Use this to log your analytical thought process. |

### Example Request

```json
{
  "marketId": "0x123abc...",
  "marketName": "Will AI pass the Turing test by 2030?",
  "slug": "will-ai-pass-the-turing-test-by-2030",
  "direction": "YES",
  "quantity": 100,
  "entryPrice": 0.45,
  "probabilityAtEntry": 0.45,
  "strategy": "momentum_bot_v1",
  "reasoning": "High volume spike observed after recent AI news."
}
```

### Response

Returns the fully created `Trade` object. Pay attention to the returned `id` (an integer), as you will need it to close the trade later.

---

## 2. Close an Existing Trade

**Endpoint:** `PATCH /trades/:id/close`

Use this endpoint when you exit a position. The API will automatically calculate your Realized PnL based on the entry price, exit price, and direction.

### URL Parameters

- `id`: The integer ID of the trade you wish to close.

### Request Body (JSON)

| Field               | Type     | Required | Description                                                                                  |
| ------------------- | -------- | -------- | -------------------------------------------------------------------------------------------- |
| `exitPrice`         | `number` | **Yes**  | The price per share at exit. Must be between 0 and 1.                                        |
| `probabilityAtExit` | `number` | No       | The implied probability at the time of exit (0 to 1).                                        |
| `exitReason`        | `enum`   | No       | Must be one of: `"TAKE_PROFIT"`, `"STOP_LOSS"`, `"MARKET_RESOLVED"`, `"SIGNAL"`, `"MANUAL"`. |
| `fees`              | `number` | No       | Any trading fees incurred (defaults to 0 or existing fees on the trade).                     |

### Example Request

```json
{
  "exitPrice": 0.85,
  "exitReason": "TAKE_PROFIT",
  "probabilityAtExit": 0.85,
  "fees": 0.05
}
```

### Response

Returns the updated `Trade` object with `status` changed to `"CLOSED"`, the `exitAt` timestamp populated, and the `pnl` field freshly calculated.

---

## 3. View Portfolio Summary

**Endpoint:** `GET /trades/portfolio`

Use this to understand your current performance and risk exposure. It calculates your cash balance, realized profit/loss, and currently deployed capital dynamically from your trade history.

### Query Parameters

- `balance` (optional): The initial starting balance to base the `cash` calculation on. Defaults to `1000`.

### Example Request

`GET /trades/portfolio?balance=5000`

### Expected Response

```json
{
  "startingBalance": 5000,
  "cash": 5450.25,
  "realizedPnl": 450.25,
  "capitalDeployed": 200.0,
  "openPositionCount": 2,
  "closedTradeCount": 15,
  "positions": [
    {
      "tradeId": 12,
      "marketId": "0x456def...",
      "marketName": "Example Market",
      "direction": "YES",
      "quantity": 500,
      "entryPrice": 0.4,
      "costBasis": 200.0
    }
  ]
}
```

---

## 4. List Trades

**Endpoint:** `GET /trades`

Fetch a list of historical or currently active trades.

### Query Parameters (all optional)

- `status`: `"OPEN"` or `"CLOSED"`
- `strategy`: Filter by a specific strategy string.
- `marketId`: Filter by a specific prediction market ID.

### Example Request

`GET /trades?status=OPEN&strategy=momentum_bot_v1`

### Expected Response

Returns an array of `Trade` JSON objects, ordered by entry date (newest first).

---

## 5. Get a Specific Trade

**Endpoint:** `GET /trades/:id`

Fetch the full details of a specific single trade by its integer ID.

### Expected Response

Returns the single `Trade` JSON object, or a `404` if it does not exist.

---

## Critical Rules for the Agent

1. **Never mutate closed trades:** Once you call `PATCH /trades/:id/close`, the trade is marked `CLOSED`. Trying to close it again or modify it will result in a 400 error.
2. **Direction logic:** `"YES"` means you are long the outcome. `"NO"` means you are short the outcome. The API handles the underlying PnL math (shorting calculates `(exitPrice - entryPrice) * quantity * -1`).
3. **Prices:** Prediction market prices must always be normalized floats between `0.0` and `1.0`.
4. **State Derivation:** You do not manage your own portfolio balance in the database. Simply execute `POST` and `PATCH` actions on your trades, and query the `/portfolio` endpoint to get your live up-to-date accurate ledger state.
