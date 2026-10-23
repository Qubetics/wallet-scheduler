import zookeeperConfig from "../helpers/common/zookeeper.helper";
const name = "qubetics";
export const APP_NAME = zookeeperConfig.config.APP_NAME;
export const SERVER = zookeeperConfig.config.SERVER;
export const DB_USER = zookeeperConfig.config.DB_USER;
export const DB_HOST_READ = zookeeperConfig.config.DB_HOST_READ;
export const DB_HOST_WRITE = zookeeperConfig.config.DB_HOST_WRITE;
export const DB_DATABASE = zookeeperConfig.config.DB_NAME;
export const DB_PASSWORD = zookeeperConfig.config.DB_PASSWORD;
export const DB_PORT = zookeeperConfig.config.DB_PORT;
export const DBSECRET = zookeeperConfig.config.DBSECRET;
export const RABBIT_MQ = zookeeperConfig.config.RABBIT_MQ;
export const KAFKA_BROKER = zookeeperConfig.config.KAFKA_BROKER;
export const KAFKA_CLIENT_ID = zookeeperConfig.config.KAFKA_CLIENT_ID;
export const BACKEND_WALLET_BALANCE_ADDRESSES_GROUP_ID =
  zookeeperConfig.config.BACKEND_WALLET_BALANCE_ADDRESSES_GROUP_ID;
export const BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC =
  zookeeperConfig.config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC;
export const MAILGUN = {
  MAILGUN_API_KEY: zookeeperConfig.config.MAILGUN_API_KEY,
  MAILGUN_DOMAIN: zookeeperConfig.config.MAILGUN_DOMAIN,
  MAILGUN_BASE_URL: zookeeperConfig.config.MAILGUN_BASE_URL,
};

export const REDIS_CONN = zookeeperConfig.config.REDIS_CONN;

export const FCM_SERVER_KEY = zookeeperConfig.config.FCM_SERVER_KEY;
export const FIREBASE_SERVICE_ACCOUNT = zookeeperConfig.config.FIREBASE_SERVICE_ACCOUNT;
export const TATUM_SOLANA_KEY = zookeeperConfig.config.TATUM_SOLANA_KEY;

export const ETH_GAS_FEE_URL = zookeeperConfig.config.ETH.GAS_FEE_URL;
export const ETH_GAS_FEE_API_KEY = zookeeperConfig.config.ETH.GAS_FEE_API_KEY;
export const BNB_GAS_FEE_URL = zookeeperConfig.config.BNB.GAS_FEE_URL;
export const BNB_GAS_FEE_API_KEY = zookeeperConfig.config.BNB.GAS_FEE_API_KEY;
export const POL_GAS_FEE_URL = zookeeperConfig.config.POL.GAS_FEE_URL;
export const POL_GAS_FEE_API_KEY = zookeeperConfig.config.POL.GAS_FEE_API_KEY;

export const STATIC_COIN_FAMILY = zookeeperConfig.config.STATIC_COIN_FAMILY;
export const REDISKEYS = {
  COIN_LIMIT_COUNTS: `${name}_${SERVER}_${zookeeperConfig.config.COIN_LIMIT_COUNTS}`,
  COIN_LIMIT_COUNT_FIELD: zookeeperConfig.config.COIN_LIMIT_COUNT_FIELD,
  ALL_PROCESSES: zookeeperConfig.config.ALL_PROCESSES,
};
export const CMC_PRODUCT = {
  COIN_ZONE_URL: zookeeperConfig.config.COIN_ZONE.URL,
  COIN_ZONE_KEY: zookeeperConfig.config.COIN_ZONE.KEY,
};
export const CMC = {
  CMC_URL: zookeeperConfig.config.CMC.URL,
  CMC_KEY: zookeeperConfig.config.CMC.KEY,
};
export const NODE = {
  ETH_RPC_URL: zookeeperConfig.config.ETH_RPC_URL,
  BTC_RPC_URL: zookeeperConfig.config.BTC_RPC_URL,
  BTC_API_KEY: zookeeperConfig.config.BTC_API_KEY,
  TRX_RPC_URL: zookeeperConfig.config.TRX_RPC_URL,
  TRX_API_KEY: zookeeperConfig.config.TRX_API_KEY,
  BNB_RPC_URL: zookeeperConfig.config.BNB_RPC_URL,
  POL_RPC_URL: zookeeperConfig.config.POL_RPC_URL,
  SOL_RPC_URL: zookeeperConfig.config.SOL_RPC_URL,
  TICS_RPC_URL: zookeeperConfig.config.TICS_RPC_URL,
};

/** for cross-chain */

export const PENDING_CROSS_CHAIN_TX_TOPIC =
  zookeeperConfig.config.PENDING_CROSS_CHAIN_TX_TOPIC;
export const MORALIS_KEY = zookeeperConfig.config.MORALIS_KEY;

export const ETH_WALLET_ADDRESS = `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.ETH_WALLET_ADDRESS}`;
export const POL_WALLET_ADDRESS = `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.POL_WALLET_ADDRESS}`;
export const SOL_WALLET_ADDRESS = `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.SOL_WALLET_ADDRESS}`;
export const TRON_WALLET_ADDRESS = `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TRON_WALLET_ADDRESS}`;
export const BTC_WALLET_ADDRESS = `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.BTC_WALLET_ADDRESS}`;
export const BSC_WALLET_ADDRESS = `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.BSC_WALLET_ADDRESS}`;
export const TICS_WALLET_ADDRESS = `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TICS_WALLET_ADDRESS}`;

export const PENDING_CROSS_CHAIN_TX_GROUP_ID =
  zookeeperConfig.config.PENDING_CROSS_CHAIN_TX_GROUP_ID;

export const TOKENS = {
  ETH_TOKEN_TYPE: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE_ETH}`,
  ETH_TOKEN_TYPE721: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE721_ETH}`,
  BSC_TOKEN_TYPE: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE_BSC}`,
  BSC_TOKEN_TYPE721: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE721_BSC}`,
  POL_TOKEN_TYPE: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE_POL}`,
  POL_TOKEN_TYPE721: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE721_POL}`,
  TRX_TOKEN_TYPE: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE_TRON}`,
  TRX_TOKEN_TYPE_10: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE10_TRON}`,
  SOL_TOKEN_TYPE: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE_SOL}`,
  TICS_TOKEN_TYPE: `${name}_${zookeeperConfig.config.SERVER}_${zookeeperConfig.config.TOKEN_TYPE_TICS}`,
};

export const MORALIS_TRADINGVIEW_GROUP_ID = zookeeperConfig.config.MORALIS_TRADING_VIEW_GROUP_ID;
export const MORALIS_TRADINGVIEW_TOPIC = zookeeperConfig.config.MORALIS_TRADING_VIEW_TOPIC;


export const CONTRACT_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "stop",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "INITIAL_SUPPLY",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "mint",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "_value", type: "uint256" }],
    name: "burn",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_subtractedValue", type: "uint256" },
    ],
    name: "decreaseApproval",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimalFactor",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "stopped",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "start",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_addedValue", type: "uint256" },
    ],
    name: "increaseApproval",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "ownerAdrs", type: "address" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "burner", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Burn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "previousOwner", type: "address" },
      { indexed: true, name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
];

export const TRON_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
