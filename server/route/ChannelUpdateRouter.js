const AChannelRouter = require("./AChannelRouter");

module.exports = function (channelModel) {
    var channelUpdateRouter = {};
    channelUpdateRouter.__proto__ = AChannelRouter(channelModel);

    var handler = function (request, reply) {
        channelUpdateRouter.__proto__.handler(request, reply, require("../schema/ChannelUpdateSchema"));
    }

    channelUpdateRouter.getRouter = function () {
        return {
            method: "PUT",
            path: "/channel",
            handler: handler
        }
    }

    return channelUpdateRouter;
}