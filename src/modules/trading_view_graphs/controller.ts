import { Op } from 'sequelize';
import { config } from '../../config';
import { Coins } from '../../models/model';
import axios from 'axios';
import redisClient from '../../helpers/common/redis';

class tradingViewController {
    constructor() {
    }

    public async getTradingViewTokens() {
        const coinData = await Coins.CoinsRead.findAll({
            attributes: [
                'coin_id',
                'coin_symbol',
                'coin_family',
                'is_token',
                'token_address',
                'graph_source',
                'graph_pair',
                'is_on_trading_view'
            ],
            where: {
                is_on_trading_view: { [Op.in]: [1, 2] },
                token_type: { [Op.in]: ['ERC20', 'BEP20', 'SPL', 'TRC20'] }
            },
            limit: 5,
            order: [['coin_id', 'ASC']],
            logging: true
        });


        if (!coinData || coinData.length === 0) return; // Exit if no data

        // Loop through each coin and update the graph source
        let coinFamily = config.STATIC_COIN_FAMILY;
        for (let coin of coinData) {
            try {
                let response: any;
                if (
                    coin.is_on_trading_view == 1 && (
                        coin.coin_family == coinFamily.ETH ||
                        coin.coin_family == coinFamily.BNB ||
                        coin.coin_family == coinFamily.SOL ||
                        coin.coin_family == coinFamily.POL)
                ) {
                    response = await this.processMoralisTradingView(coin)
                } else {
                    response = await this.processsTradingView(coin)
                }
                console.log('getTradingViewTokens', response);
                if (response) {
                    continue;
                }
            } catch (error) {
                console.error('Error updating coin data for symbol:', coin?.coin_symbol, error);
            }

        }
    }


    private async processMoralisTradingView(data: any) {
        if (data) {
            const chain = data?.coin_family ? this.getChainName(data?.coin_family) : null;
            const apiUrl = data?.coin_family ? this.buildApiUrl(data?.coin_family, data?.token_address, chain) : null;
            console.log('moralis graph apiUrl', apiUrl);
            if (!apiUrl) {
                console.warn(`Unsupported coin family: ${data?.coin_family}`);
                return { status: true, message: `Unsupported coin family: ${data?.coin_family}` };
            }
            try {
                // Fetch data from Moralis API
                const response = await axios.get(apiUrl, {
                    headers: { 'x-api-key': config.MORALIS_KEY },
                });

                const pairs = response?.data?.pairs;
                let message: string = '';
                if (pairs?.length > 0) {
                    const activePair = await pairs.find((pair: any) => pair?.inactive_pair === false || pair?.inactivePair === false);
                    if (activePair) {
                        let pairAddress: string | null = null;
                        let graph_pair: string | null = null;
                        let rawExchangeName: string | null = null;
                        if (data?.coin_family == 5) { //solana
                            pairAddress = activePair?.pairAddress || null;
                            rawExchangeName = activePair?.exchangeName || null;
                            graph_pair = activePair?.pairLabel || null;
                        } else {
                            pairAddress = activePair?.pair_address || null;
                            rawExchangeName = activePair?.exchange_name || null;
                            graph_pair = activePair?.pair_label || null;
                        }
                        const graphSource = rawExchangeName
                            ? this.formatExchangeName(rawExchangeName)
                            : null;

                        if (pairAddress) {
                            // Update the database with graph source and pair
                            await Coins.CoinsWrite.update(
                                {
                                    graph_source: graphSource,
                                    graph_pair: graph_pair,
                                    pair_address: pairAddress,
                                    is_on_trading_view: 3
                                },
                                { where: { coin_id: data.coin_id } }
                            );
                            message = `Pair address found for coin ID: ${data?.coin_id}, Symbol: ${data?.coin_symbol} Token address: ${data?.token_address}`

                        } else {
                            message = `Pair address not found for coin ID: ${data?.coin_id}, Symbol: ${data?.coin_symbol} Token address: ${data?.token_address}`
                            this.processsTradingView(data)
                        }
                    } else {
                        const firstPair = pairs[0];
                        let pairAddress: string | null = null;
                        let graph_pair: string | null = null;
                        let rawExchangeName: string | null = null;
                        if (data?.coin_family == 4) {
                            pairAddress = firstPair?.pairAddress || null;
                            rawExchangeName = firstPair?.exchangeName || null;
                            graph_pair = firstPair?.pairLabel || null;
                        } else {
                            pairAddress = firstPair?.pair_address || null;
                            rawExchangeName = firstPair?.exchange_name || null;
                            graph_pair = firstPair?.pair_label || null;
                        }
                        const graphSource = rawExchangeName
                            ? this.formatExchangeName(rawExchangeName)
                            : null;
                        if (pairAddress) {
                            // Update the database with graph source and pair
                            await Coins.CoinsWrite.update(
                                {
                                    graph_source: graphSource,
                                    graph_pair: graph_pair,
                                    pair_address: pairAddress,
                                    is_on_trading_view: 3,
                                    is_on_moralis_inactive: 1
                                },
                                { where: { coin_id: data.coin_id } }
                            );
                            message = `Pair address found for coin ID: ${data?.coin_id}, Symbol: ${data?.coin_symbol} Token address: ${data?.token_address}`
                        } else {
                            message = `Pair address not found for coin ID: ${data?.coin_id}, Symbol: ${data?.coin_symbol} Token address: ${data?.token_address}`
                            this.processsTradingView(data)
                        }
                    }
                } else {
                    message = `No pairs found for coin ID: ${data?.coin_id}, Symbol: ${data?.coin_symbol} Token address: ${data?.token_address}`;
                    this.processsTradingView(data)
                }
                console.warn(message);
                return { status: true, message: message };
            } catch (err: any) {
                console.log('moralis graph errrrr >>>', err.response?.status)
                let is_on_trading_view = (err?.response?.status === 400 || err?.response?.status === 500) ? 2 : 1;
                console.log('is_on_trading_view >>>', is_on_trading_view);
                console.error(
                    `Error processing coin ID: ${data.coin_id}, Symbol: ${data.coin_symbol} Token address: ${data.token_address}`,
                    err?.message || err
                );
                await Coins.CoinsWrite.update(
                    {
                        is_on_trading_view: is_on_trading_view
                    },
                    { where: { coin_id: data.coin_id } }
                );
                return { status: false, message: `Error processing coin ID: ${data.coin_id}, Symbol: ${data.coin_symbol} Token address: ${data.token_address}` };
            }
        }
    }

