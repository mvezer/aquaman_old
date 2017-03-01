module.exports = function (scheduleManager) {
    var scheduleManager = scheduleManager;

    var handler = function (request, reply) {
        scheduleManager.update(request.payload)
            .then(() => { reply(JSON.stringify({ "status": "ok" })).code(200) })
            .catch((error) => { reply(JSON.stringify({ "status": "error", "message": e })).code(200) });

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