const AStatusRouter = require("./AStatusRouter");

module.exports = function (statusModel) {
    var statusPatchRouter = {};
    statusPatchRouter.__proto__ = AStatusRouter(statusModel);

    var handler = function (request, reply) {
        statusPatchRouter.__proto__.handler(request, reply, require("../schema/StatusUpdateSchema"));
    }

    statusPatchRouter.getRouter = function () {
        return {
            method: "POST",
            path: "/override_activate/:id",
            handler: handler
        }
    }

    return statusPatchRouter;
}