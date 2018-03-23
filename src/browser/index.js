"use strict";
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
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        return of_1.of(null).pipe(operators_1.concatMap(() => options.deleteOutputPath
            ? this._deleteOutputDir(root, core_1.normalize(options.outputPath), this.context.host)
            : of_1.of(null)), operators_1.concatMap(() => new Observable_1.Observable(obs => {
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
        })));
    }
    buildWebpackConfig(root, projectRoot, options) {
        let wco;
        const host = new core_1.virtualFs.AliasHost(this.context.host);
        options.fileReplacements.forEach(({ from, to }) => {
            host.aliases.set(core_1.join(root, core_1.normalize(from)), core_1.join(root, core_1.normalize(to)));
        });
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
                ? webpack_configs_1.getAotConfig(wco, host)
                : webpack_configs_1.getNonAotConfig(wco, host);
            webpackConfigs.push(typescriptConfigPartial);
        }
        return webpackMerge(webpackConfigs);
    }
    _deleteOutputDir(root, outputPath, host) {
        const resolvedOutputPath = core_1.resolve(root, outputPath);
        if (resolvedOutputPath === root) {
            throw new Error('Output path MUST not be project root directory!');
        }
        return host.exists(resolvedOutputPath).pipe(operators_1.concatMap(exists => exists
            // TODO: remove this concat once host ops emit an event.
            ? host.delete(resolvedOutputPath).pipe(operators_1.concat(of_1.of(null)))
            // ? of(null)
            : of_1.of(null)));
    }
}
exports.BrowserBuilder = BrowserBuilder;
exports.default = BrowserBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFhQSwrQ0FBZ0c7QUFFaEcsZ0RBQTZDO0FBQzdDLDJDQUF3QztBQUN4Qyw4Q0FBbUQ7QUFFbkQsbUNBQW1DO0FBQ25DLGlGQU1xRDtBQUNyRCw2RUFBMEY7QUFDMUYsZ0ZBQTRFO0FBQzVFLGtHQUE2RjtBQUM3RixnRUFJOEM7QUFDOUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBZ0Y5QztJQUVFLFlBQW1CLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUksQ0FBQztJQUUvQyxHQUFHLENBQUMsYUFBMEQ7UUFDNUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFDekMsTUFBTSxXQUFXLEdBQUcsY0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEQsTUFBTSxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2xCLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQjtZQUN0QyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxnQkFBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztZQUMvRSxDQUFDLENBQUMsT0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQ2IscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLHVCQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbkMsZ0RBQWdEO1lB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QUMsQ0FBQyxPQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDZCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBeExELHdDQXdMQztBQUVELGtCQUFlLGNBQWMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBCdWlsZGVyQ29udGV4dCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBQYXRoLCBnZXRTeXN0ZW1QYXRoLCBqb2luLCBub3JtYWxpemUsIHJlc29sdmUsIHZpcnR1YWxGcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgb2YgfSBmcm9tICdyeGpzL29ic2VydmFibGUvb2YnO1xuaW1wb3J0IHsgY29uY2F0LCBjb25jYXRNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge1xuICBnZXRBb3RDb25maWcsXG4gIGdldEJyb3dzZXJDb25maWcsXG4gIGdldENvbW1vbkNvbmZpZyxcbiAgZ2V0Tm9uQW90Q29uZmlnLFxuICBnZXRTdHlsZXNDb25maWcsXG59IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MnO1xuaW1wb3J0IHsgZ2V0V2VicGFja1N0YXRzQ29uZmlnIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy91dGlscyc7XG5pbXBvcnQgeyByZWFkVHNjb25maWcgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVhZC10c2NvbmZpZyc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7XG4gIHN0YXRzRXJyb3JzVG9TdHJpbmcsXG4gIHN0YXRzVG9TdHJpbmcsXG4gIHN0YXRzV2FybmluZ3NUb1N0cmluZyxcbn0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3N0YXRzJztcbmNvbnN0IHdlYnBhY2tNZXJnZSA9IHJlcXVpcmUoJ3dlYnBhY2stbWVyZ2UnKTtcblxuXG4vLyBUT0RPOiBVc2UgcXVpY2t0eXBlIHRvIGJ1aWxkIG91ciBUeXBlU2NyaXB0IGludGVyZmFjZXMgZnJvbSB0aGUgSlNPTiBTY2hlbWEgaXRzZWxmLCBpblxuLy8gdGhlIGJ1aWxkIHN5c3RlbS5cbmV4cG9ydCBpbnRlcmZhY2UgQnJvd3NlckJ1aWxkZXJPcHRpb25zIHtcbiAgb3V0cHV0UGF0aDogc3RyaW5nO1xuICBpbmRleDogc3RyaW5nO1xuICBtYWluOiBzdHJpbmc7XG4gIHRzQ29uZmlnOiBzdHJpbmc7IC8vIHByZXZpb3VzbHkgJ3RzY29uZmlnJy5cbiAgYW90OiBib29sZWFuO1xuICB2ZW5kb3JDaHVuazogYm9vbGVhbjtcbiAgY29tbW9uQ2h1bms6IGJvb2xlYW47XG4gIHZlcmJvc2U6IGJvb2xlYW47XG4gIHByb2dyZXNzOiBib29sZWFuO1xuICBleHRyYWN0Q3NzOiBib29sZWFuO1xuICB3YXRjaDogYm9vbGVhbjtcbiAgb3V0cHV0SGFzaGluZzogJ25vbmUnIHwgJ2FsbCcgfCAnbWVkaWEnIHwgJ2J1bmRsZXMnO1xuICBkZWxldGVPdXRwdXRQYXRoOiBib29sZWFuO1xuICBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuO1xuICBleHRyYWN0TGljZW5zZXM6IGJvb2xlYW47XG4gIHNob3dDaXJjdWxhckRlcGVuZGVuY2llczogYm9vbGVhbjtcbiAgYnVpbGRPcHRpbWl6ZXI6IGJvb2xlYW47XG4gIG5hbWVkQ2h1bmtzOiBib29sZWFuO1xuICBzdWJyZXNvdXJjZUludGVncml0eTogYm9vbGVhbjtcbiAgc2VydmljZVdvcmtlcjogYm9vbGVhbjtcbiAgc2tpcEFwcFNoZWxsOiBib29sZWFuO1xuICBmb3JrVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHN0YXRzSnNvbjogYm9vbGVhbjtcbiAgbGF6eU1vZHVsZXM6IHN0cmluZ1tdO1xuXG4gIC8vIE9wdGlvbnMgd2l0aCBubyBkZWZhdWx0cy5cbiAgLy8gVE9ETzogcmVjb25zaWRlciB0aGlzIGxpc3QuXG4gIHBvbHlmaWxscz86IHN0cmluZztcbiAgYmFzZUhyZWY/OiBzdHJpbmc7XG4gIGRlcGxveVVybD86IHN0cmluZztcbiAgaTE4bkZpbGU/OiBzdHJpbmc7XG4gIGkxOG5Gb3JtYXQ/OiBzdHJpbmc7XG4gIGkxOG5PdXRGaWxlPzogc3RyaW5nO1xuICBpMThuT3V0Rm9ybWF0Pzogc3RyaW5nO1xuICBwb2xsPzogbnVtYmVyO1xuXG4gIC8vIEEgY291cGxlIG9mIG9wdGlvbnMgaGF2ZSBkaWZmZXJlbnQgbmFtZXMuXG4gIHNvdXJjZU1hcDogYm9vbGVhbjsgLy8gcHJldmlvdXNseSAnc291cmNlbWFwcycuXG4gIGV2YWxTb3VyY2VNYXA6IGJvb2xlYW47IC8vIHByZXZpb3VzbHkgJ2V2YWxTb3VyY2VtYXBzJy5cbiAgb3B0aW1pemF0aW9uOiBib29sZWFuOyAvLyBwcmV2aW91c2x5ICd0YXJnZXQnLlxuICBpMThuTG9jYWxlPzogc3RyaW5nOyAvLyBwcmV2aW91c2x5ICdsb2NhbGUnLlxuICBpMThuTWlzc2luZ1RyYW5zbGF0aW9uPzogc3RyaW5nOyAvLyBwcmV2aW91c2x5ICdtaXNzaW5nVHJhbnNsYXRpb24nLlxuXG4gIC8vIFRoZXNlIG9wdGlvbnMgd2VyZSBub3QgYXZhaWxhYmxlIGFzIGZsYWdzLlxuICBhc3NldHM6IEFzc2V0UGF0dGVybltdO1xuICBzY3JpcHRzOiBFeHRyYUVudHJ5UG9pbnRbXTtcbiAgc3R5bGVzOiBFeHRyYUVudHJ5UG9pbnRbXTtcbiAgc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zOiB7IGluY2x1ZGVQYXRoczogc3RyaW5nW10gfTtcblxuICBmaWxlUmVwbGFjZW1lbnRzOiB7IGZyb206IHN0cmluZzsgdG86IHN0cmluZzsgfVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzc2V0UGF0dGVybiB7XG4gIGdsb2I6IHN0cmluZztcbiAgaW5wdXQ6IHN0cmluZztcbiAgb3V0cHV0OiBzdHJpbmc7XG4gIGFsbG93T3V0c2lkZU91dERpcjogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYUVudHJ5UG9pbnQge1xuICBpbnB1dDogc3RyaW5nO1xuICBvdXRwdXQ/OiBzdHJpbmc7XG4gIGxhenk6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2VicGFja0NvbmZpZ09wdGlvbnMge1xuICByb290OiBzdHJpbmc7XG4gIHByb2plY3RSb290OiBzdHJpbmc7XG4gIGJ1aWxkT3B0aW9uczogQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuICBhcHBDb25maWc6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcbiAgdHNDb25maWc6IHRzLlBhcnNlZENvbW1hbmRMaW5lO1xuICBzdXBwb3J0RVMyMDE1OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgQnJvd3NlckJ1aWxkZXIgaW1wbGVtZW50cyBCdWlsZGVyPEJyb3dzZXJCdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPEJyb3dzZXJCdWlsZGVyT3B0aW9ucz4pOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcbiAgICBjb25zdCBvcHRpb25zID0gYnVpbGRlckNvbmZpZy5vcHRpb25zO1xuICAgIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRleHQud29ya3NwYWNlLnJvb3Q7XG4gICAgY29uc3QgcHJvamVjdFJvb3QgPSByZXNvbHZlKHJvb3QsIGJ1aWxkZXJDb25maWcucm9vdCk7XG5cbiAgICByZXR1cm4gb2YobnVsbCkucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBvcHRpb25zLmRlbGV0ZU91dHB1dFBhdGhcbiAgICAgICAgPyB0aGlzLl9kZWxldGVPdXRwdXREaXIocm9vdCwgbm9ybWFsaXplKG9wdGlvbnMub3V0cHV0UGF0aCksIHRoaXMuY29udGV4dC5ob3N0KVxuICAgICAgICA6IG9mKG51bGwpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgICAvLyBFbnN1cmUgQnVpbGQgT3B0aW1pemVyIGlzIG9ubHkgdXNlZCB3aXRoIEFPVC5cbiAgICAgICAgaWYgKG9wdGlvbnMuYnVpbGRPcHRpbWl6ZXIgJiYgIW9wdGlvbnMuYW90KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgYC0tYnVpbGQtb3B0aW1pemVyYCBvcHRpb24gY2Fubm90IGJlIHVzZWQgd2l0aG91dCBgLS1hb3RgLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHdlYnBhY2tDb25maWc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgd2VicGFja0NvbmZpZyA9IHRoaXMuYnVpbGRXZWJwYWNrQ29uZmlnKHJvb3QsIHByb2plY3RSb290LCBvcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFRPRE86IHdoeSBkbyBJIGhhdmUgdG8gY2F0Y2ggdGhpcyBlcnJvcj8gSSB0aG91Z2h0IHRocm93aW5nIGluc2lkZSBhbiBvYnNlcnZhYmxlXG4gICAgICAgICAgLy8gYWx3YXlzIGdvdCBjb252ZXJ0ZWQgaW50byBhbiBlcnJvci5cbiAgICAgICAgICBvYnMuZXJyb3IoZSk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2VicGFja0NvbXBpbGVyID0gd2VicGFjayh3ZWJwYWNrQ29uZmlnKTtcbiAgICAgICAgY29uc3Qgc3RhdHNDb25maWcgPSBnZXRXZWJwYWNrU3RhdHNDb25maWcob3B0aW9ucy52ZXJib3NlKTtcblxuICAgICAgICBjb25zdCBjYWxsYmFjazogd2VicGFjay5jb21waWxlci5Db21waWxlckNhbGxiYWNrID0gKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QganNvbiA9IHN0YXRzLnRvSnNvbihzdGF0c0NvbmZpZyk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHN0YXRzLnRvU3RyaW5nKHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0c1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHN0YXRzLmhhc1dhcm5pbmdzKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybihzdGF0c1dhcm5pbmdzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRzLmhhc0Vycm9ycygpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKHN0YXRzRXJyb3JzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6ICFzdGF0cy5oYXNFcnJvcnMoKSB9KTtcblxuICAgICAgICAgIGlmIChvcHRpb25zLndhdGNoKSB7XG4gICAgICAgICAgICAvLyBOZXZlciBjb21wbGV0ZSBvbiB3YXRjaCBtb2RlLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpZiAoISFhcHAuc2VydmljZVdvcmtlciAmJiBydW5UYXNrT3B0aW9ucy50YXJnZXQgPT09ICdwcm9kdWN0aW9uJyAmJlxuICAgICAgICAgICAgLy8gICB1c2VzU2VydmljZVdvcmtlcih0aGlzLnByb2plY3Qucm9vdCkgJiYgcnVuVGFza09wdGlvbnMuc2VydmljZVdvcmtlciAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vICAgY29uc3QgYXBwUm9vdCA9IHBhdGgucmVzb2x2ZSh0aGlzLnByb2plY3Qucm9vdCwgYXBwLnJvb3QpO1xuICAgICAgICAgICAgLy8gICBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXIodGhpcy5wcm9qZWN0LnJvb3QsIGFwcFJvb3QsIHBhdGgucmVzb2x2ZShvdXRwdXRQYXRoKSxcbiAgICAgICAgICAgIC8vICAgICBydW5UYXNrT3B0aW9ucy5iYXNlSHJlZiB8fCAnLycpXG4gICAgICAgICAgICAvLyAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZSgpLCAoZXJyOiBhbnkpID0+IHJlamVjdChlcnIpKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChvcHRpb25zLndhdGNoKSB7XG4gICAgICAgICAgICBjb25zdCB3YXRjaGluZyA9IHdlYnBhY2tDb21waWxlci53YXRjaCh7IHBvbGw6IG9wdGlvbnMucG9sbCB9LCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgIC8vIFRlYXJkb3duIGxvZ2ljLiBDbG9zZSB0aGUgd2F0Y2hlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgICAgICAgcmV0dXJuICgpID0+IHdhdGNoaW5nLmNsb3NlKCgpID0+IHsgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdlYnBhY2tDb21waWxlci5ydW4oY2FsbGJhY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgJ1xcbkFuIGVycm9yIG9jY3VyZWQgZHVyaW5nIHRoZSBidWlsZDpcXG4nICsgKChlcnIgJiYgZXJyLnN0YWNrKSB8fCBlcnIpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgKTtcbiAgfVxuXG4gIGJ1aWxkV2VicGFja0NvbmZpZyhcbiAgICByb290OiBQYXRoLFxuICAgIHByb2plY3RSb290OiBQYXRoLFxuICAgIG9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyxcbiAgKSB7XG4gICAgbGV0IHdjbzogV2VicGFja0NvbmZpZ09wdGlvbnM7XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IHZpcnR1YWxGcy5BbGlhc0hvc3QodGhpcy5jb250ZXh0Lmhvc3QgYXMgdmlydHVhbEZzLkhvc3Q8ZnMuU3RhdHM+KTtcblxuICAgIG9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5mb3JFYWNoKCh7IGZyb20sIHRvIH0pID0+IHtcbiAgICAgIGhvc3QuYWxpYXNlcy5zZXQoXG4gICAgICAgIGpvaW4ocm9vdCwgbm9ybWFsaXplKGZyb20pKSxcbiAgICAgICAgam9pbihyb290LCBub3JtYWxpemUodG8pKSxcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICAvLyBUT0RPOiBtYWtlIHRhcmdldCBkZWZhdWx0cyBpbnRvIGNvbmZpZ3VyYXRpb25zIGluc3RlYWRcbiAgICAvLyBvcHRpb25zID0gdGhpcy5hZGRUYXJnZXREZWZhdWx0cyhvcHRpb25zKTtcblxuICAgIGNvbnN0IHRzY29uZmlnUGF0aCA9IG5vcm1hbGl6ZShyZXNvbHZlKHJvb3QsIG5vcm1hbGl6ZShvcHRpb25zLnRzQ29uZmlnIGFzIHN0cmluZykpKTtcbiAgICBjb25zdCB0c0NvbmZpZyA9IHJlYWRUc2NvbmZpZyhnZXRTeXN0ZW1QYXRoKHRzY29uZmlnUGF0aCkpO1xuXG4gICAgY29uc3QgcHJvamVjdFRzID0gcmVxdWlyZVByb2plY3RNb2R1bGUoZ2V0U3lzdGVtUGF0aChwcm9qZWN0Um9vdCksICd0eXBlc2NyaXB0JykgYXMgdHlwZW9mIHRzO1xuXG4gICAgY29uc3Qgc3VwcG9ydEVTMjAxNSA9IHRzQ29uZmlnLm9wdGlvbnMudGFyZ2V0ICE9PSBwcm9qZWN0VHMuU2NyaXB0VGFyZ2V0LkVTM1xuICAgICAgJiYgdHNDb25maWcub3B0aW9ucy50YXJnZXQgIT09IHByb2plY3RUcy5TY3JpcHRUYXJnZXQuRVM1O1xuXG5cbiAgICAvLyBUT0RPOiBpbnNpZGUgdGhlIGNvbmZpZ3MsIGFsd2F5cyB1c2UgdGhlIHByb2plY3Qgcm9vdCBhbmQgbm90IHRoZSB3b3Jrc3BhY2Ugcm9vdC5cbiAgICAvLyBVbnRpbCB0aGVuIHdlIGhhdmUgdG8gcHJldGVuZCB0aGUgYXBwIHJvb3QgaXMgcmVsYXRpdmUgKGBgKSBidXQgdGhlIHNhbWUgYXMgYHByb2plY3RSb290YC5cbiAgICAob3B0aW9ucyBhcyBhbnkpLnJvb3QgPSAnJzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcblxuICAgIHdjbyA9IHtcbiAgICAgIHJvb3Q6IGdldFN5c3RlbVBhdGgocm9vdCksXG4gICAgICBwcm9qZWN0Um9vdDogZ2V0U3lzdGVtUGF0aChwcm9qZWN0Um9vdCksXG4gICAgICAvLyBUT0RPOiB1c2Ugb25seSB0aGlzLm9wdGlvbnMsIGl0IGNvbnRhaW5zIGFsbCBmbGFncyBhbmQgY29uZmlncyBpdGVtcyBhbHJlYWR5LlxuICAgICAgYnVpbGRPcHRpb25zOiBvcHRpb25zLFxuICAgICAgYXBwQ29uZmlnOiBvcHRpb25zLFxuICAgICAgdHNDb25maWcsXG4gICAgICBzdXBwb3J0RVMyMDE1LFxuICAgIH07XG5cblxuICAgIC8vIFRPRE86IGFkZCB0aGUgb2xkIGRldiBvcHRpb25zIGFzIHRoZSBkZWZhdWx0LCBhbmQgdGhlIHByb2Qgb25lIGFzIGEgY29uZmlndXJhdGlvbjpcbiAgICAvLyBkZXZlbG9wbWVudDoge1xuICAgIC8vICAgZW52aXJvbm1lbnQ6ICdkZXYnLFxuICAgIC8vICAgb3V0cHV0SGFzaGluZzogJ21lZGlhJyxcbiAgICAvLyAgIHNvdXJjZW1hcHM6IHRydWUsXG4gICAgLy8gICBleHRyYWN0Q3NzOiBmYWxzZSxcbiAgICAvLyAgIG5hbWVkQ2h1bmtzOiB0cnVlLFxuICAgIC8vICAgYW90OiBmYWxzZSxcbiAgICAvLyAgIHZlbmRvckNodW5rOiB0cnVlLFxuICAgIC8vICAgYnVpbGRPcHRpbWl6ZXI6IGZhbHNlLFxuICAgIC8vIH0sXG4gICAgLy8gcHJvZHVjdGlvbjoge1xuICAgIC8vICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcbiAgICAvLyAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgIC8vICAgc291cmNlbWFwczogZmFsc2UsXG4gICAgLy8gICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgIC8vICAgbmFtZWRDaHVua3M6IGZhbHNlLFxuICAgIC8vICAgYW90OiB0cnVlLFxuICAgIC8vICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgIC8vICAgdmVuZG9yQ2h1bms6IGZhbHNlLFxuICAgIC8vICAgYnVpbGRPcHRpbWl6ZXI6IGJ1aWxkT3B0aW9ucy5hb3QgIT09IGZhbHNlLFxuICAgIC8vIH1cblxuICAgIGNvbnN0IHdlYnBhY2tDb25maWdzOiB7fVtdID0gW1xuICAgICAgZ2V0Q29tbW9uQ29uZmlnKHdjbyksXG4gICAgICBnZXRCcm93c2VyQ29uZmlnKHdjbyksXG4gICAgICBnZXRTdHlsZXNDb25maWcod2NvKSxcbiAgICBdO1xuXG4gICAgaWYgKHdjby5hcHBDb25maWcubWFpbiB8fCB3Y28uYXBwQ29uZmlnLnBvbHlmaWxscykge1xuICAgICAgY29uc3QgdHlwZXNjcmlwdENvbmZpZ1BhcnRpYWwgPSB3Y28uYnVpbGRPcHRpb25zLmFvdFxuICAgICAgICA/IGdldEFvdENvbmZpZyh3Y28sIGhvc3QpXG4gICAgICAgIDogZ2V0Tm9uQW90Q29uZmlnKHdjbywgaG9zdCk7XG4gICAgICB3ZWJwYWNrQ29uZmlncy5wdXNoKHR5cGVzY3JpcHRDb25maWdQYXJ0aWFsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd2VicGFja01lcmdlKHdlYnBhY2tDb25maWdzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2RlbGV0ZU91dHB1dERpcihyb290OiBQYXRoLCBvdXRwdXRQYXRoOiBQYXRoLCBob3N0OiB2aXJ0dWFsRnMuSG9zdCkge1xuICAgIGNvbnN0IHJlc29sdmVkT3V0cHV0UGF0aCA9IHJlc29sdmUocm9vdCwgb3V0cHV0UGF0aCk7XG4gICAgaWYgKHJlc29sdmVkT3V0cHV0UGF0aCA9PT0gcm9vdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPdXRwdXQgcGF0aCBNVVNUIG5vdCBiZSBwcm9qZWN0IHJvb3QgZGlyZWN0b3J5IScpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0LmV4aXN0cyhyZXNvbHZlZE91dHB1dFBhdGgpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoZXhpc3RzID0+IGV4aXN0c1xuICAgICAgICAvLyBUT0RPOiByZW1vdmUgdGhpcyBjb25jYXQgb25jZSBob3N0IG9wcyBlbWl0IGFuIGV2ZW50LlxuICAgICAgICA/IGhvc3QuZGVsZXRlKHJlc29sdmVkT3V0cHV0UGF0aCkucGlwZShjb25jYXQob2YobnVsbCkpKVxuICAgICAgICAvLyA/IG9mKG51bGwpXG4gICAgICAgIDogb2YobnVsbCkpLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnJvd3NlckJ1aWxkZXI7XG4iXX0=