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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFRSCwrQ0FBK0U7QUFDL0UsZ0RBQTZDO0FBQzdDLDJDQUF3QztBQUN4Qyw4Q0FBbUQ7QUFFbkQsbUNBQW1DO0FBQ25DLGlGQU1xRDtBQUNyRCw2RUFBMEY7QUFDMUYsZ0ZBQTRFO0FBQzVFLGtHQUE2RjtBQUM3RixnRUFJOEM7QUFDOUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBcUY5QztJQUVFLFlBQW1CLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUksQ0FBQztJQUUvQyxHQUFHLENBQUMsTUFBbUQ7UUFDckQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUUvQixnRUFBZ0U7UUFDaEUsTUFBTSxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2xCLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQjtZQUN0QyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUNiLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSx1QkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLGdEQUFnRDtZQUNoRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztZ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TSxrQkFBa0IsR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUN0RCxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTTtZQUN4Qix3REFBd0Q7WUFDeEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBTSxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLGFBQWE7WUFDYixDQUFDLENBQUMsT0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ2QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFLRCx3Q0EwS0M7QUFFRCxrQkFBZSxjQUFjLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBCdWlsZGVyQ29udGV4dCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBQYXRoLCBnZXRTeXN0ZW1QYXRoLCBub3JtYWxpemUsIHJlc29sdmUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJztcbmltcG9ydCB7IG9mIH0gZnJvbSAncnhqcy9vYnNlcnZhYmxlL29mJztcbmltcG9ydCB7IGNvbmNhdCwgY29uY2F0TWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8taW1wbGljaXQtZGVwZW5kZW5jaWVzXG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtcbiAgZ2V0QW90Q29uZmlnLFxuICBnZXRCcm93c2VyQ29uZmlnLFxuICBnZXRDb21tb25Db25maWcsXG4gIGdldE5vbkFvdENvbmZpZyxcbiAgZ2V0U3R5bGVzQ29uZmlnLFxufSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzJztcbmltcG9ydCB7IGdldFdlYnBhY2tTdGF0c0NvbmZpZyB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MvdXRpbHMnO1xuaW1wb3J0IHsgcmVhZFRzY29uZmlnIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3JlYWQtdHNjb25maWcnO1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5pbXBvcnQge1xuICBzdGF0c0Vycm9yc1RvU3RyaW5nLFxuICBzdGF0c1RvU3RyaW5nLFxuICBzdGF0c1dhcm5pbmdzVG9TdHJpbmcsXG59IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9zdGF0cyc7XG5jb25zdCB3ZWJwYWNrTWVyZ2UgPSByZXF1aXJlKCd3ZWJwYWNrLW1lcmdlJyk7XG5cblxuLy8gVE9ETzogVXNlIHF1aWNrdHlwZSB0byBidWlsZCBvdXIgVHlwZVNjcmlwdCBpbnRlcmZhY2VzIGZyb20gdGhlIEpTT04gU2NoZW1hIGl0c2VsZiwgaW5cbi8vIHRoZSBidWlsZCBzeXN0ZW0uXG5leHBvcnQgaW50ZXJmYWNlIEJyb3dzZXJCdWlsZGVyT3B0aW9ucyB7XG4gIG91dHB1dFBhdGg6IHN0cmluZztcbiAgaW5kZXg6IHN0cmluZztcbiAgbWFpbjogc3RyaW5nO1xuICB0c0NvbmZpZzogc3RyaW5nOyAvLyBwcmV2aW91c2x5ICd0c2NvbmZpZycuXG4gIGFvdDogYm9vbGVhbjtcbiAgdmVuZG9yQ2h1bms6IGJvb2xlYW47XG4gIGNvbW1vbkNodW5rOiBib29sZWFuO1xuICB2ZXJib3NlOiBib29sZWFuO1xuICBwcm9ncmVzczogYm9vbGVhbjtcbiAgZXh0cmFjdENzczogYm9vbGVhbjtcbiAgYnVuZGxlRGVwZW5kZW5jaWVzOiAnbm9uZScgfCAnYWxsJztcbiAgd2F0Y2g6IGJvb2xlYW47XG4gIG91dHB1dEhhc2hpbmc6ICdub25lJyB8ICdhbGwnIHwgJ21lZGlhJyB8ICdidW5kbGVzJztcbiAgZGVsZXRlT3V0cHV0UGF0aDogYm9vbGVhbjtcbiAgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbjtcbiAgZXh0cmFjdExpY2Vuc2VzOiBib29sZWFuO1xuICBzaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXM6IGJvb2xlYW47XG4gIGJ1aWxkT3B0aW1pemVyOiBib29sZWFuO1xuICBuYW1lZENodW5rczogYm9vbGVhbjtcbiAgc3VicmVzb3VyY2VJbnRlZ3JpdHk6IGJvb2xlYW47XG4gIHNlcnZpY2VXb3JrZXI6IGJvb2xlYW47XG4gIHNraXBBcHBTaGVsbDogYm9vbGVhbjtcbiAgZm9ya1R5cGVDaGVja2VyOiBib29sZWFuO1xuICBzdGF0c0pzb246IGJvb2xlYW47XG4gIGxhenlNb2R1bGVzOiBzdHJpbmdbXTtcblxuICAvLyBPcHRpb25zIHdpdGggbm8gZGVmYXVsdHMuXG4gIC8vIFRPRE86IHJlY29uc2lkZXIgdGhpcyBsaXN0LlxuICBwb2x5ZmlsbHM/OiBzdHJpbmc7XG4gIGJhc2VIcmVmPzogc3RyaW5nO1xuICBkZXBsb3lVcmw/OiBzdHJpbmc7XG4gIGkxOG5GaWxlPzogc3RyaW5nO1xuICBpMThuRm9ybWF0Pzogc3RyaW5nO1xuICBpMThuT3V0RmlsZT86IHN0cmluZztcbiAgaTE4bk91dEZvcm1hdD86IHN0cmluZztcbiAgcG9sbD86IG51bWJlcjtcblxuICAvLyBBIGNvdXBsZSBvZiBvcHRpb25zIGhhdmUgZGlmZmVyZW50IG5hbWVzLlxuICBzb3VyY2VNYXA6IGJvb2xlYW47IC8vIHByZXZpb3VzbHkgJ3NvdXJjZW1hcHMnLlxuICBldmFsU291cmNlTWFwOiBib29sZWFuOyAvLyBwcmV2aW91c2x5ICdldmFsU291cmNlbWFwcycuXG4gIG9wdGltaXphdGlvbkxldmVsOiBudW1iZXI7IC8vIHByZXZpb3VzbHkgJ3RhcmdldCcuXG4gIGkxOG5Mb2NhbGU/OiBzdHJpbmc7IC8vIHByZXZpb3VzbHkgJ2xvY2FsZScuXG4gIGkxOG5NaXNzaW5nVHJhbnNsYXRpb24/OiBzdHJpbmc7IC8vIHByZXZpb3VzbHkgJ21pc3NpbmdUcmFuc2xhdGlvbicuXG5cbiAgLy8gVGhlc2Ugb3B0aW9ucyB3ZXJlIG5vdCBhdmFpbGFibGUgYXMgZmxhZ3MuXG4gIGFzc2V0czogQXNzZXRQYXR0ZXJuW107XG4gIHNjcmlwdHM6IEV4dHJhRW50cnlQb2ludFtdO1xuICBzdHlsZXM6IEV4dHJhRW50cnlQb2ludFtdO1xuICBzdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM6IHsgaW5jbHVkZVBhdGhzOiBzdHJpbmdbXSB9O1xuICBwbGF0Zm9ybTogJ2Jyb3dzZXInIHwgJ3NlcnZlcic7XG5cbiAgLy8gU29tZSBvcHRpb25zIGFyZSBub3QgbmVlZGVkIGFueW1vcmUuXG4gIC8vIGFwcD86IHN0cmluZzsgLy8gYXBwcyBhcmVuJ3QgdXNlZCB3aXRoIGJ1aWxkIGZhY2FkZVxuXG4gIC8vIFRPRE86IGZpZ3VyZSBvdXQgd2hhdCB0byBkbyBhYm91dCB0aGVzZS5cbiAgZW52aXJvbm1lbnQ/OiBzdHJpbmc7IC8vIE1heWJlIHJlcGxhY2Ugd2l0aCAnZmlsZVJlcGxhY2VtZW50JyBvYmplY3Q/XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXNzZXRQYXR0ZXJuIHtcbiAgZ2xvYjogc3RyaW5nO1xuICBpbnB1dDogc3RyaW5nO1xuICBvdXRwdXQ6IHN0cmluZztcbiAgYWxsb3dPdXRzaWRlT3V0RGlyOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhRW50cnlQb2ludCB7XG4gIGlucHV0OiBzdHJpbmc7XG4gIG91dHB1dD86IHN0cmluZztcbiAgbGF6eTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJwYWNrQ29uZmlnT3B0aW9ucyB7XG4gIHByb2plY3RSb290OiBzdHJpbmc7XG4gIGJ1aWxkT3B0aW9uczogQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuICBhcHBDb25maWc6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcbiAgdHNDb25maWc6IHRzLlBhcnNlZENvbW1hbmRMaW5lO1xuICBzdXBwb3J0RVMyMDE1OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgQnJvd3NlckJ1aWxkZXIgaW1wbGVtZW50cyBCdWlsZGVyPEJyb3dzZXJCdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKHRhcmdldDogQnVpbGRlckNvbmZpZ3VyYXRpb248QnJvd3NlckJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB0YXJnZXQub3B0aW9ucztcblxuICAgIC8vIFRPRE86IHZlcmlmeSB1c2luZyBvZihudWxsKSB0byBraWNrc3RhcnQgdGhpbmdzIGlzIGEgcGF0dGVybi5cbiAgICByZXR1cm4gb2YobnVsbCkucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBvcHRpb25zLmRlbGV0ZU91dHB1dFBhdGhcbiAgICAgICAgPyB0aGlzLl9kZWxldGVPdXRwdXREaXIodGFyZ2V0LnJvb3QsIG5vcm1hbGl6ZShvcHRpb25zLm91dHB1dFBhdGgpKVxuICAgICAgICA6IG9mKG51bGwpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgICAvLyBFbnN1cmUgQnVpbGQgT3B0aW1pemVyIGlzIG9ubHkgdXNlZCB3aXRoIEFPVC5cbiAgICAgICAgaWYgKG9wdGlvbnMuYnVpbGRPcHRpbWl6ZXIgJiYgIW9wdGlvbnMuYW90KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgYC0tYnVpbGQtb3B0aW1pemVyYCBvcHRpb24gY2Fubm90IGJlIHVzZWQgd2l0aG91dCBgLS1hb3RgLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHdlYnBhY2tDb25maWc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgd2VicGFja0NvbmZpZyA9IHRoaXMuYnVpbGRXZWJwYWNrQ29uZmlnKHRhcmdldC5yb290LCBvcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFRPRE86IHdoeSBkbyBJIGhhdmUgdG8gY2F0Y2ggdGhpcyBlcnJvcj8gSSB0aG91Z2h0IHRocm93aW5nIGluc2lkZSBhbiBvYnNlcnZhYmxlXG4gICAgICAgICAgLy8gYWx3YXlzIGdvdCBjb252ZXJ0ZWQgaW50byBhbiBlcnJvci5cbiAgICAgICAgICBvYnMuZXJyb3IoZSk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2VicGFja0NvbXBpbGVyID0gd2VicGFjayh3ZWJwYWNrQ29uZmlnKTtcbiAgICAgICAgY29uc3Qgc3RhdHNDb25maWcgPSBnZXRXZWJwYWNrU3RhdHNDb25maWcob3B0aW9ucy52ZXJib3NlKTtcblxuICAgICAgICBjb25zdCBjYWxsYmFjazogd2VicGFjay5jb21waWxlci5Db21waWxlckNhbGxiYWNrID0gKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QganNvbiA9IHN0YXRzLnRvSnNvbihzdGF0c0NvbmZpZyk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHN0YXRzLnRvU3RyaW5nKHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0c1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHN0YXRzLmhhc1dhcm5pbmdzKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihzdGF0c1dhcm5pbmdzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRzLmhhc0Vycm9ycygpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKHN0YXRzRXJyb3JzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6ICFzdGF0cy5oYXNFcnJvcnMoKSB9KTtcblxuICAgICAgICAgIGlmIChvcHRpb25zLndhdGNoKSB7XG4gICAgICAgICAgICAvLyBOZXZlciBjb21wbGV0ZSBvbiB3YXRjaCBtb2RlLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpZiAoISFhcHAuc2VydmljZVdvcmtlciAmJiBydW5UYXNrT3B0aW9ucy50YXJnZXQgPT09ICdwcm9kdWN0aW9uJyAmJlxuICAgICAgICAgICAgLy8gICB1c2VzU2VydmljZVdvcmtlcih0aGlzLnByb2plY3Qucm9vdCkgJiYgcnVuVGFza09wdGlvbnMuc2VydmljZVdvcmtlciAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vICAgY29uc3QgYXBwUm9vdCA9IHBhdGgucmVzb2x2ZSh0aGlzLnByb2plY3Qucm9vdCwgYXBwLnJvb3QpO1xuICAgICAgICAgICAgLy8gICBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXIodGhpcy5wcm9qZWN0LnJvb3QsIGFwcFJvb3QsIHBhdGgucmVzb2x2ZShvdXRwdXRQYXRoKSxcbiAgICAgICAgICAgIC8vICAgICBydW5UYXNrT3B0aW9ucy5iYXNlSHJlZiB8fCAnLycpXG4gICAgICAgICAgICAvLyAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZSgpLCAoZXJyOiBhbnkpID0+IHJlamVjdChlcnIpKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChvcHRpb25zLndhdGNoKSB7XG4gICAgICAgICAgICBjb25zdCB3YXRjaGluZyA9IHdlYnBhY2tDb21waWxlci53YXRjaCh7IHBvbGw6IG9wdGlvbnMucG9sbCB9LCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgIC8vIFRlYXJkb3duIGxvZ2ljLiBDbG9zZSB0aGUgd2F0Y2hlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgICAgICAgcmV0dXJuICgpID0+IHdhdGNoaW5nLmNsb3NlKCgpID0+IHsgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5ydW4oY2FsbGJhY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgJ1xcbkFuIGVycm9yIG9jY3VyZWQgZHVyaW5nIHRoZSBidWlsZDpcXG4nICsgKChlcnIgJiYgZXJyLnN0YWNrKSB8fCBlcnIpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgKTtcbiAgfVxuXG4gIGJ1aWxkV2VicGFja0NvbmZpZyhyb290OiBQYXRoLCBvcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnMpIHtcbiAgICBjb25zdCBzeXN0ZW1Sb290ID0gZ2V0U3lzdGVtUGF0aChyb290KTtcbiAgICBsZXQgd2NvOiBXZWJwYWNrQ29uZmlnT3B0aW9ucztcblxuICAgIC8vIFRPRE86IG1ha2UgdGFyZ2V0IGRlZmF1bHRzIGludG8gY29uZmlndXJhdGlvbnMgaW5zdGVhZFxuICAgIC8vIG9wdGlvbnMgPSB0aGlzLmFkZFRhcmdldERlZmF1bHRzKG9wdGlvbnMpO1xuXG4gICAgY29uc3QgdHNjb25maWdQYXRoID0gbm9ybWFsaXplKHJlc29sdmUocm9vdCwgbm9ybWFsaXplKG9wdGlvbnMudHNDb25maWcgYXMgc3RyaW5nKSkpO1xuICAgIGNvbnN0IHRzQ29uZmlnID0gcmVhZFRzY29uZmlnKGdldFN5c3RlbVBhdGgodHNjb25maWdQYXRoKSk7XG5cbiAgICBjb25zdCBwcm9qZWN0VHMgPSByZXF1aXJlUHJvamVjdE1vZHVsZShzeXN0ZW1Sb290LCAndHlwZXNjcmlwdCcpIGFzIHR5cGVvZiB0cztcblxuICAgIGNvbnN0IHN1cHBvcnRFUzIwMTUgPSB0c0NvbmZpZy5vcHRpb25zLnRhcmdldCAhPT0gcHJvamVjdFRzLlNjcmlwdFRhcmdldC5FUzNcbiAgICAgICYmIHRzQ29uZmlnLm9wdGlvbnMudGFyZ2V0ICE9PSBwcm9qZWN0VHMuU2NyaXB0VGFyZ2V0LkVTNTtcblxuXG4gICAgLy8gVE9ETzogaW5zaWRlIHRoZSBjb25maWdzLCBhbHdheXMgdXNlIHRoZSBwcm9qZWN0IHJvb3QgYW5kIG5vdCB0aGUgd29ya3NwYWNlIHJvb3QuXG4gICAgLy8gVW50aWwgdGhlbiB3ZSBoYXZlIHRvIHByZXRlbmQgdGhlIGFwcCByb290IGlzIHJlbGF0aXZlIChgYCkgYnV0IHRoZSBzYW1lIGFzIGBwcm9qZWN0Um9vdGAuXG4gICAgKG9wdGlvbnMgYXMgYW55KS5yb290ID0gJyc7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG5cbiAgICB3Y28gPSB7XG4gICAgICBwcm9qZWN0Um9vdDogc3lzdGVtUm9vdCxcbiAgICAgIC8vIFRPRE86IHVzZSBvbmx5IHRoaXMub3B0aW9ucywgaXQgY29udGFpbnMgYWxsIGZsYWdzIGFuZCBjb25maWdzIGl0ZW1zIGFscmVhZHkuXG4gICAgICBidWlsZE9wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBhcHBDb25maWc6IG9wdGlvbnMsXG4gICAgICB0c0NvbmZpZyxcbiAgICAgIHN1cHBvcnRFUzIwMTUsXG4gICAgfTtcblxuXG4gICAgLy8gVE9ETzogYWRkIHRoZSBvbGQgZGV2IG9wdGlvbnMgYXMgdGhlIGRlZmF1bHQsIGFuZCB0aGUgcHJvZCBvbmUgYXMgYSBjb25maWd1cmF0aW9uOlxuICAgIC8vIGRldmVsb3BtZW50OiB7XG4gICAgLy8gICBlbnZpcm9ubWVudDogJ2RldicsXG4gICAgLy8gICBvdXRwdXRIYXNoaW5nOiAnbWVkaWEnLFxuICAgIC8vICAgc291cmNlbWFwczogdHJ1ZSxcbiAgICAvLyAgIGV4dHJhY3RDc3M6IGZhbHNlLFxuICAgIC8vICAgbmFtZWRDaHVua3M6IHRydWUsXG4gICAgLy8gICBhb3Q6IGZhbHNlLFxuICAgIC8vICAgdmVuZG9yQ2h1bms6IHRydWUsXG4gICAgLy8gICBidWlsZE9wdGltaXplcjogZmFsc2UsXG4gICAgLy8gfSxcbiAgICAvLyBwcm9kdWN0aW9uOiB7XG4gICAgLy8gICBlbnZpcm9ubWVudDogJ3Byb2QnLFxuICAgIC8vICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgLy8gICBzb3VyY2VtYXBzOiBmYWxzZSxcbiAgICAvLyAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgLy8gICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgLy8gICBhb3Q6IHRydWUsXG4gICAgLy8gICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgLy8gICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgLy8gICBidWlsZE9wdGltaXplcjogYnVpbGRPcHRpb25zLmFvdCAhPT0gZmFsc2UsXG4gICAgLy8gfVxuXG4gICAgY29uc3Qgd2VicGFja0NvbmZpZ3M6IHt9W10gPSBbXG4gICAgICBnZXRDb21tb25Db25maWcod2NvKSxcbiAgICAgIGdldEJyb3dzZXJDb25maWcod2NvKSxcbiAgICAgIGdldFN0eWxlc0NvbmZpZyh3Y28pLFxuICAgIF07XG5cbiAgICBpZiAod2NvLmFwcENvbmZpZy5tYWluIHx8IHdjby5hcHBDb25maWcucG9seWZpbGxzKSB7XG4gICAgICBjb25zdCB0eXBlc2NyaXB0Q29uZmlnUGFydGlhbCA9IHdjby5idWlsZE9wdGlvbnMuYW90XG4gICAgICAgID8gZ2V0QW90Q29uZmlnKHdjbylcbiAgICAgICAgOiBnZXROb25Bb3RDb25maWcod2NvKTtcbiAgICAgIHdlYnBhY2tDb25maWdzLnB1c2godHlwZXNjcmlwdENvbmZpZ1BhcnRpYWwpO1xuICAgIH1cblxuICAgIHJldHVybiB3ZWJwYWNrTWVyZ2Uod2VicGFja0NvbmZpZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZGVsZXRlT3V0cHV0RGlyKHJvb3Q6IFBhdGgsIG91dHB1dFBhdGg6IFBhdGgpIHtcbiAgICBjb25zdCByZXNvbHZlZE91dHB1dFBhdGggPSByZXNvbHZlKHJvb3QsIG91dHB1dFBhdGgpO1xuICAgIGlmIChyZXNvbHZlZE91dHB1dFBhdGggPT09IHJvb3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT3V0cHV0IHBhdGggTVVTVCBub3QgYmUgcHJvamVjdCByb290IGRpcmVjdG9yeSEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0Lmhvc3QuZXhpc3RzKHJlc29sdmVkT3V0cHV0UGF0aCkucGlwZShcbiAgICAgIGNvbmNhdE1hcChleGlzdHMgPT4gZXhpc3RzXG4gICAgICAgIC8vIFRPRE86IHJlbW92ZSB0aGlzIGNvbmNhdCBvbmNlIGhvc3Qgb3BzIGVtaXQgYW4gZXZlbnQuXG4gICAgICAgID8gdGhpcy5jb250ZXh0Lmhvc3QuZGVsZXRlKHJlc29sdmVkT3V0cHV0UGF0aCkucGlwZShjb25jYXQob2YobnVsbCkpKVxuICAgICAgICAvLyA/IG9mKG51bGwpXG4gICAgICAgIDogb2YobnVsbCkpLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnJvd3NlckJ1aWxkZXI7XG4iXX0=