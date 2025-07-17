import ZooKeeper from './helpers/common/zookeeper';


(async () => {
    await ZooKeeper.connectZookeeper();
    await require('./config/index');
    await require('./server.cron');
})();