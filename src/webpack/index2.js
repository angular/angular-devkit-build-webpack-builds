"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const index2_1 = require("@angular-devkit/architect/src/index2");
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
const architect_1 = require("../plugins/architect");
const utils_1 = require("../utils");
const webpackMerge = require('webpack-merge');
function runWebpack(config, context, options = {}) {
    const createWebpack = options.webpackFactory || (config => rxjs_1.of(webpack(config)));
    const log = options.logging
        || ((stats, config) => context.logger.info(stats.toString(config.stats)));
    config = webpackMerge(config, {
        plugins: [
            new architect_1.ArchitectPlugin(context),
        ],
    });
    return createWebpack(config).pipe(operators_1.switchMap(webpackCompiler => new rxjs_1.Observable(obs => {
        const callback = (err, stats) => {
            if (err) {
                return obs.error(err);
            }
            // Log stats.
            log(stats, config);
            obs.next({
                success: !stats.hasErrors(),
                emittedFiles: utils_1.getEmittedFiles(stats.compilation),
            });
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
                context.logger.error(`\nAn error occurred during the build:\n${err && err.stack || err}`);
            }
            throw err;
        }
    })));
}
exports.runWebpack = runWebpack;
exports.default = index2_1.createBuilder((options, context) => {
    const configPath = core_1.resolve(core_1.normalize(context.workspaceRoot), core_1.normalize(options.webpackConfig));
    return rxjs_1.from(Promise.resolve().then(() => require(core_1.getSystemPath(configPath)))).pipe(operators_1.switchMap((config) => runWebpack(config, context)));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy93ZWJwYWNrL2luZGV4Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILGlFQUFvRztBQUNwRywrQ0FBK0U7QUFDL0UsK0JBQTRDO0FBQzVDLDhDQUEyQztBQUMzQyxtQ0FBbUM7QUFDbkMsb0RBQXVEO0FBQ3ZELG9DQUF5RDtBQUd6RCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFlOUMsU0FBZ0IsVUFBVSxDQUN4QixNQUE2QixFQUM3QixPQUF1QixFQUN2QixVQUdJLEVBQUU7SUFFTixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRixNQUFNLEdBQUcsR0FBMkIsT0FBTyxDQUFDLE9BQU87V0FDOUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU1RSxNQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRTtRQUM1QixPQUFPLEVBQUU7WUFDUCxJQUFJLDJCQUFlLENBQUMsT0FBTyxDQUFDO1NBQzdCO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUMvQixxQkFBUyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxpQkFBVSxDQUFjLEdBQUcsQ0FBQyxFQUFFO1FBQzdELE1BQU0sUUFBUSxHQUE2QixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN4RCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdkI7WUFFRCxhQUFhO1lBQ2IsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVuQixHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUU7Z0JBQzNCLFlBQVksRUFBRSx1QkFBZSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7YUFDdkIsQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDaEI7UUFDSCxDQUFDLENBQUM7UUFFRixJQUFJO1lBQ0YsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUNoQixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztnQkFDL0MsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBRS9ELDREQUE0RDtnQkFDNUQsT0FBTyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ3hDO2lCQUFNO2dCQUNMLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDL0I7U0FDRjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMENBQTBDLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7YUFDM0Y7WUFDRCxNQUFNLEdBQUcsQ0FBQztTQUNYO0lBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhERCxnQ0F3REM7QUFHRCxrQkFBZSxzQkFBYSxDQUF1QixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUN0RSxNQUFNLFVBQVUsR0FBRyxjQUFPLENBQUMsZ0JBQVMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsZ0JBQVMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUUvRixPQUFPLFdBQUksc0NBQVEsb0JBQWEsQ0FBQyxVQUFVLENBQUMsR0FBRSxDQUFDLElBQUksQ0FDakQscUJBQVMsQ0FBQyxDQUFDLE1BQTZCLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FDMUUsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQsIEJ1aWxkZXJPdXRwdXQsIGNyZWF0ZUJ1aWxkZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0L3NyYy9pbmRleDInO1xuaW1wb3J0IHsgZ2V0U3lzdGVtUGF0aCwganNvbiwgbm9ybWFsaXplLCByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgZnJvbSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IHN3aXRjaE1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBBcmNoaXRlY3RQbHVnaW4gfSBmcm9tICcuLi9wbHVnaW5zL2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBFbWl0dGVkRmlsZXMsIGdldEVtaXR0ZWRGaWxlcyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBSZWFsV2VicGFja0J1aWxkZXJTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmNvbnN0IHdlYnBhY2tNZXJnZSA9IHJlcXVpcmUoJ3dlYnBhY2stbWVyZ2UnKTtcblxuZXhwb3J0IHR5cGUgV2VicGFja0J1aWxkZXJTY2hlbWEgPSBqc29uLkpzb25PYmplY3QgJiBSZWFsV2VicGFja0J1aWxkZXJTY2hlbWE7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2VicGFja0xvZ2dpbmdDYWxsYmFjayB7XG4gIChzdGF0czogd2VicGFjay5TdGF0cywgY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pOiB2b2lkO1xufVxuZXhwb3J0IGludGVyZmFjZSBXZWJwYWNrRmFjdG9yeSB7XG4gIChjb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbik6IE9ic2VydmFibGU8d2VicGFjay5Db21waWxlcj47XG59XG5cbmV4cG9ydCB0eXBlIEJ1aWxkUmVzdWx0ID0gQnVpbGRlck91dHB1dCAmIHtcbiAgZW1pdHRlZEZpbGVzPzogRW1pdHRlZEZpbGVzW107XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcnVuV2VicGFjayhcbiAgY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBvcHRpb25zOiB7XG4gICAgbG9nZ2luZz86IFdlYnBhY2tMb2dnaW5nQ2FsbGJhY2ssXG4gICAgd2VicGFja0ZhY3Rvcnk/OiBXZWJwYWNrRmFjdG9yeSxcbiAgfSA9IHt9LFxuKTogT2JzZXJ2YWJsZTxCdWlsZFJlc3VsdD4ge1xuICBjb25zdCBjcmVhdGVXZWJwYWNrID0gb3B0aW9ucy53ZWJwYWNrRmFjdG9yeSB8fCAoY29uZmlnID0+IG9mKHdlYnBhY2soY29uZmlnKSkpO1xuICBjb25zdCBsb2c6IFdlYnBhY2tMb2dnaW5nQ2FsbGJhY2sgPSBvcHRpb25zLmxvZ2dpbmdcbiAgICB8fCAoKHN0YXRzLCBjb25maWcpID0+IGNvbnRleHQubG9nZ2VyLmluZm8oc3RhdHMudG9TdHJpbmcoY29uZmlnLnN0YXRzKSkpO1xuXG4gIGNvbmZpZyA9IHdlYnBhY2tNZXJnZShjb25maWcsIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICBuZXcgQXJjaGl0ZWN0UGx1Z2luKGNvbnRleHQpLFxuICAgIF0sXG4gIH0pO1xuXG4gIHJldHVybiBjcmVhdGVXZWJwYWNrKGNvbmZpZykucGlwZShcbiAgICBzd2l0Y2hNYXAod2VicGFja0NvbXBpbGVyID0+IG5ldyBPYnNlcnZhYmxlPEJ1aWxkUmVzdWx0PihvYnMgPT4ge1xuICAgICAgY29uc3QgY2FsbGJhY2s6IHdlYnBhY2suQ29tcGlsZXIuSGFuZGxlciA9IChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2cgc3RhdHMuXG4gICAgICAgIGxvZyhzdGF0cywgY29uZmlnKTtcblxuICAgICAgICBvYnMubmV4dCh7XG4gICAgICAgICAgc3VjY2VzczogIXN0YXRzLmhhc0Vycm9ycygpLFxuICAgICAgICAgIGVtaXR0ZWRGaWxlczogZ2V0RW1pdHRlZEZpbGVzKHN0YXRzLmNvbXBpbGF0aW9uKSxcbiAgICAgICAgfSBhcyB1bmtub3duIGFzIEJ1aWxkUmVzdWx0KTtcblxuICAgICAgICBpZiAoIWNvbmZpZy53YXRjaCkge1xuICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICBpZiAoY29uZmlnLndhdGNoKSB7XG4gICAgICAgICAgY29uc3Qgd2F0Y2hPcHRpb25zID0gY29uZmlnLndhdGNoT3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICBjb25zdCB3YXRjaGluZyA9IHdlYnBhY2tDb21waWxlci53YXRjaCh3YXRjaE9wdGlvbnMsIGNhbGxiYWNrKTtcblxuICAgICAgICAgIC8vIFRlYXJkb3duIGxvZ2ljLiBDbG9zZSB0aGUgd2F0Y2hlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgICAgIHJldHVybiAoKSA9PiB3YXRjaGluZy5jbG9zZSgoKSA9PiB7IH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdlYnBhY2tDb21waWxlci5ydW4oY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGNvbnRleHQubG9nZ2VyLmVycm9yKGBcXG5BbiBlcnJvciBvY2N1cnJlZCBkdXJpbmcgdGhlIGJ1aWxkOlxcbiR7ZXJyICYmIGVyci5zdGFjayB8fCBlcnJ9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0pLFxuICApKTtcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPFdlYnBhY2tCdWlsZGVyU2NoZW1hPigob3B0aW9ucywgY29udGV4dCkgPT4ge1xuICBjb25zdCBjb25maWdQYXRoID0gcmVzb2x2ZShub3JtYWxpemUoY29udGV4dC53b3Jrc3BhY2VSb290KSwgbm9ybWFsaXplKG9wdGlvbnMud2VicGFja0NvbmZpZykpO1xuXG4gIHJldHVybiBmcm9tKGltcG9ydChnZXRTeXN0ZW1QYXRoKGNvbmZpZ1BhdGgpKSkucGlwZShcbiAgICBzd2l0Y2hNYXAoKGNvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uKSA9PiBydW5XZWJwYWNrKGNvbmZpZywgY29udGV4dCkpLFxuICApO1xufSk7XG4iXX0=