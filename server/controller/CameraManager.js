const RaspiCam = require("raspicam");
const path = require("path");
const TimeUtil = require("../util/TimeUtil")

module.exports = function (config) {
    var config = config;
    var _camera = {};
    var _photoFileName = "";

    var init = function () {
        _camera = new RaspiCam({});
    }

    var shoot = function () {
        if (!config.getEnv("rpiEnabled")) {
            console.log("SHoot!");
            return;
        }

        if (_photoFileName != "") {
            console.log("No shooting, photo currently being taken, decrease periodicity of your camera service");
            return;
        }

        _photoFileName = path.join(config.getEnv("photoPath"), getFileName());
        var camera = new RaspiCam({
            mode: "photo",
            output: _photoFileName,
            w: parseInt(config.getEnv("photoWidth")),
            h: parseInt(config.getEnv("photoHeight")),
            q: parseInt(config.getEnv("photoQuality")),
            e: config.getEnv("photoEncoding")
        })

        camera.start();
        camera.on("read", shootHandler);
    }

    var shootHandler = function (error, filename) {
        if (error) {
            console.log(error)
        } else if (filename) {
            console.log("Photo taken: ", _photoFileName);
            _photoFileName = "";
        }
    }

    var getFileName = function () {
        return "photo_" + TimeUtil.getCurrentRTS() + "." + config.getEnv("photoEncoding");
    }

    return {
        init: init,
        shoot: shoot
    }
}