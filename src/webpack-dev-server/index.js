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
exports.runWebpackDevServer = void 0;
const architect_1 = require("@angular-devkit/architect");
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const webpack_1 = __importDefault(require("webpack"));
const webpack_dev_server_1 = __importDefault(require("webpack-dev-server"));
const utils_1 = require("../utils");
function runWebpackDevServer(config, context, options = {}) {
    var _a;
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
    const createWebpackDevServer = (webpack, config) => {
        if (options.webpackDevServerFactory) {
            return new options.webpackDevServerFactory(config, webpack);
        }
        return new webpack_dev_server_1.default(config, webpack);
    };
    const log = options.logging || ((stats, config) => context.logger.info(stats.toString(config.stats)));
    const shouldProvideStats = (_a = options.shouldProvideStats) !== null && _a !== void 0 ? _a : true;
    return createWebpack({ ...config, watch: false }).pipe((0, rxjs_1.switchMap)((webpackCompiler) => new rxjs_1.Observable((obs) => {
        var _a;
        const devServerConfig = options.devServerConfig || config.devServer || {};
        (_a = devServerConfig.host) !== null && _a !== void 0 ? _a : (devServerConfig.host = 'localhost');
        let result;
        const statsOptions = typeof config.stats === 'boolean' ? undefined : config.stats;
        webpackCompiler.hooks.done.tap('build-webpack', (stats) => {
            // Log stats.
            log(stats, config);
            obs.next({
                ...result,
                webpackStats: shouldProvideStats ? stats.toJson(statsOptions) : undefined,
                emittedFiles: (0, utils_1.getEmittedFiles)(stats.compilation),
                success: !stats.hasErrors(),
                outputPath: stats.compilation.outputOptions.path,
            });
        });
        const devServer = createWebpackDevServer(webpackCompiler, devServerConfig);
        devServer.startCallback((err) => {
            var _a;
            if (err) {
                obs.error(err);
                return;
            }
            const address = (_a = devServer.server) === null || _a === void 0 ? void 0 : _a.address();
            if (!address) {
                obs.error(new Error(`Dev-server address info is not defined.`));
                return;
            }
            result = {
                success: true,
                port: typeof address === 'string' ? 0 : address.port,
                family: typeof address === 'string' ? '' : address.family,
                address: typeof address === 'string' ? address : address.address,
            };
        });
        // Teardown logic. Close the server when unsubscribed from.
        return () => {
            devServer.stopCallback(() => { });
            webpackCompiler.close(() => { });
        };
    })));
}
exports.runWebpackDevServer = runWebpackDevServer;
exports.default = (0, architect_1.createBuilder)((options, context) => {
    const configPath = (0, path_1.resolve)(context.workspaceRoot, options.webpackConfig);
    return (0, rxjs_1.from)((0, utils_1.getWebpackConfig)(configPath)).pipe((0, rxjs_1.switchMap)((config) => runWebpackDevServer(config, context)));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy93ZWJwYWNrLWRldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgseURBQTBFO0FBQzFFLCtCQUE4QztBQUM5QywrQkFBcUU7QUFDckUsc0RBQThCO0FBQzlCLDRFQUFrRDtBQUNsRCxvQ0FBNkQ7QUFZN0QsU0FBZ0IsbUJBQW1CLENBQ2pDLE1BQTZCLEVBQzdCLE9BQXVCLEVBQ3ZCLFVBTUksRUFBRTs7SUFFTixNQUFNLGFBQWEsR0FBRyxDQUFDLENBQXdCLEVBQUUsRUFBRTtRQUNqRCxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUU7WUFDMUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLElBQUEsbUJBQVksRUFBQyxNQUFNLENBQUMsRUFBRTtnQkFDeEIsT0FBTyxNQUFNLENBQUM7YUFDZjtpQkFBTTtnQkFDTCxPQUFPLElBQUEsU0FBRSxFQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ25CO1NBQ0Y7YUFBTTtZQUNMLE9BQU8sSUFBQSxTQUFFLEVBQUMsSUFBQSxpQkFBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDdkI7SUFDSCxDQUFDLENBQUM7SUFFRixNQUFNLHNCQUFzQixHQUFHLENBQzdCLE9BQWlELEVBQ2pELE1BQXNDLEVBQ3RDLEVBQUU7UUFDRixJQUFJLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRTtZQUNuQyxPQUFPLElBQUksT0FBTyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM3RDtRQUVELE9BQU8sSUFBSSw0QkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQyxD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QUU7WUFDVixTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0wsQ0FDRixDQUFDO0FBQ0osQ0FBQztBQTlGRCxrREE4RkM7QUFFRCxrQkFBZSxJQUFBLHlCQUFhLEVBQzFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25CLE1BQU0sVUFBVSxHQUFHLElBQUEsY0FBVyxFQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBRTdFLE9BQU8sSUFBQSxXQUFJLEVBQUMsSUFBQSx3QkFBZ0IsRUFBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDNUMsSUFBQSxnQkFBUyxFQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FDNUQsQ0FBQztBQUNKLENBQUMsQ0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBjcmVhdGVCdWlsZGVyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyByZXNvbHZlIGFzIHBhdGhSZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBmcm9tLCBpc09ic2VydmFibGUsIG9mLCBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzJztcbmltcG9ydCB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IFdlYnBhY2tEZXZTZXJ2ZXIgZnJvbSAnd2VicGFjay1kZXYtc2VydmVyJztcbmltcG9ydCB7IGdldEVtaXR0ZWRGaWxlcywgZ2V0V2VicGFja0NvbmZpZyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IEJ1aWxkUmVzdWx0LCBXZWJwYWNrRmFjdG9yeSwgV2VicGFja0xvZ2dpbmdDYWxsYmFjayB9IGZyb20gJy4uL3dlYnBhY2snO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFdlYnBhY2tEZXZTZXJ2ZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5leHBvcnQgdHlwZSBXZWJwYWNrRGV2U2VydmVyRmFjdG9yeSA9IHR5cGVvZiBXZWJwYWNrRGV2U2VydmVyO1xuXG5leHBvcnQgdHlwZSBEZXZTZXJ2ZXJCdWlsZE91dHB1dCA9IEJ1aWxkUmVzdWx0ICYge1xuICBwb3J0OiBudW1iZXI7XG4gIGZhbWlseTogc3RyaW5nO1xuICBhZGRyZXNzOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcnVuV2VicGFja0RldlNlcnZlcihcbiAgY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBvcHRpb25zOiB7XG4gICAgc2hvdWxkUHJvdmlkZVN0YXRzPzogYm9vbGVhbjtcbiAgICBkZXZTZXJ2ZXJDb25maWc/OiBXZWJwYWNrRGV2U2VydmVyLkNvbmZpZ3VyYXRpb247XG4gICAgbG9nZ2luZz86IFdlYnBhY2tMb2dnaW5nQ2FsbGJhY2s7XG4gICAgd2VicGFja0ZhY3Rvcnk/OiBXZWJwYWNrRmFjdG9yeTtcbiAgICB3ZWJwYWNrRGV2U2VydmVyRmFjdG9yeT86IFdlYnBhY2tEZXZTZXJ2ZXJGYWN0b3J5O1xuICB9ID0ge30sXG4pOiBPYnNlcnZhYmxlPERldlNlcnZlckJ1aWxkT3V0cHV0PiB7XG4gIGNvbnN0IGNyZWF0ZVdlYnBhY2sgPSAoYzogd2VicGFjay5Db25maWd1cmF0aW9uKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMud2VicGFja0ZhY3RvcnkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG9wdGlvbnMud2VicGFja0ZhY3RvcnkoYyk7XG4gICAgICBpZiAoaXNPYnNlcnZhYmxlKHJlc3VsdCkpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvZihyZXN1bHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb2Yod2VicGFjayhjKSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZVdlYnBhY2tEZXZTZXJ2ZXIgPSAoXG4gICAgd2VicGFjazogd2VicGFjay5Db21waWxlciB8IHdlYnBhY2suTXVsdGlDb21waWxlcixcbiAgICBjb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXIuQ29uZmlndXJhdGlvbixcbiAgKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMud2VicGFja0RldlNlcnZlckZhY3RvcnkpIHtcbiAgICAgIHJldHVybiBuZXcgb3B0aW9ucy53ZWJwYWNrRGV2U2VydmVyRmFjdG9yeShjb25maWcsIHdlYnBhY2spO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgV2VicGFja0RldlNlcnZlcihjb25maWcsIHdlYnBhY2spO1xuICB9O1xuXG4gIGNvbnN0IGxvZzogV2VicGFja0xvZ2dpbmdDYWxsYmFjayA9XG4gICAgb3B0aW9ucy5sb2dnaW5nIHx8ICgoc3RhdHMsIGNvbmZpZykgPT4gY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0cy50b1N0cmluZyhjb25maWcuc3RhdHMpKSk7XG5cbiAgY29uc3Qgc2hvdWxkUHJvdmlkZVN0YXRzID0gb3B0aW9ucy5zaG91bGRQcm92aWRlU3RhdHMgPz8gdHJ1ZTtcblxuICByZXR1cm4gY3JlYXRlV2VicGFjayh7IC4uLmNvbmZpZywgd2F0Y2g6IGZhbHNlIH0pLnBpcGUoXG4gICAgc3dpdGNoTWFwKFxuICAgICAgKHdlYnBhY2tDb21waWxlcikgPT5cbiAgICAgICAgbmV3IE9ic2VydmFibGU8RGV2U2VydmVyQnVpbGRPdXRwdXQ+KChvYnMpID0+IHtcbiAgICAgICAgICBjb25zdCBkZXZTZXJ2ZXJDb25maWcgPSBvcHRpb25zLmRldlNlcnZlckNvbmZpZyB8fCBjb25maWcuZGV2U2VydmVyIHx8IHt9O1xuICAgICAgICAgIGRldlNlcnZlckNvbmZpZy5ob3N0ID8/PSAnbG9jYWxob3N0JztcblxuICAgICAgICAgIGxldCByZXN1bHQ6IFBhcnRpYWw8RGV2U2VydmVyQnVpbGRPdXRwdXQ+O1xuXG4gICAgICAgICAgY29uc3Qgc3RhdHNPcHRpb25zID0gdHlwZW9mIGNvbmZpZy5zdGF0cyA9PT0gJ2Jvb2xlYW4nID8gdW5kZWZpbmVkIDogY29uZmlnLnN0YXRzO1xuXG4gICAgICAgICAgd2VicGFja0NvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdidWlsZC13ZWJwYWNrJywgKHN0YXRzKSA9PiB7XG4gICAgICAgICAgICAvLyBMb2cgc3RhdHMuXG4gICAgICAgICAgICBsb2coc3RhdHMsIGNvbmZpZyk7XG4gICAgICAgICAgICBvYnMubmV4dCh7XG4gICAgICAgICAgICAgIC4uLnJlc3VsdCxcbiAgICAgICAgICAgICAgd2VicGFja1N0YXRzOiBzaG91bGRQcm92aWRlU3RhdHMgPyBzdGF0cy50b0pzb24oc3RhdHNPcHRpb25zKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgZW1pdHRlZEZpbGVzOiBnZXRFbWl0dGVkRmlsZXMoc3RhdHMuY29tcGlsYXRpb24pLFxuICAgICAgICAgICAgICBzdWNjZXNzOiAhc3RhdHMuaGFzRXJyb3JzKCksXG4gICAgICAgICAgICAgIG91dHB1dFBhdGg6IHN0YXRzLmNvbXBpbGF0aW9uLm91dHB1dE9wdGlvbnMucGF0aCxcbiAgICAgICAgICAgIH0gYXMgdW5rbm93biBhcyBEZXZTZXJ2ZXJCdWlsZE91dHB1dCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zdCBkZXZTZXJ2ZXIgPSBjcmVhdGVXZWJwYWNrRGV2U2VydmVyKHdlYnBhY2tDb21waWxlciwgZGV2U2VydmVyQ29uZmlnKTtcbiAgICAgICAgICBkZXZTZXJ2ZXIuc3RhcnRDYWxsYmFjaygoZXJyKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIG9icy5lcnJvcihlcnIpO1xuXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYWRkcmVzcyA9IGRldlNlcnZlci5zZXJ2ZXI/LmFkZHJlc3MoKTtcbiAgICAgICAgICAgIGlmICghYWRkcmVzcykge1xuICAgICAgICAgICAgICBvYnMuZXJyb3IobmV3IEVycm9yKGBEZXYtc2VydmVyIGFkZHJlc3MgaW5mbyBpcyBub3QgZGVmaW5lZC5gKSk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgIHBvcnQ6IHR5cGVvZiBhZGRyZXNzID09PSAnc3RyaW5nJyA/IDAgOiBhZGRyZXNzLnBvcnQsXG4gICAgICAgICAgICAgIGZhbWlseTogdHlwZW9mIGFkZHJlc3MgPT09ICdzdHJpbmcnID8gJycgOiBhZGRyZXNzLmZhbWlseSxcbiAgICAgICAgICAgICAgYWRkcmVzczogdHlwZW9mIGFkZHJlc3MgPT09ICdzdHJpbmcnID8gYWRkcmVzcyA6IGFkZHJlc3MuYWRkcmVzcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBUZWFyZG93biBsb2dpYy4gQ2xvc2UgdGhlIHNlcnZlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBkZXZTZXJ2ZXIuc3RvcENhbGxiYWNrKCgpID0+IHt9KTtcbiAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5jbG9zZSgoKSA9PiB7fSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgKSxcbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxXZWJwYWNrRGV2U2VydmVyQnVpbGRlclNjaGVtYSwgRGV2U2VydmVyQnVpbGRPdXRwdXQ+KFxuICAob3B0aW9ucywgY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBwYXRoUmVzb2x2ZShjb250ZXh0LndvcmtzcGFjZVJvb3QsIG9wdGlvbnMud2VicGFja0NvbmZpZyk7XG5cbiAgICByZXR1cm4gZnJvbShnZXRXZWJwYWNrQ29uZmlnKGNvbmZpZ1BhdGgpKS5waXBlKFxuICAgICAgc3dpdGNoTWFwKChjb25maWcpID0+IHJ1bldlYnBhY2tEZXZTZXJ2ZXIoY29uZmlnLCBjb250ZXh0KSksXG4gICAgKTtcbiAgfSxcbik7XG4iXX0=