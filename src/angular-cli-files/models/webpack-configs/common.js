"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const webpack_1 = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const utils_1 = require("./utils");
const is_directory_1 = require("../../utilities/is-directory");
const require_project_module_1 = require("../../utilities/require-project-module");
const bundle_budget_1 = require("../../plugins/bundle-budget");
const cleancss_webpack_plugin_1 = require("../../plugins/cleancss-webpack-plugin");
const scripts_webpack_plugin_1 = require("../../plugins/scripts-webpack-plugin");
const find_up_1 = require("../../utilities/find-up");
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const StatsPlugin = require('stats-webpack-plugin');
const SilentError = require('silent-error');
const resolve = require('resolve');
/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('url-loader')
 * require('file-loader')
 * require('cache-loader')
 * require('@angular-devkit/build-optimizer')
 */
function getCommonConfig(wco) {
    const { projectRoot, buildOptions, appConfig } = wco;
    const appRoot = path.resolve(projectRoot, appConfig.root);
    const nodeModules = find_up_1.findUp('node_modules', projectRoot);
    if (!nodeModules) {
        throw new Error('Cannot locate node_modules directory.');
    }
    let extraPlugins = [];
    let entryPoints = {};
    if (appConfig.main) {
        entryPoints['main'] = [path.resolve(appRoot, appConfig.main)];
    }
    if (appConfig.polyfills) {
        entryPoints['polyfills'] = [path.resolve(appRoot, appConfig.polyfills)];
    }
    // determine hashing format
    const hashFormat = utils_1.getOutputHashFormat(buildOptions.outputHashing);
    // process global scripts
    if (appConfig.scripts.length > 0) {
        const globalScripts = utils_1.extraEntryParser(appConfig.scripts, appRoot, 'scripts');
        const globalScriptsByEntry = globalScripts
            .reduce((prev, curr) => {
            let existingEntry = prev.find((el) => el.entry === curr.entry);
            if (existingEntry) {
                existingEntry.paths.push(curr.path);
                // All entries have to be lazy for the bundle to be lazy.
                existingEntry.lazy = existingEntry.lazy && curr.lazy;
            }
            else {
                prev.push({
                    entry: curr.entry, paths: [curr.path],
                    lazy: curr.lazy
                });
            }
            return prev;
        }, []);
        // Add a new asset for each entry.
        globalScriptsByEntry.forEach((script) => {
            // Lazy scripts don't get a hash, otherwise they can't be loaded by name.
            const hash = script.lazy ? '' : hashFormat.script;
            extraPlugins.push(new scripts_webpack_plugin_1.ScriptsWebpackPlugin({
                name: script.entry,
                sourceMap: buildOptions.sourceMap,
                filename: `${script.entry}${hash}.js`,
                scripts: script.paths,
                basePath: projectRoot,
            }));
        });
    }
    // process asset entries
    if (appConfig.assets) {
        const copyWebpackPluginPatterns = appConfig.assets.map((asset) => {
            // Convert all string assets to object notation.
            asset = typeof asset === 'string' ? { glob: asset } : asset;
            // Add defaults.
            // Input is always resolved relative to the appRoot.
            asset.input = path.resolve(appRoot, asset.input || '').replace(/\\/g, '/');
            asset.output = asset.output || '';
            asset.glob = asset.glob || '';
            // Prevent asset configurations from writing outside of the output path, except if the user
            // specify a configuration flag.
            // Also prevent writing outside the project path. That is not overridable.
            const absoluteOutputPath = path.resolve(projectRoot, buildOptions.outputPath);
            const absoluteAssetOutput = path.resolve(absoluteOutputPath, asset.output);
            const outputRelativeOutput = path.relative(absoluteOutputPath, absoluteAssetOutput);
            if (outputRelativeOutput.startsWith('..') || path.isAbsolute(outputRelativeOutput)) {
                // TODO: This check doesn't make a lot of sense anymore with multiple project. Review it.
                // const projectRelativeOutput = path.relative(projectRoot, absoluteAssetOutput);
                // if (projectRelativeOutput.startsWith('..') || path.isAbsolute(projectRelativeOutput)) {
                //   const message = 'An asset cannot be written to a location outside the project.';
                //   throw new SilentError(message);
                // }
                if (!asset.allowOutsideOutDir) {
                    const message = 'An asset cannot be written to a location outside of the output path. '
                        + 'You can override this message by setting the `allowOutsideOutDir` '
                        + 'property on the asset to true in the CLI configuration.';
                    throw new SilentError(message);
                }
            }
            // TODO: This check doesn't make a lot of sense anymore with multiple project. Review it.
            // Prevent asset configurations from reading files outside of the project.
            // const projectRelativeInput = path.relative(projectRoot, asset.input);
            // if (projectRelativeInput.startsWith('..') || path.isAbsolute(projectRelativeInput)) {
            //   const message = 'An asset cannot be read from a location outside the project.';
            //   throw new SilentError(message);
            // }
            // Ensure trailing slash.
            if (is_directory_1.isDirectory(path.resolve(asset.input))) {
                asset.input += '/';
            }
            // Convert dir patterns to globs.
            if (is_directory_1.isDirectory(path.resolve(asset.input, asset.glob))) {
                asset.glob = asset.glob + '/**/*';
            }
            return {
                context: asset.input,
                to: asset.output,
                from: {
                    glob: asset.glob,
                    dot: true
                }
            };
        });
        const copyWebpackPluginOptions = { ignore: ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'] };
        const copyWebpackPluginInstance = new CopyWebpackPlugin(copyWebpackPluginPatterns, copyWebpackPluginOptions);
        // Save options so we can use them in eject.
        copyWebpackPluginInstance['copyWebpackPluginPatterns'] = copyWebpackPluginPatterns;
        copyWebpackPluginInstance['copyWebpackPluginOptions'] = copyWebpackPluginOptions;
        extraPlugins.push(copyWebpackPluginInstance);
    }
    if (buildOptions.progress) {
        extraPlugins.push(new ProgressPlugin({ profile: buildOptions.verbose, colors: true }));
    }
    if (buildOptions.showCircularDependencies) {
        extraPlugins.push(new CircularDependencyPlugin({
            exclude: /[\\\/]node_modules[\\\/]/
        }));
    }
    if (buildOptions.statsJson) {
        extraPlugins.push(new StatsPlugin('stats.json', 'verbose'));
    }
    let buildOptimizerUseRule;
    if (buildOptions.buildOptimizer) {
        // Set the cache directory to the Build Optimizer dir, so that package updates will delete it.
        const buildOptimizerDir = path.dirname(resolve.sync('@angular-devkit/build-optimizer', { basedir: projectRoot }));
        const cacheDirectory = path.resolve(buildOptimizerDir, './.cache/');
        buildOptimizerUseRule = {
            use: [
                {
                    loader: 'cache-loader',
                    options: { cacheDirectory }
                },
                {
                    loader: '@angular-devkit/build-optimizer/webpack-loader',
                    options: { sourceMap: buildOptions.sourceMap }
                },
            ],
        };
    }
    // Allow loaders to be in a node_modules nested inside the CLI package
    const loaderNodeModules = ['node_modules'];
    const potentialNodeModules = path.join(__dirname, '..', '..', 'node_modules');
    if (is_directory_1.isDirectory(potentialNodeModules)) {
        loaderNodeModules.push(potentialNodeModules);
    }
    // Load rxjs path aliases.
    // https://github.com/ReactiveX/rxjs/blob/master/doc/lettable-operators.md#build-and-treeshaking
    let alias = {};
    try {
        const rxjsPathMappingImport = wco.supportES2015
            ? 'rxjs/_esm2015/path-mapping'
            : 'rxjs/_esm5/path-mapping';
        const rxPaths = require_project_module_1.requireProjectModule(projectRoot, rxjsPathMappingImport);
        alias = rxPaths(nodeModules);
    }
    catch (e) { }
    return {
        mode: buildOptions.optimizationLevel === 0 ? 'development' : 'production',
        devtool: false,
        resolve: {
            extensions: ['.ts', '.js'],
            symlinks: !buildOptions.preserveSymlinks,
            modules: [appRoot, 'node_modules'],
            alias
        },
        resolveLoader: {
            modules: loaderNodeModules
        },
        context: projectRoot,
        entry: entryPoints,
        output: {
            path: path.resolve(projectRoot, buildOptions.outputPath),
            publicPath: buildOptions.deployUrl,
            filename: `[name]${hashFormat.chunk}.js`,
        },
        performance: {
            hints: false,
        },
        module: {
            rules: [
                { test: /\.html$/, loader: 'raw-loader' },
                {
                    test: /\.(eot|svg|cur)$/,
                    loader: 'file-loader',
                    options: {
                        name: `[name]${hashFormat.file}.[ext]`,
                        limit: 10000
                    }
                },
                {
                    test: /\.(jpg|png|webp|gif|otf|ttf|woff|woff2|ani)$/,
                    loader: 'url-loader',
                    options: {
                        name: `[name]${hashFormat.file}.[ext]`,
                        limit: 10000
                    }
                },
                Object.assign({ test: /[\/\\]@angular[\/\\].+\.js$/, sideEffects: false, parser: { system: true } }, buildOptimizerUseRule),
                Object.assign({ test: /\.js$/ }, buildOptimizerUseRule),
            ]
        },
        optimization: {
            noEmitOnErrors: true,
            minimizer: [
                new webpack_1.HashedModuleIdsPlugin(),
                // TODO: check with Mike what this feature needs.
                new bundle_budget_1.BundleBudgetPlugin({ budgets: appConfig.budgets }),
                new cleancss_webpack_plugin_1.CleanCssWebpackPlugin({
                    sourceMap: buildOptions.sourceMap,
                    // component styles retain their original file name
                    test: (file) => /\.(?:css|scss|sass|less|styl)$/.test(file),
                }),
                new UglifyJSPlugin({
                    sourceMap: buildOptions.sourceMap,
                    parallel: true,
                    cache: true,
                    uglifyOptions: {
                        ecma: wco.supportES2015 ? 6 : 5,
                        warnings: buildOptions.verbose,
                        safari10: true,
                        compress: {
                            pure_getters: buildOptions.buildOptimizer,
                            // PURE comments work best with 3 passes.
                            // See https://github.com/webpack/webpack/issues/2899#issuecomment-317425926.
                            passes: buildOptions.buildOptimizer ? 3 : 1,
                        },
                        output: {
                            ascii_only: true,
                            comments: false,
                            webkit: true,
                        },
                    }
                }),
            ],
        },
        plugins: extraPlugins,
    };
}
exports.getCommonConfig = getCommonConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL2NvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBQWlCO0FBQ2pCLCtEQUErRDs7QUFFL0QsNkJBQTZCO0FBQzdCLHFDQUFnRDtBQUNoRCx5REFBeUQ7QUFDekQsbUNBQThFO0FBQzlFLCtEQUEyRDtBQUMzRCxtRkFBOEU7QUFFOUUsK0RBQWlFO0FBQ2pFLG1GQUE4RTtBQUM5RSxpRkFBNEU7QUFDNUUscURBQWlEO0FBRWpELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQzdELE1BQU0sd0JBQXdCLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFDdkUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDMUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDcEQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVuQzs7Ozs7Ozs7OztHQVVHO0FBRUgseUJBQWdDLEdBQXlCO0lBQ3ZELE1BQU0sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxHQUFHLEdBQUcsQ0FBQztJQUVyRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUQsTUFBTSxXQUFXLEdBQUcsZ0JBQU0sQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFD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O0tBQ3RCLENBQUM7QUFDSixDQUFDO0FBbFJELDBDQWtSQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXG4vLyBUT0RPOiBjbGVhbnVwIHRoaXMgZmlsZSwgaXQncyBjb3BpZWQgYXMgaXMgZnJvbSBBbmd1bGFyIENMSS5cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEhhc2hlZE1vZHVsZUlkc1BsdWdpbiB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0ICogYXMgQ29weVdlYnBhY2tQbHVnaW4gZnJvbSAnY29weS13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBleHRyYUVudHJ5UGFyc2VyLCBnZXRPdXRwdXRIYXNoRm9ybWF0LCBBc3NldFBhdHRlcm4gfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGlzRGlyZWN0b3J5IH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2lzLWRpcmVjdG9yeSc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7IFdlYnBhY2tDb25maWdPcHRpb25zIH0gZnJvbSAnLi4vYnVpbGQtb3B0aW9ucyc7XG5pbXBvcnQgeyBCdW5kbGVCdWRnZXRQbHVnaW4gfSBmcm9tICcuLi8uLi9wbHVnaW5zL2J1bmRsZS1idWRnZXQnO1xuaW1wb3J0IHsgQ2xlYW5Dc3NXZWJwYWNrUGx1Z2luIH0gZnJvbSAnLi4vLi4vcGx1Z2lucy9jbGVhbmNzcy13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBTY3JpcHRzV2VicGFja1BsdWdpbiB9IGZyb20gJy4uLy4uL3BsdWdpbnMvc2NyaXB0cy13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZmluZC11cCc7XG5cbmNvbnN0IFByb2dyZXNzUGx1Z2luID0gcmVxdWlyZSgnd2VicGFjay9saWIvUHJvZ3Jlc3NQbHVnaW4nKTtcbmNvbnN0IENpcmN1bGFyRGVwZW5kZW5jeVBsdWdpbiA9IHJlcXVpcmUoJ2NpcmN1bGFyLWRlcGVuZGVuY3ktcGx1Z2luJyk7XG5jb25zdCBVZ2xpZnlKU1BsdWdpbiA9IHJlcXVpcmUoJ3VnbGlmeWpzLXdlYnBhY2stcGx1Z2luJyk7XG5jb25zdCBTdGF0c1BsdWdpbiA9IHJlcXVpcmUoJ3N0YXRzLXdlYnBhY2stcGx1Z2luJyk7XG5jb25zdCBTaWxlbnRFcnJvciA9IHJlcXVpcmUoJ3NpbGVudC1lcnJvcicpO1xuY29uc3QgcmVzb2x2ZSA9IHJlcXVpcmUoJ3Jlc29sdmUnKTtcblxuLyoqXG4gKiBFbnVtZXJhdGUgbG9hZGVycyBhbmQgdGhlaXIgZGVwZW5kZW5jaWVzIGZyb20gdGhpcyBmaWxlIHRvIGxldCB0aGUgZGVwZW5kZW5jeSB2YWxpZGF0b3JcbiAqIGtub3cgdGhleSBhcmUgdXNlZC5cbiAqXG4gKiByZXF1aXJlKCdzb3VyY2UtbWFwLWxvYWRlcicpXG4gKiByZXF1aXJlKCdyYXctbG9hZGVyJylcbiAqIHJlcXVpcmUoJ3VybC1sb2FkZXInKVxuICogcmVxdWlyZSgnZmlsZS1sb2FkZXInKVxuICogcmVxdWlyZSgnY2FjaGUtbG9hZGVyJylcbiAqIHJlcXVpcmUoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXInKVxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb21tb25Db25maWcod2NvOiBXZWJwYWNrQ29uZmlnT3B0aW9ucykge1xuICBjb25zdCB7IHByb2plY3RSb290LCBidWlsZE9wdGlvbnMsIGFwcENvbmZpZyB9ID0gd2NvO1xuXG4gIGNvbnN0IGFwcFJvb3QgPSBwYXRoLnJlc29sdmUocHJvamVjdFJvb3QsIGFwcENvbmZpZy5yb290KTtcbiAgY29uc3Qgbm9kZU1vZHVsZXMgPSBmaW5kVXAoJ25vZGVfbW9kdWxlcycsIHByb2plY3RSb290KTtcbiAgaWYgKCFub2RlTW9kdWxlcykge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGxvY2F0ZSBub2RlX21vZHVsZXMgZGlyZWN0b3J5LicpXG4gIH1cblxuICBsZXQgZXh0cmFQbHVnaW5zOiBhbnlbXSA9IFtdO1xuICBsZXQgZW50cnlQb2ludHM6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nW10gfSA9IHt9O1xuXG4gIGlmIChhcHBDb25maWcubWFpbikge1xuICAgIGVudHJ5UG9pbnRzWydtYWluJ10gPSBbcGF0aC5yZXNvbHZlKGFwcFJvb3QsIGFwcENvbmZpZy5tYWluKV07XG4gIH1cblxuICBpZiAoYXBwQ29uZmlnLnBvbHlmaWxscykge1xuICAgIGVudHJ5UG9pbnRzWydwb2x5ZmlsbHMnXSA9IFtwYXRoLnJlc29sdmUoYXBwUm9vdCwgYXBwQ29uZmlnLnBvbHlmaWxscyldO1xuICB9XG5cbiAgLy8gZGV0ZXJtaW5lIGhhc2hpbmcgZm9ybWF0XG4gIGNvbnN0IGhhc2hGb3JtYXQgPSBnZXRPdXRwdXRIYXNoRm9ybWF0KGJ1aWxkT3B0aW9ucy5vdXRwdXRIYXNoaW5nIGFzIGFueSk7XG5cbiAgLy8gcHJvY2VzcyBnbG9iYWwgc2NyaXB0c1xuICBpZiAoYXBwQ29uZmlnLnNjcmlwdHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGdsb2JhbFNjcmlwdHMgPSBleHRyYUVudHJ5UGFyc2VyKGFwcENvbmZpZy5zY3JpcHRzLCBhcHBSb290LCAnc2NyaXB0cycpO1xuICAgIGNvbnN0IGdsb2JhbFNjcmlwdHNCeUVudHJ5ID0gZ2xvYmFsU2NyaXB0c1xuICAgICAgLnJlZHVjZSgocHJldjogeyBlbnRyeTogc3RyaW5nLCBwYXRoczogc3RyaW5nW10sIGxhenk6IGJvb2xlYW4gfVtdLCBjdXJyKSA9PiB7XG5cbiAgICAgICAgbGV0IGV4aXN0aW5nRW50cnkgPSBwcmV2LmZpbmQoKGVsKSA9PiBlbC5lbnRyeSA9PT0gY3Vyci5lbnRyeSk7XG4gICAgICAgIGlmIChleGlzdGluZ0VudHJ5KSB7XG4gICAgICAgICAgZXhpc3RpbmdFbnRyeS5wYXRocy5wdXNoKGN1cnIucGF0aCBhcyBzdHJpbmcpO1xuICAgICAgICAgIC8vIEFsbCBlbnRyaWVzIGhhdmUgdG8gYmUgbGF6eSBmb3IgdGhlIGJ1bmRsZSB0byBiZSBsYXp5LlxuICAgICAgICAgIChleGlzdGluZ0VudHJ5IGFzIGFueSkubGF6eSA9IGV4aXN0aW5nRW50cnkubGF6eSAmJiBjdXJyLmxhenk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHJldi5wdXNoKHtcbiAgICAgICAgICAgIGVudHJ5OiBjdXJyLmVudHJ5IGFzIHN0cmluZywgcGF0aHM6IFtjdXJyLnBhdGggYXMgc3RyaW5nXSxcbiAgICAgICAgICAgIGxhenk6IGN1cnIubGF6eSBhcyBib29sZWFuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSk7XG5cblxuICAgIC8vIEFkZCBhIG5ldyBhc3NldCBmb3IgZWFjaCBlbnRyeS5cbiAgICBnbG9iYWxTY3JpcHRzQnlFbnRyeS5mb3JFYWNoKChzY3JpcHQpID0+IHtcbiAgICAgIC8vIExhenkgc2NyaXB0cyBkb24ndCBnZXQgYSBoYXNoLCBvdGhlcndpc2UgdGhleSBjYW4ndCBiZSBsb2FkZWQgYnkgbmFtZS5cbiAgICAgIGNvbnN0IGhhc2ggPSBzY3JpcHQubGF6eSA/ICcnIDogaGFzaEZvcm1hdC5zY3JpcHQ7XG4gICAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgU2NyaXB0c1dlYnBhY2tQbHVnaW4oe1xuICAgICAgICBuYW1lOiBzY3JpcHQuZW50cnksXG4gICAgICAgIHNvdXJjZU1hcDogYnVpbGRPcHRpb25zLnNvdXJjZU1hcCxcbiAgICAgICAgZmlsZW5hbWU6IGAke3NjcmlwdC5lbnRyeX0ke2hhc2h9LmpzYCxcbiAgICAgICAgc2NyaXB0czogc2NyaXB0LnBhdGhzLFxuICAgICAgICBiYXNlUGF0aDogcHJvamVjdFJvb3QsXG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBwcm9jZXNzIGFzc2V0IGVudHJpZXNcbiAgaWYgKGFwcENvbmZpZy5hc3NldHMpIHtcbiAgICBjb25zdCBjb3B5V2VicGFja1BsdWdpblBhdHRlcm5zID0gYXBwQ29uZmlnLmFzc2V0cy5tYXAoKGFzc2V0OiBzdHJpbmcgfCBBc3NldFBhdHRlcm4pID0+IHtcbiAgICAgIC8vIENvbnZlcnQgYWxsIHN0cmluZyBhc3NldHMgdG8gb2JqZWN0IG5vdGF0aW9uLlxuICAgICAgYXNzZXQgPSB0eXBlb2YgYXNzZXQgPT09ICdzdHJpbmcnID8geyBnbG9iOiBhc3NldCB9IDogYXNzZXQ7XG4gICAgICAvLyBBZGQgZGVmYXVsdHMuXG4gICAgICAvLyBJbnB1dCBpcyBhbHdheXMgcmVzb2x2ZWQgcmVsYXRpdmUgdG8gdGhlIGFwcFJvb3QuXG4gICAgICBhc3NldC5pbnB1dCA9IHBhdGgucmVzb2x2ZShhcHBSb290LCBhc3NldC5pbnB1dCB8fCAnJykucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgYXNzZXQub3V0cHV0ID0gYXNzZXQub3V0cHV0IHx8ICcnO1xuICAgICAgYXNzZXQuZ2xvYiA9IGFzc2V0Lmdsb2IgfHwgJyc7XG5cbiAgICAgIC8vIFByZXZlbnQgYXNzZXQgY29uZmlndXJhdGlvbnMgZnJvbSB3cml0aW5nIG91dHNpZGUgb2YgdGhlIG91dHB1dCBwYXRoLCBleGNlcHQgaWYgdGhlIHVzZXJcbiAgICAgIC8vIHNwZWNpZnkgYSBjb25maWd1cmF0aW9uIGZsYWcuXG4gICAgICAvLyBBbHNvIHByZXZlbnQgd3JpdGluZyBvdXRzaWRlIHRoZSBwcm9qZWN0IHBhdGguIFRoYXQgaXMgbm90IG92ZXJyaWRhYmxlLlxuICAgICAgY29uc3QgYWJzb2x1dGVPdXRwdXRQYXRoID0gcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCBidWlsZE9wdGlvbnMub3V0cHV0UGF0aCBhcyBzdHJpbmcpO1xuICAgICAgY29uc3QgYWJzb2x1dGVBc3NldE91dHB1dCA9IHBhdGgucmVzb2x2ZShhYnNvbHV0ZU91dHB1dFBhdGgsIGFzc2V0Lm91dHB1dCk7XG4gICAgICBjb25zdCBvdXRwdXRSZWxhdGl2ZU91dHB1dCA9IHBhdGgucmVsYXRpdmUoYWJzb2x1dGVPdXRwdXRQYXRoLCBhYnNvbHV0ZUFzc2V0T3V0cHV0KTtcblxuICAgICAgaWYgKG91dHB1dFJlbGF0aXZlT3V0cHV0LnN0YXJ0c1dpdGgoJy4uJykgfHwgcGF0aC5pc0Fic29sdXRlKG91dHB1dFJlbGF0aXZlT3V0cHV0KSkge1xuXG4gICAgICAgIC8vIFRPRE86IFRoaXMgY2hlY2sgZG9lc24ndCBtYWtlIGEgbG90IG9mIHNlbnNlIGFueW1vcmUgd2l0aCBtdWx0aXBsZSBwcm9qZWN0LiBSZXZpZXcgaXQuXG4gICAgICAgIC8vIGNvbnN0IHByb2plY3RSZWxhdGl2ZU91dHB1dCA9IHBhdGgucmVsYXRpdmUocHJvamVjdFJvb3QsIGFic29sdXRlQXNzZXRPdXRwdXQpO1xuICAgICAgICAvLyBpZiAocHJvamVjdFJlbGF0aXZlT3V0cHV0LnN0YXJ0c1dpdGgoJy4uJykgfHwgcGF0aC5pc0Fic29sdXRlKHByb2plY3RSZWxhdGl2ZU91dHB1dCkpIHtcbiAgICAgICAgLy8gICBjb25zdCBtZXNzYWdlID0gJ0FuIGFzc2V0IGNhbm5vdCBiZSB3cml0dGVuIHRvIGEgbG9jYXRpb24gb3V0c2lkZSB0aGUgcHJvamVjdC4nO1xuICAgICAgICAvLyAgIHRocm93IG5ldyBTaWxlbnRFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIGlmICghYXNzZXQuYWxsb3dPdXRzaWRlT3V0RGlyKSB7XG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9ICdBbiBhc3NldCBjYW5ub3QgYmUgd3JpdHRlbiB0byBhIGxvY2F0aW9uIG91dHNpZGUgb2YgdGhlIG91dHB1dCBwYXRoLiAnXG4gICAgICAgICAgICArICdZb3UgY2FuIG92ZXJyaWRlIHRoaXMgbWVzc2FnZSBieSBzZXR0aW5nIHRoZSBgYWxsb3dPdXRzaWRlT3V0RGlyYCAnXG4gICAgICAgICAgICArICdwcm9wZXJ0eSBvbiB0aGUgYXNzZXQgdG8gdHJ1ZSBpbiB0aGUgQ0xJIGNvbmZpZ3VyYXRpb24uJztcbiAgICAgICAgICB0aHJvdyBuZXcgU2lsZW50RXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzogVGhpcyBjaGVjayBkb2Vzbid0IG1ha2UgYSBsb3Qgb2Ygc2Vuc2UgYW55bW9yZSB3aXRoIG11bHRpcGxlIHByb2plY3QuIFJldmlldyBpdC5cbiAgICAgIC8vIFByZXZlbnQgYXNzZXQgY29uZmlndXJhdGlvbnMgZnJvbSByZWFkaW5nIGZpbGVzIG91dHNpZGUgb2YgdGhlIHByb2plY3QuXG4gICAgICAvLyBjb25zdCBwcm9qZWN0UmVsYXRpdmVJbnB1dCA9IHBhdGgucmVsYXRpdmUocHJvamVjdFJvb3QsIGFzc2V0LmlucHV0KTtcbiAgICAgIC8vIGlmIChwcm9qZWN0UmVsYXRpdmVJbnB1dC5zdGFydHNXaXRoKCcuLicpIHx8IHBhdGguaXNBYnNvbHV0ZShwcm9qZWN0UmVsYXRpdmVJbnB1dCkpIHtcbiAgICAgIC8vICAgY29uc3QgbWVzc2FnZSA9ICdBbiBhc3NldCBjYW5ub3QgYmUgcmVhZCBmcm9tIGEgbG9jYXRpb24gb3V0c2lkZSB0aGUgcHJvamVjdC4nO1xuICAgICAgLy8gICB0aHJvdyBuZXcgU2lsZW50RXJyb3IobWVzc2FnZSk7XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIEVuc3VyZSB0cmFpbGluZyBzbGFzaC5cbiAgICAgIGlmIChpc0RpcmVjdG9yeShwYXRoLnJlc29sdmUoYXNzZXQuaW5wdXQpKSkge1xuICAgICAgICBhc3NldC5pbnB1dCArPSAnLyc7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbnZlcnQgZGlyIHBhdHRlcm5zIHRvIGdsb2JzLlxuICAgICAgaWYgKGlzRGlyZWN0b3J5KHBhdGgucmVzb2x2ZShhc3NldC5pbnB1dCwgYXNzZXQuZ2xvYikpKSB7XG4gICAgICAgIGFzc2V0Lmdsb2IgPSBhc3NldC5nbG9iICsgJy8qKi8qJztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGV4dDogYXNzZXQuaW5wdXQsXG4gICAgICAgIHRvOiBhc3NldC5vdXRwdXQsXG4gICAgICAgIGZyb206IHtcbiAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgIGRvdDogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICAgIGNvbnN0IGNvcHlXZWJwYWNrUGx1Z2luT3B0aW9ucyA9IHsgaWdub3JlOiBbJy5naXRrZWVwJywgJyoqLy5EU19TdG9yZScsICcqKi9UaHVtYnMuZGInXSB9O1xuXG4gICAgY29uc3QgY29weVdlYnBhY2tQbHVnaW5JbnN0YW5jZSA9IG5ldyBDb3B5V2VicGFja1BsdWdpbihjb3B5V2VicGFja1BsdWdpblBhdHRlcm5zLFxuICAgICAgY29weVdlYnBhY2tQbHVnaW5PcHRpb25zKTtcblxuICAgIC8vIFNhdmUgb3B0aW9ucyBzbyB3ZSBjYW4gdXNlIHRoZW0gaW4gZWplY3QuXG4gICAgKGNvcHlXZWJwYWNrUGx1Z2luSW5zdGFuY2UgYXMgYW55KVsnY29weVdlYnBhY2tQbHVnaW5QYXR0ZXJucyddID0gY29weVdlYnBhY2tQbHVnaW5QYXR0ZXJucztcbiAgICAoY29weVdlYnBhY2tQbHVnaW5JbnN0YW5jZSBhcyBhbnkpWydjb3B5V2VicGFja1BsdWdpbk9wdGlvbnMnXSA9IGNvcHlXZWJwYWNrUGx1Z2luT3B0aW9ucztcblxuICAgIGV4dHJhUGx1Z2lucy5wdXNoKGNvcHlXZWJwYWNrUGx1Z2luSW5zdGFuY2UpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5wcm9ncmVzcykge1xuICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7IHByb2ZpbGU6IGJ1aWxkT3B0aW9ucy52ZXJib3NlLCBjb2xvcnM6IHRydWUgfSkpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5zaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXMpIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgQ2lyY3VsYXJEZXBlbmRlbmN5UGx1Z2luKHtcbiAgICAgIGV4Y2x1ZGU6IC9bXFxcXFxcL11ub2RlX21vZHVsZXNbXFxcXFxcL10vXG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5zdGF0c0pzb24pIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgU3RhdHNQbHVnaW4oJ3N0YXRzLmpzb24nLCAndmVyYm9zZScpKTtcbiAgfVxuXG4gIGxldCBidWlsZE9wdGltaXplclVzZVJ1bGU7XG4gIGlmIChidWlsZE9wdGlvbnMuYnVpbGRPcHRpbWl6ZXIpIHtcbiAgICAvLyBTZXQgdGhlIGNhY2hlIGRpcmVjdG9yeSB0byB0aGUgQnVpbGQgT3B0aW1pemVyIGRpciwgc28gdGhhdCBwYWNrYWdlIHVwZGF0ZXMgd2lsbCBkZWxldGUgaXQuXG4gICAgY29uc3QgYnVpbGRPcHRpbWl6ZXJEaXIgPSBwYXRoLmRpcm5hbWUoXG4gICAgICByZXNvbHZlLnN5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXInLCB7IGJhc2VkaXI6IHByb2plY3RSb290IH0pKTtcbiAgICBjb25zdCBjYWNoZURpcmVjdG9yeSA9IHBhdGgucmVzb2x2ZShidWlsZE9wdGltaXplckRpciwgJy4vLmNhY2hlLycpO1xuXG4gICAgYnVpbGRPcHRpbWl6ZXJVc2VSdWxlID0ge1xuICAgICAgdXNlOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkZXI6ICdjYWNoZS1sb2FkZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVEaXJlY3RvcnkgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbG9hZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLW9wdGltaXplci93ZWJwYWNrLWxvYWRlcicsXG4gICAgICAgICAgb3B0aW9uczogeyBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAgfVxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9O1xuICB9XG5cbiAgLy8gQWxsb3cgbG9hZGVycyB0byBiZSBpbiBhIG5vZGVfbW9kdWxlcyBuZXN0ZWQgaW5zaWRlIHRoZSBDTEkgcGFja2FnZVxuICBjb25zdCBsb2FkZXJOb2RlTW9kdWxlcyA9IFsnbm9kZV9tb2R1bGVzJ107XG4gIGNvbnN0IHBvdGVudGlhbE5vZGVNb2R1bGVzID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoaXNEaXJlY3RvcnkocG90ZW50aWFsTm9kZU1vZHVsZXMpKSB7XG4gICAgbG9hZGVyTm9kZU1vZHVsZXMucHVzaChwb3RlbnRpYWxOb2RlTW9kdWxlcyk7XG4gIH1cblxuICAvLyBMb2FkIHJ4anMgcGF0aCBhbGlhc2VzLlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vUmVhY3RpdmVYL3J4anMvYmxvYi9tYXN0ZXIvZG9jL2xldHRhYmxlLW9wZXJhdG9ycy5tZCNidWlsZC1hbmQtdHJlZXNoYWtpbmdcbiAgbGV0IGFsaWFzID0ge307XG4gIHRyeSB7XG4gICAgY29uc3Qgcnhqc1BhdGhNYXBwaW5nSW1wb3J0ID0gd2NvLnN1cHBvcnRFUzIwMTVcbiAgICAgID8gJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJ1xuICAgICAgOiAncnhqcy9fZXNtNS9wYXRoLW1hcHBpbmcnO1xuICAgIGNvbnN0IHJ4UGF0aHMgPSByZXF1aXJlUHJvamVjdE1vZHVsZShwcm9qZWN0Um9vdCwgcnhqc1BhdGhNYXBwaW5nSW1wb3J0KTtcbiAgICBhbGlhcyA9IHJ4UGF0aHMobm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlKSB7IH1cblxuICByZXR1cm4ge1xuICAgIG1vZGU6IGJ1aWxkT3B0aW9ucy5vcHRpbWl6YXRpb25MZXZlbCA9PT0gMCA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbicsXG4gICAgZGV2dG9vbDogZmFsc2UsXG4gICAgcmVzb2x2ZToge1xuICAgICAgZXh0ZW5zaW9uczogWycudHMnLCAnLmpzJ10sXG4gICAgICBzeW1saW5rczogIWJ1aWxkT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgbW9kdWxlczogW2FwcFJvb3QsICdub2RlX21vZHVsZXMnXSxcbiAgICAgIGFsaWFzXG4gICAgfSxcbiAgICByZXNvbHZlTG9hZGVyOiB7XG4gICAgICBtb2R1bGVzOiBsb2FkZXJOb2RlTW9kdWxlc1xuICAgIH0sXG4gICAgY29udGV4dDogcHJvamVjdFJvb3QsXG4gICAgZW50cnk6IGVudHJ5UG9pbnRzLFxuICAgIG91dHB1dDoge1xuICAgICAgcGF0aDogcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCBidWlsZE9wdGlvbnMub3V0cHV0UGF0aCBhcyBzdHJpbmcpLFxuICAgICAgcHVibGljUGF0aDogYnVpbGRPcHRpb25zLmRlcGxveVVybCxcbiAgICAgIGZpbGVuYW1lOiBgW25hbWVdJHtoYXNoRm9ybWF0LmNodW5rfS5qc2AsXG4gICAgfSxcbiAgICBwZXJmb3JtYW5jZToge1xuICAgICAgaGludHM6IGZhbHNlLFxuICAgIH0sXG4gICAgbW9kdWxlOiB7XG4gICAgICBydWxlczogW1xuICAgICAgICB7IHRlc3Q6IC9cXC5odG1sJC8sIGxvYWRlcjogJ3Jhdy1sb2FkZXInIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXN0OiAvXFwuKGVvdHxzdmd8Y3VyKSQvLFxuICAgICAgICAgIGxvYWRlcjogJ2ZpbGUtbG9hZGVyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBuYW1lOiBgW25hbWVdJHtoYXNoRm9ybWF0LmZpbGV9LltleHRdYCxcbiAgICAgICAgICAgIGxpbWl0OiAxMDAwMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRlc3Q6IC9cXC4oanBnfHBuZ3x3ZWJwfGdpZnxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICAgIGxvYWRlcjogJ3VybC1sb2FkZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG5hbWU6IGBbbmFtZV0ke2hhc2hGb3JtYXQuZmlsZX0uW2V4dF1gLFxuICAgICAgICAgICAgbGltaXQ6IDEwMDAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGVzdDogL1tcXC9cXFxcXUBhbmd1bGFyW1xcL1xcXFxdLitcXC5qcyQvLFxuICAgICAgICAgIHNpZGVFZmZlY3RzOiBmYWxzZSxcbiAgICAgICAgICBwYXJzZXI6IHsgc3lzdGVtOiB0cnVlIH0sXG4gICAgICAgICAgLi4uYnVpbGRPcHRpbWl6ZXJVc2VSdWxlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGVzdDogL1xcLmpzJC8sXG4gICAgICAgICAgLi4uYnVpbGRPcHRpbWl6ZXJVc2VSdWxlLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgIH0sXG4gICAgb3B0aW1pemF0aW9uOiB7XG4gICAgICBub0VtaXRPbkVycm9yczogdHJ1ZSxcbiAgICAgIG1pbmltaXplcjogW1xuICAgICAgICBuZXcgSGFzaGVkTW9kdWxlSWRzUGx1Z2luKCksXG4gICAgICAgIC8vIFRPRE86IGNoZWNrIHdpdGggTWlrZSB3aGF0IHRoaXMgZmVhdHVyZSBuZWVkcy5cbiAgICAgICAgbmV3IEJ1bmRsZUJ1ZGdldFBsdWdpbih7IGJ1ZGdldHM6IGFwcENvbmZpZy5idWRnZXRzIH0pLFxuICAgICAgICBuZXcgQ2xlYW5Dc3NXZWJwYWNrUGx1Z2luKHtcbiAgICAgICAgICBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAsXG4gICAgICAgICAgLy8gY29tcG9uZW50IHN0eWxlcyByZXRhaW4gdGhlaXIgb3JpZ2luYWwgZmlsZSBuYW1lXG4gICAgICAgICAgdGVzdDogKGZpbGUpID0+IC9cXC4oPzpjc3N8c2Nzc3xzYXNzfGxlc3N8c3R5bCkkLy50ZXN0KGZpbGUpLFxuICAgICAgICB9KSxcbiAgICAgICAgbmV3IFVnbGlmeUpTUGx1Z2luKHtcbiAgICAgICAgICBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAsXG4gICAgICAgICAgcGFyYWxsZWw6IHRydWUsXG4gICAgICAgICAgY2FjaGU6IHRydWUsXG4gICAgICAgICAgdWdsaWZ5T3B0aW9uczoge1xuICAgICAgICAgICAgZWNtYTogd2NvLnN1cHBvcnRFUzIwMTUgPyA2IDogNSxcbiAgICAgICAgICAgIHdhcm5pbmdzOiBidWlsZE9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgICAgIHNhZmFyaTEwOiB0cnVlLFxuICAgICAgICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgICAgICAgcHVyZV9nZXR0ZXJzOiBidWlsZE9wdGlvbnMuYnVpbGRPcHRpbWl6ZXIsXG4gICAgICAgICAgICAgIC8vIFBVUkUgY29tbWVudHMgd29yayBiZXN0IHdpdGggMyBwYXNzZXMuXG4gICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93ZWJwYWNrL2lzc3Vlcy8yODk5I2lzc3VlY29tbWVudC0zMTc0MjU5MjYuXG4gICAgICAgICAgICAgIHBhc3NlczogYnVpbGRPcHRpb25zLmJ1aWxkT3B0aW1pemVyID8gMyA6IDEsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgIGFzY2lpX29ubHk6IHRydWUsXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiBmYWxzZSxcbiAgICAgICAgICAgICAgd2Via2l0OiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgXSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IGV4dHJhUGx1Z2lucyxcbiAgfTtcbn1cbiJdfQ==