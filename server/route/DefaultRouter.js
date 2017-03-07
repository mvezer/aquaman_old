module.exports = function () {
    var handler = function (request, reply) {
        reply("Aquaman front-end will be found here soon").code(200);
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