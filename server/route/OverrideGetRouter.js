module.exports = function (overrideManager) {
    var overrideManager = overrideManager;

    var handler = function (request, reply) {
        return reply(JSON.stringify(overrideManager.getOverrides())).code(200);
    }

    var getRouter = function () {
        return {
            method: "GET",
            path: "/override",
            handler: handler
        }
    }

    return {
        handler: handler,
        getRouter: getRouter
    }

}
