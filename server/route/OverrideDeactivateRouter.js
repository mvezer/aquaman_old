module.exports = function (overrideManager) {
    var overrideManager = overrideManager;
    var handler = function (request, reply) {
        overrideManager.deactivateOverride(request.params.override_id);
        reply(JSON.stringify({ status: "ok" })).code(200);
    }

    var getRouter = function () {
        return {
            method: "POST",
            path: "/override/deactivate/{override_id}",
            handler: handler
        }
    }

    return {
        getRouter: getRouter,
        handler: handler
    }
}