module.exports = function (config, redisClient, serviceMap) {
    const Util = require("../util/Util")
    const TimeUtil = require("../util/TimeUtil")
    const EventEmitter = require("events");

    var config = config;
    var redisClient = redisClient;
    var _serviceMap = serviceMap;

    var event = new EventEmitter();

    _services = {};

    const propertiesPrefix = config.getEnv("redisServicePropertiesPrefix") + config.getEnv("redisKeySeparator");
    const channelsPrefix = config.getEnv("redisServiceChannelsPrefix") + config.getEnv("redisKeySeparator");
    const servicePrefix = config.getEnv("redisServicePrefix") + config.getEnv("redisKeySeparator");

    var getServices = function () {
        
        var returnObj = {};

        for (id in _services) {
            if (_services.hasOwnProperty(id)) {
                returnObj[id] = {};
                returnObj[id].channels = [];
                returnObj[id].period = _services[id].period;
                _services[id].channels.forEach((channel)=>{
                    returnObj[id].channels.push(channel);
                })
            }
            
        }
        return returnObj;
    }

    var init = function () {
        return new Promise((resolve, reject) => {
            loadFromRedis()
                .then((services) => {
                    if (!Util.isEmpty(services)) {
                        _services = services;
                        initTimers(_services, _serviceMap);
                    } else {
                        _services = loadFromJSON(config.getEnv("serviceDefaults"));
                        initTimers(_services, _serviceMap);
                        return saveToRedis(_services);
                    }
                })
                .then(() => { resolve() })
                .catch((error) => { reject(error) })
        })
    }

    var update = function (inJson) {
        _services = loadFromJSON(inJson);
        initTimers(_services);
        return saveToRedis(_services);
    }

    var initTimers = function (services, serviceMap) {
        for (id in services) {
            if (services.hasOwnProperty(id)) {
                clearInterval(services[id].timer);
                services[id].timer = setInterval(serviceMap[id], services[id].period * 1000, services, id)
            }
        }
    }

    var loadFromJSON = function (inJson) {
        let services = {};
        inJson.forEach((serviceSettings) => {
            let serviceObj = {};
            serviceObj.period = parseInt(serviceSettings.period)
            serviceObj.timer = {};
            serviceObj.channels = [];
            serviceSettings.channels.forEach((inChannels) => {
                serviceObj.channels.push(inChannels)
            })

            services[serviceSettings.id] = serviceObj;
        })
        return services;
    }

    var loadFromRedis = function () {
        return new Promise((resolve, reject) => {
            let services = {};
            let serviceIds = [];
            let itemIdMap = {};
            let propertyMap = {};
            redisClient.getKeys(propertiesPrefix)
                .then((pKeys) => {
                    propertyKeys = pKeys;
                    let pipe = redisClient.getPipeline();
                    pKeys.forEach((key) => {
                        pipe.hgetall(key);
                        serviceIds.push(key.split(config.getEnv("redisKeySeparator"))[1])
                    });
                    return pipe.exec();
                })
                .then((properties) => {
                    let pipe = redisClient.getPipeline();
                    serviceIds.forEach((id, index) => {
                        propertyMap[id] = properties[index][1];
                        pipe.smembers(servicePrefix + id);
                    })

                    return pipe.exec();
                })
                .then((itemIds) => {
                    let pipe = redisClient.getPipeline();
                    itemIds.forEach((idRow, rowIndex) => {
                        itemIdMap[serviceIds[rowIndex]] = idRow[1];
                        idRow[1].forEach((id) => {
                            pipe.hgetall(channelsPrefix + id);
                        })
                    })

                    return pipe.exec();
                })
                .then((serviceItems) => {
                    serviceIds.forEach((id) => {
                        services[id] = {};
                        services[id].channels = [];
                        services[id].period = parseInt(propertyMap[id].period);
                        services[id].timer = {};
                        itemIdMap[id].forEach((itemId) => {
                            let o = serviceItems.shift()[1];
                            o.state = o.state == "true";
                            services[id].channels.push(o);
                        })

                    })

                    resolve(services);
                })
                .catch((error) => { reject(error) })
        })
    }

    var saveToRedis = function (services) {
        return new Promise((resolve, reject) => {
            clearRedis()
                .then(() => {
                    let pipe = redisClient.getPipeline();
                    let serviceId = 0;
                    for (id in services) {
                        if (services.hasOwnProperty(id)) {
                            serviceObj = services[id]
                            pipe.hmset(propertiesPrefix + id, { period: serviceObj.period });
                            serviceObj.channels.forEach((channelItem) => {
                                pipe.hmset(channelsPrefix + serviceId, channelItem);
                                pipe.sadd(servicePrefix + id, serviceId);
                                serviceId++;
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
                redisClient.getKeys(channelsPrefix),
                redisClient.getKeys(servicePrefix)
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



    return {
        init: init,
        update: update,
        getServices: getServices
    }
}