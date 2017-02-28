module.exports = function (scheduleManager) {
    var scheduleManager = scheduleManager;

    var handler = function (request, reply) {
        scheduleManager.update(request.payload);
        reply(JSON.stringify({ "status": "ok" })).code(200);
    }

    var getRouter = function () {
        return {
            method: "PUT",
            path: "/schedule",
            handler: handler
        }
    }

    return {
        getRouter: getRouter,
        handler: handler
    }
}