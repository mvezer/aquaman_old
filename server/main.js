const HttpServer = require("./controller/HttpServer");
const RedisClient = require("./controller/RedisClient");
const ScheduleManager = require("./controller/ScheduleManager");

const Config = require("./model/ConfigModel");
const StatusModel = require("./model/StatusModel");

const config = new Config(process.argv[2] || "config.json");
const server = new HttpServer(config.fill(["httpHost", "httpPort"]));

const redisClient = new RedisClient(config);

const statusModel = new StatusModel(config.fill(["redisKeySeparator", "redisStatusKeyPrefix"]), redisClient, null);
const scheduleManager = new ScheduleManager();

redisClient.connect()
    .then(() => { statusModel.init() })
    .then(() => {
        server
            .connect()
            .addRoute(require("./route/DefaultRouter"))
            .addRoute(require("./route/StatusGetRouter"), statusModel)
            .addRoute(require("./route/StatusPatchRouter"), statusModel)
            .addRoute(require("./route/StatusUpdateRouter"), statusModel)
            .addRoute(require("./route/ScheduleUpdateRouter"), scheduleManager)
            .start()
    })
    .then(() => { console.log("HTTP server connected") })
    .catch(
    (error) => {
        console.log(error);
    })

