import { Op } from 'sequelize';
import { config } from '../../config';
import { Coins } from '../../models/model';
import axios from 'axios';

class tradingViewController {
    constructor() {
    }

    // private async fetchAndUpdate(
    //     tradingviewTokens: any[],
    //     exchangeName: string,
    //     apiEndpoint: (symbol: string) => string,
    //     isApiResponseValid: (response: any) => boolean
    // ) {
    //     const BATCH_SIZE = 20
    //     for (let i = 0; i < tradingviewTokens.length; i += BATCH_SIZE) {
    //         const batch = tradingviewTokens.slice(i, i + BATCH_SIZE);

    //         const batchPromises = batch.map(async (token) => {
    //             const { coin_symbol, id } = token;
    //             let symbol = `${coin_symbol?.toUpperCase()}`;

    //             switch (exchangeName) {
    //                 case 'okx':
    //                     symbol = `${symbol}-USDT`;
    //                     break;
    //                 case 'bitmart':
    //                     symbol = `${symbol}_USDT`;
    //                     break;
    //                 default:
    //                     symbol = `${symbol}USDT`;
    //                     break;
    //             }

    //             try {
    //                 const response = await axios.get(apiEndpoint(symbol));
    //                 if (isApiResponseValid(response)) {
    //                     await Coins.CoinsWrite.update(
    //                         {
    //                             graph_source: exchangeName,
    //                             graph_pair: `${coin_symbol?.toLowerCase()}usdt`,
    //                         },
    //                         { where: { coin_id: id } }
    //                     );
    //                 }
    //             } catch (err: any) {
    //                 console.error(
    //                     `💥 ~  Error processing coin ID: ${id}, Symbol: ${coin_symbol} for ${exchangeName}`,
    //                     err?.message || err
    //                 );
    //             }
    //         });