    private getChainName = (coinFamily: number): string | null => {
        const chains: any = {
            1: 'bsc',
            2: 'eth',
            4: 'polygon'
        };
        return chains[coinFamily] || null;
    };


    private buildApiUrl = (coinFamily: number, tokenAddress: string, chain: string | null): string | null => {
        if (coinFamily === 5) {
            return `https://solana-gateway.moralis.io/token/mainnet/${tokenAddress}/pairs`;
        }
        if (chain) {
            return `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/pairs?chain=${chain}`;
        }
        return null;
    };

    // Utility function to format exchange names
    private formatExchangeName = (exchangeName: string): string => {
        return exchangeName
            .split(' ') // Split the string by spaces
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
            .join('') // Join without spaces
            .replace(/v(\d+)/gi, 'V$1'); // Handle 'v3' to 'V3'
    };


    // Function to validate the response based on exchange name
    private isValidExchangeResponse = (exchange: { name: string }, response: any) => {
        switch (exchange.name) {
            case 'BINANCE':
                return response.data?.code === undefined;
            case 'OKX':
                return response.data?.code === "0";
            case 'BYBIT':
                return response.data?.result?.list?.length > 0;
            case 'BITGET':
                return response.data.code === '00000' && response?.data?.data?.length > 0;
            case 'BITMART':
                return response?.data?.code === 1000 && response?.data?.data !== undefined;
            case 'COINBASE':
                return response?.data?.products?.length > 0;
            case 'MEXC':
                return response?.data?.symbols?.length > 0;
            case 'GATEIO':
                return response?.data?.label === undefined;
            case 'KUCOIN':
                return response?.data?.code === '200000' && response?.data?.data !== undefined;
            case 'POLONIEX':
                return response?.data?.data !== undefined && response?.data?.data?.length > 0;
            default:
                return false;
        }
    };

