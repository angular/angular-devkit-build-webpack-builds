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
        const browserTargetOptions = { project, target: targetName, configuration, overrides };
        const browserTarget = this.context.architect
            .getTarget(browserTargetOptions);
        return this.context.architect.getBuilderDescription(browserTarget).pipe(operators_1.concatMap(browserDescription => this.context.architect.validateBuilderOptions(browserTarget, browserDescription)), operators_1.concatMap((validatedBrowserOptions) => new Observable_1.Observable(obs => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2V4dHJhY3QtaTE4bi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUdILDZCQUE2QjtBQUM3QixnREFBNkM7QUFDN0MsOENBQTJDO0FBQzNDLG1DQUFtQztBQUNuQyw2RUFBMEY7QUFDMUYsZ0VBQWtHO0FBQ2xHLHdDQUFtRTtBQUNuRSxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFXdEM7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLE1BQXlDO1FBQzNDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDL0IsTUFBTSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxDQUFDLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUUsd0NBQXdDO1FBQ3hDLE1BQU0sU0FBUyxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBRW5DLE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDdkYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTO2FBQ3pDLFNBQVMsQ0FBd0Isb0JBQW9CLENBQUMsQ0FBQztRQUUxRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUNyRSxxQkFBUyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsc0JB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Q0FBQztDQUNGO0FBeEVELGdEQXdFQztBQUVELHdCQUF3QixNQUFjO0lBQ3BDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDZixLQUFLLEtBQUs7WUFDUixNQUFNLENBQUMsY0FBYyxDQUFDO1FBQ3hCLEtBQUssS0FBSyxDQUFDO1FBQ1gsS0FBSyxNQUFNLENBQUM7UUFDWixLQUFLLE9BQU8sQ0FBQztRQUNiLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxRQUFRO1lBQ1gsTUFBTSxDQUFDLGNBQWMsQ0FBQztRQUN4QjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDdEQsQ0FBQztBQUNILENBQUM7QUFFRCxrQkFBZSxrQkFBa0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQnVpbGRFdmVudCwgQnVpbGRlciwgQnVpbGRlckNvbnRleHQsIFRhcmdldCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgY29uY2F0TWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IGdldFdlYnBhY2tTdGF0c0NvbmZpZyB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MvdXRpbHMnO1xuaW1wb3J0IHsgc3RhdHNFcnJvcnNUb1N0cmluZywgc3RhdHNXYXJuaW5nc1RvU3RyaW5nIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3N0YXRzJztcbmltcG9ydCB7IEJyb3dzZXJCdWlsZGVyLCBCcm93c2VyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuLi9icm93c2VyJztcbmNvbnN0IE1lbW9yeUZTID0gcmVxdWlyZSgnbWVtb3J5LWZzJyk7XG5cblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYWN0STE4bkJ1aWxkZXJPcHRpb25zIHtcbiAgYnJvd3NlclRhcmdldDogc3RyaW5nO1xuICBpMThuRm9ybWF0OiBzdHJpbmc7XG4gIGkxOG5Mb2NhbGU6IHN0cmluZztcbiAgb3V0cHV0UGF0aD86IHN0cmluZztcbiAgb3V0RmlsZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEV4dHJhY3RJMThuQnVpbGRlciBpbXBsZW1lbnRzIEJ1aWxkZXI8RXh0cmFjdEkxOG5CdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKHRhcmdldDogVGFyZ2V0PEV4dHJhY3RJMThuQnVpbGRlck9wdGlvbnM+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHRhcmdldC5vcHRpb25zO1xuICAgIGNvbnN0IFtwcm9qZWN0LCB0YXJnZXROYW1lLCBjb25maWd1cmF0aW9uXSA9IG9wdGlvbnMuYnJvd3NlclRhcmdldC5zcGxpdCgnOicpO1xuICAgIC8vIE92ZXJyaWRlIGJyb3dzZXIgYnVpbGQgd2F0Y2ggc2V0dGluZy5cbiAgICBjb25zdCBvdmVycmlkZXMgPSB7IHdhdGNoOiBmYWxzZSB9O1xuXG4gICAgY29uc3QgYnJvd3NlclRhcmdldE9wdGlvbnMgPSB7IHByb2plY3QsIHRhcmdldDogdGFyZ2V0TmFtZSwgY29uZmlndXJhdGlvbiwgb3ZlcnJpZGVzIH07XG4gICAgY29uc3QgYnJvd3NlclRhcmdldCA9IHRoaXMuY29udGV4dC5hcmNoaXRlY3RcbiAgICAgIC5nZXRUYXJnZXQ8QnJvd3NlckJ1aWxkZXJPcHRpb25zPihicm93c2VyVGFyZ2V0T3B0aW9ucyk7XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0LmFyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnJvd3NlclRhcmdldCkucGlwZShcbiAgICAgIGNvbmNhdE1hcChicm93c2VyRGVzY3JpcHRpb24gPT5cbiAgICAgICAgdGhpcy5jb250ZXh0LmFyY2hpdGVjdC52YWxpZGF0ZUJ1aWxkZXJPcHRpb25zKGJyb3dzZXJUYXJnZXQsIGJyb3dzZXJEZXNjcmlwdGlvbikpLFxuICAgICAgY29uY2F0TWFwKCh2YWxpZGF0ZWRCcm93c2VyT3B0aW9ucykgPT4gbmV3IE9ic2VydmFibGUob2JzID0+IHtcbiAgICAgICAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSB2YWxpZGF0ZWRCcm93c2VyT3B0aW9ucztcbiAgICAgICAgY29uc3QgYnJvd3NlckJ1aWxkZXIgPSBuZXcgQnJvd3NlckJ1aWxkZXIodGhpcy5jb250ZXh0KTtcblxuICAgICAgICAvLyBXZSBuZWVkIHRvIGRldGVybWluZSB0aGUgb3V0RmlsZSBuYW1lIHNvIHRoYXQgQW5ndWxhckNvbXBpbGVyIGNhbiByZXRyaWV2ZSBpdC5cbiAgICAgICAgbGV0IG91dEZpbGUgPSBvcHRpb25zLm91dEZpbGUgfHwgZ2V0STE4bk91dGZpbGUob3B0aW9ucy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3V0cHV0UGF0aCkge1xuICAgICAgICAgIC8vIEFuZ3VsYXJDb21waWxlclBsdWdpbiBkb2Vzbid0IHN1cHBvcnQgZ2VuRGlyIHNvIHdlIGhhdmUgdG8gYWRqdXN0IG91dEZpbGUgaW5zdGVhZC5cbiAgICAgICAgICBvdXRGaWxlID0gcGF0aC5qb2luKG9wdGlvbnMub3V0cHV0UGF0aCwgb3V0RmlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0aW5nIGkxOG4gdXNlcyB0aGUgYnJvd3NlciB0YXJnZXQgd2VicGFjayBjb25maWcgd2l0aCBzb21lIHNwZWNpZmljIG9wdGlvbnMuXG4gICAgICAgIGNvbnN0IHdlYnBhY2tDb25maWcgPSBicm93c2VyQnVpbGRlci5idWlsZFdlYnBhY2tDb25maWcodGFyZ2V0LnJvb3QsIHtcbiAgICAgICAgICAuLi5icm93c2VyT3B0aW9ucyxcbiAgICAgICAgICBvcHRpbWl6YXRpb25MZXZlbDogMCxcbiAgICAgICAgICBpMThuTG9jYWxlOiBvcHRpb25zLmkxOG5Mb2NhbGUsXG4gICAgICAgICAgaTE4bk91dEZvcm1hdDogb3B0aW9ucy5pMThuRm9ybWF0LFxuICAgICAgICAgIGkxOG5PdXRGaWxlOiBvdXRGaWxlLFxuICAgICAgICAgIGFvdDogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qgd2VicGFja0NvbXBpbGVyID0gd2VicGFjayh3ZWJwYWNrQ29uZmlnKTtcbiAgICAgICAgd2VicGFja0NvbXBpbGVyLm91dHB1dEZpbGVTeXN0ZW0gPSBuZXcgTWVtb3J5RlMoKTtcbiAgICAgICAgY29uc3Qgc3RhdHNDb25maWcgPSBnZXRXZWJwYWNrU3RhdHNDb25maWcoKTtcblxuICAgICAgICBjb25zdCBjYWxsYmFjazogd2VicGFjay5jb21waWxlci5Db21waWxlckNhbGxiYWNrID0gKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QganNvbiA9IHN0YXRzLnRvSnNvbigndmVyYm9zZScpO1xuICAgICAgICAgIGlmIChzdGF0cy5oYXNXYXJuaW5ncygpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oc3RhdHNXYXJuaW5nc1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHN0YXRzLmhhc0Vycm9ycygpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKHN0YXRzRXJyb3JzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6ICFzdGF0cy5oYXNFcnJvcnMoKSB9KTtcblxuICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgd2VicGFja0NvbXBpbGVyLnJ1bihjYWxsYmFjayk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICdcXG5BbiBlcnJvciBvY2N1cmVkIGR1cmluZyB0aGUgZXh0cmFjdGlvbjpcXG4nICsgKChlcnIgJiYgZXJyLnN0YWNrKSB8fCBlcnIpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9KSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEkxOG5PdXRmaWxlKGZvcm1hdDogc3RyaW5nKSB7XG4gIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgY2FzZSAneG1iJzpcbiAgICAgIHJldHVybiAnbWVzc2FnZXMueG1iJztcbiAgICBjYXNlICd4bGYnOlxuICAgIGNhc2UgJ3hsaWYnOlxuICAgIGNhc2UgJ3hsaWZmJzpcbiAgICBjYXNlICd4bGYyJzpcbiAgICBjYXNlICd4bGlmZjInOlxuICAgICAgcmV0dXJuICdtZXNzYWdlcy54bGYnO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGZvcm1hdCBcIiR7Zm9ybWF0fVwiYCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRXh0cmFjdEkxOG5CdWlsZGVyO1xuIl19