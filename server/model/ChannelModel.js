var gpio = require("mc-gpio");

module.exports = function (config, redisClient) {
    var _channelStates = {};
    var redisClient = redisClient;

    const _pinMap = {
        light: parseInt(config.getEnv("rpiLightPin")),
        filter: parseInt(config.getEnv("rpiFilterPin")),
        co2: parseInt(config.getEnv("RPI_CO2_PIN"))
    }

    var init = function () {
        return new Promise(function (resolve, reject) {
            let promises = [initRPI(_pinMap)];
            for (let key in _channelStates) {
                if (_channelStates.hasOwnProperty(key)) {
                    promises.push(redisClient.get(getKey(key)).then((value) => { _channelStates[key] = value }));
                }
            }

            Promise.all(promises)
                .then(function (values) { resolve() })
                .catch((error) => { reject(error) });
        });


    }

    var initRPI = function (pinMap) {
        return new Promise((resolve, reject) => {
            console.log(config.getEnv("nodeEnv"));
            if (config.getEnv("nodeEnv") == "production") {
                for (channel in pinMap) {
                    if (pinMap.hasOwnProperty(channel)) {
                        gpio.openPin(pinMap[channel], "out", (error) => {
                            if (error) {
                                reject(error);
                            }
                        })
                    }
                }
            }

            resolve();
        })
    }

    var updateRPI = function (channelStates, pinMap) {
        return new Promise((resolve, reject) => {
            if (config.getEnv("nodeEnv") == "production") {
                for (let key in channelStates) {
                    gpio.write(pinMap[key], channelStates[key] ? 0 : 1, (error) => {
                        if (error) {
                            reject(error);
                        }
                    })
                }
            }

            resolve();
        })

    }

    var get = function (channel) {
        return _channelStates[channel];
    }

    var set = function (channel, state) {
        return new Promise((resolve, reject) => {
            if (_channelStates[channel] != state) {
                redisClient.set(getKey(channel), state)
                    .then(() => {
                        _channelStates[channel] = state;
                        return updateRPI(_channelStates, _pinMap);
                    })
                    .then(() => { resolve() })
                    .catch((error) => { reject(error) })
            } else {
                resolve();
            }
        });
    }

    var getKey = function (id) {
        return config.getEnv("redisChannelStateKeyPrefix") + config.getEnv("redisKeySeparator") + String(id);
    }

    var getStates = function () {
        return _channelStates;
    }

    return {
        get: get,
        set: set,
        getStates: getStates,
        init: init
    }
}