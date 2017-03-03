const AStatusRouter = require("./AStatusRouter");

module.exports = function (statusModel) {
    var statusPatchRouter = {};
    statusPatchRouter.__proto__ = AStatusRouter(statusModel);

    var handler = function (request, reply) {
        statusPatchRouter.__proto__.handler(request, reply, require("../schema/StatusUpdateSchema"));
    }

    statusPatchRouter.getRouter = function () {
        return {
            method: "PUT",
            path: "/status",
            handler: handler
        }
    }

    return statusPatchRouter;
}