const ConfigUtil = require("../util/ConfigUtil")

module.exports = function (config, redisClient, statusModel) {
    var config = config;
    var statusModel = statusModel;
    var redisClient = redisClient;
    var timingsArray = [];

    var init = function () {

    }

    var update = function (schedulerObj) {
        timings = [];
        ConfigUtil.obj2array(schedulerObj.channels).forEach((channel) => {
            var channelId = channel.channel_id;
            ConfigUtil.obj2array(channel.timings).forEach((timingObject) => {
                //console.log("Channel \"%s\" at %s is set to %s", channelId, t.time, t.status);
                timings.push(createTimingItem(channelId, timingObject));
            });
        })

        timings.sort(sortTimingsArray);
        console.log(timings);
        return storeTimings(timings);
    }

    var storeTimings = function (timings) {
        let promises = [];

        timings.forEach((timingItem) => {
            console.log(createKeyFromTimingItem(timingItem));
            promises.push(redisClient.set(createKeyFromTimingItem(timingItem),String(timingItem.status)));
        });

        return Promise.all(promises);
    }

    var createKeyFromTimingItem = function (timingItem) {
        return Array(
            config.getEnv("redisTimingsKeyPrefix"),
            timingItem.channel,
            String(timingItem.rts)
        ).join(config.getEnv("redisKeySeparator"))
    }

    var timeString2rts = function (timestr) {
        const timeArr = String(timestr).split(":");
        return Number.parseInt(timeArr[0]) * 3600 + Number.parseInt(timeArr[1]) * 60;
    }

    var sortTimingsArray = function (t1, t2) {
        return t1.rts - t2.rts;
    }

    var createTimingItem = function (channel, timingObject) {
        return {
            channel: channel,
            rts: timeString2rts(timingObject.time),
            status: timingObject.status
        }
    }

    return {
        init: init,
        update: update,
        timeString2rts: timeString2rts

    }
}