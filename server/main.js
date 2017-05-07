const HttpServer = require("./controller/HttpServer");
const RedisClient = require("./controller/RedisClient");
const ScheduleManager = require("./controller/ScheduleManager");
const OverrideManager = require("./controller/OverrideManager");
const ServiceManager = require("./controller/ServiceManager");
const CameraManager = require("./controller/CameraManager");

const Config = require("./model/ConfigModel");
const ChannelModel = require("./model/ChannelModel");

const config = new Config(process.argv[2] || "config.json");
const server = new HttpServer(config);

const redisClient = new RedisClient(config);

const channelModel = new ChannelModel(config, redisClient, null);
const overrideManager = new OverrideManager(config, redisClient);
const scheduleManager = new ScheduleManager(config, redisClient, channelModel, overrideManager);
const cameraManager = new CameraManager(config);
const serviceManager = new ServiceManager(config, redisClient, channelModel, { camera: cameraManager.shoot });

redisClient.connect()
    .then(() => { return channelModel.init() })
    .then(() => { return overrideManager.init() })
    .then(() => { return scheduleManager.init() })
    .then(() => { return serviceManager.init() })
    .then(() => {
        return server
            .connect()
            .addRoute(require("./route/DefaultRouter"))
            .addRoute(require("./route/ChannelGetRouter"), channelModel)
            .addRoute(require("./route/ChannelPatchRouter"), channelModel)
            .addRoute(require("./route/ChannelUpdateRouter"), channelModel)
            .addRoute(require("./route/ScheduleUpdateRouter"), scheduleManager)
            .addRoute(require("./route/OverrideGetRouter"), overrideManager)
            .addRoute(require("./route/OverrideUpdateRouter"), overrideManager)
            .addRoute(require("./route/OverrideActivateRouter"), overrideManager)
            .addRoute(require("./route/OverrideDeactivateRouter"), overrideManager)
            .addRoute(require("./route/ServiceGetRouter"), serviceManager)
            .addRoute(require("./route/ServiceUpdateRouter"), serviceManager)
            .start()
    })
    .then(() => { console.log("HTTP server connected: ", config.getEnv("httpHost")) })
    .catch((error) => {
        console.log(error);
    })
