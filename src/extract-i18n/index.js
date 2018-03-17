"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const Observable_1 = require("rxjs/Observable");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
const utils_1 = require("../angular-cli-files/models/webpack-configs/utils");
const stats_1 = require("../angular-cli-files/utilities/stats");
const browser_1 = require("../browser");
const MemoryFS = require('memory-fs');
class ExtractI18nBuilder {
    constructor(context) {
        this.context = context;
    }
    run(target) {
        const options = target.options;
        const [project, targetName, configuration] = options.browserTarget.split(':');
        // Override browser build watch setting.
        const overrides = { watch: false };
        const browserTargetSpec = { project, target: targetName, configuration, overrides };
        let browserBuilderConfig;
        return this.context.architect.getBuilderConfiguration(browserTargetSpec)
            .pipe(operators_1.tap(cfg => browserBuilderConfig = cfg), operators_1.concatMap(builderConfig => this.context.architect.getBuilderDescription(builderConfig)), operators_1.concatMap(browserDescription => this.context.architect.validateBuilderOptions(browserBuilderConfig, browserDescription)), operators_1.map(browserBuilderConfig => browserBuilderConfig.options), operators_1.concatMap((validatedBrowserOptions) => new Observable_1.Observable(obs => {
            const browserOptions = validatedBrowserOptions;
            const browserBuilder = new browser_1.BrowserBuilder(this.context);
            // We need to determine the outFile name so that AngularCompiler can retrieve it.
            let outFile = options.outFile || getI18nOutfile(options.i18nFormat);
            if (options.outputPath) {
                // AngularCompilerPlugin doesn't support genDir so we have to adjust outFile instead.
                outFile = path.join(options.outputPath, outFile);
            }
            // Extracting i18n uses the browser target webpack config with some specific options.
            const webpackConfig = browserBuilder.buildWebpackConfig(target.root, Object.assign({}, browserOptions, { optimizationLevel: 0, i18nLocale: options.i18nLocale, i18nOutFormat: options.i18nFormat, i18nOutFile: outFile, aot: true }));
            const webpackCompiler = webpack(webpackConfig);
            webpackCompiler.outputFileSystem = new MemoryFS();
            const statsConfig = utils_1.getWebpackStatsConfig();
            const callback = (err, stats) => {
                if (err) {
                    return obs.error(err);
                }
                const json = stats.toJson('verbose');
                if (stats.hasWarnings()) {
                    this.context.logger.warn(stats_1.statsWarningsToString(json, statsConfig));
                }
                if (stats.hasErrors()) {
                    this.context.logger.error(stats_1.statsErrorsToString(json, statsConfig));
                }
                obs.next({ success: !stats.hasErrors() });
                obs.complete();
            };
            try {
                webpackCompiler.run(callback);
            }
            catch (err) {
                if (err) {
                    this.context.logger.error('\nAn error occured during the extraction:\n' + ((err && err.stack) || err));
                }
                throw err;
            }
        })));
    }
}
exports.ExtractI18nBuilder = ExtractI18nBuilder;
function getI18nOutfile(format) {
    switch (format) {
        case 'xmb':
            return 'messages.xmb';
        case 'xlf':
        case 'xlif':
        case 'xliff':
        case 'xlf2':
        case 'xliff2':
            return 'messages.xlf';
        default:
            throw new Error(`Unsupported format "${format}"`);
    }
}
exports.default = ExtractI18nBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2V4dHJhY3QtaTE4bi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQVFILDZCQUE2QjtBQUM3QixnREFBNkM7QUFDN0MsOENBQXFEO0FBQ3JELG1DQUFtQztBQUNuQyw2RUFBMEY7QUFDMUYsZ0VBQWtHO0FBQ2xHLHdDQUFtRTtBQUNuRSxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFXdEM7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLE1BQXVEO1FBQ3pELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDL0IsTUFBTSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxDQUFDLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUUsd0NBQXdDO1FBQ3hDLE1BQU0sU0FBUyxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBRW5DLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDcEYsSUFBSSxvQkFBaUUsQ0FBQztRQUV0RSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQXdCLGlCQUFpQixDQUFDO2FBQzVGLElBQUksQ0FDSCxlQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsR0FBRyxHQUFHLENBQUMsRUFDdEMscUJBQVMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLHFC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QUN2Qiw2Q0FBNkMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixDQUFDO2dCQUNELE1BQU0sR0FBRyxDQUFDO1lBQ1osQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FDRjtBQTNFRCxnREEyRUM7QUFFRCx3QkFBd0IsTUFBYztJQUNwQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2YsS0FBSyxLQUFLO1lBQ1IsTUFBTSxDQUFDLGNBQWMsQ0FBQztRQUN4QixLQUFLLEtBQUssQ0FBQztRQUNYLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxPQUFPLENBQUM7UUFDYixLQUFLLE1BQU0sQ0FBQztRQUNaLEtBQUssUUFBUTtZQUNYLE1BQU0sQ0FBQyxjQUFjLENBQUM7UUFDeEI7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3RELENBQUM7QUFDSCxDQUFDO0FBRUQsa0JBQWUsa0JBQWtCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBCdWlsZGVyQ29udGV4dCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IGdldFdlYnBhY2tTdGF0c0NvbmZpZyB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MvdXRpbHMnO1xuaW1wb3J0IHsgc3RhdHNFcnJvcnNUb1N0cmluZywgc3RhdHNXYXJuaW5nc1RvU3RyaW5nIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3N0YXRzJztcbmltcG9ydCB7IEJyb3dzZXJCdWlsZGVyLCBCcm93c2VyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuLi9icm93c2VyJztcbmNvbnN0IE1lbW9yeUZTID0gcmVxdWlyZSgnbWVtb3J5LWZzJyk7XG5cblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYWN0STE4bkJ1aWxkZXJPcHRpb25zIHtcbiAgYnJvd3NlclRhcmdldDogc3RyaW5nO1xuICBpMThuRm9ybWF0OiBzdHJpbmc7XG4gIGkxOG5Mb2NhbGU6IHN0cmluZztcbiAgb3V0cHV0UGF0aD86IHN0cmluZztcbiAgb3V0RmlsZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEV4dHJhY3RJMThuQnVpbGRlciBpbXBsZW1lbnRzIEJ1aWxkZXI8RXh0cmFjdEkxOG5CdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKHRhcmdldDogQnVpbGRlckNvbmZpZ3VyYXRpb248RXh0cmFjdEkxOG5CdWlsZGVyT3B0aW9ucz4pOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcbiAgICBjb25zdCBvcHRpb25zID0gdGFyZ2V0Lm9wdGlvbnM7XG4gICAgY29uc3QgW3Byb2plY3QsIHRhcmdldE5hbWUsIGNvbmZpZ3VyYXRpb25dID0gb3B0aW9ucy5icm93c2VyVGFyZ2V0LnNwbGl0KCc6Jyk7XG4gICAgLy8gT3ZlcnJpZGUgYnJvd3NlciBidWlsZCB3YXRjaCBzZXR0aW5nLlxuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHsgd2F0Y2g6IGZhbHNlIH07XG5cbiAgICBjb25zdCBicm93c2VyVGFyZ2V0U3BlYyA9IHsgcHJvamVjdCwgdGFyZ2V0OiB0YXJnZXROYW1lLCBjb25maWd1cmF0aW9uLCBvdmVycmlkZXMgfTtcbiAgICBsZXQgYnJvd3NlckJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPEJyb3dzZXJCdWlsZGVyT3B0aW9ucz47XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0LmFyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbjxCcm93c2VyQnVpbGRlck9wdGlvbnM+KGJyb3dzZXJUYXJnZXRTcGVjKVxuICAgICAgLnBpcGUoXG4gICAgICAgIHRhcChjZmcgPT4gYnJvd3NlckJ1aWxkZXJDb25maWcgPSBjZmcpLFxuICAgICAgICBjb25jYXRNYXAoYnVpbGRlckNvbmZpZyA9PiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZmlnKSksXG4gICAgICAgIGNvbmNhdE1hcChicm93c2VyRGVzY3JpcHRpb24gPT5cbiAgICAgICAgICB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LnZhbGlkYXRlQnVpbGRlck9wdGlvbnMoYnJvd3NlckJ1aWxkZXJDb25maWcsIGJyb3dzZXJEZXNjcmlwdGlvbikpLFxuICAgICAgICBtYXAoYnJvd3NlckJ1aWxkZXJDb25maWcgPT4gYnJvd3NlckJ1aWxkZXJDb25maWcub3B0aW9ucyksXG4gICAgICAgIGNvbmNhdE1hcCgodmFsaWRhdGVkQnJvd3Nlck9wdGlvbnMpID0+IG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICAgICAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSB2YWxpZGF0ZWRCcm93c2VyT3B0aW9ucztcbiAgICAgICAgICBjb25zdCBicm93c2VyQnVpbGRlciA9IG5ldyBCcm93c2VyQnVpbGRlcih0aGlzLmNvbnRleHQpO1xuXG4gICAgICAgICAgLy8gV2UgbmVlZCB0byBkZXRlcm1pbmUgdGhlIG91dEZpbGUgbmFtZSBzbyB0aGF0IEFuZ3VsYXJDb21waWxlciBjYW4gcmV0cmlldmUgaXQuXG4gICAgICAgICAgbGV0IG91dEZpbGUgPSBvcHRpb25zLm91dEZpbGUgfHwgZ2V0STE4bk91dGZpbGUob3B0aW9ucy5pMThuRm9ybWF0KTtcbiAgICAgICAgICBpZiAob3B0aW9ucy5vdXRwdXRQYXRoKSB7XG4gICAgICAgICAgICAvLyBBbmd1bGFyQ29tcGlsZXJQbHVnaW4gZG9lc24ndCBzdXBwb3J0IGdlbkRpciBzbyB3ZSBoYXZlIHRvIGFkanVzdCBvdXRGaWxlIGluc3RlYWQuXG4gICAgICAgICAgICBvdXRGaWxlID0gcGF0aC5qb2luKG9wdGlvbnMub3V0cHV0UGF0aCwgb3V0RmlsZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gRXh0cmFjdGluZyBpMThuIHVzZXMgdGhlIGJyb3dzZXIgdGFyZ2V0IHdlYnBhY2sgY29uZmlnIHdpdGggc29tZSBzcGVjaWZpYyBvcHRpb25zLlxuICAgICAgICAgIGNvbnN0IHdlYnBhY2tDb25maWcgPSBicm93c2VyQnVpbGRlci5idWlsZFdlYnBhY2tDb25maWcodGFyZ2V0LnJvb3QsIHtcbiAgICAgICAgICAgIC4uLmJyb3dzZXJPcHRpb25zLFxuICAgICAgICAgICAgb3B0aW1pemF0aW9uTGV2ZWw6IDAsXG4gICAgICAgICAgICBpMThuTG9jYWxlOiBvcHRpb25zLmkxOG5Mb2NhbGUsXG4gICAgICAgICAgICBpMThuT3V0Rm9ybWF0OiBvcHRpb25zLmkxOG5Gb3JtYXQsXG4gICAgICAgICAgICBpMThuT3V0RmlsZTogb3V0RmlsZSxcbiAgICAgICAgICAgIGFvdDogdHJ1ZSxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNvbnN0IHdlYnBhY2tDb21waWxlciA9IHdlYnBhY2sod2VicGFja0NvbmZpZyk7XG4gICAgICAgICAgd2VicGFja0NvbXBpbGVyLm91dHB1dEZpbGVTeXN0ZW0gPSBuZXcgTWVtb3J5RlMoKTtcbiAgICAgICAgICBjb25zdCBzdGF0c0NvbmZpZyA9IGdldFdlYnBhY2tTdGF0c0NvbmZpZygpO1xuXG4gICAgICAgICAgY29uc3QgY2FsbGJhY2s6IHdlYnBhY2suY29tcGlsZXIuQ29tcGlsZXJDYWxsYmFjayA9IChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvYnMuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QganNvbiA9IHN0YXRzLnRvSnNvbigndmVyYm9zZScpO1xuICAgICAgICAgICAgaWYgKHN0YXRzLmhhc1dhcm5pbmdzKCkpIHtcbiAgICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKHN0YXRzV2FybmluZ3NUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhdHMuaGFzRXJyb3JzKCkpIHtcbiAgICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihzdGF0c0Vycm9yc1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9icy5uZXh0KHsgc3VjY2VzczogIXN0YXRzLmhhc0Vycm9ycygpIH0pO1xuXG4gICAgICAgICAgICBvYnMuY29tcGxldGUoKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5ydW4oY2FsbGJhY2spO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAgICdcXG5BbiBlcnJvciBvY2N1cmVkIGR1cmluZyB0aGUgZXh0cmFjdGlvbjpcXG4nICsgKChlcnIgJiYgZXJyLnN0YWNrKSB8fCBlcnIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0STE4bk91dGZpbGUoZm9ybWF0OiBzdHJpbmcpIHtcbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgcmV0dXJuICdtZXNzYWdlcy54bWInO1xuICAgIGNhc2UgJ3hsZic6XG4gICAgY2FzZSAneGxpZic6XG4gICAgY2FzZSAneGxpZmYnOlxuICAgIGNhc2UgJ3hsZjInOlxuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgICByZXR1cm4gJ21lc3NhZ2VzLnhsZic7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgZm9ybWF0IFwiJHtmb3JtYXR9XCJgKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBFeHRyYWN0STE4bkJ1aWxkZXI7XG4iXX0=