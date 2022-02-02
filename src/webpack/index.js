"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
    return (0, rxjs_1.from)((0, utils_1.getWebpackConfig)(configPath)).pipe((0, operators_1.switchMap)((config) => runWebpack(config, context)));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy93ZWJwYWNrL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILHlEQUF5RjtBQUN6RiwrQkFBOEM7QUFDOUMsK0JBQTBEO0FBQzFELDhDQUEyQztBQUMzQyxzREFBOEI7QUFDOUIsb0NBQTJFO0FBa0IzRSxTQUFnQixVQUFVLENBQ3hCLE1BQTZCLEVBQzdCLE9BQXVCLEVBQ3ZCLFVBSUksRUFBRTtJQUVOLE1BQU0sRUFDSixPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDbkYsa0JBQWtCLEdBQUcsSUFBSSxHQUMxQixHQUFHLE9BQU8sQ0FBQztJQUNaLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBd0IsRUFBRSxFQUFFO1FBQ2pELElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRTtZQUMxQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLElBQUksSUFBQSxtQkFBWSxFQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN4QixPQUFPLE1BQU0sQ0FBQzthQUNmO2lCQUFNO2dCQUNMLE9BQU8sSUFBQSxTQUFFLEVBQUMsTUFBTSxDQUFDLENBQUM7YUFDbkI7U0FDRjthQUFNO1lBQ0wsT0FBTyxJQUFBLFNBQUUsRUFBQyxJQUFBLGlCQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN2QjtJQUNILENBQUMsQ0FBQztJQUVGLE9BQU8sYUFBYSxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsS0FBSyxF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RUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FDbkQsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBCdWlsZGVyT3V0cHV0LCBjcmVhdGVCdWlsZGVyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyByZXNvbHZlIGFzIHBhdGhSZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBmcm9tLCBpc09ic2VydmFibGUsIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IEVtaXR0ZWRGaWxlcywgZ2V0RW1pdHRlZEZpbGVzLCBnZXRXZWJwYWNrQ29uZmlnIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFJlYWxXZWJwYWNrQnVpbGRlclNjaGVtYSB9IGZyb20gJy4vc2NoZW1hJztcblxuZXhwb3J0IHR5cGUgV2VicGFja0J1aWxkZXJTY2hlbWEgPSBSZWFsV2VicGFja0J1aWxkZXJTY2hlbWE7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2VicGFja0xvZ2dpbmdDYWxsYmFjayB7XG4gIChzdGF0czogd2VicGFjay5TdGF0cywgY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pOiB2b2lkO1xufVxuZXhwb3J0IGludGVyZmFjZSBXZWJwYWNrRmFjdG9yeSB7XG4gIChjb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbik6IE9ic2VydmFibGU8d2VicGFjay5Db21waWxlcj4gfCB3ZWJwYWNrLkNvbXBpbGVyO1xufVxuXG5leHBvcnQgdHlwZSBCdWlsZFJlc3VsdCA9IEJ1aWxkZXJPdXRwdXQgJiB7XG4gIGVtaXR0ZWRGaWxlcz86IEVtaXR0ZWRGaWxlc1tdO1xuICB3ZWJwYWNrU3RhdHM/OiB3ZWJwYWNrLlN0YXRzQ29tcGlsYXRpb247XG4gIG91dHB1dFBhdGg6IHN0cmluZztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5XZWJwYWNrKFxuICBjb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbixcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIG9wdGlvbnM6IHtcbiAgICBsb2dnaW5nPzogV2VicGFja0xvZ2dpbmdDYWxsYmFjaztcbiAgICB3ZWJwYWNrRmFjdG9yeT86IFdlYnBhY2tGYWN0b3J5O1xuICAgIHNob3VsZFByb3ZpZGVTdGF0cz86IGJvb2xlYW47XG4gIH0gPSB7fSxcbik6IE9ic2VydmFibGU8QnVpbGRSZXN1bHQ+IHtcbiAgY29uc3Qge1xuICAgIGxvZ2dpbmc6IGxvZyA9IChzdGF0cywgY29uZmlnKSA9PiBjb250ZXh0LmxvZ2dlci5pbmZvKHN0YXRzLnRvU3RyaW5nKGNvbmZpZy5zdGF0cykpLFxuICAgIHNob3VsZFByb3ZpZGVTdGF0cyA9IHRydWUsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBjcmVhdGVXZWJwYWNrID0gKGM6IHdlYnBhY2suQ29uZmlndXJhdGlvbikgPT4ge1xuICAgIGlmIChvcHRpb25zLndlYnBhY2tGYWN0b3J5KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBvcHRpb25zLndlYnBhY2tGYWN0b3J5KGMpO1xuICAgICAgaWYgKGlzT2JzZXJ2YWJsZShyZXN1bHQpKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2YocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9mKHdlYnBhY2soYykpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gY3JlYXRlV2VicGFjayh7IC4uLmNvbmZpZywgd2F0Y2g6IGZhbHNlIH0pLnBpcGUoXG4gICAgc3dpdGNoTWFwKFxuICAgICAgKHdlYnBhY2tDb21waWxlcikgPT5cbiAgICAgICAgbmV3IE9ic2VydmFibGU8QnVpbGRSZXN1bHQ+KChvYnMpID0+IHtcbiAgICAgICAgICBjb25zdCBjYWxsYmFjayA9IChlcnI/OiBFcnJvciB8IG51bGwsIHN0YXRzPzogd2VicGFjay5TdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghc3RhdHMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBMb2cgc3RhdHMuXG4gICAgICAgICAgICBsb2coc3RhdHMsIGNvbmZpZyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRzT3B0aW9ucyA9IHR5cGVvZiBjb25maWcuc3RhdHMgPT09ICdib29sZWFuJyA/IHVuZGVmaW5lZCA6IGNvbmZpZy5zdGF0cztcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgc3VjY2VzczogIXN0YXRzLmhhc0Vycm9ycygpLFxuICAgICAgICAgICAgICB3ZWJwYWNrU3RhdHM6IHNob3VsZFByb3ZpZGVTdGF0cyA/IHN0YXRzLnRvSnNvbihzdGF0c09wdGlvbnMpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICBlbWl0dGVkRmlsZXM6IGdldEVtaXR0ZWRGaWxlcyhzdGF0cy5jb21waWxhdGlvbiksXG4gICAgICAgICAgICAgIG91dHB1dFBhdGg6IHN0YXRzLmNvbXBpbGF0aW9uLm91dHB1dE9wdGlvbnMucGF0aCxcbiAgICAgICAgICAgIH0gYXMgdW5rbm93biBhcyBCdWlsZFJlc3VsdDtcblxuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXRjaCkge1xuICAgICAgICAgICAgICBvYnMubmV4dChyZXN1bHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgd2VicGFja0NvbXBpbGVyLmNsb3NlKCgpID0+IHtcbiAgICAgICAgICAgICAgICBvYnMubmV4dChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChjb25maWcud2F0Y2gpIHtcbiAgICAgICAgICAgICAgY29uc3Qgd2F0Y2hPcHRpb25zID0gY29uZmlnLndhdGNoT3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgICAgY29uc3Qgd2F0Y2hpbmcgPSB3ZWJwYWNrQ29tcGlsZXIud2F0Y2god2F0Y2hPcHRpb25zLCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgICAgLy8gVGVhcmRvd24gbG9naWMuIENsb3NlIHRoZSB3YXRjaGVyIHdoZW4gdW5zdWJzY3JpYmVkIGZyb20uXG4gICAgICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgd2F0Y2hpbmcuY2xvc2UoKCkgPT4ge30pO1xuICAgICAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5jbG9zZSgoKSA9PiB7fSk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB3ZWJwYWNrQ29tcGlsZXIucnVuKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYFxcbkFuIGVycm9yIG9jY3VycmVkIGR1cmluZyB0aGUgYnVpbGQ6XFxuJHsoZXJyICYmIGVyci5zdGFjaykgfHwgZXJyfWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICApLFxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPFdlYnBhY2tCdWlsZGVyU2NoZW1hPigob3B0aW9ucywgY29udGV4dCkgPT4ge1xuICBjb25zdCBjb25maWdQYXRoID0gcGF0aFJlc29sdmUoY29udGV4dC53b3Jrc3BhY2VSb290LCBvcHRpb25zLndlYnBhY2tDb25maWcpO1xuXG4gIHJldHVybiBmcm9tKGdldFdlYnBhY2tDb25maWcoY29uZmlnUGF0aCkpLnBpcGUoXG4gICAgc3dpdGNoTWFwKChjb25maWcpID0+IHJ1bldlYnBhY2soY29uZmlnLCBjb250ZXh0KSksXG4gICk7XG59KTtcbiJdfQ==