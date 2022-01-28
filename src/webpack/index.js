"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWebpack = void 0;
const architect_1 = require("@angular-devkit/architect");
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack_1 = __importDefault(require("webpack"));
const utils_1 = require("../utils");
function runWebpack(config, context, options = {}) {
    const { logging: log = (stats, config) => context.logger.info(stats.toString(config.stats)), shouldProvideStats = true, } = options;
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
    return createWebpack({ ...config, watch: false }).pipe((0, operators_1.switchMap)((webpackCompiler) => new rxjs_1.Observable((obs) => {
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
                context.logger.error(`\nAn error occurred during the build:\n${(err && err.stack) || err}`);
            }
            throw err;
        }
    })));
}
exports.runWebpack = runWebpack;
exports.default = (0, architect_1.createBuilder)((options, context) => {
    const configPath = (0, path_1.resolve)(context.workspaceRoot, options.webpackConfig);
    return (0, rxjs_1.from)(Promise.resolve().then(() => __importStar(require(configPath)))).pipe((0, operators_1.switchMap)(({ default: config }) => runWebpack(config, context)));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy93ZWJwYWNrL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCx5REFBeUY7QUFDekYsK0JBQThDO0FBQzlDLCtCQUEwRDtBQUMxRCw4Q0FBMkM7QUFDM0Msc0RBQThCO0FBQzlCLG9DQUF5RDtBQWtCekQsU0FBZ0IsVUFBVSxDQUN4QixNQUE2QixFQUM3QixPQUF1QixFQUN2QixVQUlJLEVBQUU7SUFFTixNQUFNLEVBQ0osT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQ25GLGtCQUFrQixHQUFHLElBQUksR0FDMUIsR0FBRyxPQUFPLENBQUM7SUFDWixNQUFNLGFBQWEsR0FBRyxDQUFDLENBQXdCLEVBQUUsRUFBRTtRQUNqRCxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUU7WUFDMUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLElBQUEsbUJBQVksRUFBQyxNQUFNLENBQUMsRUFBRTtnQkFDeEIsT0FBTyxNQUFNLENBQUM7YUFDZjtpQkFBTTtnQkFDTCxPQUFPLElBQUEsU0FBRSxFQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ25CO1NBQ0Y7YUFBTTtZQUNMLE9BQU8sSUFBQSxTQUFFLEVBQUMsSUFBQSxpQkFBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDdkI7SUFDSCxDQUFDLENBQUM7SUFFRixPQUFPLGFBQWEsQ0FBQyxFQUFFLEdB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RSxNQUFNLEVBQXNDLEVBQUUsRUFBRSxDQUNwRSxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUM1QixDQUNGLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCwgQnVpbGRlck91dHB1dCwgY3JlYXRlQnVpbGRlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgcmVzb2x2ZSBhcyBwYXRoUmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgZnJvbSwgaXNPYnNlcnZhYmxlLCBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBFbWl0dGVkRmlsZXMsIGdldEVtaXR0ZWRGaWxlcyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBSZWFsV2VicGFja0J1aWxkZXJTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmV4cG9ydCB0eXBlIFdlYnBhY2tCdWlsZGVyU2NoZW1hID0gUmVhbFdlYnBhY2tCdWlsZGVyU2NoZW1hO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdlYnBhY2tMb2dnaW5nQ2FsbGJhY2sge1xuICAoc3RhdHM6IHdlYnBhY2suU3RhdHMsIGNvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uKTogdm9pZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV2VicGFja0ZhY3Rvcnkge1xuICAoY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pOiBPYnNlcnZhYmxlPHdlYnBhY2suQ29tcGlsZXI+IHwgd2VicGFjay5Db21waWxlcjtcbn1cblxuZXhwb3J0IHR5cGUgQnVpbGRSZXN1bHQgPSBCdWlsZGVyT3V0cHV0ICYge1xuICBlbWl0dGVkRmlsZXM/OiBFbWl0dGVkRmlsZXNbXTtcbiAgd2VicGFja1N0YXRzPzogd2VicGFjay5TdGF0c0NvbXBpbGF0aW9uO1xuICBvdXRwdXRQYXRoOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcnVuV2VicGFjayhcbiAgY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBvcHRpb25zOiB7XG4gICAgbG9nZ2luZz86IFdlYnBhY2tMb2dnaW5nQ2FsbGJhY2s7XG4gICAgd2VicGFja0ZhY3Rvcnk/OiBXZWJwYWNrRmFjdG9yeTtcbiAgICBzaG91bGRQcm92aWRlU3RhdHM/OiBib29sZWFuO1xuICB9ID0ge30sXG4pOiBPYnNlcnZhYmxlPEJ1aWxkUmVzdWx0PiB7XG4gIGNvbnN0IHtcbiAgICBsb2dnaW5nOiBsb2cgPSAoc3RhdHMsIGNvbmZpZykgPT4gY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0cy50b1N0cmluZyhjb25maWcuc3RhdHMpKSxcbiAgICBzaG91bGRQcm92aWRlU3RhdHMgPSB0cnVlLFxuICB9ID0gb3B0aW9ucztcbiAgY29uc3QgY3JlYXRlV2VicGFjayA9IChjOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pID0+IHtcbiAgICBpZiAob3B0aW9ucy53ZWJwYWNrRmFjdG9yeSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gb3B0aW9ucy53ZWJwYWNrRmFjdG9yeShjKTtcbiAgICAgIGlmIChpc09ic2VydmFibGUocmVzdWx0KSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9mKHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvZih3ZWJwYWNrKGMpKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGNyZWF0ZVdlYnBhY2soeyAuLi5jb25maWcsIHdhdGNoOiBmYWxzZSB9KS5waXBlKFxuICAgIHN3aXRjaE1hcChcbiAgICAgICh3ZWJwYWNrQ29tcGlsZXIpID0+XG4gICAgICAgIG5ldyBPYnNlcnZhYmxlPEJ1aWxkUmVzdWx0Pigob2JzKSA9PiB7XG4gICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAoZXJyPzogRXJyb3IsIHN0YXRzPzogd2VicGFjay5TdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghc3RhdHMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBMb2cgc3RhdHMuXG4gICAgICAgICAgICBsb2coc3RhdHMsIGNvbmZpZyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRzT3B0aW9ucyA9IHR5cGVvZiBjb25maWcuc3RhdHMgPT09ICdib29sZWFuJyA/IHVuZGVmaW5lZCA6IGNvbmZpZy5zdGF0cztcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgc3VjY2VzczogIXN0YXRzLmhhc0Vycm9ycygpLFxuICAgICAgICAgICAgICB3ZWJwYWNrU3RhdHM6IHNob3VsZFByb3ZpZGVTdGF0cyA/IHN0YXRzLnRvSnNvbihzdGF0c09wdGlvbnMpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICBlbWl0dGVkRmlsZXM6IGdldEVtaXR0ZWRGaWxlcyhzdGF0cy5jb21waWxhdGlvbiksXG4gICAgICAgICAgICAgIG91dHB1dFBhdGg6IHN0YXRzLmNvbXBpbGF0aW9uLm91dHB1dE9wdGlvbnMucGF0aCxcbiAgICAgICAgICAgIH0gYXMgdW5rbm93biBhcyBCdWlsZFJlc3VsdDtcblxuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXRjaCkge1xuICAgICAgICAgICAgICBvYnMubmV4dChyZXN1bHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgd2VicGFja0NvbXBpbGVyLmNsb3NlKCgpID0+IHtcbiAgICAgICAgICAgICAgICBvYnMubmV4dChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChjb25maWcud2F0Y2gpIHtcbiAgICAgICAgICAgICAgY29uc3Qgd2F0Y2hPcHRpb25zID0gY29uZmlnLndhdGNoT3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgICAgY29uc3Qgd2F0Y2hpbmcgPSB3ZWJwYWNrQ29tcGlsZXIud2F0Y2god2F0Y2hPcHRpb25zLCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgICAgLy8gVGVhcmRvd24gbG9naWMuIENsb3NlIHRoZSB3YXRjaGVyIHdoZW4gdW5zdWJzY3JpYmVkIGZyb20uXG4gICAgICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgd2F0Y2hpbmcuY2xvc2UoKCkgPT4ge30pO1xuICAgICAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5jbG9zZSgoKSA9PiB7fSk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB3ZWJwYWNrQ29tcGlsZXIucnVuKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFxcbkFuIGVycm9yIG9jY3VycmVkIGR1cmluZyB0aGUgYnVpbGQ6XFxuJHsoZXJyICYmIGVyci5zdGFjaykgfHwgZXJyfWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICApLFxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPFdlYnBhY2tCdWlsZGVyU2NoZW1hPigob3B0aW9ucywgY29udGV4dCkgPT4ge1xuICBjb25zdCBjb25maWdQYXRoID0gcGF0aFJlc29sdmUoY29udGV4dC53b3Jrc3BhY2VSb290LCBvcHRpb25zLndlYnBhY2tDb25maWcpO1xuXG4gIHJldHVybiBmcm9tKGltcG9ydChjb25maWdQYXRoKSkucGlwZShcbiAgICBzd2l0Y2hNYXAoKHsgZGVmYXVsdDogY29uZmlnIH06IHsgZGVmYXVsdDogd2VicGFjay5Db25maWd1cmF0aW9uIH0pID0+XG4gICAgICBydW5XZWJwYWNrKGNvbmZpZywgY29udGV4dCksXG4gICAgKSxcbiAgKTtcbn0pO1xuIl19