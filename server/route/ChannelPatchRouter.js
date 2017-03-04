const AChannelRouter = require("./AChannelRouter");

module.exports = function (channelModel) {
    var channelPatchRouter = {};
    channelPatchRouter.__proto__ = AChannelRouter(channelModel);

    var handler = function (request, reply) {
        channelPatchRouter.__proto__.handler(request, reply, require("../schema/ChannelPatchSchema"));
    }

    channelPatchRouter.getRouter = function () {
        return {
            method: "PATCH",
            path: "/channel",
            handler: handler
        }
    }

    return channelPatchRouter;
}