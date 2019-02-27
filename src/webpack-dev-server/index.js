"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const webpack_1 = require("../webpack");
class WebpackDevServerBuilder {
    constructor(context) {
        this.context = context;
    }
    run(builderConfig) {
        const configPath = core_1.resolve(this.context.workspace.root, core_1.normalize(builderConfig.options.webpackConfig));
        return this.loadWebpackConfig(core_1.getSystemPath(configPath)).pipe(operators_1.concatMap(config => this.runWebpackDevServer(config)));
    }
    loadWebpackConfig(webpackConfigPath) {
        return rxjs_1.from(Promise.resolve().then(() => require(webpackConfigPath)));
    }
    runWebpackDevServer(webpackConfig, devServerCfg, loggingCb = webpack_1.defaultLoggingCb) {
        return new rxjs_1.Observable(obs => {
            const devServerConfig = devServerCfg || webpackConfig.devServer || {};
            devServerConfig.host = devServerConfig.host || 'localhost';
            if (devServerConfig.port == undefined) {
                devServerConfig.port = 8080;
            }
            if (devServerConfig.stats) {
                webpackConfig.stats = devServerConfig.stats;
            }
            // Disable stats reporting by the devserver, we have our own logger.
            devServerConfig.stats = false;
            const webpackCompiler = webpack(webpackConfig);
            const server = new WebpackDevServer(webpackCompiler, devServerConfig);
            let result;
            webpackCompiler.hooks.done.tap('build-webpack', (stats) => {
                // Log stats.
                loggingCb(stats, webpackConfig, this.context.logger);
                obs.next({ success: !stats.hasErrors(), result });
            });
            server.listen(devServerConfig.port, devServerConfig.host, function (err) {
                if (err) {
                    obs.error(err);
                }
                else {
                    // this is ignored because of ts errors
                    // that this is overshadowed by it's outer contain
                    // @ts-ignore;
                    result = this.address();
                }
            });
            // Teardown logic. Close the server when unsubscribed from.
            return () => server.close();
        });
    }
}
exports.WebpackDevServerBuilder = WebpackDevServerBuilder;
exports.default = WebpackDevServerBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3dlYnBhY2stZGV2LXNlcnZlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQVFILCtDQUF5RTtBQUV6RSwrQkFBd0M7QUFDeEMsOENBQTJDO0FBQzNDLG1DQUFtQztBQUNuQyx1REFBdUQ7QUFDdkQsd0NBQStEO0FBUy9ELE1BQWEsdUJBQXVCO0lBRWxDLFlBQW1CLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUksQ0FBQztJQUUvQyxHQUFHLENBQUMsYUFBa0U7UUFFcEUsTUFBTSxVQUFVLEdBQUcsY0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksRUFDcEQsZ0JBQVMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFFbEQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDM0QscUJBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUN0RCxDQUFDO0lBQ0osQ0FBQztJQUVNLGlCQUFpQixDQUFDLGlCQUF5QjtRQUNoRCxPQUFPLFdBQUksc0NBQVEsaUJBQWlCLEdBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRU0sbUJBQW1CLENBQ3hCLGFBQW9DLEVBQ3BDLFlBQTZDLEVBQzdDLFlBQTZCLDBCQUFnQjtRQUU3QyxPQUFPLElBQUksaUJBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMxQixNQUFNLGVBQWUsR0FBRyxZQUFZLElBQUksYUFBYSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7WUFDdEUsZUFBZSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQztZQUMzRCxJQUFJLGVBQWUsQ0FBQyxJQUFJLElBQUksU0FBUyxFQUFFO2dCQUNyQyxlQUFlLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzthQUM3QjtZQUVELElBQUksZUFBZSxDQUFDLEtBQUssRUFBRTtnQkFDekIsYUFBYSxDQUFDLEtBQUssR0FBRyxlQUFlLENBQUMsS0FBNEMsQ0FBQzthQUNwRjtZQUNELG9FQUFvRTtZQUNwRSxlQUFlLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUU5QixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDL0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDdEUsSUFBSSxNQUFtQyxDQUFDO1lBRXhDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDeEQsYUFBYTtnQkFDYixTQUFTLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUVyRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsTUFBTSxDQUNYLGVBQWUsQ0FBQyxJQUFJLEVBQ3BCLGVBQWUsQ0FBQyxJQUFJLEVBQ3BCLFVBQVUsR0FBRztnQkFDWCxJQUFJLEdBQUcsRUFBRTtvQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNoQjtxQkFBTTtvQkFDTCx1Q0FBdUM7b0JBQ3ZDLGtEQUFrRDtvQkFDbEQsY0FBYztvQkFDZCxNQUFNLEdBQUksSUFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDekM7WUFDSCxDQUFDLENBQ0YsQ0FBQztZQUVGLDJEQUEyRDtZQUMzRCxPQUFPLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWxFRCwwREFrRUM7QUFHRCxrQkFBZSx1QkFBdUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlcixcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGdldFN5c3RlbVBhdGgsIG5vcm1hbGl6ZSwgcmVzb2x2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgZnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY29uY2F0TWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCAqIGFzIFdlYnBhY2tEZXZTZXJ2ZXIgZnJvbSAnd2VicGFjay1kZXYtc2VydmVyJztcbmltcG9ydCB7IExvZ2dpbmdDYWxsYmFjaywgZGVmYXVsdExvZ2dpbmdDYiB9IGZyb20gJy4uL3dlYnBhY2snO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFdlYnBhY2tEZXZTZXJ2ZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERldlNlcnZlclJlc3VsdCB7XG4gIHBvcnQ6IG51bWJlcjtcbiAgZmFtaWx5OiBzdHJpbmc7XG4gIGFkZHJlc3M6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFdlYnBhY2tEZXZTZXJ2ZXJCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxXZWJwYWNrRGV2U2VydmVyQnVpbGRlclNjaGVtYT4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPFdlYnBhY2tEZXZTZXJ2ZXJCdWlsZGVyU2NoZW1hPilcbiAgICA6IE9ic2VydmFibGU8QnVpbGRFdmVudDxEZXZTZXJ2ZXJSZXN1bHQ+PiB7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IHJlc29sdmUodGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290LFxuICAgICAgbm9ybWFsaXplKGJ1aWxkZXJDb25maWcub3B0aW9ucy53ZWJwYWNrQ29uZmlnKSk7XG5cbiAgICByZXR1cm4gdGhpcy5sb2FkV2VicGFja0NvbmZpZyhnZXRTeXN0ZW1QYXRoKGNvbmZpZ1BhdGgpKS5waXBlKFxuICAgICAgY29uY2F0TWFwKGNvbmZpZyA9PiB0aGlzLnJ1bldlYnBhY2tEZXZTZXJ2ZXIoY29uZmlnKSksXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBsb2FkV2VicGFja0NvbmZpZyh3ZWJwYWNrQ29uZmlnUGF0aDogc3RyaW5nKTogT2JzZXJ2YWJsZTx3ZWJwYWNrLkNvbmZpZ3VyYXRpb24+IHtcbiAgICByZXR1cm4gZnJvbShpbXBvcnQod2VicGFja0NvbmZpZ1BhdGgpKTtcbiAgfVxuXG4gIHB1YmxpYyBydW5XZWJwYWNrRGV2U2VydmVyKFxuICAgIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbixcbiAgICBkZXZTZXJ2ZXJDZmc/OiBXZWJwYWNrRGV2U2VydmVyLkNvbmZpZ3VyYXRpb24sXG4gICAgbG9nZ2luZ0NiOiBMb2dnaW5nQ2FsbGJhY2sgPSBkZWZhdWx0TG9nZ2luZ0NiLFxuICApOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ8RGV2U2VydmVyUmVzdWx0Pj4ge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgY29uc3QgZGV2U2VydmVyQ29uZmlnID0gZGV2U2VydmVyQ2ZnIHx8IHdlYnBhY2tDb25maWcuZGV2U2VydmVyIHx8IHt9O1xuICAgICAgZGV2U2VydmVyQ29uZmlnLmhvc3QgPSBkZXZTZXJ2ZXJDb25maWcuaG9zdCB8fCAnbG9jYWxob3N0JztcbiAgICAgIGlmIChkZXZTZXJ2ZXJDb25maWcucG9ydCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGV2U2VydmVyQ29uZmlnLnBvcnQgPSA4MDgwO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGV2U2VydmVyQ29uZmlnLnN0YXRzKSB7XG4gICAgICAgIHdlYnBhY2tDb25maWcuc3RhdHMgPSBkZXZTZXJ2ZXJDb25maWcuc3RhdHMgYXMgd2VicGFjay5TdGF0cy5Ub1N0cmluZ09wdGlvbnNPYmplY3Q7XG4gICAgICB9XG4gICAgICAvLyBEaXNhYmxlIHN0YXRzIHJlcG9ydGluZyBieSB0aGUgZGV2c2VydmVyLCB3ZSBoYXZlIG91ciBvd24gbG9nZ2VyLlxuICAgICAgZGV2U2VydmVyQ29uZmlnLnN0YXRzID0gZmFsc2U7XG5cbiAgICAgIGNvbnN0IHdlYnBhY2tDb21waWxlciA9IHdlYnBhY2sod2VicGFja0NvbmZpZyk7XG4gICAgICBjb25zdCBzZXJ2ZXIgPSBuZXcgV2VicGFja0RldlNlcnZlcih3ZWJwYWNrQ29tcGlsZXIsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgICBsZXQgcmVzdWx0OiB1bmRlZmluZWQgfCBEZXZTZXJ2ZXJSZXN1bHQ7XG5cbiAgICAgIHdlYnBhY2tDb21waWxlci5ob29rcy5kb25lLnRhcCgnYnVpbGQtd2VicGFjaycsIChzdGF0cykgPT4ge1xuICAgICAgICAvLyBMb2cgc3RhdHMuXG4gICAgICAgIGxvZ2dpbmdDYihzdGF0cywgd2VicGFja0NvbmZpZywgdGhpcy5jb250ZXh0LmxvZ2dlcik7XG5cbiAgICAgICAgb2JzLm5leHQoeyBzdWNjZXNzOiAhc3RhdHMuaGFzRXJyb3JzKCksIHJlc3VsdCB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBzZXJ2ZXIubGlzdGVuKFxuICAgICAgICBkZXZTZXJ2ZXJDb25maWcucG9ydCxcbiAgICAgICAgZGV2U2VydmVyQ29uZmlnLmhvc3QsXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBvYnMuZXJyb3IoZXJyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBpZ25vcmVkIGJlY2F1c2Ugb2YgdHMgZXJyb3JzXG4gICAgICAgICAgICAvLyB0aGF0IHRoaXMgaXMgb3ZlcnNoYWRvd2VkIGJ5IGl0J3Mgb3V0ZXIgY29udGFpblxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZTtcbiAgICAgICAgICAgIHJlc3VsdCA9ICh0aGlzIGFzIG5ldC5TZXJ2ZXIpLmFkZHJlc3MoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICApO1xuXG4gICAgICAvLyBUZWFyZG93biBsb2dpYy4gQ2xvc2UgdGhlIHNlcnZlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgcmV0dXJuICgpID0+IHNlcnZlci5jbG9zZSgpO1xuICAgIH0pO1xuICB9XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgV2VicGFja0RldlNlcnZlckJ1aWxkZXI7XG4iXX0=