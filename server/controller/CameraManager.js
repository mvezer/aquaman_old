const RaspiCam = require("raspicam");
const path = require("path");
const TimeUtil = require("../util/TimeUtil")
const Flickr = require("flickrapi");

module.exports = function (config) {
    var config = config;
    var _camera = {};
    var _photoFileName = "";
    var _photoTS = -1;
    var _flickrOptions = {
        api_key: config.getEnv("flickrApiKey"),
        secret: config.getEnv("flickrApiSecret"),
        user_id: config.getEnv("flickrUserId"),
        access_token: config.getEnv("flickrAccessToken"),
        access_token_secret: config.getEnv("flickrAccessTokenSecret"),
        nobrowser: true
    }

    var _state = "";

    var shoot = function () {
        if (!config.getEnv("rpiEnabled")) {
            return;
        }

        if (_state != "") {
            return;
        }

        _state = "shoot";

        _photoFileName = path.join(config.getEnv("photoPath"), getFileName());
        _photoTS = TimeUtil.getCurrentTS();
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
            upload();
        }
    }

    var upload = function () {
        if (_state == "upload") {
            return;
        }
        _state = "upload"
        Flickr.authenticate(_flickrOptions, function (error, flickr) {
            var uploadOptions = {
                photos: [{
                    title: "Aquaman shot",
                    tags: [
                        "aquaman",
                        "aquarium"
                    ],
                    photo: _photoFileName
                }]
            };

            Flickr.upload(uploadOptions, _flickrOptions, function (err, result) {
                if (err) {
                    return console.error(error);
                }
                console.log("photos uploaded", result);
                _photoFileName = "";
                _state = "";
            });
        });
    }

    var getFileName = function () {
        return "photo_" + TimeUtil.getCurrentRTS() + "." + config.getEnv("photoEncoding");
    }

    return {
        shoot: shoot
    }
}