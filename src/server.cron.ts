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
} from "./modules/index";

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

    /** Graph data */
    this.updateFiatCoinPriceCron();
    this.getCoinGraphDataDaily();
    /**  */
    /** cross chain */
    this.getPendingWithdrawalTxProcess();
    this.updateTxStatusProcess();
    /** Update btc balances of users */
    // this.updateBtcBalances()
    // this.updateUsdtBalances()
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
    if (config.SERVER == "prod") {
      /** for eth coins/tokens current prices */
      schedule.scheduleJob("0 */1 * * * *", async function () {
        await PricesController.fetchCmcPrice(COIN_FAMILY.ETH);
      });
    } else {
      /** for eth coins/tokens current prices */
      schedule.scheduleJob("0 */1 * * * *", async function () {
        await PricesController.fetchCmcPrice(COIN_FAMILY.ETH);
      });
    }
  };
  public getCoinGraphDataDaily = async () => {
    if (config.SERVER == "prod") {
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
          5,
          // COIN_FAMILY.ETH
        );
      });
    } else {
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
          5,
          // COIN_FAMILY.ETH
        );
      });
    }
  };

  public getPendingWithdrawalTxProcess() {
    schedule.scheduleJob("*/2 * * * *", async function () {
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
    }, 10000)
  }

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
}

new CronJobs();
