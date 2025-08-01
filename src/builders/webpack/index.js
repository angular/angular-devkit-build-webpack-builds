"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWebpack = runWebpack;
const architect_1 = require("@angular-devkit/architect");
const node_assert_1 = __importDefault(require("node:assert"));
const node_path_1 = require("node:path");
const rxjs_1 = require("rxjs");
const webpack_1 = __importDefault(require("webpack"));
const utils_1 = require("../../utils");
function runWebpack(config, context, options = {}) {
    const { logging: log = (stats, config) => {
        if (config.stats !== false) {
            const statsOptions = config.stats === true ? undefined : config.stats;
            context.logger.info(stats.toString(statsOptions));
        }
    }, shouldProvideStats = true, } = options;
    const createWebpack = (c) => {
        if (options.webpackFactory) {
            const result = options.webpackFactory(c);
            if ((0, rxjs_1.isObservable)(result)) {
                return result;
            }
            else {
                return (0, rxjs_1.of)(result);
            }
        }
        else {
            return (0, rxjs_1.of)((0, webpack_1.default)(c));
        }
    };
    return createWebpack({ ...config, watch: false }).pipe((0, rxjs_1.switchMap)((webpackCompiler) => new rxjs_1.Observable((obs) => {
        (0, node_assert_1.default)(webpackCompiler, 'Webpack compiler factory did not return a compiler instance.');
        const callback = (err, stats) => {
            if (err) {
                return obs.error(err);
            }
            if (!stats) {
                return;
            }
            // Log stats.
            log(stats, config);
            const statsOptions = typeof config.stats === 'boolean' ? undefined : config.stats;
            const result = {
                success: !stats.hasErrors(),
                webpackStats: shouldProvideStats ? stats.toJson(statsOptions) : undefined,
                emittedFiles: (0, utils_1.getEmittedFiles)(stats.compilation),
                outputPath: stats.compilation.outputOptions.path,
            };
            if (config.watch) {
                obs.next(result);
            }
            else {
                webpackCompiler.close(() => {
                    obs.next(result);
                    obs.complete();
                });
            }
        };
        try {
            if (config.watch) {
                const watchOptions = config.watchOptions || {};
                const watching = webpackCompiler.watch(watchOptions, callback);
                // Teardown logic. Close the watcher when unsubscribed from.
                return () => {
                    watching.close(() => { });
                    webpackCompiler.close(() => { });
                };
            }
            else {
                webpackCompiler.run(callback);
            }
        }
        catch (err) {
            if (err) {
                context.logger.error(`\nAn error occurred during the build:\n${err instanceof Error ? err.stack : err}`);
            }
            throw err;
        }
    })));
}
const builder = (0, architect_1.createBuilder)((options, context) => {
    const configPath = (0, node_path_1.resolve)(context.workspaceRoot, options.webpackConfig);
    return (0, rxjs_1.from)((0, utils_1.getWebpackConfig)(configPath)).pipe((0, rxjs_1.switchMap)((config) => runWebpack(config, context)));
});
exports.default = builder;
