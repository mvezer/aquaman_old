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
            client.on("error", function (error) { reject(error) })
        })
    }

    var set = function (key, value) {
        console.log("redis setting %s to %s", key, value)
        return client.set(key, value);
    }

    var get = function (key) {
        return client.get(key);
    }

    var getKeys = function(prefix) {
        return  prefix ? client.send_command("KEYS") : client.send_command("KEYS", prefix + config.getEnv("redisKeySeparator"));
    }

    return {
        config: config,
        connect: connect,
        client: client,
        set: set,
        get: get,
    }

}