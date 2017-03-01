module.exports = {
    secondsInADay: 24 * 60 * 60,

    timeString2rts: function (timestr) {
        const timeArr = String(timestr).split(":");
        return Number.parseInt(timeArr[0]) * 3600 + Number.parseInt(timeArr[1]) * 60;
    },

    getCurrentTS: function () {
        return Math.floor(new Date().getTime() / 1000);
    },

    getCurrentRTS: function () {
        return this.getCurrentTS() % this.secondsInADay;
    }

}