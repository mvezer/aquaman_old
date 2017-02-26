
module.exports = ConfigUtil = {};

ConfigUtil.getEnvFormattedName = function (varName) {
    return varName.split('').map((c, i, arr) => {
        if (i > 0) {
            const prevUpper = arr[i - 1].toUpperCase() == arr[i - 1];
            const currentUpper = arr[i].toUpperCase() == arr[i];
            if (!prevUpper && currentUpper) {
                return "_" + c.toUpperCase();
            }
            else {
                return c.toUpperCase();
            }
        } else {
            return c.toUpperCase();
        }
    }).join('');
}

ConfigUtil.createUrl = function (config) {

    let url = config.host;

    if (config.port) {
        url = url + ":" + config.port;
    }

    if (config.username) {
        if (config.password) {
            url = config.username + ":" + config.password + "@" + url;
        } else {
            url = config.username + "@" + url;
        }
    }

    if (config.protocol) {
        url = config.protocol + "://" + url;
    }

    return url;
}


