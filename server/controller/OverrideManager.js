const Util = require("../util/Util")
const TimeUtil = require("../util/TimeUtil")
const EventEmitter = require("events");

module.exports = function (config, redisClient) {
    var config = config;
    var redisClient = redisClient;

    var event = new EventEmitter();

    const propertiesPrefix = config.getEnv("redisOverridePropertiesPrefix") + config.getEnv("redisKeySeparator");
    const channelPrefix = config.getEnv("redisChannelOverridePrefix") + config.getEnv("redisKeySeparator");
    const overridePrefix = config.getEnv("redisOverridePrefix") + config.getEnv("redisKeySeparator");

    _overrides = {};

    var getOverrides = function() {
        return _overrides;
    }


    var init = function () {
        return new Promise((resolve, reject) => {
            loadFromRedis()
                .then((overrides) => {
                    if (!Util.isEmpty(overrides)) {
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
        _overrides = loadFromJSON(inJson);
        return saveToRedis(_overrides);
    }

    var activateOverride = function (overrideId) {
        if (!isOverrideActive(overrideId)) {
            _overrides[overrideId].timer = setTimeout(deactivateOverride, _overrides[overrideId].timeout * 1000, overrideId);
            event.emit("overrideActivated", _overrides[overrideId].overrides);
        }
    }

    var deactivateOverride = function (overrideId) {
        if (isOverrideActive(overrideId)) {
            clearTimeout(_overrides[overrideId].timer)
            _overrides[overrideId].timer = null;
            event.emit("overrideDeactivated", _overrides[overrideId].overrides);
        }
    }

    var isOverrideActive = function (overrideId) {
        if (Util.isEmpty(_overrides)) {
            return false;
        }
        return _overrides[overrideId].timer != null;
    }

    var isChannelOverriden = function (channelId) {
        let isOverridden = false;

        for (id in _overrides) {
            if (_overrides.hasOwnProperty(id) && isOverrideActive(id)) {
                _overrides[id].overrides.forEach((ovr) => {
                    if (ovr.channelId == channelId) {
                        isOverridden = true;
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
            overrideObj.timer = null;
            overrideObj.overrides = [];
            overrideSettings.overrides.forEach((inOverrideItem) => {
                overrideObj.overrides.push(inOverrideItem)
            })

            overrides[overrideSettings.id] = overrideObj;
        })

        return overrides;
    }

    var saveToRedis = function (overrides) {
        return new Promise((resolve, reject) => {
            clearRedis()
                .then(() => {
                    let pipe = redisClient.getPipeline();
                    let overrideId = 0;
                    for (id in overrides) {
                        if (overrides.hasOwnProperty(id)) {
                            overrideObj = overrides[id]
                            pipe.hmset(propertiesPrefix + id, { timeout: overrideObj.timeout });
                            overrideObj.overrides.forEach((overrideItem) => {
                                pipe.hmset(overridePrefix + overrideId, overrideItem);
                                pipe.sadd(channelPrefix + id, overrideId);
                                overrideId++;
                            })
                        }
                    }

                    return pipe.exec();
                })
                .then(() => {
                    resolve();
                })
                .catch((error) => { reject(error) })
        })
    }

    var clearRedis = function () {
        return new Promise((resolve, reject) => {
            let promises = [
                redisClient.getKeys(propertiesPrefix),
                redisClient.getKeys(channelPrefix),
                redisClient.getKeys(overridePrefix)
            ];
            Promise.all(promises)
                .then((allKeys) => {
                    let pipe = redisClient.getPipeline();
                    allKeys.forEach((keys) => {
                        keys.forEach((k) => {
                            pipe.del(k);
                        })
                    })

                    return pipe.exec();
                })
                .then(() => resolve())
                .catch((error) => { reject(error) });
        });
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
                        overrides[id].timer = null;
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
        update: update,
        event: event,
        activateOverride: activateOverride,
        deactivateOverride: deactivateOverride,
        isChannelOverriden: isChannelOverriden,
        getChannelOverrideState: getChannelOverrideState,
        getOverrides:getOverrides
    }
}

