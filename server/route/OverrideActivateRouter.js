module.exports = function (overrideManager) {
    var overrideManager = overrideManager;
    var handler = function (request, reply) {
        overrideManager.activateOverride(request.params.override_id);
        reply(JSON.stringify({ status: "ok" })).code(200);
    }

    var getRouter = function () {
        return {
            method: "POST",
            path: "/override_activate/{override_id}",
            handler: handler
        }
    }

    return {
        getRouter: getRouter,
        handler: handler
    }
}