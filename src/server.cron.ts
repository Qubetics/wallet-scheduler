import schedule from "node-schedule";
import moment from "moment";
import { config } from "./config";
const COIN_FAMILY = config.STATIC_COIN_FAMILY;
import {
  ThirdPartyController,
  PricesController,
  update_balance_controller,
  PendingCrossChainProcess,
  CosnumeCrossChainTxProcess,
  OnOffRampController,
  TradingViewGraphs,
} from "./modules/index";

const {
  eth: ETH,
  btc: BTC,
  bnb: BNB,
  sol: SOL,
  ada: ADA,
  matic: MATIC,
  avax: AVAX,
  cro: CRO,
  pls: PLS,
} = config.STATIC_COIN_FAMILY;

class CronJobs {
  constructor() {
    /** Update Gas Prices */
    this.updateEthGasPriceCron();
    this.updateBNBGasPriceCron();
    this.updatePOLGasPriceCron();
    /**  */

    /** Update Cmc Ids*/
    this.updateCmcIds();
    /**  */

    // /** Graph data */
    this.updateFiatCoinPriceCron();
    this.getCoinGraphDataDaily();
    /**  */
    /** cross chain */
    this.getPendingWithdrawalTxProcess();
    this.updateTxStatusProcess();
    /** Update btc balances of users */
    // this.updateBtcBalances()
    // this.updateUsdtBalances()
    this.tradingViewGraphData();

    /* moralis Chart Widget TradingView */
    // this.moralisTradingviewETH();
    // this.moralisTradingviewBSC();
    // this.moralisTradingviewMATIC();
    this.moralisTradingviewSOL();
  }

  public updateEthGasPriceCron = async () => {
    schedule.scheduleJob("*/7 * * * * *", async function () {
      await ThirdPartyController.updateGasPrice();
    });
  };

  public updateBNBGasPriceCron = async () => {
    schedule.scheduleJob("*/7 * * * * *", async function () {
      await ThirdPartyController.updateBNBGasPrice();
    });
  };

  public updatePOLGasPriceCron = async () => {
    schedule.scheduleJob("*/7 * * * * *", async function () {
      await ThirdPartyController.updatePolGasPrice();
    });
  };

  public updateCmcIds = async () => {
    schedule.scheduleJob("*/25 * * * * *", async function () {
      await PricesController.fetchCmcIds();
    });
  };

  public updateFiatCoinPriceCron = async () => {
    schedule.scheduleJob("0 */1 * * * *", async function () {
      await PricesController.fetchCmcPrice();
    });
  };

  public getCoinGraphDataDaily = async () => {
    schedule.scheduleJob("0 */2 * * * *", async function () {
      const endDateMoment = moment().format("YYYY-MM-DD HH:mm");
      const startDateMoment = moment()
        .subtract(1, "day")
        .format("YYYY-MM-DD HH:mm");
      await PricesController.getCoinGraphData(
        startDateMoment,
        endDateMoment,
        "5m",
        "1d",
        5
        // COIN_FAMILY.ETH
      );
    });
  };

  public getPendingWithdrawalTxProcess() {
    schedule.scheduleJob("*/2 * * * *", async function () {
      console.log("getting pending crosschain");
      await PendingCrossChainProcess.getTransactionFromDB(0);
    });
  }

  public async updateTxStatusProcess() {
    setTimeout(async () => {
      await CosnumeCrossChainTxProcess.startTxStatusUpdateQueue();
    }, 1000);
  }

  public updateBalanceCron = async () => {
    setTimeout(async () => {
      await update_balance_controller.update_wallet_balance();
    }, 10000);
  };

  public tradingViewGraphData = async () => {
    schedule.scheduleJob("*/1 * * * *", async function () {
      await TradingViewGraphs.getTradingViewTokens();
    });
  };
  // public async updateOnOffRampFiats() {
  //   schedule.scheduleJob('0 0 */2 * *', async function () {
  //     // await OnOffRampController.updateFiats('alchemy')
  //     await OnOffRampController.updateFiats('transak')
  //   })
  // }
  // public async updateTranskToken() {
  //   schedule.scheduleJob('0 */12 * * *', async function () {
  //     await OnOffRampController.updateTransakToken()
  //   })
  // }

  // public async updateBtcBalances() {
  //   schedule.scheduleJob("*/2 * * * *", async function () {
  //     console.log("hy entered into updateBtcBalances")
  //     await update_balance_controller.updateBtcBalances()
  //   })
  // }
  // public async updateUsdtBalances() {
  //   schedule.scheduleJob("*/2 * * * *", async function () {
  //     console.log("hy entered into updateUsdtBalances")
  //     await update_balance_controller.updateUsdtBalances()
  //   })
  // }

  /* moralis Chart Widget TradingView */
  public moralisTradingviewETH = async () => {
    schedule.scheduleJob("*/5 * * * *", async function () {
      await PricesController.moralisTradingviewChartWidget(
        "eth",
        COIN_FAMILY.ETH,
        "ERC20"
      );
    });
  };

  public moralisTradingviewBSC = async () => {
    schedule.scheduleJob("*/6 * * * *", async function () {
      await PricesController.moralisTradingviewChartWidget(
        "bsc",
        COIN_FAMILY.BNB,
        "BEP20"
      );
    });
  };

  public moralisTradingviewMATIC = async () => {
    schedule.scheduleJob("*/7 * * * *", async function () {
      await PricesController.moralisTradingviewChartWidget(
        "polygon",
        COIN_FAMILY.POL,
        "ERC20"
      );
    });
  };

  public moralisTradingviewSOL = async () => {
    schedule.scheduleJob("*/8 * * * *", async function () {
      await PricesController.moralisTradingviewChartWidgetSOL();
    });
  };
}

new CronJobs();
