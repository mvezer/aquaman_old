module.exports = function (config, redisClient, rpiService) {
    var channelStates = {};
    var redisClient = redisClient;
    var rpiService = rpiService;

    var init = function () {
        return new Promise(function (resolve, reject) {
            let promises = [];
            for (let key in channelStates) {
                if (channelStates.hasOwnProperty(key)) {
                    promises.push(redisClient.get(getKey(key)).then((value) => { status[key] = value }));
                }
            }

            Promise.all(promises)
                .then(function (values) { resolve() })
                .catch((error) => { reject(error) });
        });
    }

    var get = function (channel) {
        return this.status[channel];
    }

    var set = function (channel, state) {
        return new Promise((resolve, reject) => {
            if (channelStates[channel] != state) {
                redisClient.set(getKey(channel), state)
                    .then(() => { channelStates[channel] = state; resolve() })
                    .catch((error) => { reject(error) })
            } else {
                resolve();
            }
        });
    }

    var getKey = function (id) {
        return config.getEnv("redisChannelStatePrefix") + config.getEnv("redisKeySeparator") + String(id);
    }

    var getStates = function () {
        return channelStates;
    }

    return {
        get: get,
        set: set,
        getStates: getStates,
        init: init
    }
}