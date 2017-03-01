const ConfigUtil = require("../util/ConfigUtil")
const TimeUtil = require("../util/TimeUtil")

module.exports = function (config, redisClient, statusModel) {
    var config = config;
    var statusModel = statusModel;
    var redisClient = redisClient;
    var timingsArray = [];

    var init = function () {
        return new Promise((resolve, reject) => {
            let timings = [];
            getTimingsKeys()
                .then((keys) => {
                    let promises = [];
                    keys.forEach((key) => {
                        promises.push(redisClient.get(key).then((value) => { timings.push(createTimingItemFromKey(key, value)) }));
                    })

                    return Promise.all(promises);
                })
                .then(() => {
                    reset(timings);
                    console.log(timings);
                    resolve();
                })
                .catch((error) => { console.log(error); reject(error) });
        });
    }

    var getTimingsKeys = function () {
        return redisClient.getKeys(config.getEnv("redisTimingsKeyPrefix"))
    }

    var reset = function (timings) {
        timings.sort(sortTimingsArray);
        timingsArray = timings;

        console.log(TimeUtil.getCurrentTS(), TimeUtil.getCurrentRTS(), TimeUtil.secondsInADay);
    }

    var clearTimingsKeys = function () {
        return new Promise((resolve, reject) => {
            getTimingsKeys()
                .then((keys) => {
                    let pipeline = redisClient.getPipeline();
                    keys.forEach((key) => {
                        pipeline.del(key);
                    })

                    return pipeline.exec();
                })
                .then(() => { resolve() })
                .catch((error) => { reject(error) })
        });

    }

    var update = function (schedulerObj) {
        return new Promise((resolve, reject) => {
            timings = [];
            clearTimingsKeys()
                .then(() => {
                    ConfigUtil.obj2array(schedulerObj.channels).forEach((channel) => {
                        var channelId = channel.channel_id;
                        ConfigUtil.obj2array(channel.timings).forEach((timingObject) => {
                            timings.push(createTimingItem(channelId, timingObject));
                        });
                    })

                    return storeTimings(timings);
                })
                .then(() => {
                    reset(timings);
                    resolve()
                })
                .catch((error) => { reject(error) });
        })

    }

    var storeTimings = function (timings) {
        let pipeline = redisClient.getPipeline();
        timings.forEach((timingItem) => {
            pipeline.set(createKeyFromTimingItem(timingItem), String(timingItem.status));
        });

        return pipeline.exec();
    }

    var createKeyFromTimingItem = function (timingItem) {
        return Array(
            config.getEnv("redisTimingsKeyPrefix"),
            timingItem.channel,
            String(timingItem.rts)
        ).join(config.getEnv("redisKeySeparator"))
    }



    var sortTimingsArray = function (t1, t2) {
        return t1.rts - t2.rts;
    }

    var createTimingItem = function (channel, timingObject) {
        return {
            channel: channel,
            rts: TimeUtil.timeString2rts(timingObject.time),
            status: timingObject.status
        }
    }

    var createTimingItemFromKey = function (key, value) {
        const keyArr = String(key).split(config.getEnv("redisKeySeparator"));

        return {
            channel: keyArr[1],
            rts: Number.parseInt(keyArr[2]),
            status: value
        }
    }

    return {
        init: init,
        update: update
    }
}