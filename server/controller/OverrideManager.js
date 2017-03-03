const Util = require("../util/Util")
const TimeUtil = require("../util/TimeUtil")

module.exports = function (config, redisClient) {
    var config = config;
    var redisClient = redisClient;

    var propertiesPrefix = config.getEnv("redisOverridePropertiesPrefix") + config.getEnv("redisKeySeparator");
    var channelPrefix = config.getEnv("redisChannelOverridePrefix") + config.getEnv("redisKeySeparator");;
    var overridePrefix = config.getEnv("redisOverridePrefix") + config.getEnv("redisKeySeparator");;

    _overrides = []

    var init = function () {
        _overrides = loadFromJSON(config.getEnv("overrideDefaults"));
        saveToRedis(_overrides).then(() => {"Saved to redis"});
    }

    var update = function (inJson) {

    }

    var loadFromJSON = function (inJson) {
        let overrides = [];
        inJson.forEach((overrideSettings) => {
            let overrideObj = {};
            overrideObj.id = overrideSettings.id;
            overrideObj.timeout = parseInt(overrideSettings.timeout)
            overrideObj.overrides = [];
            overrideSettings.overrides.forEach((inOverrideItem) => {
                overrideObj.overrides.push(inOverrideItem)
            })

            overrides.push(overrideObj);
        })

        return overrides;
    }

    var saveToRedis = function (overrides) {
        let pipe = redisClient.getPipeline();
        let overrideId = 0;
        overrides.forEach((overrideObj) => {
            pipe.hmset(propertiesPrefix + overrideObj.id, { timeout: overrideObj.timeout });
            overrideObj.overrides.forEach((overrideItem) => {
                pipe.hmset(overridePrefix + overrideId, overrideItem);
                pipe.sadd(channelPrefix + overrideObj.id, overrideId);
                overrideId++;
            })
        })

        return pipe.exec();
    }

    var loadFromRedis = function () {

    }

    return {
        init: init,
        update: update
    }


}

