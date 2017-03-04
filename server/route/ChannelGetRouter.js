module.exports = function (channelModel) {
    var channelModel = channelModel;

    var handler = function (request, reply) {
        return reply(JSON.stringify(channelModel.getStates())).code(200);
    }

    var getRouter = function () {
        return {
            method: "GET",
            path: "/channel",
            handler: handler
        }
    }

    return {
        handler: handler,
        getRouter: getRouter
    }

}
