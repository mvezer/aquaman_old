const ValidationUtil = require("../util/ValidationUtil");

module.exports = function (statusModel) {
    var statusModel = statusModel;
    //var schema = {};

    var handler = function (request, reply,schema) {
        ValidationUtil.validate(request.payload, schema)
            .then((payload) => { updateStatus(payload) })
            .then((values) => { reply(JSON.stringify({ status: "ok" })).code(200) })
            .catch((error) => { console.log(error); reply(JSON.stringify({ status: "error", message: error.message })).code(200); })
    }

    var updateStatus = function (status) {
        let promises = [];
        for (let key in status) {
            promises.push(statusModel.set(key, status[key]));
        }

        return Promise.all(promises);

    }

    var setSchema = function(newSchema) {
        schema = newSchema;
    }

    return {
        handler: handler
    }
}