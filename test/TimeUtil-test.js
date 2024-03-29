const expect = require("chai").expect;
const sinon = require("sinon");
const TimeUtil = require("../server/util/TimeUtil");

describe("TimeUtil", () => {
    it("timeString2rts should return properly calculated relative timestamps", (done) => {
        expect(TimeUtil.timeString2rts("0:00")).to.equal(0);
        expect(TimeUtil.timeString2rts("1:00")).to.equal(3600);
        expect(TimeUtil.timeString2rts("1:01")).to.equal(3660);
        expect(TimeUtil.timeString2rts("1:10")).to.equal(4200);
        expect(TimeUtil.timeString2rts("10:00")).to.equal(36000);
        done();
    });
});