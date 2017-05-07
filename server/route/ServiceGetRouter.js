module.exports = function (serviceManager) {
    var serviceManager = serviceManager;

    var handler = function (request, reply) {
        return reply(JSON.stringify(serviceManager.getServices())).code(200);
    }

    var getRouter = function () {
        return {
            method: "GET",
            path: "/service",
            handler: handler
        }
    }

    return {
        handler: handler,
        getRouter: getRouter
    }

}
