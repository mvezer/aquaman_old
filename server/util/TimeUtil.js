module.exports = {
    secondsInADay: 24 * 60 * 60,

    timeString2rts: function (timestr) {
        const timeArr = String(timestr).split(":");
        return Number.parseInt(timeArr[0]) * 3600 + Number.parseInt(timeArr[1]) * 60;
    },

    getCurrentTS: function () { // non UTC!
        const date = new Date();
        return Math.floor(date.getTime() / 1000) - date.getTimezoneOffset() * 60;
        
    },

    getCurrentRTS: function () {
        return this.getCurrentTS() % this.secondsInADay;
    },

    getDifference: function (rts) {
        const currentRTS = this.getCurrentRTS()
        return rts > currentRTS ? (rts - currentRTS) : (this.secondsInADay - currentRTS + rts);
    }

}