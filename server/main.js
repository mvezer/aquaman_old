const HttpServer = require("./controller/HttpServer");
const RedisClient = require("./controller/RedisClient");
const ScheduleManager = require("./controller/ScheduleManager");

const Config = require("./model/ConfigModel");
const ChannelModel = require("./model/ChannelModel");

const config = new Config(process.argv[2] || "config.json");
const server = new HttpServer(config);

const redisClient = new RedisClient(config);

const channelModel = new ChannelModel(config, redisClient, null);
const scheduleManager = new ScheduleManager(config, redisClient, channelModel);


redisClient.connect()
    .then(() => { return channelModel.init() })
    .then(() => { return scheduleManager.init() })
    .then(() => {
        return server
            .connect()
            .addRoute(require("./route/DefaultRouter"))
            .addRoute(require("./route/ChanneStatesGetRouter"), channelModel)
            .addRoute(require("./route/ChanneStatesPatchRouter"), channelModel)
            .addRoute(require("./route/ChanneStatesUpdateRouter"), channelModel)
            .addRoute(require("./route/ScheduleUpdateRouter"), scheduleManager)
            .start()
    })
    .then(() => { console.log("HTTP server connected") })
    .catch((error) => {
        console.log(error);
    })

