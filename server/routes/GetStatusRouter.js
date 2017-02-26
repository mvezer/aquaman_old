module.exports = function (statusModel) {
    var statusModel = statusModel;

    var handler = function (request, reply) {
        return reply(JSON.stringify(statusModel.getStatus())).code(200);
    }

    var getRouter = function () {
        return {
            method: "GET",
            path: "/status",
            handler: handler
        }
    }

    return {
        handler: handler,
        getRouter: getRouter
    }

}
