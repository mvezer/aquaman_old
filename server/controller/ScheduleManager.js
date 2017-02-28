const ConfigUtil = require("../util/ConfigUtil")

module.exports = function (config) {
    var config = config;

    var init = function () {

    }

    var update = function (schedulerObj) {
        const channels = ConfigUtil.obj2array(schedulerObj);

        channels.forEach((channel) => {
            var channelId = channel.channel_id;
            var timings = ConfigUtil.obj2array(channel);
            timings.forEach((t) => {
                // testing
                console.log("Channel \"%s\" at %s is set to %s", channelId, t.time, t.status);
            });
        })

    }

    return {
        init: init,
        update: update
    }
}