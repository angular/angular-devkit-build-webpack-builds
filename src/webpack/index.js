"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
exports.defaultLoggingCb = (stats, config, logger) => logger.info(stats.toString(config.stats));
class WebpackBuilder {
    constructor(context) {
        this.context = context;
    }
    run(builderConfig) {
        const configPath = core_1.resolve(this.context.workspace.root, core_1.normalize(builderConfig.options.webpackConfig));
        return this.loadWebpackConfig(core_1.getSystemPath(configPath)).pipe(operators_1.concatMap(config => this.runWebpack(config)));
    }
    loadWebpackConfig(webpackConfigPath) {
        return rxjs_1.from(Promise.resolve().then(() => require(webpackConfigPath)));
    }
    createWebpackCompiler(config) {
        return webpack(config);
    }
    runWebpack(config, loggingCb = exports.defaultLoggingCb) {
        return new rxjs_1.Observable(obs => {
            const webpackCompiler = this.createWebpackCompiler(config);
            const callback = (err, stats) => {
                if (err) {
                    return obs.error(err);
                }
                // Log stats.
                loggingCb(stats, config, this.context.logger);
                obs.next({ success: !stats.hasErrors() });
                if (!config.watch) {
                    obs.complete();
                }
            };
            try {
                if (config.watch) {
                    const watchOptions = config.watchOptions || {};
                    const watching = webpackCompiler.watch(watchOptions, callback);
                    // Teardown logic. Close the watcher when unsubscribed from.
                    return () => watching.close(() => { });
                }
                else {
                    webpackCompiler.run(callback);
                }
            }
            catch (err) {
                if (err) {
                    this.context.logger.error('\nAn error occured during the build:\n' + ((err && err.stack) || err));
                }
                throw err;
            }
        });
    }
}
exports.WebpackBuilder = WebpackBuilder;
exports.default = WebpackBuilder;