    //         await Promise.all(batchPromises);
    //     }
    // }

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
                token_type: { [Op.or]: [{ [Op.in]: ['ERC20', 'BEP20', 'SPL', 'TRC20'] }, { [Op.is]: null }] },
            },
            limit: 5,
            order: [['coin_id', 'ASC']],
            logging: true
        });


        if (!coinData || coinData.length === 0) return; // Exit if no data

        // const exchanges = [
        //     { name: 'BINANCE', url: (symbol: string) => `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}USDT` },
        //     { name: 'OKX', url: (symbol: string) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT` },
        //     { name: 'BYBIT', url: (symbol: string) => `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}USDT` },
        //     { name: 'BITGET', url: (symbol: string) => `https://api.bitget.com/api/v2/spot/public/symbols?symbol=${symbol}USDT` },
        //     { name: 'BITMART', url: (symbol: string) => `https://api-cloud.bitmart.com/spot/quotation/v3/ticker?symbol=${symbol}_USDT` },
        //     { name: 'COINBASE', url: (symbol: string) => `https://api.coinbase.com/api/v3/brokerage/market/products/?product_ids=${symbol}-USDT` },
        //     { name: 'MEXC', url: (symbol: string) => `https://api.mexc.com/api/v3/exchangeInfo?symbol=${symbol}USDT` },
        //     { name: 'GATEIO', url: (symbol: string) => `https://api.gateio.ws/api/v4/spot/currency_pairs/${symbol}_USDT` }

        // ];
        // const usdtExchanges = [
        //     { name: 'BINANCE', url: (symbol: string) => `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}USD` },
        //     { name: 'OKX', url: (symbol: string) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USD` },
        //     { name: 'BYBIT', url: (symbol: string) => `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}USD` },
        //     { name: 'BITGET', url: (symbol: string) => `https://api.bitget.com/api/v2/spot/public/symbols?symbol=${symbol}USD` },
        //     { name: 'BITMART', url: (symbol: string) => `https://api-cloud.bitmart.com/spot/quotation/v3/ticker?symbol=${symbol}_USD` },
        //     { name: 'COINBASE', url: (symbol: string) => `https://api.coinbase.com/api/v3/brokerage/market/products/?product_ids=${symbol}-USD` },
        //     { name: 'MEXC', url: (symbol: string) => `https://api.mexc.com/api/v3/exchangeInfo?symbol=${symbol}USD` },
        //     { name: 'GATEIO', url: (symbol: string) => `https://api.gateio.ws/api/v4/spot/currency_pairs/${symbol}_USD` }

        // ];

        // // Helper function to find the exchange source
        // const getExchangeSource = async (symbol: string) => {
        //     const exchangesSource = symbol.toLowerCase() == 'usdt' ? usdtExchanges : exchanges;
        //     // console.log('exchangesSource >>>', exchangesSource);
        //     for (let exchange of exchangesSource) {
        //         try {
        //             // console.log('exchange.url(symbol) ', exchange.url(symbol));
        //             const response = await axios.get(exchange.url(symbol));
        //             // Simplified exchange response validation
        //             if (isValidExchangeResponse(exchange, response)) {
        //                 return exchange.name;
        //             }
        //             // if ((exchange.name === 'BINANCE' && response.data?.code === undefined) ||
        //             //     (exchange.name === 'OKX' && response.data?.code === 0) ||
        //             //     (exchange.name === 'BYBIT' && response.data?.result?.list?.length > 0) ||
        //             //     (exchange.name === 'BITGET' && response.data.code === '00000' && response.data.data?.length > 0) ||
        //             //     (exchange.name === 'BITMART' && response?.data?.code === 1000 && response?.data?.data !== undefined) ||
        //             //     (exchange.name === 'COINBASE' && response?.data?.products?.length > 0) ||
        //             //     (exchange.name === 'MEXC' && response?.data?.symbols?.length > 0) ||
        //             //     (exchange.name === 'GATEIO' && response?.data?.label === undefined)
        //             // ) {
        //             //     return exchange.name;
        //             // }
        //         } catch (error: any) {
        //             console.error(`Error fetching from ${exchange.name}:`, error.message);
        //         }
        //     }
        //     return null; // If no exchange source is found
        // };

        // // Function to validate the response based on exchange name
        // const isValidExchangeResponse = (exchange: { name: string }, response: any) => {
        //     switch (exchange.name) {
        //         case 'BINANCE':
        //             return response.data?.code === undefined;
        //         case 'OKX':
        //             return response.data?.code === "0";
        //         case 'BYBIT':
        //             return response.data?.result?.list?.length > 0;
        //         case 'BITGET':
        //             return response.data.code === '00000' && response.data.data?.length > 0;
        //         case 'BITMART':
        //             return response?.data?.code === 1000 && response?.data?.data !== undefined;
        //         case 'COINBASE':
        //             return response?.data?.products?.length > 0;
        //         case 'MEXC':
        //             return response?.data?.symbols?.length > 0;
        //         case 'GATEIO':
        //             return response?.data?.label === undefined;
        //         default:
        //             return false;
        //     }
        // };

        // Loop through each coin and update the graph source
        // for (let coin of coinData) {
        //     let graph_source = null;
        //     const symbol = `${coin.coin_symbol?.toUpperCase()}`;
        //     try {
        //         console.log('Checking symbol:', symbol);
        //         graph_source = await getExchangeSource(symbol);

        //         if (graph_source) {
        //             const graph_pair = symbol?.toLowerCase() == 'usdt' ? `${symbol}USD` : `${symbol}USDT`;
        //             console.log('Graph source found:', graph_source);
        //             await Coins.CoinsWrite.update(
        //                 {
        //                     graph_source: graph_source,
        //                     graph_pair: graph_pair,
        //                 },
        //                 { where: { coin_id: coin.coin_id } }
        //             );
        //         } else {
        //             console.log('No valid graph source for symbol:', symbol);
        //             await Coins.CoinsWrite.update(
        //                 {
        //                     is_on_trading_view: 0,
        //                 },
        //                 { where: { coin_id: coin.coin_id } }
        //             );
        //         }
        //     } catch (error) {
        //         console.error('Error updating coin data for symbol:', symbol, error);
        //         await Coins.CoinsWrite.update(
        //             {
        //                 is_on_trading_view: 0,
        //             },
        //             { where: { coin_id: coin.coin_id } }
        //         );
        //     }
        // }

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
                // await Coins.CoinsWrite.update(
                //     {
                //         is_on_trading_view: 0,
                //     },
                //     { where: { coin_id: coin.coin_id } }
                // );
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
                    // const firstPair = pairs[0];
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
                        message = `No active pair found for coin ID: ${data?.coin_id}, Symbol: ${data?.coin_symbol} Token address: ${data?.token_address}`;
                        this.processsTradingView(data)
                    }
                } else {
                    message = `No pairs found for coin ID: ${data?.coin_id}, Symbol: ${data?.coin_symbol} Token address: ${data?.token_address}`;
                    this.processsTradingView(data)
                }
                console.warn(message);
                return { status: true, message: message };
            } catch (err: any) {
                console.error(
                    `Error processing coin ID: ${data.coin_id}, Symbol: ${data.coin_symbol} Token address: ${data.token_address}`,
                    err?.message || err
                );
                await Coins.CoinsWrite.update(
                    {
                        is_on_trading_view: 1
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

    //function to find the exchange source
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
        // console.log('exchangesSource >>>', exchangesSource);
        for (let exchange of exchangesSource) {
            try {
                // console.log('exchange.url(symbol) ', exchange.url(symbol));
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

    // public async tradingviewBinance() {
    //     const tokens = await this.getTradingViewTokens();
    //     await this.fetchAndUpdate(
    //         tokens,
    //         'binance',
    //         (symbol) => `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`,
    //         (response) => response.data?.code == undefined
    //     );
    // }

    // public async tradingviewOkx() {
    //     const tokens = await this.getTradingViewTokens();
    //     await this.fetchAndUpdate(
    //         tokens,
    //         'okx',
    //         (symbol) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol}`,
    //         (response) => response.data?.code === 0
    //     );
    // }

    // public async tradingviewBybit() {
    //     const tokens = await this.getTradingViewTokens();
    //     await this.fetchAndUpdate(
    //         tokens,
    //         'bybit',
    //         (symbol) => `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}`,
    //         (response) => response.data.list?.length > 0
    //     );
    // }

    // public async tradingviewMexc() {
    //     const tokens = await this.getTradingViewTokens();
    //     await this.fetchAndUpdate(
    //         tokens,
    //         'mexc',
    //         (symbol) => `https://api.mexc.com/api/v3/exchangeInfo?symbol=${symbol}`,
    //         (response) => response.data?.code == undefined
    //     );
    // }

    // public async tradingviewBitmart() {
    //     const tokens = await this.getTradingViewTokens();
    //     await this.fetchAndUpdate(
    //         tokens,
    //         'bitmart',
    //         (symbol) => `https://api-cloud.bitmart.com/spot/quotation/v3/ticker?symbol=${symbol}`,
    //         (response) => response.data?.code === 1000
    //     );
    // }

    // public async tradingviewBitget() {
    //     const tokens = await this.getTradingViewTokens();
    //     await this.fetchAndUpdate(
    //         tokens,
    //         'bitget',
    //         (symbol) => `https://api.bitget.com/api/v2/spot/public/symbols?symbol=${symbol}`,
    //         (response) => response.data?.code === '00000'
    //     );
    // }

}

const trading_view_controller = new tradingViewController();
export default trading_view_controller;
