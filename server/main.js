const HttpServer = require("./controller/HttpServer");
const RedisClient = require("./controller/RedisClient");
const Config = require("./model/ConfigModel");
const StatusModel = require("./model/StatusModel");

const config = new Config(process.argv[2] || "config.json");
const server = new HttpServer(config.fill(["httpHost", "httpPort"]));


var redisClient = new RedisClient(config);

const statusModel = new StatusModel(config.fill(["redisKeySeparator", "redisStatusKeyPrefix"]), redisClient, null);

redisClient.connect()
    .then(() => { statusModel.init() })
    .then(() => {
        server
            .connect()
            .addRoute(require("./routes/DefaultRouter"), ":)")
            .addRoute(require("./routes/GetStatusRouter"), statusModel)
            .start()
    })
    .then(() => { console.log("HTTP server connected") })
    .catch(
    (error) => {
        console.log(error);
    })

