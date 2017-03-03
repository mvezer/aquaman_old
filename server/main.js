const HttpServer = require("./controller/HttpServer");
const RedisClient = require("./controller/RedisClient");
const ScheduleManager = require("./controller/ScheduleManager");
const OverrideManager = require("./controller/OverrideManager");

const Config = require("./model/ConfigModel");
const ChannelModel = require("./model/ChannelModel");

const config = new Config(process.argv[2] || "config.json");
const server = new HttpServer(config);

const redisClient = new RedisClient(config);

const channelModel = new ChannelModel(config, redisClient, null);
const overrideManager = new OverrideManager(config, redisClient);
const scheduleManager = new ScheduleManager(config, redisClient, channelModel, overrideManager);

redisClient.connect()
    .then(() => { return channelModel.init() })
    .then(() => { return overrideManager.init() })
    .then(() => { return scheduleManager.init() })
    .then(() => {
        return server
            .connect()
            .addRoute(require("./route/DefaultRouter"))
            .addRoute(require("./route/ChannelStatesGetRouter"), channelModel)
            .addRoute(require("./route/ChannelStatesPatchRouter"), channelModel)
            .addRoute(require("./route/ChannelStatesUpdateRouter"), channelModel)
            .addRoute(require("./route/ScheduleUpdateRouter"), scheduleManager)
            .start()
    })
    .then(() => { console.log("HTTP server connected") })
    .catch((error) => {
        console.log(error);
    })

