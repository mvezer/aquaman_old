const ConfigUtil = require("../util/ConfigUtil")

module.exports = function (config) {
    var config = config;
    var timingArray = [];

    var init = function () {

    }

    var update = function (schedulerObj) {
        timingArray = [];
        ConfigUtil.obj2array(schedulerObj.channels).forEach((channel) => {
            var channelId = channel.channel_id;
            ConfigUtil.obj2array(channel.timings).forEach((timingObject) => {
                //console.log("Channel \"%s\" at %s is set to %s", channelId, t.time, t.status);
                timingArray.push(createTimingItem(channelId, timingObject));
            });
        })

        timingArray.sort(sortTimingsArray);
        console.log(timingArray);
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