module.exports = function (overrideManager) {
    var overrideManager = overrideManager;
    var handler = function (request, reply) {
        overrideManager.update(request.payload)
            .then((values) => { reply(JSON.stringify({ status: "ok" })).code(200) })
            .catch((error) => { console.log(error); reply(JSON.stringify({ status: "error", message: error.message })).code(200) })
    }

    var getRouter = function () {
        return {
            method: "PUT",
            path: "/override/update",
            handler: handler
        }
    }

    return {
        getRouter: getRouter,
        handler: handler
    }
}