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
exports.runWebpackDevServer = void 0;
const architect_1 = require("@angular-devkit/architect");
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack_1 = __importDefault(require("webpack"));
const webpack_dev_server_1 = __importDefault(require("webpack-dev-server"));
const utils_1 = require("../utils");
function runWebpackDevServer(config, context, options = {}) {
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
    return createWebpack({ ...config, watch: false }).pipe((0, operators_1.switchMap)((webpackCompiler) => new rxjs_1.Observable((obs) => {
        var _a;
        const devServerConfig = options.devServerConfig || config.devServer || {};
        (_a = devServerConfig.host) !== null && _a !== void 0 ? _a : (devServerConfig.host = 'localhost');
        let result;
        webpackCompiler.hooks.done.tap('build-webpack', (stats) => {
            // Log stats.
            log(stats, config);
            obs.next({
                ...result,
                emittedFiles: (0, utils_1.getEmittedFiles)(stats.compilation),
                success: !stats.hasErrors(),
                outputPath: stats.compilation.outputOptions.path,
            });
        });
        const devServer = createWebpackDevServer(webpackCompiler, devServerConfig);
        devServer.startCallback(() => {
            var _a;
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
    return (0, rxjs_1.from)(Promise.resolve().then(() => __importStar(require(configPath)))).pipe((0, operators_1.switchMap)(({ default: config }) => runWebpackDevServer(config, context)));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy93ZWJwYWNrLWRldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHlEQUEwRTtBQUMxRSwrQkFBOEM7QUFDOUMsK0JBQTBEO0FBQzFELDhDQUEyQztBQUMzQyxzREFBOEI7QUFDOUIsNEVBQWtEO0FBQ2xELG9DQUEyQztBQVkzQyxTQUFnQixtQkFBbUIsQ0FDakMsTUFBNkIsRUFDN0IsT0FBdUIsRUFDdkIsVUFLSSxFQUFFO0lBRU4sTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUF3QixFQUFFLEVBQUU7UUFDakQsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFO1lBQzFCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekMsSUFBSSxJQUFBLG1CQUFZLEVBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3hCLE9BQU8sTUFBTSxDQUFDO2FBQ2Y7aUJBQU07Z0JBQ0wsT0FBTyxJQUFBLFNBQUUsRUFBQyxNQUFNLENBQUMsQ0FBQzthQUNuQjtTQUNGO2FBQU07WUFDTCxPQUFPLElBQUEsU0FBRSxFQUFDLElBQUEsaUJBQU8sRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQyxDQUFDO0lBRUYsTUFBTSxzQkFBc0IsR0FBRyxDQUM3QixPQUFpRCxFQUNqRCxNQUFzQyxFQUN0QyxFQUFFO1FBQ0YsSUFBSSxPQUFPLENBQUMsdUJBQXVCLEVBQUU7WUFDbkMsT0FBTyxJQUFJLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDN0Q7UUFFRCxPQUFPLElBQUksNEJBQWdCLENBQUMsTUFBTSxF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Q0FBQyxDQUFDO0lBRTdFLE9BQU8sSUFBQSxXQUFJLG9EQUFRLFVBQVUsSUFBRSxDQUFDLElBQUksQ0FDbEMsSUFBQSxxQkFBUyxFQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFzQyxFQUFFLEVBQUUsQ0FDcEUsbUJBQW1CLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUNyQyxDQUNGLENBQUM7QUFDSixDQUFDLENBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCwgY3JlYXRlQnVpbGRlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgcmVzb2x2ZSBhcyBwYXRoUmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgZnJvbSwgaXNPYnNlcnZhYmxlLCBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgV2VicGFja0RldlNlcnZlciBmcm9tICd3ZWJwYWNrLWRldi1zZXJ2ZXInO1xuaW1wb3J0IHsgZ2V0RW1pdHRlZEZpbGVzIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgQnVpbGRSZXN1bHQsIFdlYnBhY2tGYWN0b3J5LCBXZWJwYWNrTG9nZ2luZ0NhbGxiYWNrIH0gZnJvbSAnLi4vd2VicGFjayc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgV2VicGFja0RldlNlcnZlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmV4cG9ydCB0eXBlIFdlYnBhY2tEZXZTZXJ2ZXJGYWN0b3J5ID0gdHlwZW9mIFdlYnBhY2tEZXZTZXJ2ZXI7XG5cbmV4cG9ydCB0eXBlIERldlNlcnZlckJ1aWxkT3V0cHV0ID0gQnVpbGRSZXN1bHQgJiB7XG4gIHBvcnQ6IG51bWJlcjtcbiAgZmFtaWx5OiBzdHJpbmc7XG4gIGFkZHJlc3M6IHN0cmluZztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5XZWJwYWNrRGV2U2VydmVyKFxuICBjb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbixcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIG9wdGlvbnM6IHtcbiAgICBkZXZTZXJ2ZXJDb25maWc/OiBXZWJwYWNrRGV2U2VydmVyLkNvbmZpZ3VyYXRpb247XG4gICAgbG9nZ2luZz86IFdlYnBhY2tMb2dnaW5nQ2FsbGJhY2s7XG4gICAgd2VicGFja0ZhY3Rvcnk/OiBXZWJwYWNrRmFjdG9yeTtcbiAgICB3ZWJwYWNrRGV2U2VydmVyRmFjdG9yeT86IFdlYnBhY2tEZXZTZXJ2ZXJGYWN0b3J5O1xuICB9ID0ge30sXG4pOiBPYnNlcnZhYmxlPERldlNlcnZlckJ1aWxkT3V0cHV0PiB7XG4gIGNvbnN0IGNyZWF0ZVdlYnBhY2sgPSAoYzogd2VicGFjay5Db25maWd1cmF0aW9uKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMud2VicGFja0ZhY3RvcnkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG9wdGlvbnMud2VicGFja0ZhY3RvcnkoYyk7XG4gICAgICBpZiAoaXNPYnNlcnZhYmxlKHJlc3VsdCkpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvZihyZXN1bHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb2Yod2VicGFjayhjKSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZVdlYnBhY2tEZXZTZXJ2ZXIgPSAoXG4gICAgd2VicGFjazogd2VicGFjay5Db21waWxlciB8IHdlYnBhY2suTXVsdGlDb21waWxlcixcbiAgICBjb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXIuQ29uZmlndXJhdGlvbixcbiAgKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMud2VicGFja0RldlNlcnZlckZhY3RvcnkpIHtcbiAgICAgIHJldHVybiBuZXcgb3B0aW9ucy53ZWJwYWNrRGV2U2VydmVyRmFjdG9yeShjb25maWcsIHdlYnBhY2spO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgV2VicGFja0RldlNlcnZlcihjb25maWcsIHdlYnBhY2spO1xuICB9O1xuXG4gIGNvbnN0IGxvZzogV2VicGFja0xvZ2dpbmdDYWxsYmFjayA9XG4gICAgb3B0aW9ucy5sb2dnaW5nIHx8ICgoc3RhdHMsIGNvbmZpZykgPT4gY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0cy50b1N0cmluZyhjb25maWcuc3RhdHMpKSk7XG5cbiAgcmV0dXJuIGNyZWF0ZVdlYnBhY2soeyAuLi5jb25maWcsIHdhdGNoOiBmYWxzZSB9KS5waXBlKFxuICAgIHN3aXRjaE1hcChcbiAgICAgICh3ZWJwYWNrQ29tcGlsZXIpID0+XG4gICAgICAgIG5ldyBPYnNlcnZhYmxlPERldlNlcnZlckJ1aWxkT3V0cHV0Pigob2JzKSA9PiB7XG4gICAgICAgICAgY29uc3QgZGV2U2VydmVyQ29uZmlnID0gb3B0aW9ucy5kZXZTZXJ2ZXJDb25maWcgfHwgY29uZmlnLmRldlNlcnZlciB8fCB7fTtcbiAgICAgICAgICBkZXZTZXJ2ZXJDb25maWcuaG9zdCA/Pz0gJ2xvY2FsaG9zdCc7XG5cbiAgICAgICAgICBsZXQgcmVzdWx0OiBQYXJ0aWFsPERldlNlcnZlckJ1aWxkT3V0cHV0PjtcblxuICAgICAgICAgIHdlYnBhY2tDb21waWxlci5ob29rcy5kb25lLnRhcCgnYnVpbGQtd2VicGFjaycsIChzdGF0cykgPT4ge1xuICAgICAgICAgICAgLy8gTG9nIHN0YXRzLlxuICAgICAgICAgICAgbG9nKHN0YXRzLCBjb25maWcpO1xuICAgICAgICAgICAgb2JzLm5leHQoe1xuICAgICAgICAgICAgICAuLi5yZXN1bHQsXG4gICAgICAgICAgICAgIGVtaXR0ZWRGaWxlczogZ2V0RW1pdHRlZEZpbGVzKHN0YXRzLmNvbXBpbGF0aW9uKSxcbiAgICAgICAgICAgICAgc3VjY2VzczogIXN0YXRzLmhhc0Vycm9ycygpLFxuICAgICAgICAgICAgICBvdXRwdXRQYXRoOiBzdGF0cy5jb21waWxhdGlvbi5vdXRwdXRPcHRpb25zLnBhdGgsXG4gICAgICAgICAgICB9IGFzIHVua25vd24gYXMgRGV2U2VydmVyQnVpbGRPdXRwdXQpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3QgZGV2U2VydmVyID0gY3JlYXRlV2VicGFja0RldlNlcnZlcih3ZWJwYWNrQ29tcGlsZXIsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgICAgICAgZGV2U2VydmVyLnN0YXJ0Q2FsbGJhY2soKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYWRkcmVzcyA9IGRldlNlcnZlci5zZXJ2ZXI/LmFkZHJlc3MoKTtcbiAgICAgICAgICAgIGlmICghYWRkcmVzcykge1xuICAgICAgICAgICAgICBvYnMuZXJyb3IobmV3IEVycm9yKGBEZXYtc2VydmVyIGFkZHJlc3MgaW5mbyBpcyBub3QgZGVmaW5lZC5gKSk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgIHBvcnQ6IHR5cGVvZiBhZGRyZXNzID09PSAnc3RyaW5nJyA/IDAgOiBhZGRyZXNzLnBvcnQsXG4gICAgICAgICAgICAgIGZhbWlseTogdHlwZW9mIGFkZHJlc3MgPT09ICdzdHJpbmcnID8gJycgOiBhZGRyZXNzLmZhbWlseSxcbiAgICAgICAgICAgICAgYWRkcmVzczogdHlwZW9mIGFkZHJlc3MgPT09ICdzdHJpbmcnID8gYWRkcmVzcyA6IGFkZHJlc3MuYWRkcmVzcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBUZWFyZG93biBsb2dpYy4gQ2xvc2UgdGhlIHNlcnZlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBkZXZTZXJ2ZXIuc3RvcENhbGxiYWNrKCgpID0+IHt9KTtcbiAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5jbG9zZSgoKSA9PiB7fSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgKSxcbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxXZWJwYWNrRGV2U2VydmVyQnVpbGRlclNjaGVtYSwgRGV2U2VydmVyQnVpbGRPdXRwdXQ+KFxuICAob3B0aW9ucywgY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBwYXRoUmVzb2x2ZShjb250ZXh0LndvcmtzcGFjZVJvb3QsIG9wdGlvbnMud2VicGFja0NvbmZpZyk7XG5cbiAgICByZXR1cm4gZnJvbShpbXBvcnQoY29uZmlnUGF0aCkpLnBpcGUoXG4gICAgICBzd2l0Y2hNYXAoKHsgZGVmYXVsdDogY29uZmlnIH06IHsgZGVmYXVsdDogd2VicGFjay5Db25maWd1cmF0aW9uIH0pID0+XG4gICAgICAgIHJ1bldlYnBhY2tEZXZTZXJ2ZXIoY29uZmlnLCBjb250ZXh0KSxcbiAgICAgICksXG4gICAgKTtcbiAgfSxcbik7XG4iXX0=