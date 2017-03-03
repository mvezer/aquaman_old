const Util = require("../util/Util")
const TimeUtil = require("../util/TimeUtil")

module.exports = function (config, redisClient, channelModel) {
    var config = config;
    var channelModel = channelModel;
    var redisClient = redisClient;
    var _schedule = {};
    var overrides = [];
    var channels = [];

    const timingPrefix = config.getEnv("redisTimingPrefix") + config.getEnv("redisKeySeparator");
    const channelPrefix = config.getEnv("redisChannelSchedulePrefix") + config.getEnv("redisKeySeparator");

    var init = function () {
        return new Promise((resolve, reject) => {
            loadFromRedis()
                .then((schedule) => {
                    if (!Util.isEmpty(schedule)) {
                        _schedule = schedule;
                        resolve();
                    } else {
                        console.log("Loading schedule defaults")
                        _schedule = loadFromJSON(config.getEnv("scheduleDefaults"));
                        return saveToRedis(_schedule);
                    }
                })
                .then(() => {
                    initTimers(_schedule);
                    initChannels(_schedule);
                    resolve();
                })
                .catch((error) => { reject(error) })
        })
    }

    var update = function (inJSON) {
        _schedule = loadFromJSON(inJSON);
        initTimers(_schedule);
        initChannels(_schedule);
        return saveToRedis(_schedule);
    }

    var loadFromRedis = function () {
        return new Promise((resolve, reject) => {
            let schedule = {};
            let channelIds = [];
            let timingIds = [];

            redisClient.getKeys(channelPrefix)
                .then((channel_ids) => {
                    channelIds = channel_ids
                    let pipe = redisClient.getPipeline();
                    channel_ids.forEach((key) => {
                        pipe.smembers(key);
                    });
                    return pipe.exec()
                })
                .then((timing_ids) => {
                    timingIds = timing_ids;
                    let pipe = redisClient.getPipeline();
                    timing_ids.forEach((inner_ids) => {
                        let channel = {};
                        inner_ids[1].forEach((timingId) => {
                            pipe.hgetall(timingPrefix + timingId);
                        });
                    })

                    return pipe.exec();
                })
                .then((timings) => {
                    channelIds.forEach((channel_id, channel_index) => {
                        let channel = {};
                        channel.timings = [];
                        timingIds[channel_index][1].forEach(() => {
                            let t = timings.shift()[1];
                            t.rts = Number(t.rts);
                            t.state = (t.state == "true")
                            channel.timings.push(t);
                        })

                        channel.timings.sort((t0, t1) => { return t0.rts - t1.rts });

                        schedule[channel_id.split(config.getEnv("redisKeySeparator"))[1]] = channel;
                    });

                    resolve(schedule);
                })
                .catch((error) => { reject(error) });
        })

    }

    var loadFromJSON = function (inJson) {
        let schedule = {};
        Util.obj2array(inJson.channels).forEach((inChannel) => {
            let channel = {};
            channel.timings = [];
            channel.timeout = {};
            Util.obj2array(inChannel.timings).forEach((inTiming) => {
                channel.timings.push({
                    rts: TimeUtil.timeString2rts(inTiming.rts),
                    state: inTiming.state,
                });
            })
            channel.timings = channel.timings.map(Number);
            channel.timings.sort((t0, t1) => { return t0.rts - t1.rts });

            schedule[inChannel.channelId] = channel;
        })

        return schedule;
    }

    var saveToRedis = function (schedule) {
        return new Promise((resolve, reject) => {
            let pipe = redisClient.getPipeline();
            let timingId = 0;
            clearRedis()
                .then(() => {
                    for (channel in schedule) {
                        if (schedule.hasOwnProperty(channel)) {
                            schedule[channel].timings.forEach((timing) => {
                                pipe.hmset(timingPrefix + timingId, timing);
                                pipe.sadd(channelPrefix + channel, timingId);
                                timingId++;
                            });
                        }
                    }
                    return pipe.exec();
                })
                .then(() => { resolve() })
                .catch((error) => { reject(error) })
        });
    }

    var clearRedis = function () {
        return new Promise((resolve, reject) => {
            let promises = [redisClient.getKeys(timingPrefix), redisClient.getKeys(channelPrefix)];
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

    var initTimers = function (schedule) {
        for (channel in schedule) {
            if (schedule.hasOwnProperty(channel)) {
                timeoutHandler(schedule, channel);
            }
        }
    }

    var initChannels = function (schedule) {
        for (channel in schedule) {
            if (schedule.hasOwnProperty(channel)) {
                channelModel.set(channel, getCurrentState(schedule[channel].timings));
            }
        }
    }

    var timeoutHandler = function (schedule, channel) {
        if (schedule[channel].timeout) {
            clearTimeout(schedule[channel].timeout);
        }

        schedule[channel].timeout = setTimeout(timeoutHandler, getNextTimeout(schedule[channel].timings) * 1000, schedule, channel);
    }

    var getNextTimeout = function (timings) {
        const currentRTS = TimeUtil.getCurrentRTS();
        let lo = 0;
        let hi = 0;
        let i = 0;
        while (i < timings.length && (!lo || !hi)) {
            if (timings[i].rts < currentRTS) {
                lo = timings[i].rts;
            } else {
                hi = timings[i].rts;
            }
            i++;
        }

        if (hi) {
            return hi - currentRTS;
        }

        if (lo) {
            return TimeUtil.secondsInADay - currentRTS + lo;
        }

        return TimeUtil.secondsInADay;
    }

    var getCurrentState = function (timings) {
        const currentRTS = TimeUtil.getCurrentRTS();
        let lo = -1;
        let hi = -1;
        let i = 0;
        while (i < timings.length && (lo == -1 || hi == -1)) {
            if (timings[i].rts < currentRTS) {
                lo = i;
            } else {
                hi = i;
            }
            i++;
        }

        if (lo > -1) {
            return timings[lo].state;
        }

        if (hi > -1) {
            return timings[hi].state;
        }

        return true;
    }


    return {
        init: init,
        update: update
    }
}