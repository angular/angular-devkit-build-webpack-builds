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
const Observable_1 = require("rxjs/Observable");
const concat_1 = require("rxjs/observable/concat");
const empty_1 = require("rxjs/observable/empty");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
const webpack_configs_1 = require("../angular-cli-files/models/webpack-configs");
const utils_1 = require("../angular-cli-files/models/webpack-configs/utils");
const read_tsconfig_1 = require("../angular-cli-files/utilities/read-tsconfig");
const require_project_module_1 = require("../angular-cli-files/utilities/require-project-module");
const stats_1 = require("../angular-cli-files/utilities/stats");
const webpackMerge = require('webpack-merge');
class BrowserBuilder {
    constructor(context) {
        this.context = context;
    }
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        return concat_1.concat(options.deleteOutputPath
            ? this._deleteOutputDir(root, core_1.normalize(options.outputPath))
            : empty_1.empty(), new Observable_1.Observable(obs => {
            // Ensure Build Optimizer is only used with AOT.
            if (options.buildOptimizer && !options.aot) {
                throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
            }
            let webpackConfig;
            try {
                webpackConfig = this.buildWebpackConfig(root, projectRoot, options);
            }
            catch (e) {
                // TODO: why do I have to catch this error? I thought throwing inside an observable
                // always got converted into an error.
                obs.error(e);
                return;
            }
            const webpackCompiler = webpack(webpackConfig);
            const statsConfig = utils_1.getWebpackStatsConfig(options.verbose);
            const callback = (err, stats) => {
                if (err) {
                    return obs.error(err);
                }
                const json = stats.toJson(statsConfig);
                if (options.verbose) {
                    this.context.logger.info(stats.toString(statsConfig));
                }
                else {
                    this.context.logger.info(stats_1.statsToString(json, statsConfig));
                }
                if (stats.hasWarnings()) {
                    this.context.logger.warn(stats_1.statsWarningsToString(json, statsConfig));
                }
                if (stats.hasErrors()) {
                    this.context.logger.error(stats_1.statsErrorsToString(json, statsConfig));
                }
                obs.next({ success: !stats.hasErrors() });
                if (options.watch) {
                    // Never complete on watch mode.
                    return;
                }
                else {
                    // if (!!app.serviceWorker && runTaskOptions.target === 'production' &&
                    //   usesServiceWorker(this.project.root) && runTaskOptions.serviceWorker !== false) {
                    //   const appRoot = path.resolve(this.project.root, app.root);
                    //   augmentAppWithServiceWorker(this.project.root, appRoot, path.resolve(outputPath),
                    //     runTaskOptions.baseHref || '/')
                    //     .then(() => resolve(), (err: any) => reject(err));
                    // }
                    obs.complete();
                }
            };
            try {
                if (options.watch) {
                    const watching = webpackCompiler.watch({ poll: options.poll }, callback);
                    // Teardown logic. Close the watcher when unsubscribed from.
                    return () => watching.close(() => { });
                }
                else {
                    webpackCompiler.run(callback);
                }
            }
            catch (err) {
                if (err) {
                    this.context.logger.error('\nAn error occured during the build:\n' + ((err && err.stack) || err));
                }
                throw err;
            }
        }));
    }
    buildWebpackConfig(root, projectRoot, options) {
        let wco;
        // TODO: make target defaults into configurations instead
        // options = this.addTargetDefaults(options);
        const tsconfigPath = core_1.normalize(core_1.resolve(root, core_1.normalize(options.tsConfig)));
        const tsConfig = read_tsconfig_1.readTsconfig(core_1.getSystemPath(tsconfigPath));
        const projectTs = require_project_module_1.requireProjectModule(core_1.getSystemPath(projectRoot), 'typescript');
        const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
            && tsConfig.options.target !== projectTs.ScriptTarget.ES5;
        // TODO: inside the configs, always use the project root and not the workspace root.
        // Until then we have to pretend the app root is relative (``) but the same as `projectRoot`.
        options.root = ''; // tslint:disable-line:no-any
        wco = {
            root: core_1.getSystemPath(root),
            projectRoot: core_1.getSystemPath(projectRoot),
            // TODO: use only this.options, it contains all flags and configs items already.
            buildOptions: options,
            appConfig: options,
            tsConfig,
            supportES2015,
        };
        // TODO: add the old dev options as the default, and the prod one as a configuration:
        // development: {
        //   environment: 'dev',
        //   outputHashing: 'media',
        //   sourcemaps: true,
        //   extractCss: false,
        //   namedChunks: true,
        //   aot: false,
        //   vendorChunk: true,
        //   buildOptimizer: false,
        // },
        // production: {
        //   environment: 'prod',
        //   outputHashing: 'all',
        //   sourcemaps: false,
        //   extractCss: true,
        //   namedChunks: false,
        //   aot: true,
        //   extractLicenses: true,
        //   vendorChunk: false,
        //   buildOptimizer: buildOptions.aot !== false,
        // }
        const webpackConfigs = [
            webpack_configs_1.getCommonConfig(wco),
            webpack_configs_1.getBrowserConfig(wco),
            webpack_configs_1.getStylesConfig(wco),
        ];
        if (wco.appConfig.main || wco.appConfig.polyfills) {
            const typescriptConfigPartial = wco.buildOptions.aot
                ? webpack_configs_1.getAotConfig(wco, this.context.host)
                : webpack_configs_1.getNonAotConfig(wco, this.context.host);
            webpackConfigs.push(typescriptConfigPartial);
        }
        return webpackMerge(webpackConfigs);
    }
    _deleteOutputDir(root, outputPath) {
        const resolvedOutputPath = core_1.resolve(root, outputPath);
        if (resolvedOutputPath === root) {
            throw new Error('Output path MUST not be project root directory!');
        }
        return this.context.host.exists(resolvedOutputPath).pipe(operators_1.switchMap(exists => {
            if (exists) {
                return this.context.host.delete(resolvedOutputPath);
            }
            else {
                return empty_1.empty();
            }
        }), operators_1.ignoreElements());
    }
}
exports.BrowserBuilder = BrowserBuilder;
exports.default = BrowserBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFRSCwrQ0FBMEY7QUFFMUYsZ0RBQTZDO0FBQzdDLG1EQUFvRTtBQUNwRSxpREFBOEM7QUFDOUMsOENBQTJEO0FBRTNELG1DQUFtQztBQUNuQyxpRkFNcUQ7QUFDckQsNkVBQTBGO0FBQzFGLGdGQUE0RTtBQUM1RSxrR0FBNkY7QUFDN0YsZ0VBSThDO0FBQzlDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQW9GOUM7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLGFBQTBEO1FBQzVELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRELE1BQU0sQ0FBQyxlQUFnQixDQUNyQixPQUFPLENBQUMsZ0JBQWdCO1lBQ3RCLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQyxhQUFLLEVBQWMsRUFDdkIsSUFBSSx1QkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ25CLGdEQUFnRDtZQUNoRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sSUFBSSxL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dUIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUFVLEVBQUUsVUFBZ0I7UUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUN0RCxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3RELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixNQUFNLENBQUMsYUFBSyxFQUFRLENBQUM7WUFDdkIsQ0FBQztRQUNILENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTlLRCx3Q0E4S0M7QUFFRCxrQkFBZSxjQUFjLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBCdWlsZGVyQ29udGV4dCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBQYXRoLCBnZXRTeXN0ZW1QYXRoLCBub3JtYWxpemUsIHJlc29sdmUsIHZpcnR1YWxGcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgY29uY2F0IGFzIGNvbmNhdE9ic2VydmFibGUgfSBmcm9tICdyeGpzL29ic2VydmFibGUvY29uY2F0JztcbmltcG9ydCB7IGVtcHR5IH0gZnJvbSAncnhqcy9vYnNlcnZhYmxlL2VtcHR5JztcbmltcG9ydCB7IGlnbm9yZUVsZW1lbnRzLCBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge1xuICBnZXRBb3RDb25maWcsXG4gIGdldEJyb3dzZXJDb25maWcsXG4gIGdldENvbW1vbkNvbmZpZyxcbiAgZ2V0Tm9uQW90Q29uZmlnLFxuICBnZXRTdHlsZXNDb25maWcsXG59IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MnO1xuaW1wb3J0IHsgZ2V0V2VicGFja1N0YXRzQ29uZmlnIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy91dGlscyc7XG5pbXBvcnQgeyByZWFkVHNjb25maWcgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVhZC10c2NvbmZpZyc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7XG4gIHN0YXRzRXJyb3JzVG9TdHJpbmcsXG4gIHN0YXRzVG9TdHJpbmcsXG4gIHN0YXRzV2FybmluZ3NUb1N0cmluZyxcbn0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3N0YXRzJztcbmNvbnN0IHdlYnBhY2tNZXJnZSA9IHJlcXVpcmUoJ3dlYnBhY2stbWVyZ2UnKTtcblxuXG4vLyBUT0RPOiBVc2UgcXVpY2t0eXBlIHRvIGJ1aWxkIG91ciBUeXBlU2NyaXB0IGludGVyZmFjZXMgZnJvbSB0aGUgSlNPTiBTY2hlbWEgaXRzZWxmLCBpblxuLy8gdGhlIGJ1aWxkIHN5c3RlbS5cbmV4cG9ydCBpbnRlcmZhY2UgQnJvd3NlckJ1aWxkZXJPcHRpb25zIHtcbiAgb3V0cHV0UGF0aDogc3RyaW5nO1xuICBpbmRleDogc3RyaW5nO1xuICBtYWluOiBzdHJpbmc7XG4gIHRzQ29uZmlnOiBzdHJpbmc7IC8vIHByZXZpb3VzbHkgJ3RzY29uZmlnJy5cbiAgYW90OiBib29sZWFuO1xuICB2ZW5kb3JDaHVuazogYm9vbGVhbjtcbiAgY29tbW9uQ2h1bms6IGJvb2xlYW47XG4gIHZlcmJvc2U6IGJvb2xlYW47XG4gIHByb2dyZXNzOiBib29sZWFuO1xuICBleHRyYWN0Q3NzOiBib29sZWFuO1xuICB3YXRjaDogYm9vbGVhbjtcbiAgb3V0cHV0SGFzaGluZzogJ25vbmUnIHwgJ2FsbCcgfCAnbWVkaWEnIHwgJ2J1bmRsZXMnO1xuICBkZWxldGVPdXRwdXRQYXRoOiBib29sZWFuO1xuICBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuO1xuICBleHRyYWN0TGljZW5zZXM6IGJvb2xlYW47XG4gIHNob3dDaXJjdWxhckRlcGVuZGVuY2llczogYm9vbGVhbjtcbiAgYnVpbGRPcHRpbWl6ZXI6IGJvb2xlYW47XG4gIG5hbWVkQ2h1bmtzOiBib29sZWFuO1xuICBzdWJyZXNvdXJjZUludGVncml0eTogYm9vbGVhbjtcbiAgc2VydmljZVdvcmtlcjogYm9vbGVhbjtcbiAgc2tpcEFwcFNoZWxsOiBib29sZWFuO1xuICBmb3JrVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHN0YXRzSnNvbjogYm9vbGVhbjtcbiAgbGF6eU1vZHVsZXM6IHN0cmluZ1tdO1xuXG4gIC8vIE9wdGlvbnMgd2l0aCBubyBkZWZhdWx0cy5cbiAgLy8gVE9ETzogcmVjb25zaWRlciB0aGlzIGxpc3QuXG4gIHBvbHlmaWxscz86IHN0cmluZztcbiAgYmFzZUhyZWY/OiBzdHJpbmc7XG4gIGRlcGxveVVybD86IHN0cmluZztcbiAgaTE4bkZpbGU/OiBzdHJpbmc7XG4gIGkxOG5Gb3JtYXQ/OiBzdHJpbmc7XG4gIGkxOG5PdXRGaWxlPzogc3RyaW5nO1xuICBpMThuT3V0Rm9ybWF0Pzogc3RyaW5nO1xuICBwb2xsPzogbnVtYmVyO1xuXG4gIC8vIEEgY291cGxlIG9mIG9wdGlvbnMgaGF2ZSBkaWZmZXJlbnQgbmFtZXMuXG4gIHNvdXJjZU1hcDogYm9vbGVhbjsgLy8gcHJldmlvdXNseSAnc291cmNlbWFwcycuXG4gIGV2YWxTb3VyY2VNYXA6IGJvb2xlYW47IC8vIHByZXZpb3VzbHkgJ2V2YWxTb3VyY2VtYXBzJy5cbiAgb3B0aW1pemF0aW9uOiBib29sZWFuOyAvLyBwcmV2aW91c2x5ICd0YXJnZXQnLlxuICBpMThuTG9jYWxlPzogc3RyaW5nOyAvLyBwcmV2aW91c2x5ICdsb2NhbGUnLlxuICBpMThuTWlzc2luZ1RyYW5zbGF0aW9uPzogc3RyaW5nOyAvLyBwcmV2aW91c2x5ICdtaXNzaW5nVHJhbnNsYXRpb24nLlxuXG4gIC8vIFRoZXNlIG9wdGlvbnMgd2VyZSBub3QgYXZhaWxhYmxlIGFzIGZsYWdzLlxuICBhc3NldHM6IEFzc2V0UGF0dGVybltdO1xuICBzY3JpcHRzOiBFeHRyYUVudHJ5UG9pbnRbXTtcbiAgc3R5bGVzOiBFeHRyYUVudHJ5UG9pbnRbXTtcbiAgc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zOiB7IGluY2x1ZGVQYXRoczogc3RyaW5nW10gfTtcblxuICAvLyBTb21lIG9wdGlvbnMgYXJlIG5vdCBuZWVkZWQgYW55bW9yZS5cbiAgLy8gYXBwPzogc3RyaW5nOyAvLyBhcHBzIGFyZW4ndCB1c2VkIHdpdGggYnVpbGQgZmFjYWRlXG5cbiAgLy8gVE9ETzogZmlndXJlIG91dCB3aGF0IHRvIGRvIGFib3V0IHRoZXNlLlxuICBlbnZpcm9ubWVudD86IHN0cmluZzsgLy8gTWF5YmUgcmVwbGFjZSB3aXRoICdmaWxlUmVwbGFjZW1lbnQnIG9iamVjdD9cbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3NldFBhdHRlcm4ge1xuICBnbG9iOiBzdHJpbmc7XG4gIGlucHV0OiBzdHJpbmc7XG4gIG91dHB1dDogc3RyaW5nO1xuICBhbGxvd091dHNpZGVPdXREaXI6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFFbnRyeVBvaW50IHtcbiAgaW5wdXQ6IHN0cmluZztcbiAgb3V0cHV0Pzogc3RyaW5nO1xuICBsYXp5OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYnBhY2tDb25maWdPcHRpb25zIHtcbiAgcm9vdDogc3RyaW5nO1xuICBwcm9qZWN0Um9vdDogc3RyaW5nO1xuICBidWlsZE9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcbiAgYXBwQ29uZmlnOiBCcm93c2VyQnVpbGRlck9wdGlvbnM7XG4gIHRzQ29uZmlnOiB0cy5QYXJzZWRDb21tYW5kTGluZTtcbiAgc3VwcG9ydEVTMjAxNTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEJyb3dzZXJCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxCcm93c2VyQnVpbGRlck9wdGlvbnM+IHtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29udGV4dDogQnVpbGRlckNvbnRleHQpIHsgfVxuXG4gIHJ1bihidWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxCcm93c2VyQnVpbGRlck9wdGlvbnM+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGJ1aWxkZXJDb25maWcub3B0aW9ucztcbiAgICBjb25zdCByb290ID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290O1xuICAgIGNvbnN0IHByb2plY3RSb290ID0gcmVzb2x2ZShyb290LCBidWlsZGVyQ29uZmlnLnJvb3QpO1xuXG4gICAgcmV0dXJuIGNvbmNhdE9ic2VydmFibGUoXG4gICAgICBvcHRpb25zLmRlbGV0ZU91dHB1dFBhdGhcbiAgICAgICAgPyB0aGlzLl9kZWxldGVPdXRwdXREaXIocm9vdCwgbm9ybWFsaXplKG9wdGlvbnMub3V0cHV0UGF0aCkpXG4gICAgICAgIDogZW1wdHk8QnVpbGRFdmVudD4oKSxcbiAgICAgIG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICAgIC8vIEVuc3VyZSBCdWlsZCBPcHRpbWl6ZXIgaXMgb25seSB1c2VkIHdpdGggQU9ULlxuICAgICAgICBpZiAob3B0aW9ucy5idWlsZE9wdGltaXplciAmJiAhb3B0aW9ucy5hb3QpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBgLS1idWlsZC1vcHRpbWl6ZXJgIG9wdGlvbiBjYW5ub3QgYmUgdXNlZCB3aXRob3V0IGAtLWFvdGAuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgd2VicGFja0NvbmZpZztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB3ZWJwYWNrQ29uZmlnID0gdGhpcy5idWlsZFdlYnBhY2tDb25maWcocm9vdCwgcHJvamVjdFJvb3QsIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gVE9ETzogd2h5IGRvIEkgaGF2ZSB0byBjYXRjaCB0aGlzIGVycm9yPyBJIHRob3VnaHQgdGhyb3dpbmcgaW5zaWRlIGFuIG9ic2VydmFibGVcbiAgICAgICAgICAvLyBhbHdheXMgZ290IGNvbnZlcnRlZCBpbnRvIGFuIGVycm9yLlxuICAgICAgICAgIG9icy5lcnJvcihlKTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3ZWJwYWNrQ29tcGlsZXIgPSB3ZWJwYWNrKHdlYnBhY2tDb25maWcpO1xuICAgICAgICBjb25zdCBzdGF0c0NvbmZpZyA9IGdldFdlYnBhY2tTdGF0c0NvbmZpZyhvcHRpb25zLnZlcmJvc2UpO1xuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrOiB3ZWJwYWNrLmNvbXBpbGVyLkNvbXBpbGVyQ2FsbGJhY2sgPSAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBvYnMuZXJyb3IoZXJyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBqc29uID0gc3RhdHMudG9Kc29uKHN0YXRzQ29uZmlnKTtcbiAgICAgICAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oc3RhdHMudG9TdHJpbmcoc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHN0YXRzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc3RhdHMuaGFzV2FybmluZ3MoKSkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKHN0YXRzV2FybmluZ3NUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhdHMuaGFzRXJyb3JzKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3Ioc3RhdHNFcnJvcnNUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG9icy5uZXh0KHsgc3VjY2VzczogIXN0YXRzLmhhc0Vycm9ycygpIH0pO1xuXG4gICAgICAgICAgaWYgKG9wdGlvbnMud2F0Y2gpIHtcbiAgICAgICAgICAgIC8vIE5ldmVyIGNvbXBsZXRlIG9uIHdhdGNoIG1vZGUuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmICghIWFwcC5zZXJ2aWNlV29ya2VyICYmIHJ1blRhc2tPcHRpb25zLnRhcmdldCA9PT0gJ3Byb2R1Y3Rpb24nICYmXG4gICAgICAgICAgICAvLyAgIHVzZXNTZXJ2aWNlV29ya2VyKHRoaXMucHJvamVjdC5yb290KSAmJiBydW5UYXNrT3B0aW9ucy5zZXJ2aWNlV29ya2VyICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gICBjb25zdCBhcHBSb290ID0gcGF0aC5yZXNvbHZlKHRoaXMucHJvamVjdC5yb290LCBhcHAucm9vdCk7XG4gICAgICAgICAgICAvLyAgIGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlcih0aGlzLnByb2plY3Qucm9vdCwgYXBwUm9vdCwgcGF0aC5yZXNvbHZlKG91dHB1dFBhdGgpLFxuICAgICAgICAgICAgLy8gICAgIHJ1blRhc2tPcHRpb25zLmJhc2VIcmVmIHx8ICcvJylcbiAgICAgICAgICAgIC8vICAgICAudGhlbigoKSA9PiByZXNvbHZlKCksIChlcnI6IGFueSkgPT4gcmVqZWN0KGVycikpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgb2JzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMud2F0Y2gpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhdGNoaW5nID0gd2VicGFja0NvbXBpbGVyLndhdGNoKHsgcG9sbDogb3B0aW9ucy5wb2xsIH0sIGNhbGxiYWNrKTtcblxuICAgICAgICAgICAgLy8gVGVhcmRvd24gbG9naWMuIENsb3NlIHRoZSB3YXRjaGVyIHdoZW4gdW5zdWJzY3JpYmVkIGZyb20uXG4gICAgICAgICAgICByZXR1cm4gKCkgPT4gd2F0Y2hpbmcuY2xvc2UoKCkgPT4geyB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2VicGFja0NvbXBpbGVyLnJ1bihjYWxsYmFjayk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAnXFxuQW4gZXJyb3Igb2NjdXJlZCBkdXJpbmcgdGhlIGJ1aWxkOlxcbicgKyAoKGVyciAmJiBlcnIuc3RhY2spIHx8IGVycikpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBidWlsZFdlYnBhY2tDb25maWcocm9vdDogUGF0aCwgcHJvamVjdFJvb3Q6IFBhdGgsIG9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucykge1xuICAgIGxldCB3Y286IFdlYnBhY2tDb25maWdPcHRpb25zO1xuXG4gICAgLy8gVE9ETzogbWFrZSB0YXJnZXQgZGVmYXVsdHMgaW50byBjb25maWd1cmF0aW9ucyBpbnN0ZWFkXG4gICAgLy8gb3B0aW9ucyA9IHRoaXMuYWRkVGFyZ2V0RGVmYXVsdHMob3B0aW9ucyk7XG5cbiAgICBjb25zdCB0c2NvbmZpZ1BhdGggPSBub3JtYWxpemUocmVzb2x2ZShyb290LCBub3JtYWxpemUob3B0aW9ucy50c0NvbmZpZyBhcyBzdHJpbmcpKSk7XG4gICAgY29uc3QgdHNDb25maWcgPSByZWFkVHNjb25maWcoZ2V0U3lzdGVtUGF0aCh0c2NvbmZpZ1BhdGgpKTtcblxuICAgIGNvbnN0IHByb2plY3RUcyA9IHJlcXVpcmVQcm9qZWN0TW9kdWxlKGdldFN5c3RlbVBhdGgocHJvamVjdFJvb3QpLCAndHlwZXNjcmlwdCcpIGFzIHR5cGVvZiB0cztcblxuICAgIGNvbnN0IHN1cHBvcnRFUzIwMTUgPSB0c0NvbmZpZy5vcHRpb25zLnRhcmdldCAhPT0gcHJvamVjdFRzLlNjcmlwdFRhcmdldC5FUzNcbiAgICAgICYmIHRzQ29uZmlnLm9wdGlvbnMudGFyZ2V0ICE9PSBwcm9qZWN0VHMuU2NyaXB0VGFyZ2V0LkVTNTtcblxuXG4gICAgLy8gVE9ETzogaW5zaWRlIHRoZSBjb25maWdzLCBhbHdheXMgdXNlIHRoZSBwcm9qZWN0IHJvb3QgYW5kIG5vdCB0aGUgd29ya3NwYWNlIHJvb3QuXG4gICAgLy8gVW50aWwgdGhlbiB3ZSBoYXZlIHRvIHByZXRlbmQgdGhlIGFwcCByb290IGlzIHJlbGF0aXZlIChgYCkgYnV0IHRoZSBzYW1lIGFzIGBwcm9qZWN0Um9vdGAuXG4gICAgKG9wdGlvbnMgYXMgYW55KS5yb290ID0gJyc7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG5cbiAgICB3Y28gPSB7XG4gICAgICByb290OiBnZXRTeXN0ZW1QYXRoKHJvb3QpLFxuICAgICAgcHJvamVjdFJvb3Q6IGdldFN5c3RlbVBhdGgocHJvamVjdFJvb3QpLFxuICAgICAgLy8gVE9ETzogdXNlIG9ubHkgdGhpcy5vcHRpb25zLCBpdCBjb250YWlucyBhbGwgZmxhZ3MgYW5kIGNvbmZpZ3MgaXRlbXMgYWxyZWFkeS5cbiAgICAgIGJ1aWxkT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGFwcENvbmZpZzogb3B0aW9ucyxcbiAgICAgIHRzQ29uZmlnLFxuICAgICAgc3VwcG9ydEVTMjAxNSxcbiAgICB9O1xuXG5cbiAgICAvLyBUT0RPOiBhZGQgdGhlIG9sZCBkZXYgb3B0aW9ucyBhcyB0aGUgZGVmYXVsdCwgYW5kIHRoZSBwcm9kIG9uZSBhcyBhIGNvbmZpZ3VyYXRpb246XG4gICAgLy8gZGV2ZWxvcG1lbnQ6IHtcbiAgICAvLyAgIGVudmlyb25tZW50OiAnZGV2JyxcbiAgICAvLyAgIG91dHB1dEhhc2hpbmc6ICdtZWRpYScsXG4gICAgLy8gICBzb3VyY2VtYXBzOiB0cnVlLFxuICAgIC8vICAgZXh0cmFjdENzczogZmFsc2UsXG4gICAgLy8gICBuYW1lZENodW5rczogdHJ1ZSxcbiAgICAvLyAgIGFvdDogZmFsc2UsXG4gICAgLy8gICB2ZW5kb3JDaHVuazogdHJ1ZSxcbiAgICAvLyAgIGJ1aWxkT3B0aW1pemVyOiBmYWxzZSxcbiAgICAvLyB9LFxuICAgIC8vIHByb2R1Y3Rpb246IHtcbiAgICAvLyAgIGVudmlyb25tZW50OiAncHJvZCcsXG4gICAgLy8gICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAvLyAgIHNvdXJjZW1hcHM6IGZhbHNlLFxuICAgIC8vICAgZXh0cmFjdENzczogdHJ1ZSxcbiAgICAvLyAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAvLyAgIGFvdDogdHJ1ZSxcbiAgICAvLyAgIGV4dHJhY3RMaWNlbnNlczogdHJ1ZSxcbiAgICAvLyAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAvLyAgIGJ1aWxkT3B0aW1pemVyOiBidWlsZE9wdGlvbnMuYW90ICE9PSBmYWxzZSxcbiAgICAvLyB9XG5cbiAgICBjb25zdCB3ZWJwYWNrQ29uZmlnczoge31bXSA9IFtcbiAgICAgIGdldENvbW1vbkNvbmZpZyh3Y28pLFxuICAgICAgZ2V0QnJvd3NlckNvbmZpZyh3Y28pLFxuICAgICAgZ2V0U3R5bGVzQ29uZmlnKHdjbyksXG4gICAgXTtcblxuICAgIGlmICh3Y28uYXBwQ29uZmlnLm1haW4gfHwgd2NvLmFwcENvbmZpZy5wb2x5ZmlsbHMpIHtcbiAgICAgIGNvbnN0IHR5cGVzY3JpcHRDb25maWdQYXJ0aWFsID0gd2NvLmJ1aWxkT3B0aW9ucy5hb3RcbiAgICAgICAgPyBnZXRBb3RDb25maWcod2NvLCB0aGlzLmNvbnRleHQuaG9zdCBhcyB2aXJ0dWFsRnMuSG9zdDxmcy5TdGF0cz4pXG4gICAgICAgIDogZ2V0Tm9uQW90Q29uZmlnKHdjbywgdGhpcy5jb250ZXh0Lmhvc3QgYXMgdmlydHVhbEZzLkhvc3Q8ZnMuU3RhdHM+KTtcbiAgICAgIHdlYnBhY2tDb25maWdzLnB1c2godHlwZXNjcmlwdENvbmZpZ1BhcnRpYWwpO1xuICAgIH1cblxuICAgIHJldHVybiB3ZWJwYWNrTWVyZ2Uod2VicGFja0NvbmZpZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZGVsZXRlT3V0cHV0RGlyKHJvb3Q6IFBhdGgsIG91dHB1dFBhdGg6IFBhdGgpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICBjb25zdCByZXNvbHZlZE91dHB1dFBhdGggPSByZXNvbHZlKHJvb3QsIG91dHB1dFBhdGgpO1xuICAgIGlmIChyZXNvbHZlZE91dHB1dFBhdGggPT09IHJvb3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT3V0cHV0IHBhdGggTVVTVCBub3QgYmUgcHJvamVjdCByb290IGRpcmVjdG9yeSEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0Lmhvc3QuZXhpc3RzKHJlc29sdmVkT3V0cHV0UGF0aCkucGlwZShcbiAgICAgIHN3aXRjaE1hcChleGlzdHMgPT4ge1xuICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5ob3N0LmRlbGV0ZShyZXNvbHZlZE91dHB1dFBhdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBlbXB0eTx2b2lkPigpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKCksXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBCcm93c2VyQnVpbGRlcjtcbiJdfQ==