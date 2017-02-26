module.exports = function (config, redisService, rpiService) {
    var status = { filter: false, light: true, co2: true };
    var redisService = redisService;
    var rpiService = rpiService;


    var get = function (key) {
        return this.status[key];
    }

    var set = function (key, value) {
        if (this.status[key] != value) {
            this.status[key] = value;

            this.redisService.apply
        }
    }

    var getStatus = function () {
        return status;
    }

    return {
        get: get,
        set: set,
        getStatus: getStatus
    }
}