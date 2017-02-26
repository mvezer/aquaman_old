module.exports = function (message) {
    var message = message;
    var method = "GET";
    var path = "/"

    var handler = function (request, reply) {
        reply(message).code(200);
    }

    var getRouter = function() {
        return {
            method: method,
            path: path,
            handler: handler
        }
    }

    return {
        getRouter: getRouter,
        handler: handler
    }
}