    private getExchangeSource = async (symbol: string) => {
        const exchanges = [
            { name: 'BINANCE', url: (symbol: string) => `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}USDT` },
            { name: 'OKX', url: (symbol: string) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT` },
            { name: 'MEXC', url: (symbol: string) => `https://api.mexc.com/api/v3/exchangeInfo?symbol=${symbol}USDT` },
            { name: 'GATEIO', url: (symbol: string) => `https://api.gateio.ws/api/v4/spot/currency_pairs/${symbol}_USDT` },
            { name: 'KUCOIN', url: (symbol: string) => `https://api.kucoin.com/api/v2/symbols/${symbol}-USDT` },
            { name: 'POLONIEX', url: (symbol: string) => `https://api.poloniex.com/markets/${symbol}_USDT` },
            { name: 'COINBASE', url: (symbol: string) => `https://api.coinbase.com/api/v3/brokerage/market/products/?product_ids=${symbol}-USDT` },
            { name: 'BITMART', url: (symbol: string) => `https://api-cloud.bitmart.com/spot/quotation/v3/ticker?symbol=${symbol}_USDT` },
            { name: 'BYBIT', url: (symbol: string) => `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}USDT` },

        ];
        const usdtExchanges = [
            { name: 'BINANCE', url: (symbol: string) => `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}USD` },
            { name: 'OKX', url: (symbol: string) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USD` },
            { name: 'MEXC', url: (symbol: string) => `https://api.mexc.com/api/v3/exchangeInfo?symbol=${symbol}USD` },
            { name: 'GATEIO', url: (symbol: string) => `https://api.gateio.ws/api/v4/spot/currency_pairs/${symbol}_USD` },
            { name: 'KUCOIN', url: (symbol: string) => `https://api.kucoin.com/api/v2/symbols/${symbol}-USDC` },
            { name: 'POLONIEX', url: (symbol: string) => `https://api.poloniex.com/markets/${symbol}_USDC` },
            { name: 'COINBASE', url: (symbol: string) => `https://api.coinbase.com/api/v3/brokerage/market/products/?product_ids=${symbol}-USD` },
            { name: 'BITMART', url: (symbol: string) => `https://api-cloud.bitmart.com/spot/quotation/v3/ticker?symbol=${symbol}_USD` },
            { name: 'BYBIT', url: (symbol: string) => `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}USD` }
        ];

        const exchangesSource = symbol.toLowerCase() == 'usdt' ? usdtExchanges : exchanges;
        for (let exchange of exchangesSource) {
            try {
                const response = await axios.get(exchange.url(symbol));
                // Simplified exchange response validation
                if (this.isValidExchangeResponse(exchange, response)) {
                    return exchange.name;
                }

            } catch (error: any) {
                console.error(`Error fetching from ${exchange.name}:`, error.message);
            }
        }
        return null; // If no exchange source is found
    };

    private async processsTradingView(data: any) {
        let graph_source = null;
        const symbol = `${data.coin_symbol?.toUpperCase()}`;
        try {
            console.log('Checking symbol:', symbol);
            graph_source = await this.getExchangeSource(symbol);
            let message: string = '';
            if (graph_source) {
                let graph_pair = symbol?.toLowerCase() == 'usdt' ? `${symbol}USD` : `${symbol}USDT`;
                if (symbol?.toLowerCase() === 'usdt' && (graph_source === 'KUCOIN' || graph_source === 'POLONIEX')) {
                    graph_pair = `${symbol}USDC`;
                }
                console.log('Graph source found:', graph_source);
                await Coins.CoinsWrite.update(
                    {
                        graph_source: graph_source,
                        graph_pair: graph_pair,
                        is_on_trading_view: 4
                    },
                    { where: { coin_id: data.coin_id } }
                );
                message = `'Graph source found:', ${graph_source}`;
            } else {
                message = `No valid graph source for symbol:', ${symbol}`;
                await Coins.CoinsWrite.update(
                    {
                        graph_source: null,
                        graph_pair: null,
                        is_on_trading_view: 0,
                    },
                    { where: { coin_id: data.coin_id } }
                );
            }
            console.log(message);
            return { status: true, message: message };
        } catch (error) {
            console.error('Error updating coin data for symbol:', symbol, error);
            await Coins.CoinsWrite.update(
                {
                    is_on_trading_view: 2,
                },
                { where: { coin_id: data.coin_id } }
            );
            return { status: false, message: `Error updating coin data for symbol:, ${symbol}, ${error}` };
        }
    }

    public async moralisTradingviewChartWidget(MORALIS_GRAPH_COUNTER: string) {
        console.log('MORALIS_GRAPH_COUNTER >>', MORALIS_GRAPH_COUNTER,);
        try {
            let coin_limit_count = 0;
            let limit = 10;
            let redis_key = `${MORALIS_GRAPH_COUNTER}`

            let findCoinCounter = await redisClient.getKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, redis_key);
            if (findCoinCounter && Number(findCoinCounter) > 0) {
                coin_limit_count = Number(findCoinCounter);
            } else {
                coin_limit_count = 0;
            }
            const tradingviewTokens = await Coins.CoinsRead.findAll({
                attributes: [
                    'coin_id',
                    'coin_symbol',
                    'coin_family',
                    'is_token',
                    'token_address',
                    'graph_source',
                    'graph_pair',
                    'pair_address'
                ],
                where: {
                    is_token: 1,
                    coin_family: { [Op.in]: [1, 2, 4, 5] },
                    token_type: { [Op.in]: ['ERC20', 'BEP20', 'SPL'] }
                },
                order: [['coin_id', 'ASC']],
                offset: coin_limit_count,
                limit: limit,
                logging: true
            });
            if (tradingviewTokens?.length > 0) {
                for (let i = 0; i < tradingviewTokens.length; i++) {
                    const token = tradingviewTokens[i];
                    const { coin_id, token_address } = token;

                    if (!token_address) {
                        console.warn(`Skipping token with ID: ${coin_id}, as it has no token_address`);
                        continue;
                    }

                    const tradingResponse = await this.processMoralisTradingView(token);
                    console.log('tradingResponse >>>', tradingResponse);
                    if (tradingResponse) {
                        continue;
                    }
                }
            }

            if (tradingviewTokens?.length < limit) {
                coin_limit_count = 0;
                await redisClient.setKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, redis_key, coin_limit_count.toString())
            } else {
                coin_limit_count = coin_limit_count + limit;
                await redisClient.setKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, redis_key, coin_limit_count.toString());
            }
        } catch (error) {
            console.log("🔥 ~ moralisTradingviewChartWidget error", error);
        }
    }
}

const trading_view_controller = new tradingViewController();
export default trading_view_controller;
