const HttpServer = require("./controller/HttpServer");
const RedisClient = require("./controller/RedisClient");
const ScheduleManager = require("./controller/ScheduleManager");

const Config = require("./model/ConfigModel");
const StatusModel = require("./model/StatusModel");

const config = new Config(process.argv[2] || "config.json");
const server = new HttpServer(config.fill(["httpHost", "httpPort"]));

const redisClient = new RedisClient(config);

const statusModel = new StatusModel(config.fill(["redisKeySeparator", "redisStatusKeyPrefix"]), redisClient, null);
const scheduleManager = new ScheduleManager(config, redisClient, statusModel);


redisClient.connect()
    .then(() => { console.log("Initializing status model..."); return statusModel.init() })
    .then(() => { console.log("Initializing schedule manager..."); return scheduleManager.init() })
    .then(() => {
        console.log("Initializing http server...");
        return server
            .connect()
            .addRoute(require("./route/DefaultRouter"))
            .addRoute(require("./route/StatusGetRouter"), statusModel)
            .addRoute(require("./route/StatusPatchRouter"), statusModel)
            .addRoute(require("./route/StatusUpdateRouter"), statusModel)
            .addRoute(require("./route/ScheduleUpdateRouter"), scheduleManager)
            .start()
    })
    .then(() => { console.log("HTTP server connected") })
    .catch((error) => {
        console.log(error);
    })

