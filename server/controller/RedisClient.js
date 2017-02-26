const ConfigUtil = require("../util/ConfigUtil");
const Redis = require("ioredis");

module.exports = function (config) {
    var config = config;
    var connectionUrl = "";
    var client = {};

    var connect = function () {
        return new Promise(function (resolve, reject) {
            connectionUrl = ConfigUtil.createUrl({
                host: config.getEnv("redisHost"),
                port: config.getEnv("redisPort"),
                protocol: "redis"
            });

            client = new Redis(connectionUrl)
            client.on("connect", function () { console.log("Redis is connected to %s", connectionUrl) })
            client.on("ready", function () { console.log("Redis is ready"); resolve() })
            client.on("error", function(error) { reject(error) })
        })
    }

    return {
        config: config,
        connect: connect,
        client: client
    }

}