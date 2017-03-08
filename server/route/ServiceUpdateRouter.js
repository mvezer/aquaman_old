module.exports = function (serviceManager) {
    var serviceManager = serviceManager;

    var handler = function (request, reply) {
        serviceManager.update(request.payload)
            .then(() => { reply(JSON.stringify({ "status": "ok" })).code(200) })
            .catch((error) => { reply(JSON.stringify({ "status": "error", "message": error.message })).code(200) });

    }

    var getRouter = function () {
        return {
            method: "PUT",
            path: "/service",
            handler: handler
        }
    }

    return {
        getRouter: getRouter,
        handler: handler
    }
}