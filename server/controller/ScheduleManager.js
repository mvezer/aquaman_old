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

    var reset = function (timings) {
        timings.sort(sortTimingsArray);
        timingsArray = timings;

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
        console.log("updating");
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
                    console.log("store done");
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