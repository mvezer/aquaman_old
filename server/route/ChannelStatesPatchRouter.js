const AStatusRouter = require("./AStatusRouter");

module.exports = function (statusModel) {
    var statusPatchRouter = {};
    statusPatchRouter.__proto__ = AStatusRouter(statusModel);

    var handler = function (request, reply) {
        statusPatchRouter.__proto__.handler(request, reply, require("../schema/StatusPatchSchema"));
    }

    statusPatchRouter.getRouter = function () {
        return {
            method: "PATCH",
            path: "/status",
            handler: handler
        }
    }

    return statusPatchRouter;
}