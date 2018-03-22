"use strict";
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
            ? this._deleteOutputDir(root, core_1.normalize(options.outputPath), this.context.host)
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
        return host.exists(resolvedOutputPath).pipe(operators_1.switchMap(exists => {
            if (exists) {
                return host.delete(resolvedOutputPath);
            }
            else {
                return empty_1.empty();
            }
        }), operators_1.ignoreElements());
    }
}
exports.BrowserBuilder = BrowserBuilder;
exports.default = BrowserBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFhQSwrQ0FBZ0c7QUFFaEcsZ0RBQTZDO0FBQzdDLG1EQUFvRTtBQUNwRSxpREFBOEM7QUFDOUMsOENBQTJEO0FBRTNELG1DQUFtQztBQUNuQyxpRkFNcUQ7QUFDckQsNkVBQTBGO0FBQzFGLGdGQUE0RTtBQUM1RSxrR0FBNkY7QUFDN0YsZ0VBSThDO0FBQzlDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQWdGOUM7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLGFBQTBEO1FBQzVELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRELE1BQU0sQ0FBQyxlQUFnQixDQUNyQixPQUFPLENBQUMsZ0JBQWdCO1lBQ3RCLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQy9FLENBQUMsQ0FBQyxhQUFLLEVBQWMsRUFDdkIsSUFBSSx1QkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ25CLGdEQUFnRDtZQUNoRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JB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TEQsd0NBMkxDO0FBRUQsa0JBQWUsY0FBYyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlcixcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IFBhdGgsIGdldFN5c3RlbVBhdGgsIGpvaW4sIG5vcm1hbGl6ZSwgcmVzb2x2ZSwgdmlydHVhbEZzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBjb25jYXQgYXMgY29uY2F0T2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvb2JzZXJ2YWJsZS9jb25jYXQnO1xuaW1wb3J0IHsgZW1wdHkgfSBmcm9tICdyeGpzL29ic2VydmFibGUvZW1wdHknO1xuaW1wb3J0IHsgaWdub3JlRWxlbWVudHMsIHN3aXRjaE1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWltcGxpY2l0LWRlcGVuZGVuY2llc1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7XG4gIGdldEFvdENvbmZpZyxcbiAgZ2V0QnJvd3NlckNvbmZpZyxcbiAgZ2V0Q29tbW9uQ29uZmlnLFxuICBnZXROb25Bb3RDb25maWcsXG4gIGdldFN0eWxlc0NvbmZpZyxcbn0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncyc7XG5pbXBvcnQgeyBnZXRXZWJwYWNrU3RhdHNDb25maWcgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL3V0aWxzJztcbmltcG9ydCB7IHJlYWRUc2NvbmZpZyB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZWFkLXRzY29uZmlnJztcbmltcG9ydCB7IHJlcXVpcmVQcm9qZWN0TW9kdWxlIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3JlcXVpcmUtcHJvamVjdC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgc3RhdHNFcnJvcnNUb1N0cmluZyxcbiAgc3RhdHNUb1N0cmluZyxcbiAgc3RhdHNXYXJuaW5nc1RvU3RyaW5nLFxufSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvc3RhdHMnO1xuY29uc3Qgd2VicGFja01lcmdlID0gcmVxdWlyZSgnd2VicGFjay1tZXJnZScpO1xuXG5cbi8vIFRPRE86IFVzZSBxdWlja3R5cGUgdG8gYnVpbGQgb3VyIFR5cGVTY3JpcHQgaW50ZXJmYWNlcyBmcm9tIHRoZSBKU09OIFNjaGVtYSBpdHNlbGYsIGluXG4vLyB0aGUgYnVpbGQgc3lzdGVtLlxuZXhwb3J0IGludGVyZmFjZSBCcm93c2VyQnVpbGRlck9wdGlvbnMge1xuICBvdXRwdXRQYXRoOiBzdHJpbmc7XG4gIGluZGV4OiBzdHJpbmc7XG4gIG1haW46IHN0cmluZztcbiAgdHNDb25maWc6IHN0cmluZzsgLy8gcHJldmlvdXNseSAndHNjb25maWcnLlxuICBhb3Q6IGJvb2xlYW47XG4gIHZlbmRvckNodW5rOiBib29sZWFuO1xuICBjb21tb25DaHVuazogYm9vbGVhbjtcbiAgdmVyYm9zZTogYm9vbGVhbjtcbiAgcHJvZ3Jlc3M6IGJvb2xlYW47XG4gIGV4dHJhY3RDc3M6IGJvb2xlYW47XG4gIHdhdGNoOiBib29sZWFuO1xuICBvdXRwdXRIYXNoaW5nOiAnbm9uZScgfCAnYWxsJyB8ICdtZWRpYScgfCAnYnVuZGxlcyc7XG4gIGRlbGV0ZU91dHB1dFBhdGg6IGJvb2xlYW47XG4gIHByZXNlcnZlU3ltbGlua3M6IGJvb2xlYW47XG4gIGV4dHJhY3RMaWNlbnNlczogYm9vbGVhbjtcbiAgc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzOiBib29sZWFuO1xuICBidWlsZE9wdGltaXplcjogYm9vbGVhbjtcbiAgbmFtZWRDaHVua3M6IGJvb2xlYW47XG4gIHN1YnJlc291cmNlSW50ZWdyaXR5OiBib29sZWFuO1xuICBzZXJ2aWNlV29ya2VyOiBib29sZWFuO1xuICBza2lwQXBwU2hlbGw6IGJvb2xlYW47XG4gIGZvcmtUeXBlQ2hlY2tlcjogYm9vbGVhbjtcbiAgc3RhdHNKc29uOiBib29sZWFuO1xuICBsYXp5TW9kdWxlczogc3RyaW5nW107XG5cbiAgLy8gT3B0aW9ucyB3aXRoIG5vIGRlZmF1bHRzLlxuICAvLyBUT0RPOiByZWNvbnNpZGVyIHRoaXMgbGlzdC5cbiAgcG9seWZpbGxzPzogc3RyaW5nO1xuICBiYXNlSHJlZj86IHN0cmluZztcbiAgZGVwbG95VXJsPzogc3RyaW5nO1xuICBpMThuRmlsZT86IHN0cmluZztcbiAgaTE4bkZvcm1hdD86IHN0cmluZztcbiAgaTE4bk91dEZpbGU/OiBzdHJpbmc7XG4gIGkxOG5PdXRGb3JtYXQ/OiBzdHJpbmc7XG4gIHBvbGw/OiBudW1iZXI7XG5cbiAgLy8gQSBjb3VwbGUgb2Ygb3B0aW9ucyBoYXZlIGRpZmZlcmVudCBuYW1lcy5cbiAgc291cmNlTWFwOiBib29sZWFuOyAvLyBwcmV2aW91c2x5ICdzb3VyY2VtYXBzJy5cbiAgZXZhbFNvdXJjZU1hcDogYm9vbGVhbjsgLy8gcHJldmlvdXNseSAnZXZhbFNvdXJjZW1hcHMnLlxuICBvcHRpbWl6YXRpb246IGJvb2xlYW47IC8vIHByZXZpb3VzbHkgJ3RhcmdldCcuXG4gIGkxOG5Mb2NhbGU/OiBzdHJpbmc7IC8vIHByZXZpb3VzbHkgJ2xvY2FsZScuXG4gIGkxOG5NaXNzaW5nVHJhbnNsYXRpb24/OiBzdHJpbmc7IC8vIHByZXZpb3VzbHkgJ21pc3NpbmdUcmFuc2xhdGlvbicuXG5cbiAgLy8gVGhlc2Ugb3B0aW9ucyB3ZXJlIG5vdCBhdmFpbGFibGUgYXMgZmxhZ3MuXG4gIGFzc2V0czogQXNzZXRQYXR0ZXJuW107XG4gIHNjcmlwdHM6IEV4dHJhRW50cnlQb2ludFtdO1xuICBzdHlsZXM6IEV4dHJhRW50cnlQb2ludFtdO1xuICBzdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM6IHsgaW5jbHVkZVBhdGhzOiBzdHJpbmdbXSB9O1xuXG4gIGZpbGVSZXBsYWNlbWVudHM6IHsgZnJvbTogc3RyaW5nOyB0bzogc3RyaW5nOyB9W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXNzZXRQYXR0ZXJuIHtcbiAgZ2xvYjogc3RyaW5nO1xuICBpbnB1dDogc3RyaW5nO1xuICBvdXRwdXQ6IHN0cmluZztcbiAgYWxsb3dPdXRzaWRlT3V0RGlyOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhRW50cnlQb2ludCB7XG4gIGlucHV0OiBzdHJpbmc7XG4gIG91dHB1dD86IHN0cmluZztcbiAgbGF6eTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJwYWNrQ29uZmlnT3B0aW9ucyB7XG4gIHJvb3Q6IHN0cmluZztcbiAgcHJvamVjdFJvb3Q6IHN0cmluZztcbiAgYnVpbGRPcHRpb25zOiBCcm93c2VyQnVpbGRlck9wdGlvbnM7XG4gIGFwcENvbmZpZzogQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuICB0c0NvbmZpZzogdHMuUGFyc2VkQ29tbWFuZExpbmU7XG4gIHN1cHBvcnRFUzIwMTU6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBCcm93c2VyQnVpbGRlciBpbXBsZW1lbnRzIEJ1aWxkZXI8QnJvd3NlckJ1aWxkZXJPcHRpb25zPiB7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KSB7IH1cblxuICBydW4oYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248QnJvd3NlckJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBidWlsZGVyQ29uZmlnLm9wdGlvbnM7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2Uucm9vdDtcbiAgICBjb25zdCBwcm9qZWN0Um9vdCA9IHJlc29sdmUocm9vdCwgYnVpbGRlckNvbmZpZy5yb290KTtcblxuICAgIHJldHVybiBjb25jYXRPYnNlcnZhYmxlKFxuICAgICAgb3B0aW9ucy5kZWxldGVPdXRwdXRQYXRoXG4gICAgICAgID8gdGhpcy5fZGVsZXRlT3V0cHV0RGlyKHJvb3QsIG5vcm1hbGl6ZShvcHRpb25zLm91dHB1dFBhdGgpLCB0aGlzLmNvbnRleHQuaG9zdClcbiAgICAgICAgOiBlbXB0eTxCdWlsZEV2ZW50PigpLFxuICAgICAgbmV3IE9ic2VydmFibGUob2JzID0+IHtcbiAgICAgICAgLy8gRW5zdXJlIEJ1aWxkIE9wdGltaXplciBpcyBvbmx5IHVzZWQgd2l0aCBBT1QuXG4gICAgICAgIGlmIChvcHRpb25zLmJ1aWxkT3B0aW1pemVyICYmICFvcHRpb25zLmFvdCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGAtLWJ1aWxkLW9wdGltaXplcmAgb3B0aW9uIGNhbm5vdCBiZSB1c2VkIHdpdGhvdXQgYC0tYW90YC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB3ZWJwYWNrQ29uZmlnO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHdlYnBhY2tDb25maWcgPSB0aGlzLmJ1aWxkV2VicGFja0NvbmZpZyhyb290LCBwcm9qZWN0Um9vdCwgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBUT0RPOiB3aHkgZG8gSSBoYXZlIHRvIGNhdGNoIHRoaXMgZXJyb3I/IEkgdGhvdWdodCB0aHJvd2luZyBpbnNpZGUgYW4gb2JzZXJ2YWJsZVxuICAgICAgICAgIC8vIGFsd2F5cyBnb3QgY29udmVydGVkIGludG8gYW4gZXJyb3IuXG4gICAgICAgICAgb2JzLmVycm9yKGUpO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdlYnBhY2tDb21waWxlciA9IHdlYnBhY2sod2VicGFja0NvbmZpZyk7XG4gICAgICAgIGNvbnN0IHN0YXRzQ29uZmlnID0gZ2V0V2VicGFja1N0YXRzQ29uZmlnKG9wdGlvbnMudmVyYm9zZSk7XG5cbiAgICAgICAgY29uc3QgY2FsbGJhY2s6IHdlYnBhY2suY29tcGlsZXIuQ29tcGlsZXJDYWxsYmFjayA9IChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIG9icy5lcnJvcihlcnIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGpzb24gPSBzdGF0cy50b0pzb24oc3RhdHNDb25maWcpO1xuICAgICAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0cy50b1N0cmluZyhzdGF0c0NvbmZpZykpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oc3RhdHNUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzdGF0cy5oYXNXYXJuaW5ncygpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oc3RhdHNXYXJuaW5nc1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0cy5oYXNFcnJvcnMoKSkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihzdGF0c0Vycm9yc1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgb2JzLm5leHQoeyBzdWNjZXNzOiAhc3RhdHMuaGFzRXJyb3JzKCkgfSk7XG5cbiAgICAgICAgICBpZiAob3B0aW9ucy53YXRjaCkge1xuICAgICAgICAgICAgLy8gTmV2ZXIgY29tcGxldGUgb24gd2F0Y2ggbW9kZS5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaWYgKCEhYXBwLnNlcnZpY2VXb3JrZXIgJiYgcnVuVGFza09wdGlvbnMudGFyZ2V0ID09PSAncHJvZHVjdGlvbicgJiZcbiAgICAgICAgICAgIC8vICAgdXNlc1NlcnZpY2VXb3JrZXIodGhpcy5wcm9qZWN0LnJvb3QpICYmIHJ1blRhc2tPcHRpb25zLnNlcnZpY2VXb3JrZXIgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyAgIGNvbnN0IGFwcFJvb3QgPSBwYXRoLnJlc29sdmUodGhpcy5wcm9qZWN0LnJvb3QsIGFwcC5yb290KTtcbiAgICAgICAgICAgIC8vICAgYXVnbWVudEFwcFdpdGhTZXJ2aWNlV29ya2VyKHRoaXMucHJvamVjdC5yb290LCBhcHBSb290LCBwYXRoLnJlc29sdmUob3V0cHV0UGF0aCksXG4gICAgICAgICAgICAvLyAgICAgcnVuVGFza09wdGlvbnMuYmFzZUhyZWYgfHwgJy8nKVxuICAgICAgICAgICAgLy8gICAgIC50aGVuKCgpID0+IHJlc29sdmUoKSwgKGVycjogYW55KSA9PiByZWplY3QoZXJyKSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICBvYnMuY29tcGxldGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpZiAob3B0aW9ucy53YXRjaCkge1xuICAgICAgICAgICAgY29uc3Qgd2F0Y2hpbmcgPSB3ZWJwYWNrQ29tcGlsZXIud2F0Y2goeyBwb2xsOiBvcHRpb25zLnBvbGwgfSwgY2FsbGJhY2spO1xuXG4gICAgICAgICAgICAvLyBUZWFyZG93biBsb2dpYy4gQ2xvc2UgdGhlIHdhdGNoZXIgd2hlbiB1bnN1YnNjcmliZWQgZnJvbS5cbiAgICAgICAgICAgIHJldHVybiAoKSA9PiB3YXRjaGluZy5jbG9zZSgoKSA9PiB7IH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3ZWJwYWNrQ29tcGlsZXIucnVuKGNhbGxiYWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICdcXG5BbiBlcnJvciBvY2N1cmVkIGR1cmluZyB0aGUgYnVpbGQ6XFxuJyArICgoZXJyICYmIGVyci5zdGFjaykgfHwgZXJyKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIGJ1aWxkV2VicGFja0NvbmZpZyhcbiAgICByb290OiBQYXRoLFxuICAgIHByb2plY3RSb290OiBQYXRoLFxuICAgIG9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyxcbiAgKSB7XG4gICAgbGV0IHdjbzogV2VicGFja0NvbmZpZ09wdGlvbnM7XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IHZpcnR1YWxGcy5BbGlhc0hvc3QodGhpcy5jb250ZXh0Lmhvc3QgYXMgdmlydHVhbEZzLkhvc3Q8ZnMuU3RhdHM+KTtcblxuICAgIG9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5mb3JFYWNoKCh7ZnJvbSwgdG99KSA9PiB7XG4gICAgICBob3N0LmFsaWFzZXMuc2V0KFxuICAgICAgICBqb2luKHJvb3QsIG5vcm1hbGl6ZShmcm9tKSksXG4gICAgICAgIGpvaW4ocm9vdCwgbm9ybWFsaXplKHRvKSksXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgLy8gVE9ETzogbWFrZSB0YXJnZXQgZGVmYXVsdHMgaW50byBjb25maWd1cmF0aW9ucyBpbnN0ZWFkXG4gICAgLy8gb3B0aW9ucyA9IHRoaXMuYWRkVGFyZ2V0RGVmYXVsdHMob3B0aW9ucyk7XG5cbiAgICBjb25zdCB0c2NvbmZpZ1BhdGggPSBub3JtYWxpemUocmVzb2x2ZShyb290LCBub3JtYWxpemUob3B0aW9ucy50c0NvbmZpZyBhcyBzdHJpbmcpKSk7XG4gICAgY29uc3QgdHNDb25maWcgPSByZWFkVHNjb25maWcoZ2V0U3lzdGVtUGF0aCh0c2NvbmZpZ1BhdGgpKTtcblxuICAgIGNvbnN0IHByb2plY3RUcyA9IHJlcXVpcmVQcm9qZWN0TW9kdWxlKGdldFN5c3RlbVBhdGgocHJvamVjdFJvb3QpLCAndHlwZXNjcmlwdCcpIGFzIHR5cGVvZiB0cztcblxuICAgIGNvbnN0IHN1cHBvcnRFUzIwMTUgPSB0c0NvbmZpZy5vcHRpb25zLnRhcmdldCAhPT0gcHJvamVjdFRzLlNjcmlwdFRhcmdldC5FUzNcbiAgICAgICYmIHRzQ29uZmlnLm9wdGlvbnMudGFyZ2V0ICE9PSBwcm9qZWN0VHMuU2NyaXB0VGFyZ2V0LkVTNTtcblxuXG4gICAgLy8gVE9ETzogaW5zaWRlIHRoZSBjb25maWdzLCBhbHdheXMgdXNlIHRoZSBwcm9qZWN0IHJvb3QgYW5kIG5vdCB0aGUgd29ya3NwYWNlIHJvb3QuXG4gICAgLy8gVW50aWwgdGhlbiB3ZSBoYXZlIHRvIHByZXRlbmQgdGhlIGFwcCByb290IGlzIHJlbGF0aXZlIChgYCkgYnV0IHRoZSBzYW1lIGFzIGBwcm9qZWN0Um9vdGAuXG4gICAgKG9wdGlvbnMgYXMgYW55KS5yb290ID0gJyc7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG5cbiAgICB3Y28gPSB7XG4gICAgICByb290OiBnZXRTeXN0ZW1QYXRoKHJvb3QpLFxuICAgICAgcHJvamVjdFJvb3Q6IGdldFN5c3RlbVBhdGgocHJvamVjdFJvb3QpLFxuICAgICAgLy8gVE9ETzogdXNlIG9ubHkgdGhpcy5vcHRpb25zLCBpdCBjb250YWlucyBhbGwgZmxhZ3MgYW5kIGNvbmZpZ3MgaXRlbXMgYWxyZWFkeS5cbiAgICAgIGJ1aWxkT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGFwcENvbmZpZzogb3B0aW9ucyxcbiAgICAgIHRzQ29uZmlnLFxuICAgICAgc3VwcG9ydEVTMjAxNSxcbiAgICB9O1xuXG5cbiAgICAvLyBUT0RPOiBhZGQgdGhlIG9sZCBkZXYgb3B0aW9ucyBhcyB0aGUgZGVmYXVsdCwgYW5kIHRoZSBwcm9kIG9uZSBhcyBhIGNvbmZpZ3VyYXRpb246XG4gICAgLy8gZGV2ZWxvcG1lbnQ6IHtcbiAgICAvLyAgIGVudmlyb25tZW50OiAnZGV2JyxcbiAgICAvLyAgIG91dHB1dEhhc2hpbmc6ICdtZWRpYScsXG4gICAgLy8gICBzb3VyY2VtYXBzOiB0cnVlLFxuICAgIC8vICAgZXh0cmFjdENzczogZmFsc2UsXG4gICAgLy8gICBuYW1lZENodW5rczogdHJ1ZSxcbiAgICAvLyAgIGFvdDogZmFsc2UsXG4gICAgLy8gICB2ZW5kb3JDaHVuazogdHJ1ZSxcbiAgICAvLyAgIGJ1aWxkT3B0aW1pemVyOiBmYWxzZSxcbiAgICAvLyB9LFxuICAgIC8vIHByb2R1Y3Rpb246IHtcbiAgICAvLyAgIGVudmlyb25tZW50OiAncHJvZCcsXG4gICAgLy8gICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAvLyAgIHNvdXJjZW1hcHM6IGZhbHNlLFxuICAgIC8vICAgZXh0cmFjdENzczogdHJ1ZSxcbiAgICAvLyAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAvLyAgIGFvdDogdHJ1ZSxcbiAgICAvLyAgIGV4dHJhY3RMaWNlbnNlczogdHJ1ZSxcbiAgICAvLyAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAvLyAgIGJ1aWxkT3B0aW1pemVyOiBidWlsZE9wdGlvbnMuYW90ICE9PSBmYWxzZSxcbiAgICAvLyB9XG5cbiAgICBjb25zdCB3ZWJwYWNrQ29uZmlnczoge31bXSA9IFtcbiAgICAgIGdldENvbW1vbkNvbmZpZyh3Y28pLFxuICAgICAgZ2V0QnJvd3NlckNvbmZpZyh3Y28pLFxuICAgICAgZ2V0U3R5bGVzQ29uZmlnKHdjbyksXG4gICAgXTtcblxuICAgIGlmICh3Y28uYXBwQ29uZmlnLm1haW4gfHwgd2NvLmFwcENvbmZpZy5wb2x5ZmlsbHMpIHtcbiAgICAgIGNvbnN0IHR5cGVzY3JpcHRDb25maWdQYXJ0aWFsID0gd2NvLmJ1aWxkT3B0aW9ucy5hb3RcbiAgICAgICAgPyBnZXRBb3RDb25maWcod2NvLCBob3N0KVxuICAgICAgICA6IGdldE5vbkFvdENvbmZpZyh3Y28sIGhvc3QpO1xuICAgICAgd2VicGFja0NvbmZpZ3MucHVzaCh0eXBlc2NyaXB0Q29uZmlnUGFydGlhbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdlYnBhY2tNZXJnZSh3ZWJwYWNrQ29uZmlncyk7XG4gIH1cblxuICBwcml2YXRlIF9kZWxldGVPdXRwdXREaXIocm9vdDogUGF0aCwgb3V0cHV0UGF0aDogUGF0aCwgaG9zdDogdmlydHVhbEZzLkhvc3QpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICBjb25zdCByZXNvbHZlZE91dHB1dFBhdGggPSByZXNvbHZlKHJvb3QsIG91dHB1dFBhdGgpO1xuICAgIGlmIChyZXNvbHZlZE91dHB1dFBhdGggPT09IHJvb3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignT3V0cHV0IHBhdGggTVVTVCBub3QgYmUgcHJvamVjdCByb290IGRpcmVjdG9yeSEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdC5leGlzdHMocmVzb2x2ZWRPdXRwdXRQYXRoKS5waXBlKFxuICAgICAgc3dpdGNoTWFwKGV4aXN0cyA9PiB7XG4gICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICByZXR1cm4gaG9zdC5kZWxldGUocmVzb2x2ZWRPdXRwdXRQYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZW1wdHk8dm9pZD4oKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnJvd3NlckJ1aWxkZXI7XG4iXX0=