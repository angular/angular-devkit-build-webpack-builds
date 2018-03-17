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
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
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
            const webpackConfig = browserBuilder.buildWebpackConfig(root, projectRoot, Object.assign({}, browserOptions, { optimizationLevel: 0, i18nLocale: options.i18nLocale, i18nOutFormat: options.i18nFormat, i18nOutFile: outFile, aot: true }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2V4dHJhY3QtaTE4bi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQVFILCtDQUErQztBQUMvQyw2QkFBNkI7QUFDN0IsZ0RBQTZDO0FBQzdDLDhDQUFxRDtBQUNyRCxtQ0FBbUM7QUFDbkMsNkVBQTBGO0FBQzFGLGdFQUFrRztBQUNsRyx3Q0FBbUU7QUFDbkUsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBV3RDO0lBRUUsWUFBbUIsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFBSSxDQUFDO0lBRS9DLEdBQUcsQ0FBQyxhQUE4RDtRQUNoRSxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBQ3RDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUN6QyxNQUFNLFdBQVcsR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQUMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5RSx3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFFbkMsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUNwRixJQUFJLG9CQUFpRSxDQUFDO1FBRXRFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBd0IsaUJBQWlCLENB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LENBQUM7WUFDaEMsQ0FBQztZQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDUixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ3ZCLDZDQUE2QyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pGLENBQUM7Z0JBQ0QsTUFBTSxHQUFHLENBQUM7WUFDWixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNGO0FBN0VELGdEQTZFQztBQUVELHdCQUF3QixNQUFjO0lBQ3BDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDZixLQUFLLEtBQUs7WUFDUixNQUFNLENBQUMsY0FBYyxDQUFDO1FBQ3hCLEtBQUssS0FBSyxDQUFDO1FBQ1gsS0FBSyxNQUFNLENBQUM7UUFDWixLQUFLLE9BQU8sQ0FBQztRQUNiLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxRQUFRO1lBQ1gsTUFBTSxDQUFDLGNBQWMsQ0FBQztRQUN4QjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDdEQsQ0FBQztBQUNILENBQUM7QUFFRCxrQkFBZSxrQkFBa0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlcixcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IGdldFdlYnBhY2tTdGF0c0NvbmZpZyB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MvdXRpbHMnO1xuaW1wb3J0IHsgc3RhdHNFcnJvcnNUb1N0cmluZywgc3RhdHNXYXJuaW5nc1RvU3RyaW5nIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3N0YXRzJztcbmltcG9ydCB7IEJyb3dzZXJCdWlsZGVyLCBCcm93c2VyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuLi9icm93c2VyJztcbmNvbnN0IE1lbW9yeUZTID0gcmVxdWlyZSgnbWVtb3J5LWZzJyk7XG5cblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYWN0STE4bkJ1aWxkZXJPcHRpb25zIHtcbiAgYnJvd3NlclRhcmdldDogc3RyaW5nO1xuICBpMThuRm9ybWF0OiBzdHJpbmc7XG4gIGkxOG5Mb2NhbGU6IHN0cmluZztcbiAgb3V0cHV0UGF0aD86IHN0cmluZztcbiAgb3V0RmlsZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEV4dHJhY3RJMThuQnVpbGRlciBpbXBsZW1lbnRzIEJ1aWxkZXI8RXh0cmFjdEkxOG5CdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPEV4dHJhY3RJMThuQnVpbGRlck9wdGlvbnM+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGJ1aWxkZXJDb25maWcub3B0aW9ucztcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290O1xuICAgIGNvbnN0IHByb2plY3RSb290ID0gcmVzb2x2ZShyb290LCBidWlsZGVyQ29uZmlnLnJvb3QpO1xuICAgIGNvbnN0IFtwcm9qZWN0LCB0YXJnZXROYW1lLCBjb25maWd1cmF0aW9uXSA9IG9wdGlvbnMuYnJvd3NlclRhcmdldC5zcGxpdCgnOicpO1xuICAgIC8vIE92ZXJyaWRlIGJyb3dzZXIgYnVpbGQgd2F0Y2ggc2V0dGluZy5cbiAgICBjb25zdCBvdmVycmlkZXMgPSB7IHdhdGNoOiBmYWxzZSB9O1xuXG4gICAgY29uc3QgYnJvd3NlclRhcmdldFNwZWMgPSB7IHByb2plY3QsIHRhcmdldDogdGFyZ2V0TmFtZSwgY29uZmlndXJhdGlvbiwgb3ZlcnJpZGVzIH07XG4gICAgbGV0IGJyb3dzZXJCdWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxCcm93c2VyQnVpbGRlck9wdGlvbnM+O1xuXG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb248QnJvd3NlckJ1aWxkZXJPcHRpb25zPihicm93c2VyVGFyZ2V0U3BlYylcbiAgICAgIC5waXBlKFxuICAgICAgICB0YXAoY2ZnID0+IGJyb3dzZXJCdWlsZGVyQ29uZmlnID0gY2ZnKSxcbiAgICAgICAgY29uY2F0TWFwKGJ1aWxkZXJDb25maWcgPT4gdGhpcy5jb250ZXh0LmFyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmZpZykpLFxuICAgICAgICBjb25jYXRNYXAoYnJvd3NlckRlc2NyaXB0aW9uID0+XG4gICAgICAgICAgdGhpcy5jb250ZXh0LmFyY2hpdGVjdC52YWxpZGF0ZUJ1aWxkZXJPcHRpb25zKGJyb3dzZXJCdWlsZGVyQ29uZmlnLCBicm93c2VyRGVzY3JpcHRpb24pKSxcbiAgICAgICAgbWFwKGJyb3dzZXJCdWlsZGVyQ29uZmlnID0+IGJyb3dzZXJCdWlsZGVyQ29uZmlnLm9wdGlvbnMpLFxuICAgICAgICBjb25jYXRNYXAoKHZhbGlkYXRlZEJyb3dzZXJPcHRpb25zKSA9PiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgICAgIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gdmFsaWRhdGVkQnJvd3Nlck9wdGlvbnM7XG4gICAgICAgICAgY29uc3QgYnJvd3NlckJ1aWxkZXIgPSBuZXcgQnJvd3NlckJ1aWxkZXIodGhpcy5jb250ZXh0KTtcblxuICAgICAgICAgIC8vIFdlIG5lZWQgdG8gZGV0ZXJtaW5lIHRoZSBvdXRGaWxlIG5hbWUgc28gdGhhdCBBbmd1bGFyQ29tcGlsZXIgY2FuIHJldHJpZXZlIGl0LlxuICAgICAgICAgIGxldCBvdXRGaWxlID0gb3B0aW9ucy5vdXRGaWxlIHx8IGdldEkxOG5PdXRmaWxlKG9wdGlvbnMuaTE4bkZvcm1hdCk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMub3V0cHV0UGF0aCkge1xuICAgICAgICAgICAgLy8gQW5ndWxhckNvbXBpbGVyUGx1Z2luIGRvZXNuJ3Qgc3VwcG9ydCBnZW5EaXIgc28gd2UgaGF2ZSB0byBhZGp1c3Qgb3V0RmlsZSBpbnN0ZWFkLlxuICAgICAgICAgICAgb3V0RmlsZSA9IHBhdGguam9pbihvcHRpb25zLm91dHB1dFBhdGgsIG91dEZpbGUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEV4dHJhY3RpbmcgaTE4biB1c2VzIHRoZSBicm93c2VyIHRhcmdldCB3ZWJwYWNrIGNvbmZpZyB3aXRoIHNvbWUgc3BlY2lmaWMgb3B0aW9ucy5cbiAgICAgICAgICBjb25zdCB3ZWJwYWNrQ29uZmlnID0gYnJvd3NlckJ1aWxkZXIuYnVpbGRXZWJwYWNrQ29uZmlnKHJvb3QsIHByb2plY3RSb290LCB7XG4gICAgICAgICAgICAuLi5icm93c2VyT3B0aW9ucyxcbiAgICAgICAgICAgIG9wdGltaXphdGlvbkxldmVsOiAwLFxuICAgICAgICAgICAgaTE4bkxvY2FsZTogb3B0aW9ucy5pMThuTG9jYWxlLFxuICAgICAgICAgICAgaTE4bk91dEZvcm1hdDogb3B0aW9ucy5pMThuRm9ybWF0LFxuICAgICAgICAgICAgaTE4bk91dEZpbGU6IG91dEZpbGUsXG4gICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zdCB3ZWJwYWNrQ29tcGlsZXIgPSB3ZWJwYWNrKHdlYnBhY2tDb25maWcpO1xuICAgICAgICAgIHdlYnBhY2tDb21waWxlci5vdXRwdXRGaWxlU3lzdGVtID0gbmV3IE1lbW9yeUZTKCk7XG4gICAgICAgICAgY29uc3Qgc3RhdHNDb25maWcgPSBnZXRXZWJwYWNrU3RhdHNDb25maWcoKTtcblxuICAgICAgICAgIGNvbnN0IGNhbGxiYWNrOiB3ZWJwYWNrLmNvbXBpbGVyLkNvbXBpbGVyQ2FsbGJhY2sgPSAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGpzb24gPSBzdGF0cy50b0pzb24oJ3ZlcmJvc2UnKTtcbiAgICAgICAgICAgIGlmIChzdGF0cy5oYXNXYXJuaW5ncygpKSB7XG4gICAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihzdGF0c1dhcm5pbmdzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN0YXRzLmhhc0Vycm9ycygpKSB7XG4gICAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3Ioc3RhdHNFcnJvcnNUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6ICFzdGF0cy5oYXNFcnJvcnMoKSB9KTtcblxuICAgICAgICAgICAgb2JzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB3ZWJwYWNrQ29tcGlsZXIucnVuKGNhbGxiYWNrKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgICAnXFxuQW4gZXJyb3Igb2NjdXJlZCBkdXJpbmcgdGhlIGV4dHJhY3Rpb246XFxuJyArICgoZXJyICYmIGVyci5zdGFjaykgfHwgZXJyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9KSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEkxOG5PdXRmaWxlKGZvcm1hdDogc3RyaW5nKSB7XG4gIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgY2FzZSAneG1iJzpcbiAgICAgIHJldHVybiAnbWVzc2FnZXMueG1iJztcbiAgICBjYXNlICd4bGYnOlxuICAgIGNhc2UgJ3hsaWYnOlxuICAgIGNhc2UgJ3hsaWZmJzpcbiAgICBjYXNlICd4bGYyJzpcbiAgICBjYXNlICd4bGlmZjInOlxuICAgICAgcmV0dXJuICdtZXNzYWdlcy54bGYnO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGZvcm1hdCBcIiR7Zm9ybWF0fVwiYCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRXh0cmFjdEkxOG5CdWlsZGVyO1xuIl19