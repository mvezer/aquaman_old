module.exports = function () {
    var handler = function (request, reply) {
        reply(message).code(200);
    }

    var getRouter = function() {
        return {
            method: "GET",
            path: "/",
            handler: handler
        }
    }

    return {
        getRouter: getRouter,
        handler: handler
    }
}