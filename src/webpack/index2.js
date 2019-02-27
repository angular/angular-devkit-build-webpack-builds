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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy93ZWJwYWNrL2luZGV4Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILGlFQUFvRztBQUNwRywrQ0FBK0U7QUFDL0UsK0JBQTRDO0FBQzVDLDhDQUEyQztBQUMzQyxtQ0FBbUM7QUFDbkMsb0RBQXVEO0FBR3ZELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQVk5QyxTQUFnQixVQUFVLENBQ3hCLE1BQTZCLEVBQzdCLE9BQXVCLEVBQ3ZCLFVBR0ksRUFBRTtJQUVOLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxjQUFjLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLE1BQU0sR0FBRyxHQUEyQixPQUFPLENBQUMsT0FBTztXQUM5QyxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVFLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFO1FBQzVCLE9BQU8sRUFBRTtZQUNQLElBQUksMkJBQWUsQ0FBQyxPQUFPLENBQUM7U0FDN0I7S0FDRixDQUFDLENBQUM7SUFFSCxPQUFPLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQy9CLHFCQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLGlCQUFVLENBQWdCLEdBQUcsQ0FBQyxFQUFFO1FBQy9ELE1BQU0sUUFBUSxHQUE2QixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN4RCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdkI7WUFFRCxhQUFhO1lBQ2IsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVuQixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUUxQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTtnQkFDakIsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQ2hCO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsSUFBSTtZQUNGLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTtnQkFDaEIsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUM7Z0JBQy9DLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUUvRCw0REFBNEQ7Z0JBQzVELE9BQU8sR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUN4QztpQkFBTTtnQkFDTCxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQy9CO1NBQ0Y7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLElBQUksR0FBRyxFQUFFO2dCQUNQLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2FBQzNGO1lBQ0QsTUFBTSxHQUFHLENBQUM7U0FDWDtJQUNILENBQUMsQ0FBQyxDQUNILENBQUMsQ0FBQztBQUNMLENBQUM7QUFyREQsZ0NBcURDO0FBR0Qsa0JBQWUsc0JBQWEsQ0FBdUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDdEUsTUFBTSxVQUFVLEdBQUcsY0FBTyxDQUFDLGdCQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFL0YsT0FBTyxXQUFJLHNDQUFRLG9CQUFhLENBQUMsVUFBVSxDQUFDLEdBQUUsQ0FBQyxJQUFJLENBQ2pELHFCQUFTLENBQUMsQ0FBQyxNQUE2QixFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQzFFLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBCdWlsZGVyT3V0cHV0LCBjcmVhdGVCdWlsZGVyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9zcmMvaW5kZXgyJztcbmltcG9ydCB7IGdldFN5c3RlbVBhdGgsIGpzb24sIG5vcm1hbGl6ZSwgcmVzb2x2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE9ic2VydmFibGUsIGZyb20sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgQXJjaGl0ZWN0UGx1Z2luIH0gZnJvbSAnLi4vcGx1Z2lucy9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFJlYWxXZWJwYWNrQnVpbGRlclNjaGVtYSB9IGZyb20gJy4vc2NoZW1hJztcblxuY29uc3Qgd2VicGFja01lcmdlID0gcmVxdWlyZSgnd2VicGFjay1tZXJnZScpO1xuXG5leHBvcnQgdHlwZSBXZWJwYWNrQnVpbGRlclNjaGVtYSA9IGpzb24uSnNvbk9iamVjdCAmIFJlYWxXZWJwYWNrQnVpbGRlclNjaGVtYTtcblxuZXhwb3J0IGludGVyZmFjZSBXZWJwYWNrTG9nZ2luZ0NhbGxiYWNrIHtcbiAgKHN0YXRzOiB3ZWJwYWNrLlN0YXRzLCBjb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbik6IHZvaWQ7XG59XG5leHBvcnQgaW50ZXJmYWNlIFdlYnBhY2tGYWN0b3J5IHtcbiAgKGNvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uKTogT2JzZXJ2YWJsZTx3ZWJwYWNrLkNvbXBpbGVyPjtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gcnVuV2VicGFjayhcbiAgY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBvcHRpb25zOiB7XG4gICAgbG9nZ2luZz86IFdlYnBhY2tMb2dnaW5nQ2FsbGJhY2ssXG4gICAgd2VicGFja0ZhY3Rvcnk/OiBXZWJwYWNrRmFjdG9yeSxcbiAgfSA9IHt9LFxuKTogT2JzZXJ2YWJsZTxCdWlsZGVyT3V0cHV0PiB7XG4gIGNvbnN0IGNyZWF0ZVdlYnBhY2sgPSBvcHRpb25zLndlYnBhY2tGYWN0b3J5IHx8IChjb25maWcgPT4gb2Yod2VicGFjayhjb25maWcpKSk7XG4gIGNvbnN0IGxvZzogV2VicGFja0xvZ2dpbmdDYWxsYmFjayA9IG9wdGlvbnMubG9nZ2luZ1xuICAgIHx8ICgoc3RhdHMsIGNvbmZpZykgPT4gY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0cy50b1N0cmluZyhjb25maWcuc3RhdHMpKSk7XG5cbiAgY29uZmlnID0gd2VicGFja01lcmdlKGNvbmZpZywge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIG5ldyBBcmNoaXRlY3RQbHVnaW4oY29udGV4dCksXG4gICAgXSxcbiAgfSk7XG5cbiAgcmV0dXJuIGNyZWF0ZVdlYnBhY2soY29uZmlnKS5waXBlKFxuICAgIHN3aXRjaE1hcCh3ZWJwYWNrQ29tcGlsZXIgPT4gbmV3IE9ic2VydmFibGU8QnVpbGRlck91dHB1dD4ob2JzID0+IHtcbiAgICAgIGNvbnN0IGNhbGxiYWNrOiB3ZWJwYWNrLkNvbXBpbGVyLkhhbmRsZXIgPSAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIG9icy5lcnJvcihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9nIHN0YXRzLlxuICAgICAgICBsb2coc3RhdHMsIGNvbmZpZyk7XG5cbiAgICAgICAgb2JzLm5leHQoeyBzdWNjZXNzOiAhc3RhdHMuaGFzRXJyb3JzKCkgfSk7XG5cbiAgICAgICAgaWYgKCFjb25maWcud2F0Y2gpIHtcbiAgICAgICAgICBvYnMuY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGNvbmZpZy53YXRjaCkge1xuICAgICAgICAgIGNvbnN0IHdhdGNoT3B0aW9ucyA9IGNvbmZpZy53YXRjaE9wdGlvbnMgfHwge307XG4gICAgICAgICAgY29uc3Qgd2F0Y2hpbmcgPSB3ZWJwYWNrQ29tcGlsZXIud2F0Y2god2F0Y2hPcHRpb25zLCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAvLyBUZWFyZG93biBsb2dpYy4gQ2xvc2UgdGhlIHdhdGNoZXIgd2hlbiB1bnN1YnNjcmliZWQgZnJvbS5cbiAgICAgICAgICByZXR1cm4gKCkgPT4gd2F0Y2hpbmcuY2xvc2UoKCkgPT4geyB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3ZWJwYWNrQ29tcGlsZXIucnVuKGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci5lcnJvcihgXFxuQW4gZXJyb3Igb2NjdXJyZWQgZHVyaW5nIHRoZSBidWlsZDpcXG4ke2VyciAmJiBlcnIuc3RhY2sgfHwgZXJyfWApO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KSxcbiAgKSk7XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxXZWJwYWNrQnVpbGRlclNjaGVtYT4oKG9wdGlvbnMsIGNvbnRleHQpID0+IHtcbiAgY29uc3QgY29uZmlnUGF0aCA9IHJlc29sdmUobm9ybWFsaXplKGNvbnRleHQud29ya3NwYWNlUm9vdCksIG5vcm1hbGl6ZShvcHRpb25zLndlYnBhY2tDb25maWcpKTtcblxuICByZXR1cm4gZnJvbShpbXBvcnQoZ2V0U3lzdGVtUGF0aChjb25maWdQYXRoKSkpLnBpcGUoXG4gICAgc3dpdGNoTWFwKChjb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbikgPT4gcnVuV2VicGFjayhjb25maWcsIGNvbnRleHQpKSxcbiAgKTtcbn0pO1xuIl19