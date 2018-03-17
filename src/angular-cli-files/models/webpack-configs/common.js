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
    const { root, projectRoot, buildOptions, appConfig } = wco;
    const nodeModules = find_up_1.findUp('node_modules', projectRoot);
    if (!nodeModules) {
        throw new Error('Cannot locate node_modules directory.');
    }
    let extraPlugins = [];
    let entryPoints = {};
    if (appConfig.main) {
        entryPoints['main'] = [path.resolve(root, appConfig.main)];
    }
    if (appConfig.polyfills) {
        entryPoints['polyfills'] = [path.resolve(root, appConfig.polyfills)];
    }
    // determine hashing format
    const hashFormat = utils_1.getOutputHashFormat(buildOptions.outputHashing);
    // process global scripts
    if (appConfig.scripts.length > 0) {
        const globalScripts = utils_1.extraEntryParser(appConfig.scripts, root, 'scripts');
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
                filename: `${path.basename(script.entry)}${hash}.js`,
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
            // Input is always resolved relative to the projectRoot.
            // TODO: add smart defaults to schema to use project root as default.
            asset.input = path.resolve(root, asset.input || projectRoot).replace(/\\/g, '/');
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
            modules: [projectRoot, 'node_modules'],
            alias
        },
        resolveLoader: {
            modules: loaderNodeModules
        },
        context: projectRoot,
        entry: entryPoints,
        output: {
            path: path.resolve(root, buildOptions.outputPath),
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
                            // Workaround known uglify-es issue
                            // See https://github.com/mishoo/UglifyJS2/issues/2949#issuecomment-368070307
                            inline: wco.supportES2015 ? 1 : 3,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL2NvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBQWlCO0FBQ2pCLCtEQUErRDs7QUFFL0QsNkJBQTZCO0FBQzdCLHFDQUFnRDtBQUNoRCx5REFBeUQ7QUFDekQsbUNBQThFO0FBQzlFLCtEQUEyRDtBQUMzRCxtRkFBOEU7QUFFOUUsK0RBQWlFO0FBQ2pFLG1GQUE4RTtBQUM5RSxpRkFBNEU7QUFDNUUscURBQWlEO0FBRWpELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQzdELE1BQU0sd0JBQXdCLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFDdkUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDMUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDcEQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVuQzs7Ozs7Ozs7OztHQVVHO0FBRUgseUJBQWdDLEdBQXlCO0lBQ3ZELE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFFM0QsTUFBTSxXQUFXLEdBQUcsZ0JBQU0sQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsSUFBSSxZ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QkFDZixNQUFNLEVBQUUsSUFBSTt5QkFDYjtxQkFDRjtpQkFDRixDQUFDO2FBQ0g7U0FDRjtRQUNELE9BQU8sRUFBRSxZQUFZO0tBQ3RCLENBQUM7QUFDSixDQUFDO0FBdFJELDBDQXNSQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXG4vLyBUT0RPOiBjbGVhbnVwIHRoaXMgZmlsZSwgaXQncyBjb3BpZWQgYXMgaXMgZnJvbSBBbmd1bGFyIENMSS5cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEhhc2hlZE1vZHVsZUlkc1BsdWdpbiB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0ICogYXMgQ29weVdlYnBhY2tQbHVnaW4gZnJvbSAnY29weS13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBleHRyYUVudHJ5UGFyc2VyLCBnZXRPdXRwdXRIYXNoRm9ybWF0LCBBc3NldFBhdHRlcm4gfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGlzRGlyZWN0b3J5IH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2lzLWRpcmVjdG9yeSc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7IFdlYnBhY2tDb25maWdPcHRpb25zIH0gZnJvbSAnLi4vYnVpbGQtb3B0aW9ucyc7XG5pbXBvcnQgeyBCdW5kbGVCdWRnZXRQbHVnaW4gfSBmcm9tICcuLi8uLi9wbHVnaW5zL2J1bmRsZS1idWRnZXQnO1xuaW1wb3J0IHsgQ2xlYW5Dc3NXZWJwYWNrUGx1Z2luIH0gZnJvbSAnLi4vLi4vcGx1Z2lucy9jbGVhbmNzcy13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBTY3JpcHRzV2VicGFja1BsdWdpbiB9IGZyb20gJy4uLy4uL3BsdWdpbnMvc2NyaXB0cy13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZmluZC11cCc7XG5cbmNvbnN0IFByb2dyZXNzUGx1Z2luID0gcmVxdWlyZSgnd2VicGFjay9saWIvUHJvZ3Jlc3NQbHVnaW4nKTtcbmNvbnN0IENpcmN1bGFyRGVwZW5kZW5jeVBsdWdpbiA9IHJlcXVpcmUoJ2NpcmN1bGFyLWRlcGVuZGVuY3ktcGx1Z2luJyk7XG5jb25zdCBVZ2xpZnlKU1BsdWdpbiA9IHJlcXVpcmUoJ3VnbGlmeWpzLXdlYnBhY2stcGx1Z2luJyk7XG5jb25zdCBTdGF0c1BsdWdpbiA9IHJlcXVpcmUoJ3N0YXRzLXdlYnBhY2stcGx1Z2luJyk7XG5jb25zdCBTaWxlbnRFcnJvciA9IHJlcXVpcmUoJ3NpbGVudC1lcnJvcicpO1xuY29uc3QgcmVzb2x2ZSA9IHJlcXVpcmUoJ3Jlc29sdmUnKTtcblxuLyoqXG4gKiBFbnVtZXJhdGUgbG9hZGVycyBhbmQgdGhlaXIgZGVwZW5kZW5jaWVzIGZyb20gdGhpcyBmaWxlIHRvIGxldCB0aGUgZGVwZW5kZW5jeSB2YWxpZGF0b3JcbiAqIGtub3cgdGhleSBhcmUgdXNlZC5cbiAqXG4gKiByZXF1aXJlKCdzb3VyY2UtbWFwLWxvYWRlcicpXG4gKiByZXF1aXJlKCdyYXctbG9hZGVyJylcbiAqIHJlcXVpcmUoJ3VybC1sb2FkZXInKVxuICogcmVxdWlyZSgnZmlsZS1sb2FkZXInKVxuICogcmVxdWlyZSgnY2FjaGUtbG9hZGVyJylcbiAqIHJlcXVpcmUoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXInKVxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb21tb25Db25maWcod2NvOiBXZWJwYWNrQ29uZmlnT3B0aW9ucykge1xuICBjb25zdCB7IHJvb3QsIHByb2plY3RSb290LCBidWlsZE9wdGlvbnMsIGFwcENvbmZpZyB9ID0gd2NvO1xuXG4gIGNvbnN0IG5vZGVNb2R1bGVzID0gZmluZFVwKCdub2RlX21vZHVsZXMnLCBwcm9qZWN0Um9vdCk7XG4gIGlmICghbm9kZU1vZHVsZXMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBsb2NhdGUgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeS4nKVxuICB9XG5cbiAgbGV0IGV4dHJhUGx1Z2luczogYW55W10gPSBbXTtcbiAgbGV0IGVudHJ5UG9pbnRzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZ1tdIH0gPSB7fTtcblxuICBpZiAoYXBwQ29uZmlnLm1haW4pIHtcbiAgICBlbnRyeVBvaW50c1snbWFpbiddID0gW3BhdGgucmVzb2x2ZShyb290LCBhcHBDb25maWcubWFpbildO1xuICB9XG5cbiAgaWYgKGFwcENvbmZpZy5wb2x5ZmlsbHMpIHtcbiAgICBlbnRyeVBvaW50c1sncG9seWZpbGxzJ10gPSBbcGF0aC5yZXNvbHZlKHJvb3QsIGFwcENvbmZpZy5wb2x5ZmlsbHMpXTtcbiAgfVxuXG4gIC8vIGRldGVybWluZSBoYXNoaW5nIGZvcm1hdFxuICBjb25zdCBoYXNoRm9ybWF0ID0gZ2V0T3V0cHV0SGFzaEZvcm1hdChidWlsZE9wdGlvbnMub3V0cHV0SGFzaGluZyBhcyBhbnkpO1xuXG4gIC8vIHByb2Nlc3MgZ2xvYmFsIHNjcmlwdHNcbiAgaWYgKGFwcENvbmZpZy5zY3JpcHRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBnbG9iYWxTY3JpcHRzID0gZXh0cmFFbnRyeVBhcnNlcihhcHBDb25maWcuc2NyaXB0cywgcm9vdCwgJ3NjcmlwdHMnKTtcbiAgICBjb25zdCBnbG9iYWxTY3JpcHRzQnlFbnRyeSA9IGdsb2JhbFNjcmlwdHNcbiAgICAgIC5yZWR1Y2UoKHByZXY6IHsgZW50cnk6IHN0cmluZywgcGF0aHM6IHN0cmluZ1tdLCBsYXp5OiBib29sZWFuIH1bXSwgY3VycikgPT4ge1xuXG4gICAgICAgIGxldCBleGlzdGluZ0VudHJ5ID0gcHJldi5maW5kKChlbCkgPT4gZWwuZW50cnkgPT09IGN1cnIuZW50cnkpO1xuICAgICAgICBpZiAoZXhpc3RpbmdFbnRyeSkge1xuICAgICAgICAgIGV4aXN0aW5nRW50cnkucGF0aHMucHVzaChjdXJyLnBhdGggYXMgc3RyaW5nKTtcbiAgICAgICAgICAvLyBBbGwgZW50cmllcyBoYXZlIHRvIGJlIGxhenkgZm9yIHRoZSBidW5kbGUgdG8gYmUgbGF6eS5cbiAgICAgICAgICAoZXhpc3RpbmdFbnRyeSBhcyBhbnkpLmxhenkgPSBleGlzdGluZ0VudHJ5LmxhenkgJiYgY3Vyci5sYXp5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByZXYucHVzaCh7XG4gICAgICAgICAgICBlbnRyeTogY3Vyci5lbnRyeSBhcyBzdHJpbmcsIHBhdGhzOiBbY3Vyci5wYXRoIGFzIHN0cmluZ10sXG4gICAgICAgICAgICBsYXp5OiBjdXJyLmxhenkgYXMgYm9vbGVhblxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pO1xuXG5cbiAgICAvLyBBZGQgYSBuZXcgYXNzZXQgZm9yIGVhY2ggZW50cnkuXG4gICAgZ2xvYmFsU2NyaXB0c0J5RW50cnkuZm9yRWFjaCgoc2NyaXB0KSA9PiB7XG4gICAgICAvLyBMYXp5IHNjcmlwdHMgZG9uJ3QgZ2V0IGEgaGFzaCwgb3RoZXJ3aXNlIHRoZXkgY2FuJ3QgYmUgbG9hZGVkIGJ5IG5hbWUuXG4gICAgICBjb25zdCBoYXNoID0gc2NyaXB0LmxhenkgPyAnJyA6IGhhc2hGb3JtYXQuc2NyaXB0O1xuICAgICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IFNjcmlwdHNXZWJwYWNrUGx1Z2luKHtcbiAgICAgICAgbmFtZTogc2NyaXB0LmVudHJ5LFxuICAgICAgICBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAsXG4gICAgICAgIGZpbGVuYW1lOiBgJHtwYXRoLmJhc2VuYW1lKHNjcmlwdC5lbnRyeSl9JHtoYXNofS5qc2AsXG4gICAgICAgIHNjcmlwdHM6IHNjcmlwdC5wYXRocyxcbiAgICAgICAgYmFzZVBhdGg6IHByb2plY3RSb290LFxuICAgICAgfSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcHJvY2VzcyBhc3NldCBlbnRyaWVzXG4gIGlmIChhcHBDb25maWcuYXNzZXRzKSB7XG4gICAgY29uc3QgY29weVdlYnBhY2tQbHVnaW5QYXR0ZXJucyA9IGFwcENvbmZpZy5hc3NldHMubWFwKChhc3NldDogc3RyaW5nIHwgQXNzZXRQYXR0ZXJuKSA9PiB7XG4gICAgICAvLyBDb252ZXJ0IGFsbCBzdHJpbmcgYXNzZXRzIHRvIG9iamVjdCBub3RhdGlvbi5cbiAgICAgIGFzc2V0ID0gdHlwZW9mIGFzc2V0ID09PSAnc3RyaW5nJyA/IHsgZ2xvYjogYXNzZXQgfSA6IGFzc2V0O1xuICAgICAgLy8gQWRkIGRlZmF1bHRzLlxuICAgICAgLy8gSW5wdXQgaXMgYWx3YXlzIHJlc29sdmVkIHJlbGF0aXZlIHRvIHRoZSBwcm9qZWN0Um9vdC5cbiAgICAgIC8vIFRPRE86IGFkZCBzbWFydCBkZWZhdWx0cyB0byBzY2hlbWEgdG8gdXNlIHByb2plY3Qgcm9vdCBhcyBkZWZhdWx0LlxuICAgICAgYXNzZXQuaW5wdXQgPSBwYXRoLnJlc29sdmUocm9vdCwgYXNzZXQuaW5wdXQgfHwgcHJvamVjdFJvb3QpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGFzc2V0Lm91dHB1dCA9IGFzc2V0Lm91dHB1dCB8fCAnJztcbiAgICAgIGFzc2V0Lmdsb2IgPSBhc3NldC5nbG9iIHx8ICcnO1xuXG4gICAgICAvLyBQcmV2ZW50IGFzc2V0IGNvbmZpZ3VyYXRpb25zIGZyb20gd3JpdGluZyBvdXRzaWRlIG9mIHRoZSBvdXRwdXQgcGF0aCwgZXhjZXB0IGlmIHRoZSB1c2VyXG4gICAgICAvLyBzcGVjaWZ5IGEgY29uZmlndXJhdGlvbiBmbGFnLlxuICAgICAgLy8gQWxzbyBwcmV2ZW50IHdyaXRpbmcgb3V0c2lkZSB0aGUgcHJvamVjdCBwYXRoLiBUaGF0IGlzIG5vdCBvdmVycmlkYWJsZS5cbiAgICAgIGNvbnN0IGFic29sdXRlT3V0cHV0UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgYnVpbGRPcHRpb25zLm91dHB1dFBhdGggYXMgc3RyaW5nKTtcbiAgICAgIGNvbnN0IGFic29sdXRlQXNzZXRPdXRwdXQgPSBwYXRoLnJlc29sdmUoYWJzb2x1dGVPdXRwdXRQYXRoLCBhc3NldC5vdXRwdXQpO1xuICAgICAgY29uc3Qgb3V0cHV0UmVsYXRpdmVPdXRwdXQgPSBwYXRoLnJlbGF0aXZlKGFic29sdXRlT3V0cHV0UGF0aCwgYWJzb2x1dGVBc3NldE91dHB1dCk7XG5cbiAgICAgIGlmIChvdXRwdXRSZWxhdGl2ZU91dHB1dC5zdGFydHNXaXRoKCcuLicpIHx8IHBhdGguaXNBYnNvbHV0ZShvdXRwdXRSZWxhdGl2ZU91dHB1dCkpIHtcblxuICAgICAgICAvLyBUT0RPOiBUaGlzIGNoZWNrIGRvZXNuJ3QgbWFrZSBhIGxvdCBvZiBzZW5zZSBhbnltb3JlIHdpdGggbXVsdGlwbGUgcHJvamVjdC4gUmV2aWV3IGl0LlxuICAgICAgICAvLyBjb25zdCBwcm9qZWN0UmVsYXRpdmVPdXRwdXQgPSBwYXRoLnJlbGF0aXZlKHByb2plY3RSb290LCBhYnNvbHV0ZUFzc2V0T3V0cHV0KTtcbiAgICAgICAgLy8gaWYgKHByb2plY3RSZWxhdGl2ZU91dHB1dC5zdGFydHNXaXRoKCcuLicpIHx8IHBhdGguaXNBYnNvbHV0ZShwcm9qZWN0UmVsYXRpdmVPdXRwdXQpKSB7XG4gICAgICAgIC8vICAgY29uc3QgbWVzc2FnZSA9ICdBbiBhc3NldCBjYW5ub3QgYmUgd3JpdHRlbiB0byBhIGxvY2F0aW9uIG91dHNpZGUgdGhlIHByb2plY3QuJztcbiAgICAgICAgLy8gICB0aHJvdyBuZXcgU2lsZW50RXJyb3IobWVzc2FnZSk7XG4gICAgICAgIC8vIH1cblxuICAgICAgICBpZiAoIWFzc2V0LmFsbG93T3V0c2lkZU91dERpcikge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnQW4gYXNzZXQgY2Fubm90IGJlIHdyaXR0ZW4gdG8gYSBsb2NhdGlvbiBvdXRzaWRlIG9mIHRoZSBvdXRwdXQgcGF0aC4gJ1xuICAgICAgICAgICAgKyAnWW91IGNhbiBvdmVycmlkZSB0aGlzIG1lc3NhZ2UgYnkgc2V0dGluZyB0aGUgYGFsbG93T3V0c2lkZU91dERpcmAgJ1xuICAgICAgICAgICAgKyAncHJvcGVydHkgb24gdGhlIGFzc2V0IHRvIHRydWUgaW4gdGhlIENMSSBjb25maWd1cmF0aW9uLic7XG4gICAgICAgICAgdGhyb3cgbmV3IFNpbGVudEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE86IFRoaXMgY2hlY2sgZG9lc24ndCBtYWtlIGEgbG90IG9mIHNlbnNlIGFueW1vcmUgd2l0aCBtdWx0aXBsZSBwcm9qZWN0LiBSZXZpZXcgaXQuXG4gICAgICAvLyBQcmV2ZW50IGFzc2V0IGNvbmZpZ3VyYXRpb25zIGZyb20gcmVhZGluZyBmaWxlcyBvdXRzaWRlIG9mIHRoZSBwcm9qZWN0LlxuICAgICAgLy8gY29uc3QgcHJvamVjdFJlbGF0aXZlSW5wdXQgPSBwYXRoLnJlbGF0aXZlKHByb2plY3RSb290LCBhc3NldC5pbnB1dCk7XG4gICAgICAvLyBpZiAocHJvamVjdFJlbGF0aXZlSW5wdXQuc3RhcnRzV2l0aCgnLi4nKSB8fCBwYXRoLmlzQWJzb2x1dGUocHJvamVjdFJlbGF0aXZlSW5wdXQpKSB7XG4gICAgICAvLyAgIGNvbnN0IG1lc3NhZ2UgPSAnQW4gYXNzZXQgY2Fubm90IGJlIHJlYWQgZnJvbSBhIGxvY2F0aW9uIG91dHNpZGUgdGhlIHByb2plY3QuJztcbiAgICAgIC8vICAgdGhyb3cgbmV3IFNpbGVudEVycm9yKG1lc3NhZ2UpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBFbnN1cmUgdHJhaWxpbmcgc2xhc2guXG4gICAgICBpZiAoaXNEaXJlY3RvcnkocGF0aC5yZXNvbHZlKGFzc2V0LmlucHV0KSkpIHtcbiAgICAgICAgYXNzZXQuaW5wdXQgKz0gJy8nO1xuICAgICAgfVxuXG4gICAgICAvLyBDb252ZXJ0IGRpciBwYXR0ZXJucyB0byBnbG9icy5cbiAgICAgIGlmIChpc0RpcmVjdG9yeShwYXRoLnJlc29sdmUoYXNzZXQuaW5wdXQsIGFzc2V0Lmdsb2IpKSkge1xuICAgICAgICBhc3NldC5nbG9iID0gYXNzZXQuZ2xvYiArICcvKiovKic7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRleHQ6IGFzc2V0LmlucHV0LFxuICAgICAgICB0bzogYXNzZXQub3V0cHV0LFxuICAgICAgICBmcm9tOiB7XG4gICAgICAgICAgZ2xvYjogYXNzZXQuZ2xvYixcbiAgICAgICAgICBkb3Q6IHRydWVcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvcHlXZWJwYWNrUGx1Z2luT3B0aW9ucyA9IHsgaWdub3JlOiBbJy5naXRrZWVwJywgJyoqLy5EU19TdG9yZScsICcqKi9UaHVtYnMuZGInXSB9O1xuXG4gICAgY29uc3QgY29weVdlYnBhY2tQbHVnaW5JbnN0YW5jZSA9IG5ldyBDb3B5V2VicGFja1BsdWdpbihjb3B5V2VicGFja1BsdWdpblBhdHRlcm5zLFxuICAgICAgY29weVdlYnBhY2tQbHVnaW5PcHRpb25zKTtcblxuICAgIC8vIFNhdmUgb3B0aW9ucyBzbyB3ZSBjYW4gdXNlIHRoZW0gaW4gZWplY3QuXG4gICAgKGNvcHlXZWJwYWNrUGx1Z2luSW5zdGFuY2UgYXMgYW55KVsnY29weVdlYnBhY2tQbHVnaW5QYXR0ZXJucyddID0gY29weVdlYnBhY2tQbHVnaW5QYXR0ZXJucztcbiAgICAoY29weVdlYnBhY2tQbHVnaW5JbnN0YW5jZSBhcyBhbnkpWydjb3B5V2VicGFja1BsdWdpbk9wdGlvbnMnXSA9IGNvcHlXZWJwYWNrUGx1Z2luT3B0aW9ucztcblxuICAgIGV4dHJhUGx1Z2lucy5wdXNoKGNvcHlXZWJwYWNrUGx1Z2luSW5zdGFuY2UpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5wcm9ncmVzcykge1xuICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyBQcm9ncmVzc1BsdWdpbih7IHByb2ZpbGU6IGJ1aWxkT3B0aW9ucy52ZXJib3NlLCBjb2xvcnM6IHRydWUgfSkpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5zaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXMpIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgQ2lyY3VsYXJEZXBlbmRlbmN5UGx1Z2luKHtcbiAgICAgIGV4Y2x1ZGU6IC9bXFxcXFxcL11ub2RlX21vZHVsZXNbXFxcXFxcL10vXG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5zdGF0c0pzb24pIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgU3RhdHNQbHVnaW4oJ3N0YXRzLmpzb24nLCAndmVyYm9zZScpKTtcbiAgfVxuXG4gIGxldCBidWlsZE9wdGltaXplclVzZVJ1bGU7XG4gIGlmIChidWlsZE9wdGlvbnMuYnVpbGRPcHRpbWl6ZXIpIHtcbiAgICAvLyBTZXQgdGhlIGNhY2hlIGRpcmVjdG9yeSB0byB0aGUgQnVpbGQgT3B0aW1pemVyIGRpciwgc28gdGhhdCBwYWNrYWdlIHVwZGF0ZXMgd2lsbCBkZWxldGUgaXQuXG4gICAgY29uc3QgYnVpbGRPcHRpbWl6ZXJEaXIgPSBwYXRoLmRpcm5hbWUoXG4gICAgICByZXNvbHZlLnN5bmMoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXInLCB7IGJhc2VkaXI6IHByb2plY3RSb290IH0pKTtcbiAgICBjb25zdCBjYWNoZURpcmVjdG9yeSA9IHBhdGgucmVzb2x2ZShidWlsZE9wdGltaXplckRpciwgJy4vLmNhY2hlLycpO1xuXG4gICAgYnVpbGRPcHRpbWl6ZXJVc2VSdWxlID0ge1xuICAgICAgdXNlOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkZXI6ICdjYWNoZS1sb2FkZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVEaXJlY3RvcnkgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbG9hZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLW9wdGltaXplci93ZWJwYWNrLWxvYWRlcicsXG4gICAgICAgICAgb3B0aW9uczogeyBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAgfVxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9O1xuICB9XG5cbiAgLy8gQWxsb3cgbG9hZGVycyB0byBiZSBpbiBhIG5vZGVfbW9kdWxlcyBuZXN0ZWQgaW5zaWRlIHRoZSBDTEkgcGFja2FnZVxuICBjb25zdCBsb2FkZXJOb2RlTW9kdWxlcyA9IFsnbm9kZV9tb2R1bGVzJ107XG4gIGNvbnN0IHBvdGVudGlhbE5vZGVNb2R1bGVzID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoaXNEaXJlY3RvcnkocG90ZW50aWFsTm9kZU1vZHVsZXMpKSB7XG4gICAgbG9hZGVyTm9kZU1vZHVsZXMucHVzaChwb3RlbnRpYWxOb2RlTW9kdWxlcyk7XG4gIH1cblxuICAvLyBMb2FkIHJ4anMgcGF0aCBhbGlhc2VzLlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vUmVhY3RpdmVYL3J4anMvYmxvYi9tYXN0ZXIvZG9jL2xldHRhYmxlLW9wZXJhdG9ycy5tZCNidWlsZC1hbmQtdHJlZXNoYWtpbmdcbiAgbGV0IGFsaWFzID0ge307XG4gIHRyeSB7XG4gICAgY29uc3Qgcnhqc1BhdGhNYXBwaW5nSW1wb3J0ID0gd2NvLnN1cHBvcnRFUzIwMTVcbiAgICAgID8gJ3J4anMvX2VzbTIwMTUvcGF0aC1tYXBwaW5nJ1xuICAgICAgOiAncnhqcy9fZXNtNS9wYXRoLW1hcHBpbmcnO1xuICAgIGNvbnN0IHJ4UGF0aHMgPSByZXF1aXJlUHJvamVjdE1vZHVsZShwcm9qZWN0Um9vdCwgcnhqc1BhdGhNYXBwaW5nSW1wb3J0KTtcbiAgICBhbGlhcyA9IHJ4UGF0aHMobm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlKSB7IH1cblxuICByZXR1cm4ge1xuICAgIG1vZGU6IGJ1aWxkT3B0aW9ucy5vcHRpbWl6YXRpb25MZXZlbCA9PT0gMCA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbicsXG4gICAgZGV2dG9vbDogZmFsc2UsXG4gICAgcmVzb2x2ZToge1xuICAgICAgZXh0ZW5zaW9uczogWycudHMnLCAnLmpzJ10sXG4gICAgICBzeW1saW5rczogIWJ1aWxkT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgbW9kdWxlczogW3Byb2plY3RSb290LCAnbm9kZV9tb2R1bGVzJ10sXG4gICAgICBhbGlhc1xuICAgIH0sXG4gICAgcmVzb2x2ZUxvYWRlcjoge1xuICAgICAgbW9kdWxlczogbG9hZGVyTm9kZU1vZHVsZXNcbiAgICB9LFxuICAgIGNvbnRleHQ6IHByb2plY3RSb290LFxuICAgIGVudHJ5OiBlbnRyeVBvaW50cyxcbiAgICBvdXRwdXQ6IHtcbiAgICAgIHBhdGg6IHBhdGgucmVzb2x2ZShyb290LCBidWlsZE9wdGlvbnMub3V0cHV0UGF0aCBhcyBzdHJpbmcpLFxuICAgICAgcHVibGljUGF0aDogYnVpbGRPcHRpb25zLmRlcGxveVVybCxcbiAgICAgIGZpbGVuYW1lOiBgW25hbWVdJHtoYXNoRm9ybWF0LmNodW5rfS5qc2AsXG4gICAgfSxcbiAgICBwZXJmb3JtYW5jZToge1xuICAgICAgaGludHM6IGZhbHNlLFxuICAgIH0sXG4gICAgbW9kdWxlOiB7XG4gICAgICBydWxlczogW1xuICAgICAgICB7IHRlc3Q6IC9cXC5odG1sJC8sIGxvYWRlcjogJ3Jhdy1sb2FkZXInIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXN0OiAvXFwuKGVvdHxzdmd8Y3VyKSQvLFxuICAgICAgICAgIGxvYWRlcjogJ2ZpbGUtbG9hZGVyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBuYW1lOiBgW25hbWVdJHtoYXNoRm9ybWF0LmZpbGV9LltleHRdYCxcbiAgICAgICAgICAgIGxpbWl0OiAxMDAwMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRlc3Q6IC9cXC4oanBnfHBuZ3x3ZWJwfGdpZnxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICAgIGxvYWRlcjogJ3VybC1sb2FkZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG5hbWU6IGBbbmFtZV0ke2hhc2hGb3JtYXQuZmlsZX0uW2V4dF1gLFxuICAgICAgICAgICAgbGltaXQ6IDEwMDAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGVzdDogL1tcXC9cXFxcXUBhbmd1bGFyW1xcL1xcXFxdLitcXC5qcyQvLFxuICAgICAgICAgIHNpZGVFZmZlY3RzOiBmYWxzZSxcbiAgICAgICAgICBwYXJzZXI6IHsgc3lzdGVtOiB0cnVlIH0sXG4gICAgICAgICAgLi4uYnVpbGRPcHRpbWl6ZXJVc2VSdWxlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGVzdDogL1xcLmpzJC8sXG4gICAgICAgICAgLi4uYnVpbGRPcHRpbWl6ZXJVc2VSdWxlLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgIH0sXG4gICAgb3B0aW1pemF0aW9uOiB7XG4gICAgICBub0VtaXRPbkVycm9yczogdHJ1ZSxcbiAgICAgIG1pbmltaXplcjogW1xuICAgICAgICBuZXcgSGFzaGVkTW9kdWxlSWRzUGx1Z2luKCksXG4gICAgICAgIC8vIFRPRE86IGNoZWNrIHdpdGggTWlrZSB3aGF0IHRoaXMgZmVhdHVyZSBuZWVkcy5cbiAgICAgICAgbmV3IEJ1bmRsZUJ1ZGdldFBsdWdpbih7IGJ1ZGdldHM6IGFwcENvbmZpZy5idWRnZXRzIH0pLFxuICAgICAgICBuZXcgQ2xlYW5Dc3NXZWJwYWNrUGx1Z2luKHtcbiAgICAgICAgICBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAsXG4gICAgICAgICAgLy8gY29tcG9uZW50IHN0eWxlcyByZXRhaW4gdGhlaXIgb3JpZ2luYWwgZmlsZSBuYW1lXG4gICAgICAgICAgdGVzdDogKGZpbGUpID0+IC9cXC4oPzpjc3N8c2Nzc3xzYXNzfGxlc3N8c3R5bCkkLy50ZXN0KGZpbGUpLFxuICAgICAgICB9KSxcbiAgICAgICAgbmV3IFVnbGlmeUpTUGx1Z2luKHtcbiAgICAgICAgICBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAsXG4gICAgICAgICAgcGFyYWxsZWw6IHRydWUsXG4gICAgICAgICAgY2FjaGU6IHRydWUsXG4gICAgICAgICAgdWdsaWZ5T3B0aW9uczoge1xuICAgICAgICAgICAgZWNtYTogd2NvLnN1cHBvcnRFUzIwMTUgPyA2IDogNSxcbiAgICAgICAgICAgIHdhcm5pbmdzOiBidWlsZE9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgICAgIHNhZmFyaTEwOiB0cnVlLFxuICAgICAgICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgICAgICAgcHVyZV9nZXR0ZXJzOiBidWlsZE9wdGlvbnMuYnVpbGRPcHRpbWl6ZXIsXG4gICAgICAgICAgICAgIC8vIFBVUkUgY29tbWVudHMgd29yayBiZXN0IHdpdGggMyBwYXNzZXMuXG4gICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay93ZWJwYWNrL2lzc3Vlcy8yODk5I2lzc3VlY29tbWVudC0zMTc0MjU5MjYuXG4gICAgICAgICAgICAgIHBhc3NlczogYnVpbGRPcHRpb25zLmJ1aWxkT3B0aW1pemVyID8gMyA6IDEsXG4gICAgICAgICAgICAgIC8vIFdvcmthcm91bmQga25vd24gdWdsaWZ5LWVzIGlzc3VlXG4gICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbWlzaG9vL1VnbGlmeUpTMi9pc3N1ZXMvMjk0OSNpc3N1ZWNvbW1lbnQtMzY4MDcwMzA3XG4gICAgICAgICAgICAgIGlubGluZTogd2NvLnN1cHBvcnRFUzIwMTUgPyAxIDogMyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgYXNjaWlfb25seTogdHJ1ZSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IGZhbHNlLFxuICAgICAgICAgICAgICB3ZWJraXQ6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICBdLFxuICAgIH0sXG4gICAgcGx1Z2luczogZXh0cmFQbHVnaW5zLFxuICB9O1xufVxuIl19