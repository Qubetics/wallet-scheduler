import schedule from "node-schedule";
import moment from "moment";
import { config } from "./config";
import { ThirdPartyController, PricesController, PendingCrossChainProcess, CosnumeCrossChainTxProcess, TradingViewGraphs, NotificationController } from "./modules/index";

const {
  moralis_graph_counter: MORALIS_GRAPH_COUNTER,
} = config.REDISKEYS.COIN_LIMIT_COUNT_FIELD;

class CronJobs {
  constructor() {
    /** Update Gas Prices */
    this.updateEthGasPriceCron();
    this.updateBNBGasPriceCron();
    this.updatePOLGasPriceCron();

    /** Update Cmc Ids*/
    this.updateCmcIds();

    /** Graph data */
    this.updateFiatCoinPriceCronV2();

    this.getCoinGraphDataDaily();
    this.getCoinGraphDataWeekly();
    this.getCoinGraphDataMonthly();
    this.getCoinGraphDataYearly();
    /** cross chain */
    this.getPendingWithdrawalTxProcess();
    this.updateTxStatusProcess();
    this.tradingViewGraphData();

    /* moralis Chart Widget TradingView */
    this.moralisTradingviewWidget()

    this.moralisTradingview(); // call custom token kafka consumer

    this.updateFiatPrice();


    /* for SwftCoin (SWFTC) */
    this.swftcCoinList();

    /* Announcement notification */
    this.announcementNotification();
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
      await PricesController.fetchCmcIdsBySymbol();
    });
  };


  public updateFiatCoinPriceCronV2 = async () => {
    schedule.scheduleJob("0 */1 * * * *", async function () {
      await PricesController.fetchCmcPriceV2();
    });
  };


  public getCoinGraphDataDaily = async () => {
    schedule.scheduleJob("0/15 */2 * * * *", async function () {
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
      );
    });
  };

  public getCoinGraphDataWeekly = async () => {
    schedule.scheduleJob("0 */3 * * * *", async function () {
      console.log("call getCoinGraphDataWeekly :>> ");

      const endDateMoment = moment().format("YYYY-MM-DD HH:mm");
      const startDateMoment = moment()
        .subtract(1, "week")
        .format("YYYY-MM-DD HH:mm");

      await PricesController.getCoinGraphData(
        startDateMoment,
        endDateMoment,
        "3h",
        "1w",
        5
      );
    });
  };

  public getCoinGraphDataMonthly = async () => {
    schedule.scheduleJob("0 */4 * * * *", async function () {
      console.log("call getCoinGraphDataMonthly :>> ");

      const endDateMoment = moment().format("YYYY-MM-DD HH:mm");
      let startDateMoment = moment()
        .subtract(1, "months")
        .format("YYYY-MM-DD HH:mm");

      await PricesController.getCoinGraphData(
        startDateMoment,
        endDateMoment,
        "12h",
        "1m",
        5
      );
    });
  };

  public getCoinGraphDataYearly = async () => {
    schedule.scheduleJob("0 */5 * * * *", async function () {
      console.log("call getCoinGraphDataYearly :>> ");

      const endDateMoment = moment().format("YYYY-MM-DD HH:mm");
      let startDateMoment = moment()
        .subtract(1, "year")
        .format("YYYY-MM-DD HH:mm");

      await PricesController.getCoinGraphData(
        startDateMoment,
        endDateMoment,
        "3d",
        "1y",
        5
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


  public tradingViewGraphData = async () => {
    schedule.scheduleJob("*/3 * * * *", async function () {
      await TradingViewGraphs.getTradingViewTokens();
    });
  };

  public moralisTradingviewWidget = async () => {
    schedule.scheduleJob('*/5 * * * *', async function () {
      await TradingViewGraphs.moralisTradingviewChartWidget(MORALIS_GRAPH_COUNTER);
    });
  }
  public async moralisTradingview() {
    setTimeout(async () => {
      await CosnumeCrossChainTxProcess.moralisTradingviewChartWidgets();
    }, 1000);
  }

  public updateFiatPrice = async () => {
    schedule.scheduleJob("0 */5 * * * *", async function () {
      await PricesController.updateFiatPrice();
    });
  };


  public swftcCoinList = async () => {
    schedule.scheduleJob("0 0 */1 * * *", async function () {
      await ThirdPartyController.addSwftcCoinList();
    });
  }

  public announcementNotification = async () => {
    schedule.scheduleJob('*/1 * * * *', async function () {
      await NotificationController.instant_announcement_notification();
    });
  }

}

new CronJobs();
