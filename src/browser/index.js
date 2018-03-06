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
const of_1 = require("rxjs/observable/of");
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
    run(target) {
        const options = target.options;
        // TODO: verify using of(null) to kickstart things is a pattern.
        return of_1.of(null).pipe(operators_1.concatMap(() => options.deleteOutputPath
            ? this._deleteOutputDir(target.root, core_1.normalize(options.outputPath))
            : of_1.of(null)), operators_1.concatMap(() => new Observable_1.Observable(obs => {
            // Ensure Build Optimizer is only used with AOT.
            if (options.buildOptimizer && !options.aot) {
                throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
            }
            let webpackConfig;
            try {
                webpackConfig = this.buildWebpackConfig(target.root, options);
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
        })));
    }
    buildWebpackConfig(root, options) {
        const systemRoot = core_1.getSystemPath(root);
        let wco;
        // TODO: make target defaults into configurations instead
        // options = this.addTargetDefaults(options);
        const tsconfigPath = core_1.normalize(core_1.resolve(root, core_1.normalize(options.tsConfig)));
        const tsConfig = read_tsconfig_1.readTsconfig(core_1.getSystemPath(tsconfigPath));
        const projectTs = require_project_module_1.requireProjectModule(systemRoot, 'typescript');
        const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
            && tsConfig.options.target !== projectTs.ScriptTarget.ES5;
        // TODO: inside the configs, always use the project root and not the workspace root.
        // Until then we have to pretend the app root is relative (``) but the same as `projectRoot`.
        options.root = ''; // tslint:disable-line:no-any
        wco = {
            projectRoot: systemRoot,
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
                ? webpack_configs_1.getAotConfig(wco)
                : webpack_configs_1.getNonAotConfig(wco);
            webpackConfigs.push(typescriptConfigPartial);
        }
        return webpackMerge(webpackConfigs);
    }
    _deleteOutputDir(root, outputPath) {
        const resolvedOutputPath = core_1.resolve(root, outputPath);
        if (resolvedOutputPath === root) {
            throw new Error('Output path MUST not be project root directory!');
        }
        return this.context.host.exists(resolvedOutputPath).pipe(operators_1.concatMap(exists => exists
            // TODO: remove this concat once host ops emit an event.
            ? this.context.host.delete(resolvedOutputPath).pipe(operators_1.concat(of_1.of(null)))
            // ? of(null)
            : of_1.of(null)));
    }
}
exports.BrowserBuilder = BrowserBuilder;
exports.default = BrowserBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFHSCwrQ0FBK0U7QUFDL0UsZ0RBQTZDO0FBQzdDLDJDQUF3QztBQUN4Qyw4Q0FBbUQ7QUFFbkQsbUNBQW1DO0FBQ25DLGlGQU1xRDtBQUNyRCw2RUFBMEY7QUFDMUYsZ0ZBQTRFO0FBQzVFLGtHQUE2RjtBQUM3RixnRUFJOEM7QUFDOUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBcUY5QztJQUVFLFlBQW1CLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUksQ0FBQztJQUUvQyxHQUFHLENBQUMsTUFBcUM7UUFDdkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUUvQixnRUFBZ0U7UUFDaEUsTUFBTSxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2xCLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQjtZQUN0QyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUNiLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSx1QkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLGdEQUFnRDtZQUNoRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztZ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TSxrQkFBa0IsR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUN0RCxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTTtZQUN4Qix3REFBd0Q7WUFDeEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBTSxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLGFBQWE7WUFDYixDQUFDLENBQUMsT0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ2QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFLRCx3Q0EwS0M7QUFFRCxrQkFBZSxjQUFjLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEJ1aWxkRXZlbnQsIEJ1aWxkZXIsIEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IFBhdGgsIGdldFN5c3RlbVBhdGgsIG5vcm1hbGl6ZSwgcmVzb2x2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgb2YgfSBmcm9tICdyeGpzL29ic2VydmFibGUvb2YnO1xuaW1wb3J0IHsgY29uY2F0LCBjb25jYXRNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge1xuICBnZXRBb3RDb25maWcsXG4gIGdldEJyb3dzZXJDb25maWcsXG4gIGdldENvbW1vbkNvbmZpZyxcbiAgZ2V0Tm9uQW90Q29uZmlnLFxuICBnZXRTdHlsZXNDb25maWcsXG59IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MnO1xuaW1wb3J0IHsgZ2V0V2VicGFja1N0YXRzQ29uZmlnIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy91dGlscyc7XG5pbXBvcnQgeyByZWFkVHNjb25maWcgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVhZC10c2NvbmZpZyc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7XG4gIHN0YXRzRXJyb3JzVG9TdHJpbmcsXG4gIHN0YXRzVG9TdHJpbmcsXG4gIHN0YXRzV2FybmluZ3NUb1N0cmluZyxcbn0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3N0YXRzJztcbmNvbnN0IHdlYnBhY2tNZXJnZSA9IHJlcXVpcmUoJ3dlYnBhY2stbWVyZ2UnKTtcblxuXG4vLyBUT0RPOiBVc2UgcXVpY2t0eXBlIHRvIGJ1aWxkIG91ciBUeXBlU2NyaXB0IGludGVyZmFjZXMgZnJvbSB0aGUgSlNPTiBTY2hlbWEgaXRzZWxmLCBpblxuLy8gdGhlIGJ1aWxkIHN5c3RlbS5cbmV4cG9ydCBpbnRlcmZhY2UgQnJvd3NlckJ1aWxkZXJPcHRpb25zIHtcbiAgb3V0cHV0UGF0aDogc3RyaW5nO1xuICBpbmRleDogc3RyaW5nO1xuICBtYWluOiBzdHJpbmc7XG4gIHRzQ29uZmlnOiBzdHJpbmc7IC8vIHByZXZpb3VzbHkgJ3RzY29uZmlnJy5cbiAgYW90OiBib29sZWFuO1xuICB2ZW5kb3JDaHVuazogYm9vbGVhbjtcbiAgY29tbW9uQ2h1bms6IGJvb2xlYW47XG4gIHZlcmJvc2U6IGJvb2xlYW47XG4gIHByb2dyZXNzOiBib29sZWFuO1xuICBleHRyYWN0Q3NzOiBib29sZWFuO1xuICBidW5kbGVEZXBlbmRlbmNpZXM6ICdub25lJyB8ICdhbGwnO1xuICB3YXRjaDogYm9vbGVhbjtcbiAgb3V0cHV0SGFzaGluZzogJ25vbmUnIHwgJ2FsbCcgfCAnbWVkaWEnIHwgJ2J1bmRsZXMnO1xuICBkZWxldGVPdXRwdXRQYXRoOiBib29sZWFuO1xuICBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuO1xuICBleHRyYWN0TGljZW5zZXM6IGJvb2xlYW47XG4gIHNob3dDaXJjdWxhckRlcGVuZGVuY2llczogYm9vbGVhbjtcbiAgYnVpbGRPcHRpbWl6ZXI6IGJvb2xlYW47XG4gIG5hbWVkQ2h1bmtzOiBib29sZWFuO1xuICBzdWJyZXNvdXJjZUludGVncml0eTogYm9vbGVhbjtcbiAgc2VydmljZVdvcmtlcjogYm9vbGVhbjtcbiAgc2tpcEFwcFNoZWxsOiBib29sZWFuO1xuICBmb3JrVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHN0YXRzSnNvbjogYm9vbGVhbjtcbiAgbGF6eU1vZHVsZXM6IHN0cmluZ1tdO1xuXG4gIC8vIE9wdGlvbnMgd2l0aCBubyBkZWZhdWx0cy5cbiAgLy8gVE9ETzogcmVjb25zaWRlciB0aGlzIGxpc3QuXG4gIHBvbHlmaWxscz86IHN0cmluZztcbiAgYmFzZUhyZWY/OiBzdHJpbmc7XG4gIGRlcGxveVVybD86IHN0cmluZztcbiAgaTE4bkZpbGU/OiBzdHJpbmc7XG4gIGkxOG5Gb3JtYXQ/OiBzdHJpbmc7XG4gIGkxOG5PdXRGaWxlPzogc3RyaW5nO1xuICBpMThuT3V0Rm9ybWF0Pzogc3RyaW5nO1xuICBwb2xsPzogbnVtYmVyO1xuXG4gIC8vIEEgY291cGxlIG9mIG9wdGlvbnMgaGF2ZSBkaWZmZXJlbnQgbmFtZXMuXG4gIHNvdXJjZU1hcDogYm9vbGVhbjsgLy8gcHJldmlvdXNseSAnc291cmNlbWFwcycuXG4gIGV2YWxTb3VyY2VNYXA6IGJvb2xlYW47IC8vIHByZXZpb3VzbHkgJ2V2YWxTb3VyY2VtYXBzJy5cbiAgb3B0aW1pemF0aW9uTGV2ZWw6IG51bWJlcjsgLy8gcHJldmlvdXNseSAndGFyZ2V0Jy5cbiAgaTE4bkxvY2FsZT86IHN0cmluZzsgLy8gcHJldmlvdXNseSAnbG9jYWxlJy5cbiAgaTE4bk1pc3NpbmdUcmFuc2xhdGlvbj86IHN0cmluZzsgLy8gcHJldmlvdXNseSAnbWlzc2luZ1RyYW5zbGF0aW9uJy5cblxuICAvLyBUaGVzZSBvcHRpb25zIHdlcmUgbm90IGF2YWlsYWJsZSBhcyBmbGFncy5cbiAgYXNzZXRzOiBBc3NldFBhdHRlcm5bXTtcbiAgc2NyaXB0czogRXh0cmFFbnRyeVBvaW50W107XG4gIHN0eWxlczogRXh0cmFFbnRyeVBvaW50W107XG4gIHN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uczogeyBpbmNsdWRlUGF0aHM6IHN0cmluZ1tdIH07XG4gIHBsYXRmb3JtOiAnYnJvd3NlcicgfCAnc2VydmVyJztcblxuICAvLyBTb21lIG9wdGlvbnMgYXJlIG5vdCBuZWVkZWQgYW55bW9yZS5cbiAgLy8gYXBwPzogc3RyaW5nOyAvLyBhcHBzIGFyZW4ndCB1c2VkIHdpdGggYnVpbGQgZmFjYWRlXG5cbiAgLy8gVE9ETzogZmlndXJlIG91dCB3aGF0IHRvIGRvIGFib3V0IHRoZXNlLlxuICBlbnZpcm9ubWVudD86IHN0cmluZzsgLy8gTWF5YmUgcmVwbGFjZSB3aXRoICdmaWxlUmVwbGFjZW1lbnQnIG9iamVjdD9cbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3NldFBhdHRlcm4ge1xuICBnbG9iOiBzdHJpbmc7XG4gIGlucHV0OiBzdHJpbmc7XG4gIG91dHB1dDogc3RyaW5nO1xuICBhbGxvd091dHNpZGVPdXREaXI6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFFbnRyeVBvaW50IHtcbiAgaW5wdXQ6IHN0cmluZztcbiAgb3V0cHV0Pzogc3RyaW5nO1xuICBsYXp5OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlYnBhY2tDb25maWdPcHRpb25zIHtcbiAgcHJvamVjdFJvb3Q6IHN0cmluZztcbiAgYnVpbGRPcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnM7XG4gIGFwcENvbmZpZzogQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuICB0c0NvbmZpZzogdHMuUGFyc2VkQ29tbWFuZExpbmU7XG4gIHN1cHBvcnRFUzIwMTU6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBCcm93c2VyQnVpbGRlciBpbXBsZW1lbnRzIEJ1aWxkZXI8QnJvd3NlckJ1aWxkZXJPcHRpb25zPiB7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KSB7IH1cblxuICBydW4odGFyZ2V0OiBUYXJnZXQ8QnJvd3NlckJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB0YXJnZXQub3B0aW9ucztcblxuICAgIC8vIFRPRE86IHZlcmlmeSB1c2luZyBvZihudWxsKSB0byBraWNrc3RhcnQgdGhpbmdzIGlzIGEgcGF0dGVybi5cbiAgICByZXR1cm4gb2YobnVsbCkucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBvcHRpb25zLmRlbGV0ZU91dHB1dFBhdGhcbiAgICAgICAgPyB0aGlzLl9kZWxldGVPdXRwdXREaXIodGFyZ2V0LnJvb3QsIG5vcm1hbGl6ZShvcHRpb25zLm91dHB1dFBhdGgpKVxuICAgICAgICA6IG9mKG51bGwpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgICAvLyBFbnN1cmUgQnVpbGQgT3B0aW1pemVyIGlzIG9ubHkgdXNlZCB3aXRoIEFPVC5cbiAgICAgICAgaWYgKG9wdGlvbnMuYnVpbGRPcHRpbWl6ZXIgJiYgIW9wdGlvbnMuYW90KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgYC0tYnVpbGQtb3B0aW1pemVyYCBvcHRpb24gY2Fubm90IGJlIHVzZWQgd2l0aG91dCBgLS1hb3RgLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHdlYnBhY2tDb25maWc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgd2VicGFja0NvbmZpZyA9IHRoaXMuYnVpbGRXZWJwYWNrQ29uZmlnKHRhcmdldC5yb290LCBvcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFRPRE86IHdoeSBkbyBJIGhhdmUgdG8gY2F0Y2ggdGhpcyBlcnJvcj8gSSB0aG91Z2h0IHRocm93aW5nIGluc2lkZSBhbiBvYnNlcnZhYmxlXG4gICAgICAgICAgLy8gYWx3YXlzIGdvdCBjb252ZXJ0ZWQgaW50byBhbiBlcnJvci5cbiAgICAgICAgICBvYnMuZXJyb3IoZSk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2VicGFja0NvbXBpbGVyID0gd2VicGFjayh3ZWJwYWNrQ29uZmlnKTtcbiAgICAgICAgY29uc3Qgc3RhdHNDb25maWcgPSBnZXRXZWJwYWNrU3RhdHNDb25maWcob3B0aW9ucy52ZXJib3NlKTtcblxuICAgICAgICBjb25zdCBjYWxsYmFjazogd2VicGFjay5jb21waWxlci5Db21waWxlckNhbGxiYWNrID0gKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QganNvbiA9IHN0YXRzLnRvSnNvbihzdGF0c0NvbmZpZyk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHN0YXRzLnRvU3RyaW5nKHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0c1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHN0YXRzLmhhc1dhcm5pbmdzKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihzdGF0c1dhcm5pbmdzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRzLmhhc0Vycm9ycygpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKHN0YXRzRXJyb3JzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6ICFzdGF0cy5oYXNFcnJvcnMoKSB9KTtcblxuICAgICAgICAgIGlmIChvcHRpb25zLndhdGNoKSB7XG4gICAgICAgICAgICAvLyBOZXZlciBjb21wbGV0ZSBvbiB3YXRjaCBtb2RlLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpZiAoISFhcHAuc2VydmljZVdvcmtlciAmJiBydW5UYXNrT3B0aW9ucy50YXJnZXQgPT09ICdwcm9kdWN0aW9uJyAmJlxuICAgICAgICAgICAgLy8gICB1c2VzU2VydmljZVdvcmtlcih0aGlzLnByb2plY3Qucm9vdCkgJiYgcnVuVGFza09wdGlvbnMuc2VydmljZVdvcmtlciAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vICAgY29uc3QgYXBwUm9vdCA9IHBhdGgucmVzb2x2ZSh0aGlzLnByb2plY3Qucm9vdCwgYXBwLnJvb3QpO1xuICAgICAgICAgICAgLy8gICBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXIodGhpcy5wcm9qZWN0LnJvb3QsIGFwcFJvb3QsIHBhdGgucmVzb2x2ZShvdXRwdXRQYXRoKSxcbiAgICAgICAgICAgIC8vICAgICBydW5UYXNrT3B0aW9ucy5iYXNlSHJlZiB8fCAnLycpXG4gICAgICAgICAgICAvLyAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZSgpLCAoZXJyOiBhbnkpID0+IHJlamVjdChlcnIpKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChvcHRpb25zLndhdGNoKSB7XG4gICAgICAgICAgICBjb25zdCB3YXRjaGluZyA9IHdlYnBhY2tDb21waWxlci53YXRjaCh7IHBvbGw6IG9wdGlvbnMucG9sbCB9LCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgIC8vIFRlYXJkb3duIGxvZ2ljLiBDbG9zZSB0aGUgd2F0Y2hlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgICAgICAgcmV0dXJuICgpID0+IHdhdGNoaW5nLmNsb3NlKCgpID0+IHsgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5ydW4oY2FsbGJhY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgJ1xcbkFuIGVycm9yIG9jY3VyZWQgZHVyaW5nIHRoZSBidWlsZDpcXG4nICsgKChlcnIgJiYgZXJyLnN0YWNrKSB8fCBlcnIpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgKTtcbiAgfVxuXG4gIGJ1aWxkV2VicGFja0NvbmZpZyhyb290OiBQYXRoLCBvcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnMpIHtcbiAgICBjb25zdCBzeXN0ZW1Sb290ID0gZ2V0U3lzdGVtUGF0aChyb290KTtcbiAgICBsZXQgd2NvOiBXZWJwYWNrQ29uZmlnT3B0aW9ucztcblxuICAgIC8vIFRPRE86IG1ha2UgdGFyZ2V0IGRlZmF1bHRzIGludG8gY29uZmlndXJhdGlvbnMgaW5zdGVhZFxuICAgIC8vIG9wdGlvbnMgPSB0aGlzLmFkZFRhcmdldERlZmF1bHRzKG9wdGlvbnMpO1xuXG4gICAgY29uc3QgdHNjb25maWdQYXRoID0gbm9ybWFsaXplKHJlc29sdmUocm9vdCwgbm9ybWFsaXplKG9wdGlvbnMudHNDb25maWcgYXMgc3RyaW5nKSkpO1xuICAgIGNvbnN0IHRzQ29uZmlnID0gcmVhZFRzY29uZmlnKGdldFN5c3RlbVBhdGgodHNjb25maWdQYXRoKSk7XG5cbiAgICBjb25zdCBwcm9qZWN0VHMgPSByZXF1aXJlUHJvamVjdE1vZHVsZShzeXN0ZW1Sb290LCAndHlwZXNjcmlwdCcpIGFzIHR5cGVvZiB0cztcblxuICAgIGNvbnN0IHN1cHBvcnRFUzIwMTUgPSB0c0NvbmZpZy5vcHRpb25zLnRhcmdldCAhPT0gcHJvamVjdFRzLlNjcmlwdFRhcmdldC5FUzNcbiAgICAgICYmIHRzQ29uZmlnLm9wdGlvbnMudGFyZ2V0ICE9PSBwcm9qZWN0VHMuU2NyaXB0VGFyZ2V0LkVTNTtcblxuXG4gICAgLy8gVE9ETzogaW5zaWRlIHRoZSBjb25maWdzLCBhbHdheXMgdXNlIHRoZSBwcm9qZWN0IHJvb3QgYW5kIG5vdCB0aGUgd29ya3NwYWNlIHJvb3QuXG4gICAgLy8gVW50aWwgdGhlbiB3ZSBoYXZlIHRvIHByZXRlbmQgdGhlIGFwcCByb290IGlzIHJlbGF0aXZlIChgYCkgYnV0IHRoZSBzYW1lIGFzIGBwcm9qZWN0Um9vdGAuXG4gICAgKG9wdGlvbnMgYXMgYW55KS5yb290ID0gJyc7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG5cbiAgICB3Y28gPSB7XG4gICAgICBwcm9qZWN0Um9vdDogc3lzdGVtUm9vdCxcbiAgICAgIC8vIFRPRE86IHVzZSBvbmx5IHRoaXMub3B0aW9ucywgaXQgY29udGFpbnMgYWxsIGZsYWdzIGFuZCBjb25maWdzIGl0ZW1zIGFscmVhZHkuXG4gICAgICBidWlsZE9wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBhcHBDb25maWc6IG9wdGlvbnMsXG4gICAgICB0c0NvbmZpZyxcbiAgICAgIHN1cHBvcnRFUzIwMTUsXG4gICAgfTtcblxuXG4gICAgLy8gVE9ETzogYWRkIHRoZSBvbGQgZGV2IG9wdGlvbnMgYXMgdGhlIGRlZmF1bHQsIGFuZCB0aGUgcHJvZCBvbmUgYXMgYSBjb25maWd1cmF0aW9uOlxuICAgIC8vIGRldmVsb3BtZW50OiB7XG4gICAgLy8gICBlbnZpcm9ubWVudDogJ2RldicsXG4gICAgLy8gICBvdXRwdXRIYXNoaW5nOiAnbWVkaWEnLFxuICAgIC8vICAgc291cmNlbWFwczogdHJ1ZSxcbiAgICAvLyAgIGV4dHJhY3RDc3M6IGZhbHNlLFxuICAgIC8vICAgbmFtZWRDaHVua3M6IHRydWUsXG4gICAgLy8gICBhb3Q6IGZhbHNlLFxuICAgIC8vICAgdmVuZG9yQ2h1bms6IHRydWUsXG4gICAgLy8gICBidWlsZE9wdGltaXplcjogZmFsc2UsXG4gICAgLy8gfSxcbiAgICAvLyBwcm9kdWN0aW9uOiB7XG4gICAgLy8gICBlbnZpcm9ubWVudDogJ3Byb2QnLFxuICAgIC8vICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgLy8gICBzb3VyY2VtYXBzOiBmYWxzZSxcbiAgICAvLyAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgLy8gICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgLy8gICBhb3Q6IHRydWUsXG4gICAgLy8gICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgLy8gICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgLy8gICBidWlsZE9wdGltaXplcjogYnVpbGRPcHRpb25zLmFvdCAhPT0gZmFsc2UsXG4gICAgLy8gfVxuXG4gICAgY29uc3Qgd2VicGFja0NvbmZpZ3M6IHt9W10gPSBbXG4gICAgICBnZXRDb21tb25Db25maWcod2NvKSxcbiAgICAgIGdldEJyb3dzZXJDb25maWcod2NvKSxcbiAgICAgIGdldFN0eWxlc0NvbmZpZyh3Y28pLFxuICAgIF07XG5cbiAgICBpZiAod2NvLmFwcENvbmZpZy5tYWluIHx8IHdjby5hcHBDb25maWcucG9seWZpbGxzKSB7XG4gICAgICBjb25zdCB0eXBlc2NyaXB0Q29uZmlnUGFydGlhbCA9IHdjby5idWlsZE9wdGlvbnMuYW90XG4gICAgICAgID8gZ2V0QW90Q29uZmlnKHdjbylcbiAgICAgICAgOiBnZXROb25Bb3RDb25maWcod2NvKTtcbiAgICAgIHdlYnBhY2tDb25maWdzLnB1c2godHlwZXNjcmlwdENvbmZpZ1BhcnRpYWwpO1xuICAgIH1cblxuICAgIHJldHVybiB3ZWJwYWNrTWVyZ2Uod2VicGFja0NvbmZpZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZGVsZXRlT3V0cHV0RGlyKHJvb3Q6IFBhdGgsIG91dHB1dFBhdGg6IFBhdGgpIHtcbiAgICBjb25zdCByZXNvbHZlZE91dHB1dFBhdGggPSByZXNvbHZlKHJvb3QsIG91dHB1dFBhdGgpO1xuICAgIGlmIChyZXNvbHZlZE91dHB1dFBhdGggPT09IHJvb3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT3V0cHV0IHBhdGggTVVTVCBub3QgYmUgcHJvamVjdCByb290IGRpcmVjdG9yeSEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0Lmhvc3QuZXhpc3RzKHJlc29sdmVkT3V0cHV0UGF0aCkucGlwZShcbiAgICAgIGNvbmNhdE1hcChleGlzdHMgPT4gZXhpc3RzXG4gICAgICAgIC8vIFRPRE86IHJlbW92ZSB0aGlzIGNvbmNhdCBvbmNlIGhvc3Qgb3BzIGVtaXQgYW4gZXZlbnQuXG4gICAgICAgID8gdGhpcy5jb250ZXh0Lmhvc3QuZGVsZXRlKHJlc29sdmVkT3V0cHV0UGF0aCkucGlwZShjb25jYXQob2YobnVsbCkpKVxuICAgICAgICAvLyA/IG9mKG51bGwpXG4gICAgICAgIDogb2YobnVsbCkpLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnJvd3NlckJ1aWxkZXI7XG4iXX0=