const ArrayUtil = require("../util/ArrayUtil")
const TimeUtil = require("../util/TimeUtil")

module.exports = function (config, redisClient, statusModel) {
    var config = config;
    var statusModel = statusModel;
    var redisClient = redisClient;
    var timingsArray = [];

    var init = function () {
        return new Promise((resolve, reject) => {
            timingsArray = [];
            getTimingsKeys()
                .then((keys) => {
                    if (keys.length) {
                        let promises = [];
                        keys.forEach((key) => {
                            promises.push(redisClient.get(key).then((value) => { timingsArray.push(createTimingItemFromKey(key, value)) }));
                        })

                        return Promise.all(promises);
                    } else {
                        return update(config.getEnv("defaultSchedule"));
                    }
                })
                .then(() => {
                    start();

                    let promises = [];
                    promises.push(statusModel.set("light", getCurrentState("light")));
                    promises.push(statusModel.set("co2", getCurrentState("co2")));
                    promises.push(statusModel.set("filter", getCurrentState("filter")));

                    return Promise.all(promises);
                })
                .then(() => { resolve() })
                .catch((error) => { reject(error) });
        });
    }

    var getCurrentState = function (channel) {
        const currentRTS = TimeUtil.getCurrentRTS();

        let lowerIndex = -1;
        let higherIndex = -1;

        let i = 0;
        while (i < timingsArray.length && (lowerIndex == -1 || higherIndex == -1)) {
            if (channel == timingsArray[i].channel) {
                if (timingsArray[i].rts <= currentRTS) {
                    lowerIndex = i;
                } else {
                    higherIndex = i;
                }
            }

            i++;
        }

        if (lowerIndex > -1) {
            return timingsArray[lowerIndex].status;
        }

        if (higherIndex > -1) {
            return timingsArray[higherIndex].status;
        }

        return (true);
    }

    var getTimingsKeys = function () {
        return redisClient.getKeys(config.getEnv("redisTimingsKeyPrefix"))
    }

    var start = function () {
        timingsArray.sort(sortTimingsArray);

        const currentRTS = TimeUtil.getCurrentRTS();

        timingsArray.forEach((timing, index) => {
            timingsArray[index].timingHandler = setTimeout(handleTiming, TimeUtil.getDifference(timingsArray[index].rts) * 1000, index);
        })
    }

    var handleTiming = function (index) {
        statusModel.set(timingsArray[index].channel, timingsArray[index].status)
            .then(() => {
                clearTimeout(timingsArray[index].timingHandler);
                timingsArray[index].timingHandler = setTimeout(handleTiming, TimeUtil.getDifference(timingsArray[index].rts) * 1000, index);
            })
            .catch((error) => { console.log(error) })
    }

    var clearTimingsKeys = function () {
        return new Promise((resolve, reject) => {
            getTimingsKeys()
                .then((keys) => {
                   return redisClient.del(keys);
                })
                .then(() => { resolve() })
                .catch((error) => { reject(error) })
        });

    }

    var update = function (schedulerObj) {
        return new Promise((resolve, reject) => {
            timingsArray = [];
            clearTimingsKeys()
                .then(() => {
                    ArrayUtil.obj2array(schedulerObj.channels).forEach((channel) => {
                        var channelId = channel.channel_id;
                        ArrayUtil.obj2array(channel.timings).forEach((timingObject) => {
                            timingsArray.push(createTimingItem(channelId, timingObject));
                        });
                    })

                    return storeTimings();
                })
                .then(() => {
                    start();
                    resolve()
                })
                .catch((error) => { reject(error) });
        })

    }

    var storeTimings = function () {
        let pipeline = redisClient.getPipeline();
        timingsArray.forEach((timingItem) => {
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
            status: timingObject.status,
            timingHandler: {}
        }
    }

    var createTimingItemFromKey = function (key, value) {
        const keyArr = String(key).split(config.getEnv("redisKeySeparator"));

        return {
            channel: keyArr[1],
            rts: Number.parseInt(keyArr[2]),
            status: value,
            timer: {}
        }
    }

    return {
        init: init,
        update: update
    }
}