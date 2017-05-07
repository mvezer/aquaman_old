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
    _timeouts = {};

    var get = function () {
        return _overrides;
    }

    var init = function () {
        return new Promise((resolve, reject) => {
            loadFromRedis()
                .then((loadedOverrides) => {
                    if (!Util.isEmpty(loadedOverrides)) {
                        _overrides = loadedOverrides;
                    } else {
                        _overrides = loadFromJSON(config.getEnv("overrideDefaults"));
                        return saveToRedis();
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
            _timeouts[overrideId] = setTimeout(deactivateOverride, _overrides[overrideId].timeout * 1000, overrideId);
            event.emit("overrideActivated", overrideId);
        }
    }

    var deactivateOverride = function (overrideId) {
        if (isOverrideActive(overrideId)) {
            clearTimeout(timeouts[overrideId]);
            _timeouts[overrideId] = null;
            event.emit("overrideDeactivated", overrideId);
        }
    }

    var isOverrideActive = function (overrideId) {
        if (Util.isEmpty(_timeouts)) {
            return false;
        }
        return _timeouts[overrideId] != null;
    }

    var isChannelOverriden = function (channelId) {
        let isOverridden = false;
        for (let id in _overrides) {
            if (_overrides.hasOwnProperty(id) && isOverrideActive(id)) {
                if (_overrides[id].channels[channelId]) {
                    isOverridden = true;
                }
            }
        }

        return isOverridden;
    }

    var getChannelOverrideState = function (channelId) {
        let state = false;
        for (let overrideId in _overrides) {
            if (_overrides.hasOwnProperty(overrideId) && isOverrideActive(overrideId)) {
                const channels = _overrides[overrideId].channels;
                for (let id in channels) {
                    if (channels.hasOwnProperty(id)) {
                        if (id == channelId && channels[id]) {
                            state = true;
                        }
                    }
                }
            }
        }

        return state;
    }

    var loadFromJSON = function (inJson) {
        let overrides = inJson;
        for (let id in overrides) {
            if (overrides.hasOwnProperty(id)) {
                overrides[id].timeout = parseInt(overrides[id].timeout);
            }
        }

        return overrides;
    }

    var saveToRedis = function (overrides) {
        return new Promise((resolve, reject) => {
            clearRedis()
                .then(() => {
                    let pipe = redisClient.getPipeline();
                    let overrideId = 0;
                    for (let id in overrides) {
                        if (overrides.hasOwnProperty(id)) {
                            overrideObj = overrides[id]
                            pipe.hmset(propertiesPrefix + id, { timeout: overrideObj.timeout });

                            for (let channelId in overrideObj.channels) {
                                if (overrideObj.channels.hasOwnProperty(channelId)) {
                                    let channelItem = {}; channelItem[channelId] = overrideObj.channels[channelId];
                                    pipe.hmset(overridePrefix + overrideId, channelItem);
                                    pipe.sadd(channelPrefix + id, overrideId);
                                    overrideId++;
                                }
                            }
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
                        overrides[id].channels = {};
                        overrides[id].timeout = parseInt(propertyMap[id].timeout);
                        itemIdMap[id].forEach((itemId) => {
                            let o = overrideItems.shift()[1];
                            for (k in o) {
                                if (o.hasOwnProperty(k)) { overrides[id].channels[k] = o[k] == "true"; }
                            }
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
        get: get,
        event: event,
        activateOverride: activateOverride,
        deactivateOverride: deactivateOverride,
        isChannelOverriden: isChannelOverriden,
        getChannelOverrideState: getChannelOverrideState
    }
}

