const ValidationUtil = require("../util/ValidationUtil");
const schema = require("../schema/StatusPatchSchema");

module.exports = function (statusModel) {
    var statusModel = statusModel;

    var handler = function (request, reply) {
        ValidationUtil.validate(request.payload, schema)
            .then((payload) => { patchStatus(payload) })
            .then((values) => { reply(JSON.stringify({ status: "ok" })).code(200) })
            .catch((error) => { console.log(error); reply(JSON.stringify({ status: "error", message: error.message })).code(200); })
    }

    var patchStatus = function (status) {
        let promises = [];
        for (let key in status) {
            promises.push(statusModel.set(key, status[key]));
        }

        return Promise.all(promises);

    }

    var getRouter = function () {
        return {
            method: "PATCH",
            path: "/status",
            handler: handler
        }
    }



    return {
        getRouter: getRouter,
        handler: handler
    }
}