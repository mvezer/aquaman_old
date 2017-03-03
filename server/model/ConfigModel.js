const ConfigUtil = require("../util/ConfigUtil");
const Util = require("../util/Util");
const NConf = require("nconf");

module.exports = function (configFileName) {
    if (!configFileName) {
        return
    }

    var configFileName = configFileName;

    NConf.argv()
        .env()
        .file({ file: configFileName });

    var get = function (key) {
        return NConf.get(key);
    }

    var getEnv = function (varName) {
        return NConf.get(ConfigUtil.getEnvFormattedName(varName));
    }

    var fill = function (source) {
        let obj = {};

        if (Util.isArray(source)) {
            source.forEach((property) => { obj[property] = this.getEnv(property) });
        } else {
            for (property in obj) {
                if (obj.hasOwnProperty(property)) {
                    obj[property] = this.getEnv(property);
                }
            }
        }

        return obj;
    }

    return {
        get: get,
        getEnv: getEnv,
        fill: fill
    }
}