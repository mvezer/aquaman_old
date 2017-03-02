module.exports = {
    obj2array: function (obj) {
        return Object.keys(obj).map(function (key) { return obj[key]; });
    },

    isArray: function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }
}