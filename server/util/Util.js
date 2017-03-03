module.exports = {
    obj2array: function (obj) {
        return Object.keys(obj).map(function (key) { return obj[key]; });
    },

    isArray: function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },

    isEmpty: function (obj) {
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        if (obj == null) return true;
        if (obj.length > 0) return false;
        if (obj.length === 0) return true;
        if (typeof obj !== "object") return true;
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) return false;
        }
        return true;
    }
}