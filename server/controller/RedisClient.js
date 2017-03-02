const ConfigUtil = require("../util/ConfigUtil");
const ArrayUtil = require("../util/ArrayUtil");
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

    var del = function (keys) {
        if (ArrayUtil.isArray(keys)) {
            let pipeline = getPipeline();
            keys.forEach((k) => {
                pipeline.del(k);
            })

            return pipeline.exec();
        }

        return client.del(keys);
    }


    var getKeys = function (prefix) {
        return prefix ? client.send_command("keys", prefix + config.getEnv("redisKeySeparator") + "*") : client.send_command("keys", "*");
    }

    var getPipeline = function () {
        return client.pipeline();
    }

    return {
        config: config,
        connect: connect,
        client: client,
        set: set,
        get: get,
        del:del,
        getPipeline: getPipeline,
        getKeys: getKeys
    }

}