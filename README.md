# Qubetics Crons Processes

Scheduler service for Qubetics Wallet. It runs the scheduled jobs shared by all chains: gas prices, coin prices and graph data, pending cross-chain withdrawals, transaction status updates, the swap coin list and announcement notifications. It has no HTTP API: it works through scheduled jobs and Kafka consumers.

## Prerequisites

| Requirement | Version / notes |
|---|---|
| Node.js | 24.22.1 (same as the Docker image and `.nvmrc`) |
| npm | 11 (bundled with Node 24) |
| ZooKeeper | Holds the service configuration (see below) |
| MySQL | Shared wallet database (read and write hosts) |
| Redis | Cached prices and lookups |
| Kafka | Message broker shared with the backend and the chain services |
| Chain nodes | RPC / API access for ETH, BSC, Polygon, Solana, Tron, BTC and Qubetics |
| Price providers | API access for the coin price and graph data providers |

## Configuration

The service reads two environment variables from a `.env` file in the project root. Copy the example and fill it in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `ZOOKEEPER_HOST` | ZooKeeper address, for example `localhost:2181` |
| `ZOOKEEPER_PATH` | ZooKeeper node that holds the configuration, for example `/qubetics_wallet` |

Every other setting is read from that ZooKeeper node, which holds a single JSON document. The main keys are:

| Area | Keys |
|---|---|
| Blockchain | `ETH_RPC_URL`, `BNB_RPC_URL`, `POL_RPC_URL`, `SOL_RPC_URL`, `TICS_RPC_URL`, `TRX_RPC_URL`, `BTC_RPC_URL`, the `*_WALLET_ADDRESS` keys, `BTC_API_KEY`, `TRX_API_KEY`, `TATUM_SOLANA_KEY`, `MORALIS_KEY` |
| Prices and gas | `CMC.URL`, `CMC.KEY`, `COIN_ZONE.URL`, `COIN_ZONE.KEY`, `ETH.GAS_FEE_URL`, `BNB.GAS_FEE_URL`, `POL.GAS_FEE_URL` and their `GAS_FEE_API_KEY` |
| Database | `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST_WRITE`, `DB_HOST_READ`, `DB_PORT` |
| Redis / Kafka | `REDIS_CONN`, `KAFKA_BROKER`, `KAFKA_CLIENT_ID`, and the `MORALIS_TRADING_VIEW_*`, `PENDING_CROSS_CHAIN_TX_*` and `BACKEND_WALLET_BALANCE_ADDRESSES_*` topic and consumer group names |
| Push notifications | `FIREBASE_SERVICE_ACCOUNT`, `FCM_SERVER_KEY` |
| Alert emails | `MAILGUN_API_KEY`, `MAILGUN_BASE_URL`, `MAILGUN_DOMAIN` |

The service refuses to start if `FIREBASE_SERVICE_ACCOUNT` or `TATUM_SOLANA_KEY` is missing (see `src/config/required-secrets.ts`).

Never commit `.env` or any configuration values to the repository.

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Build and start (compiles TypeScript into build/ and starts the service)
npm run start
```

On start-up the service:

1. connects to ZooKeeper and loads the configuration,
2. checks the required keys,
3. connects to MySQL, Redis and Kafka,
4. starts the scheduled jobs and the Kafka consumers.

A successful start logs `Zookeeper connected...` and `producer connetced`, followed by the job output.

For development, `npm run dev` compiles and runs the service with `nodemon`.

## Scheduled jobs

| Job | Description |
|---|---|
| Gas price | ETH, BSC and Polygon gas prices |
| Coin data | CoinMarketCap ids, fiat coin prices and fiat price updates |
| Graph data | Daily, weekly, monthly and yearly coin graphs, and trading view graph data |
| Withdrawals | Pending cross-chain withdrawal processing and transaction status updates |
| Swap | Swap coin list update |
| Notifications | Announcement push notifications |

## Other commands

| Command | Description |
|---|---|
| `npm run compile` | Compile TypeScript into `build/` without starting |
| `npm test` | Compile and run the tests in `test/` |

## Run with Docker

```bash
docker build -t wallet-scheduler .
docker run -d --name wallet-scheduler \
  -e ZOOKEEPER_HOST=<zookeeper-host:port> \
  -e ZOOKEEPER_PATH=<config-node> \
  wallet-scheduler
```

The service does not listen on a port, so no port mapping is needed. ZooKeeper, MySQL, Redis, Kafka, the chain nodes and the price providers must be reachable from inside the container.

Run only one instance of this service, otherwise the scheduled jobs run more than once.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Missing ZooKeeper config keys: ...` | A required key is missing from the ZooKeeper node |
| Hangs at start-up with no `Zookeeper connected...` line | ZooKeeper unreachable, or wrong `ZOOKEEPER_HOST` / `ZOOKEEPER_PATH` |
| `ECONNREFUSED` for Redis, MySQL or Kafka | The service is not running, or the address in the configuration is wrong |
| Prices or graphs not updating | Check the price provider keys and their API limits |
