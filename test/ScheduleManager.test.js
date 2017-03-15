const expect = require("chai").expect;
const sinon = require("sinon");
const ScheduleManager = require("../server/controller/ScheduleManager");

let TimeUtil;
let config, redisClient, channelModel, overrideManager;

const timings_A =
    [{ rts: 10 * 3600, state: true },
    { rts: 11 * 3600, state: false },
    { rts: 13 * 3600, state: true },
    { rts: 17 * 3600, state: false }];

describe("ScheduleManager", () => {
    beforeEach(() => {
        config = sinon.stub();
        /*
        const timingPrefix = config.getEnv("redisTimingPrefix") + config.getEnv("redisKeySeparator");
    const channelPrefix = config.getEnv("redisChannelSchedulePrefix") + config.getEnv("redisKeySeparator");*/
        config.getEnv = sinon.stub();

        config.getEnv.withArgs("redisTimingPrefix").returns("timing");
        config.getEnv.withArgs("redisKeySeparator").returns(":");
        config.getEnv.withArgs("redisChannelSchedulePrefix").returns("channel_schedule");

        TimeUtil = sinon.stub();
        TimeUtil.getCurrentRTS = sinon.stub.returns(12 * 3600); // 12pm

        scheduleManager = new ScheduleManager(config, redisClient, channelModel, overrideManager);
    });
    it("getNextTiming() should return the next upcoming timing object", (done) => {
        expect(scheduleManager._getNextTiming(timings_A)).to.deep.equal({ rts: 13 * 3600, state: true });
        done();
    });
});