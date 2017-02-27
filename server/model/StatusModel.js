module.exports = function (config, redisClient, rpiService) {
    var status = { filter: false, light: true, co2: true };
    var redisClient = redisClient;
    var rpiService = rpiService;

    var init = function () {
        return new Promise(function (resolve, reject) {
            let promises = [];
            for (let key in status) {
                if (status.hasOwnProperty(key)) {
                    promises.push(redisClient.get(getKey(key)).then((value) => { status[key] = value }));
                }

            }

            Promise.all(promises)
                .then(function (values) { resolve() })
                .catch((error) => { reject(error) });
        });
    }

    var get = function (key) {
        return this.status[key];
    }

    var set = function (key, value) {
        return new Promise((resolve, reject) => {
            if (status[key] != value) {
                redisClient.set(getKey(key), value)
                    .then(() => { status[key] = value; resolve() })
                    .catch((error) => { reject(error) })
            } else {
                resolve();
            }
        });
    }

    var getKey = function (id) {
        return config.redisStatusKeyPrefix + config.redisKeySeparator + String(id);
    }



    var getStatus = function () {
        return status;
    }

    return {
        get: get,
        set: set,
        getStatus: getStatus,
        init: init
    }
}