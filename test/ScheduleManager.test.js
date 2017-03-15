const expect = require("chai").expect;
const sinon = require("sinon");
const ScheduleManager = require("../server/controller/ScheduleManager");
const TimeUtil = require("../server/util/TimeUtil");

let timeUtilMock;
let config, redisClient, channelModel, overrideManager;

const timings_A =
    [{ rts: 10 * 3600, state: true },
    { rts: 11 * 3600, state: false },
    { rts: 13 * 3600, state: true },
    { rts: 17 * 3600, state: false }];

describe("ScheduleManager", () => {
    beforeEach(() => {
        config = sinon.stub();

        config.getEnv = sinon.stub();
        config.getEnv.withArgs("redisTimingPrefix").returns("timing");
        config.getEnv.withArgs("redisKeySeparator").returns(":");
        config.getEnv.withArgs("redisChannelSchedulePrefix").returns("channel_schedule");

        scheduleManager = new ScheduleManager(config, redisClient, channelModel, overrideManager);
        
        
    });
    it("getNextTiming() should return the next upcoming timing object", (done) => {
        timeUtilMock = sinon.mock(TimeUtil);
        timeUtilMock.expects("getCurrentRTS").returns(12*3600);
        expect(scheduleManager._getNextTiming(timings_A)).to.deep.equal({ rts: 13 * 3600, state: true });

        timeUtilMock.expects("getCurrentRTS").returns(0);
        expect(scheduleManager._getNextTiming(timings_A)).to.deep.equal({ rts: 10 * 3600, state: true });

        timeUtilMock.expects("getCurrentRTS").returns(18*3600);
        expect(scheduleManager._getNextTiming(timings_A)).to.deep.equal({ rts: 10 * 3600, state: true });

        timeUtilMock.restore();
        done();
    });

    it("getCurrentState() should return the current state by schedule", (done) => {
        timeUtilMock = sinon.mock(TimeUtil);
        timeUtilMock.expects("getCurrentRTS").returns(13*3600);
        expect(scheduleManager._getCurrentState(timings_A)).to.be.true;

        timeUtilMock.expects("getCurrentRTS").returns(0);
        expect(scheduleManager._getCurrentState(timings_A)).to.be.false;

        timeUtilMock.expects("getCurrentRTS").returns(18*3600);
        expect(scheduleManager._getCurrentState(timings_A)).to.be.false;

        timeUtilMock.restore();
        
        done();
    });
});