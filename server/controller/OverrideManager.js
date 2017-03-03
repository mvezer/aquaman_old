const Util = require("../util/Util")
const TimeUtil = require("../util/TimeUtil")

module.exports = function (config, redisClient) {
    var config = config;
    var redisClient = redisClient;

    var propertiesPrefix = config.getEnv("redisOverridePropertiesPrefix") + config.getEnv("redisKeySeparator");
    var channelPrefix = config.getEnv("redisChannelOverridePrefix") + config.getEnv("redisKeySeparator");
    var overridePrefix = config.getEnv("redisOverridePrefix") + config.getEnv("redisKeySeparator");

    _overrides = {};

    var init = function () {
        return new Promise((resolve, reject) => {
            loadFromRedis()
                .then((overrides) => {
                    if (overrides) {
                        _overrides = overrides;
                    } else {
                        console.log("Loading override defaults")
                        _overrides = loadFromJSON(config.getEnv("overrideDefaults"));
                        return saveToRedis(_overrides);
                    }
                })
                .then(() => { resolve() })
                .catch((error) => { reject(error) })
        })
    }

    var update = function (inJson) {

    }

    var activateOverride = function (overrideId) {

    }

    var deactivateOverride = function (overrideId) {

    }

    var isOverrideActive = function (overrideId) {
        return _overrides[overrideId].timer != {};
    }

    var isChannelOverriden = function (channelId) {
        let isOverridden = false;

        for (id in _overrides) {
            if (_overrides.hasOwnProperty(id) && isOverrideActive(id)) {
                _overrides[id].overrides.forEach((ovr) => {
                    if (ovr.channelId == channelId) {
                        isOverridden = true;
                        break;
                    }
                });
            }
        }

        return isOverridden;
    }

    var getChannelOverrideState = function (channelId) {
        let state = false;

        for (id in _overrides) {
            if (_overrides.hasOwnProperty(id) && isOverrideActive(id)) {
                _overrides[id].overrides.forEach((ovr) => {
                    if (ovr.channelId == channelId) {
                        state = ovr.state;
                        break;
                    }
                });
            }
        }

        return state;
    }

    var loadFromJSON = function (inJson) {
        let overrides = {};
        inJson.forEach((overrideSettings) => {
            let overrideObj = {};
            overrideObj.timeout = parseInt(overrideSettings.timeout)
            overrideObj.timer = {};
            overrideObj.overrides = [];
            overrideSettings.overrides.forEach((inOverrideItem) => {
                overrideObj.overrides.push(inOverrideItem)
            })

            overrides[overrideSettings.id] = overrideObj;
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
        return new Promise((resolve, reject) => {
            let overrides = {};
            let overrideIds = [];
            let itemIdMap = {};
            let propertyMap = {};
            redisClient.getKeys(propertiesPrefix)
                .then((pKeys) => {
                    propertyKeys = pKeys;
                    let pipe = redisClient.getPipeline();
                    pKeys.forEach((key) => {
                        pipe.hgetall(key);
                        overrideIds.push(key.split(config.getEnv("redisKeySeparator"))[1])
                    });
                    return pipe.exec();
                })
                .then((properties) => {
                    let pipe = redisClient.getPipeline();
                    overrideIds.forEach((id, index) => {
                        propertyMap[id] = properties[index][1];
                        pipe.smembers(channelPrefix + id);
                    })

                    return pipe.exec();
                })
                .then((itemIds) => {
                    let pipe = redisClient.getPipeline();
                    itemIds.forEach((idRow, rowIndex) => {
                        itemIdMap[overrideIds[rowIndex]] = idRow[1];
                        idRow[1].forEach((id) => {
                            pipe.hgetall(overridePrefix + id);
                        })
                    })

                    return pipe.exec();
                })
                .then((overrideItems) => {
                    overrideIds.forEach((id) => {
                        overrides[id] = {};
                        overrides[id].overrides = [];
                        overrides[id].timeout = parseInt(propertyMap[id].timeout);
                        overrides[id].timer = false;
                        itemIdMap[id].forEach((itemId) => {
                            let o = overrideItems.shift()[1];
                            o.state = o.state == "true";
                            overrides[id].overrides.push(o);
                        })

                    })

                    resolve(overrides);
                })
                .catch((error) => { reject(error) })
        })

    }

    return {
        init: init,
        update: update
    }
}

