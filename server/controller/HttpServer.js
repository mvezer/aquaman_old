const Hapi = require("hapi");
const ConfigUtil = require("../util/ConfigUtil");


module.exports = function (config) {
    var config = config;

    console.log(config);
    var server;

    var connect = function () {
        server = new Hapi.Server();
        server.connection({ host: config.httpHost, port: config.httpPort });
        //this.config.httpServerPlugins.forEach((plugin) => { this.server.register(plugin) }, this);
        return this;
    }

    var addRoute = function (router, parameters) {
        const routerInstance = new router(parameters);

        //console.log(routerInstance.handler(null,null));

        server.route(routerInstance.getRouter());

        return this;
    }

    var start = function () {
        return server.start();
        //console.log("HTTP server started on port ", this.config.httpPort);
    }

    var getUrl = function () {
        return ConfigUtil.createUrl({ host: this.config.httpHost, port: this.config.httpPort, protocol: "http" });
    }

    return {
        config: config,
        connect: connect,
        addRoute: addRoute,
        start: start,
        getUrl: getUrl
    }

};