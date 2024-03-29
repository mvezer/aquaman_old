const Util = require("../util/Util")
const TimeUtil = require("../util/TimeUtil")

module.exports = function (config, redisClient, channelModel, overrideManager) {
    var config = config;
    var channelModel = channelModel;
    var redisClient = redisClient;
    var overrideManager = overrideManager;

    var _schedule = {};
    var _timeouts = {};

    const timingPrefix = config.getEnv("redisTimingPrefix") + config.getEnv("redisKeySeparator");
    const channelPrefix = config.getEnv("redisChannelSchedulePrefix") + config.getEnv("redisKeySeparator");

    var init = function () {
        overrideManager.event.on("overrideActivated", onOverrideChanged);
        overrideManager.event.on("overrideDeactivated", onOverrideChanged);

        return new Promise((resolve, reject) => {
            loadFromRedis()
                .then((loadedSchedule) => {
                    if (!Util.isEmpty(loadedSchedule)) {
                        _schedule = loadedSchedule;
                        resolve();
                    } else {
                        _schedule = loadFromJSON(config.getEnv("scheduleDefaults"));
                        return saveToRedis(_schedule);
                    }
                })
                .then(() => {
                    initChannels(_schedule);
                    resolve();
                })
                .catch((error) => { reject(error) })
        })
    }

    var update = function (inJSON) {
        _schedule = loadFromJSON(inJSON);
        initChannels(_schedule);
        return saveToRedis(_schedule);
    }

    var get = function () {
        return _schedule;
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
                        inner_ids[1].forEach((timingId) => {
                            pipe.hgetall(timingPrefix + timingId);
                        });
                    })

                    return pipe.exec();
                })
                .then((timings) => {
                    channelIds.forEach((channel_id, channel_index) => {

                        channelTimings = [];
                        timingIds[channel_index][1].forEach(() => {
                            let t = timings.shift()[1];
                            t.rts = parseInt(t.rts);
                            t.state = (t.state == "true")
                            channelTimings.push(t);
                        })

                        channelTimings.sort((t0, t1) => { return t0.rts - t1.rts });

                        schedule[channel_id.split(config.getEnv("redisKeySeparator"))[1]] = channelTimings;
                    });

                    resolve(schedule);
                })
                .catch((error) => { reject(error) });
        })

    }

    var loadFromJSON = function (inJson) {
        let schedule = inJson;

        for (let channelId in schedule) {
            if (schedule.hasOwnProperty(channelId)) {
                schedule[channelId].forEach((timing) => {
                    timing.rts = TimeUtil.timeString2rts(timing.rts);
                })
            }
        }
        return schedule;
    }

    var saveToRedis = function (schedule) {
        return new Promise((resolve, reject) => {
            let pipe = redisClient.getPipeline();
            let timingId = 0;
            clearRedis()
                .then(() => {
                    for (channelId in schedule) {
                        if (schedule.hasOwnProperty(channelId)) {
                            schedule[channelId].forEach((timing) => {
                                pipe.hmset(timingPrefix + timingId, timing);
                                pipe.sadd(channelPrefix + channelId, timingId);
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

    var onOverrideChanged = function () {
        initChannels()
    }

    var initChannels = function (schedule) {
        for (channelId in schedule) {
            if (schedule.hasOwnProperty(channelId)) {
                handleTimeout(schedule, channelId);
            }
        }
    }

    var handleTimeout = function (schedule, channelId) {
        setChannelTimeOut(channelId, getNextTimeout(schedule, channelId));
        updateChannelState(schedule, channelId);
    }

    var setChannelTimeOut = function (channelId, timeout) {
        if (_timeouts[channelId]) {
            clearTimeout(_timeouts[channelId]);
        }
        _timeouts[channelId] = setTimeout(handleTimeout, timeout * 1000, channelId);
    }

    var updateChannelState = function (schedule, channelId) {
        const state = overrideManager.isChannelOverriden(channelId)
            ? overrideManager.getChannelOverrideState(channelId) : getCurrentScheduleState(schedule, channelId);
        channelModel.set(channelId, state);
    }

    var getNextTiming = function (schedule, channelId) {
        const currentRTS = TimeUtil.getCurrentRTS();
        const timings = schedule[channelId];

        let lo = -1;
        let hi = -1;
        let i = 0;

        while (i < timings.length && (lo == -1 || hi == -1)) {
            if (timings[i].rts < currentRTS && lo == -1) {
                lo = i;
            } else if (timings[i].rts > currentRTS + 1 && hi == -1) {
                hi = i;
            }
            i++;
        }

        if (hi != -1) {
            return timings[hi];
        }

        if (lo != -1) {
            return timings[lo];
        }

        return timings[0];
    }

    var getNextTimeout = function (schedule, channelId) {
        const currentRTS = TimeUtil.getCurrentRTS();
        const nextRts = getNextTiming(schedule, channelId).rts;

        if (nextRts >= currentRTS) {
            return (nextRts - currentRTS);
        } else {
            return TimeUtil.secondsInADay - currentRTS + nextRts;
        }
    }

    var getCurrentScheduleState = function (schedule, channelId) {
        const currentRTS = TimeUtil.getCurrentRTS();
        const timings = schedule[channelId];

        let lo = -1;
        let hi = -1;
        let i = 0;
        while (i < timings.length && (lo == -1 || hi == -1)) {
            if (timings[i].rts <= currentRTS) {
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
        update: update,
        get: get,

        _getNextTiming: getNextTiming,
        _getCurrentScheduleState: getCurrentScheduleState,
    }
}