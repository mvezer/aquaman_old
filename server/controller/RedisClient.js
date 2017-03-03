const ConfigUtil = require("../util/ConfigUtil");
const Util = require("../util/Util");
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

    var mget = function (keys) {
        return client.send_command("mget", keys);
    }

    var del = function (keys) {
        if (Util.isArray(keys)) {
            let pipeline = getPipeline();
            keys.forEach((k) => {
                pipeline.del(k);
            })

            return pipeline.exec();
        }

        return client.del(keys);
    }

    var saveHash = function (key, obj) {
        return client.hmset(key, obj);
    }


    var getKeys = function (prefix) {
        return prefix ? client.keys(prefix + "*") : client.keys("*");
    }

    var getPipeline = function () {
        return client.pipeline();
    }

    var prepObj = function (obj) {
        for (property in obj) {
            if (obj.hasOwnProperty(property)) {
                obj[property] = String(obj[property]);
            }
        }

        return obj;
    }


    return {
        config: config,
        connect: connect,
        client: client,
        set: set,
        get: get,
        del: del,
        getPipeline: getPipeline,
        getKeys: getKeys,
        mget:mget
    }

}