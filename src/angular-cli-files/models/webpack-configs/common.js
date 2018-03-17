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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL2NvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBQWlCO0FBQ2pCLCtEQUErRDs7QUFFL0QsNkJBQTZCO0FBQzdCLHFDQUFnRDtBQUNoRCx5REFBeUQ7QUFDekQsbUNBQThFO0FBQzlFLCtEQUEyRDtBQUMzRCxtRkFBOEU7QUFFOUUsK0RBQWlFO0FBQ2pFLG1GQUE4RTtBQUM5RSxpRkFBNEU7QUFDNUUscURBQWlEO0FBRWpELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQzdELE1BQU0sd0JBQXdCLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFDdkUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDMUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDcEQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVuQzs7Ozs7Ozs7OztHQVVHO0FBRUgseUJBQWdDLEdBQXlCO0lBQ3ZELE1BQU0sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxHQUFHLEdBQUcsQ0FBQztJQUVyRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUQsTUFBTSxXQUFXLEdBQUcsZ0JBQU0sQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFD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SUFBSTs0QkFDaEIsUUFBUSxFQUFFLEtBQUs7NEJBQ2YsTUFBTSxFQUFFLElBQUk7eUJBQ2I7cUJBQ0Y7aUJBQ0YsQ0FBQzthQUNIO1NBQ0Y7UUFDRCxPQUFPLEVBQUUsWUFBWTtLQUN0QixDQUFDO0FBQ0osQ0FBQztBQXJSRCwwQ0FxUkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZVxuLy8gVE9ETzogY2xlYW51cCB0aGlzIGZpbGUsIGl0J3MgY29waWVkIGFzIGlzIGZyb20gQW5ndWxhciBDTEkuXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBIYXNoZWRNb2R1bGVJZHNQbHVnaW4gfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCAqIGFzIENvcHlXZWJwYWNrUGx1Z2luIGZyb20gJ2NvcHktd2VicGFjay1wbHVnaW4nO1xuaW1wb3J0IHsgZXh0cmFFbnRyeVBhcnNlciwgZ2V0T3V0cHV0SGFzaEZvcm1hdCwgQXNzZXRQYXR0ZXJuIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBpc0RpcmVjdG9yeSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9pcy1kaXJlY3RvcnknO1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5pbXBvcnQgeyBXZWJwYWNrQ29uZmlnT3B0aW9ucyB9IGZyb20gJy4uL2J1aWxkLW9wdGlvbnMnO1xuaW1wb3J0IHsgQnVuZGxlQnVkZ2V0UGx1Z2luIH0gZnJvbSAnLi4vLi4vcGx1Z2lucy9idW5kbGUtYnVkZ2V0JztcbmltcG9ydCB7IENsZWFuQ3NzV2VicGFja1BsdWdpbiB9IGZyb20gJy4uLy4uL3BsdWdpbnMvY2xlYW5jc3Mtd2VicGFjay1wbHVnaW4nO1xuaW1wb3J0IHsgU2NyaXB0c1dlYnBhY2tQbHVnaW4gfSBmcm9tICcuLi8uLi9wbHVnaW5zL3NjcmlwdHMtd2VicGFjay1wbHVnaW4nO1xuaW1wb3J0IHsgZmluZFVwIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2ZpbmQtdXAnO1xuXG5jb25zdCBQcm9ncmVzc1BsdWdpbiA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL1Byb2dyZXNzUGx1Z2luJyk7XG5jb25zdCBDaXJjdWxhckRlcGVuZGVuY3lQbHVnaW4gPSByZXF1aXJlKCdjaXJjdWxhci1kZXBlbmRlbmN5LXBsdWdpbicpO1xuY29uc3QgVWdsaWZ5SlNQbHVnaW4gPSByZXF1aXJlKCd1Z2xpZnlqcy13ZWJwYWNrLXBsdWdpbicpO1xuY29uc3QgU3RhdHNQbHVnaW4gPSByZXF1aXJlKCdzdGF0cy13ZWJwYWNrLXBsdWdpbicpO1xuY29uc3QgU2lsZW50RXJyb3IgPSByZXF1aXJlKCdzaWxlbnQtZXJyb3InKTtcbmNvbnN0IHJlc29sdmUgPSByZXF1aXJlKCdyZXNvbHZlJyk7XG5cbi8qKlxuICogRW51bWVyYXRlIGxvYWRlcnMgYW5kIHRoZWlyIGRlcGVuZGVuY2llcyBmcm9tIHRoaXMgZmlsZSB0byBsZXQgdGhlIGRlcGVuZGVuY3kgdmFsaWRhdG9yXG4gKiBrbm93IHRoZXkgYXJlIHVzZWQuXG4gKlxuICogcmVxdWlyZSgnc291cmNlLW1hcC1sb2FkZXInKVxuICogcmVxdWlyZSgncmF3LWxvYWRlcicpXG4gKiByZXF1aXJlKCd1cmwtbG9hZGVyJylcbiAqIHJlcXVpcmUoJ2ZpbGUtbG9hZGVyJylcbiAqIHJlcXVpcmUoJ2NhY2hlLWxvYWRlcicpXG4gKiByZXF1aXJlKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtb3B0aW1pemVyJylcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29tbW9uQ29uZmlnKHdjbzogV2VicGFja0NvbmZpZ09wdGlvbnMpIHtcbiAgY29uc3QgeyBwcm9qZWN0Um9vdCwgYnVpbGRPcHRpb25zLCBhcHBDb25maWcgfSA9IHdjbztcblxuICBjb25zdCBhcHBSb290ID0gcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCBhcHBDb25maWcucm9vdCk7XG4gIGNvbnN0IG5vZGVNb2R1bGVzID0gZmluZFVwKCdub2RlX21vZHVsZXMnLCBwcm9qZWN0Um9vdCk7XG4gIGlmICghbm9kZU1vZHVsZXMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBsb2NhdGUgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeS4nKVxuICB9XG5cbiAgbGV0IGV4dHJhUGx1Z2luczogYW55W10gPSBbXTtcbiAgbGV0IGVudHJ5UG9pbnRzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZ1tdIH0gPSB7fTtcblxuICBpZiAoYXBwQ29uZmlnLm1haW4pIHtcbiAgICBlbnRyeVBvaW50c1snbWFpbiddID0gW3BhdGgucmVzb2x2ZShhcHBSb290LCBhcHBDb25maWcubWFpbildO1xuICB9XG5cbiAgaWYgKGFwcENvbmZpZy5wb2x5ZmlsbHMpIHtcbiAgICBlbnRyeVBvaW50c1sncG9seWZpbGxzJ10gPSBbcGF0aC5yZXNvbHZlKGFwcFJvb3QsIGFwcENvbmZpZy5wb2x5ZmlsbHMpXTtcbiAgfVxuXG4gIC8vIGRldGVybWluZSBoYXNoaW5nIGZvcm1hdFxuICBjb25zdCBoYXNoRm9ybWF0ID0gZ2V0T3V0cHV0SGFzaEZvcm1hdChidWlsZE9wdGlvbnMub3V0cHV0SGFzaGluZyBhcyBhbnkpO1xuXG4gIC8vIHByb2Nlc3MgZ2xvYmFsIHNjcmlwdHNcbiAgaWYgKGFwcENvbmZpZy5zY3JpcHRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBnbG9iYWxTY3JpcHRzID0gZXh0cmFFbnRyeVBhcnNlcihhcHBDb25maWcuc2NyaXB0cywgYXBwUm9vdCwgJ3NjcmlwdHMnKTtcbiAgICBjb25zdCBnbG9iYWxTY3JpcHRzQnlFbnRyeSA9IGdsb2JhbFNjcmlwdHNcbiAgICAgIC5yZWR1Y2UoKHByZXY6IHsgZW50cnk6IHN0cmluZywgcGF0aHM6IHN0cmluZ1tdLCBsYXp5OiBib29sZWFuIH1bXSwgY3VycikgPT4ge1xuXG4gICAgICAgIGxldCBleGlzdGluZ0VudHJ5ID0gcHJldi5maW5kKChlbCkgPT4gZWwuZW50cnkgPT09IGN1cnIuZW50cnkpO1xuICAgICAgICBpZiAoZXhpc3RpbmdFbnRyeSkge1xuICAgICAgICAgIGV4aXN0aW5nRW50cnkucGF0aHMucHVzaChjdXJyLnBhdGggYXMgc3RyaW5nKTtcbiAgICAgICAgICAvLyBBbGwgZW50cmllcyBoYXZlIHRvIGJlIGxhenkgZm9yIHRoZSBidW5kbGUgdG8gYmUgbGF6eS5cbiAgICAgICAgICAoZXhpc3RpbmdFbnRyeSBhcyBhbnkpLmxhenkgPSBleGlzdGluZ0VudHJ5LmxhenkgJiYgY3Vyci5sYXp5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByZXYucHVzaCh7XG4gICAgICAgICAgICBlbnRyeTogY3Vyci5lbnRyeSBhcyBzdHJpbmcsIHBhdGhzOiBbY3Vyci5wYXRoIGFzIHN0cmluZ10sXG4gICAgICAgICAgICBsYXp5OiBjdXJyLmxhenkgYXMgYm9vbGVhblxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pO1xuXG5cbiAgICAvLyBBZGQgYSBuZXcgYXNzZXQgZm9yIGVhY2ggZW50cnkuXG4gICAgZ2xvYmFsU2NyaXB0c0J5RW50cnkuZm9yRWFjaCgoc2NyaXB0KSA9PiB7XG4gICAgICAvLyBMYXp5IHNjcmlwdHMgZG9uJ3QgZ2V0IGEgaGFzaCwgb3RoZXJ3aXNlIHRoZXkgY2FuJ3QgYmUgbG9hZGVkIGJ5IG5hbWUuXG4gICAgICBjb25zdCBoYXNoID0gc2NyaXB0LmxhenkgPyAnJyA6IGhhc2hGb3JtYXQuc2NyaXB0O1xuICAgICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IFNjcmlwdHNXZWJwYWNrUGx1Z2luKHtcbiAgICAgICAgbmFtZTogc2NyaXB0LmVudHJ5LFxuICAgICAgICBzb3VyY2VNYXA6IGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXAsXG4gICAgICAgIGZpbGVuYW1lOiBgJHtzY3JpcHQuZW50cnl9JHtoYXNofS5qc2AsXG4gICAgICAgIHNjcmlwdHM6IHNjcmlwdC5wYXRocyxcbiAgICAgICAgYmFzZVBhdGg6IHByb2plY3RSb290LFxuICAgICAgfSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcHJvY2VzcyBhc3NldCBlbnRyaWVzXG4gIGlmIChhcHBDb25maWcuYXNzZXRzKSB7XG4gICAgY29uc3QgY29weVdlYnBhY2tQbHVnaW5QYXR0ZXJucyA9IGFwcENvbmZpZy5hc3NldHMubWFwKChhc3NldDogc3RyaW5nIHwgQXNzZXRQYXR0ZXJuKSA9PiB7XG4gICAgICAvLyBDb252ZXJ0IGFsbCBzdHJpbmcgYXNzZXRzIHRvIG9iamVjdCBub3RhdGlvbi5cbiAgICAgIGFzc2V0ID0gdHlwZW9mIGFzc2V0ID09PSAnc3RyaW5nJyA/IHsgZ2xvYjogYXNzZXQgfSA6IGFzc2V0O1xuICAgICAgLy8gQWRkIGRlZmF1bHRzLlxuICAgICAgLy8gSW5wdXQgaXMgYWx3YXlzIHJlc29sdmVkIHJlbGF0aXZlIHRvIHRoZSBhcHBSb290LlxuICAgICAgYXNzZXQuaW5wdXQgPSBwYXRoLnJlc29sdmUoYXBwUm9vdCwgYXNzZXQuaW5wdXQgfHwgJycpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGFzc2V0Lm91dHB1dCA9IGFzc2V0Lm91dHB1dCB8fCAnJztcbiAgICAgIGFzc2V0Lmdsb2IgPSBhc3NldC5nbG9iIHx8ICcnO1xuXG4gICAgICAvLyBQcmV2ZW50IGFzc2V0IGNvbmZpZ3VyYXRpb25zIGZyb20gd3JpdGluZyBvdXRzaWRlIG9mIHRoZSBvdXRwdXQgcGF0aCwgZXhjZXB0IGlmIHRoZSB1c2VyXG4gICAgICAvLyBzcGVjaWZ5IGEgY29uZmlndXJhdGlvbiBmbGFnLlxuICAgICAgLy8gQWxzbyBwcmV2ZW50IHdyaXRpbmcgb3V0c2lkZSB0aGUgcHJvamVjdCBwYXRoLiBUaGF0IGlzIG5vdCBvdmVycmlkYWJsZS5cbiAgICAgIGNvbnN0IGFic29sdXRlT3V0cHV0UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgYnVpbGRPcHRpb25zLm91dHB1dFBhdGggYXMgc3RyaW5nKTtcbiAgICAgIGNvbnN0IGFic29sdXRlQXNzZXRPdXRwdXQgPSBwYXRoLnJlc29sdmUoYWJzb2x1dGVPdXRwdXRQYXRoLCBhc3NldC5vdXRwdXQpO1xuICAgICAgY29uc3Qgb3V0cHV0UmVsYXRpdmVPdXRwdXQgPSBwYXRoLnJlbGF0aXZlKGFic29sdXRlT3V0cHV0UGF0aCwgYWJzb2x1dGVBc3NldE91dHB1dCk7XG5cbiAgICAgIGlmIChvdXRwdXRSZWxhdGl2ZU91dHB1dC5zdGFydHNXaXRoKCcuLicpIHx8IHBhdGguaXNBYnNvbHV0ZShvdXRwdXRSZWxhdGl2ZU91dHB1dCkpIHtcblxuICAgICAgICAvLyBUT0RPOiBUaGlzIGNoZWNrIGRvZXNuJ3QgbWFrZSBhIGxvdCBvZiBzZW5zZSBhbnltb3JlIHdpdGggbXVsdGlwbGUgcHJvamVjdC4gUmV2aWV3IGl0LlxuICAgICAgICAvLyBjb25zdCBwcm9qZWN0UmVsYXRpdmVPdXRwdXQgPSBwYXRoLnJlbGF0aXZlKHByb2plY3RSb290LCBhYnNvbHV0ZUFzc2V0T3V0cHV0KTtcbiAgICAgICAgLy8gaWYgKHByb2plY3RSZWxhdGl2ZU91dHB1dC5zdGFydHNXaXRoKCcuLicpIHx8IHBhdGguaXNBYnNvbHV0ZShwcm9qZWN0UmVsYXRpdmVPdXRwdXQpKSB7XG4gICAgICAgIC8vICAgY29uc3QgbWVzc2FnZSA9ICdBbiBhc3NldCBjYW5ub3QgYmUgd3JpdHRlbiB0byBhIGxvY2F0aW9uIG91dHNpZGUgdGhlIHByb2plY3QuJztcbiAgICAgICAgLy8gICB0aHJvdyBuZXcgU2lsZW50RXJyb3IobWVzc2FnZSk7XG4gICAgICAgIC8vIH1cblxuICAgICAgICBpZiAoIWFzc2V0LmFsbG93T3V0c2lkZU91dERpcikge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnQW4gYXNzZXQgY2Fubm90IGJlIHdyaXR0ZW4gdG8gYSBsb2NhdGlvbiBvdXRzaWRlIG9mIHRoZSBvdXRwdXQgcGF0aC4gJ1xuICAgICAgICAgICAgKyAnWW91IGNhbiBvdmVycmlkZSB0aGlzIG1lc3NhZ2UgYnkgc2V0dGluZyB0aGUgYGFsbG93T3V0c2lkZU91dERpcmAgJ1xuICAgICAgICAgICAgKyAncHJvcGVydHkgb24gdGhlIGFzc2V0IHRvIHRydWUgaW4gdGhlIENMSSBjb25maWd1cmF0aW9uLic7XG4gICAgICAgICAgdGhyb3cgbmV3IFNpbGVudEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE86IFRoaXMgY2hlY2sgZG9lc24ndCBtYWtlIGEgbG90IG9mIHNlbnNlIGFueW1vcmUgd2l0aCBtdWx0aXBsZSBwcm9qZWN0LiBSZXZpZXcgaXQuXG4gICAgICAvLyBQcmV2ZW50IGFzc2V0IGNvbmZpZ3VyYXRpb25zIGZyb20gcmVhZGluZyBmaWxlcyBvdXRzaWRlIG9mIHRoZSBwcm9qZWN0LlxuICAgICAgLy8gY29uc3QgcHJvamVjdFJlbGF0aXZlSW5wdXQgPSBwYXRoLnJlbGF0aXZlKHByb2plY3RSb290LCBhc3NldC5pbnB1dCk7XG4gICAgICAvLyBpZiAocHJvamVjdFJlbGF0aXZlSW5wdXQuc3RhcnRzV2l0aCgnLi4nKSB8fCBwYXRoLmlzQWJzb2x1dGUocHJvamVjdFJlbGF0aXZlSW5wdXQpKSB7XG4gICAgICAvLyAgIGNvbnN0IG1lc3NhZ2UgPSAnQW4gYXNzZXQgY2Fubm90IGJlIHJlYWQgZnJvbSBhIGxvY2F0aW9uIG91dHNpZGUgdGhlIHByb2plY3QuJztcbiAgICAgIC8vICAgdGhyb3cgbmV3IFNpbGVudEVycm9yKG1lc3NhZ2UpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBFbnN1cmUgdHJhaWxpbmcgc2xhc2guXG4gICAgICBpZiAoaXNEaXJlY3RvcnkocGF0aC5yZXNvbHZlKGFzc2V0LmlucHV0KSkpIHtcbiAgICAgICAgYXNzZXQuaW5wdXQgKz0gJy8nO1xuICAgICAgfVxuXG4gICAgICAvLyBDb252ZXJ0IGRpciBwYXR0ZXJucyB0byBnbG9icy5cbiAgICAgIGlmIChpc0RpcmVjdG9yeShwYXRoLnJlc29sdmUoYXNzZXQuaW5wdXQsIGFzc2V0Lmdsb2IpKSkge1xuICAgICAgICBhc3NldC5nbG9iID0gYXNzZXQuZ2xvYiArICcvKiovKic7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRleHQ6IGFzc2V0LmlucHV0LFxuICAgICAgICB0bzogYXNzZXQub3V0cHV0LFxuICAgICAgICBmcm9tOiB7XG4gICAgICAgICAgZ2xvYjogYXNzZXQuZ2xvYixcbiAgICAgICAgICBkb3Q6IHRydWVcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcbiAgICBjb25zdCBjb3B5V2VicGFja1BsdWdpbk9wdGlvbnMgPSB7IGlnbm9yZTogWycuZ2l0a2VlcCcsICcqKi8uRFNfU3RvcmUnLCAnKiovVGh1bWJzLmRiJ10gfTtcblxuICAgIGNvbnN0IGNvcHlXZWJwYWNrUGx1Z2luSW5zdGFuY2UgPSBuZXcgQ29weVdlYnBhY2tQbHVnaW4oY29weVdlYnBhY2tQbHVnaW5QYXR0ZXJucyxcbiAgICAgIGNvcHlXZWJwYWNrUGx1Z2luT3B0aW9ucyk7XG5cbiAgICAvLyBTYXZlIG9wdGlvbnMgc28gd2UgY2FuIHVzZSB0aGVtIGluIGVqZWN0LlxuICAgIChjb3B5V2VicGFja1BsdWdpbkluc3RhbmNlIGFzIGFueSlbJ2NvcHlXZWJwYWNrUGx1Z2luUGF0dGVybnMnXSA9IGNvcHlXZWJwYWNrUGx1Z2luUGF0dGVybnM7XG4gICAgKGNvcHlXZWJwYWNrUGx1Z2luSW5zdGFuY2UgYXMgYW55KVsnY29weVdlYnBhY2tQbHVnaW5PcHRpb25zJ10gPSBjb3B5V2VicGFja1BsdWdpbk9wdGlvbnM7XG5cbiAgICBleHRyYVBsdWdpbnMucHVzaChjb3B5V2VicGFja1BsdWdpbkluc3RhbmNlKTtcbiAgfVxuXG4gIGlmIChidWlsZE9wdGlvbnMucHJvZ3Jlc3MpIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgUHJvZ3Jlc3NQbHVnaW4oeyBwcm9maWxlOiBidWlsZE9wdGlvbnMudmVyYm9zZSwgY29sb3JzOiB0cnVlIH0pKTtcbiAgfVxuXG4gIGlmIChidWlsZE9wdGlvbnMuc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzKSB7XG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IENpcmN1bGFyRGVwZW5kZW5jeVBsdWdpbih7XG4gICAgICBleGNsdWRlOiAvW1xcXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFxcXC9dL1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChidWlsZE9wdGlvbnMuc3RhdHNKc29uKSB7XG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IFN0YXRzUGx1Z2luKCdzdGF0cy5qc29uJywgJ3ZlcmJvc2UnKSk7XG4gIH1cblxuICBsZXQgYnVpbGRPcHRpbWl6ZXJVc2VSdWxlO1xuICBpZiAoYnVpbGRPcHRpb25zLmJ1aWxkT3B0aW1pemVyKSB7XG4gICAgLy8gU2V0IHRoZSBjYWNoZSBkaXJlY3RvcnkgdG8gdGhlIEJ1aWxkIE9wdGltaXplciBkaXIsIHNvIHRoYXQgcGFja2FnZSB1cGRhdGVzIHdpbGwgZGVsZXRlIGl0LlxuICAgIGNvbnN0IGJ1aWxkT3B0aW1pemVyRGlyID0gcGF0aC5kaXJuYW1lKFxuICAgICAgcmVzb2x2ZS5zeW5jKCdAYW5ndWxhci1kZXZraXQvYnVpbGQtb3B0aW1pemVyJywgeyBiYXNlZGlyOiBwcm9qZWN0Um9vdCB9KSk7XG4gICAgY29uc3QgY2FjaGVEaXJlY3RvcnkgPSBwYXRoLnJlc29sdmUoYnVpbGRPcHRpbWl6ZXJEaXIsICcuLy5jYWNoZS8nKTtcblxuICAgIGJ1aWxkT3B0aW1pemVyVXNlUnVsZSA9IHtcbiAgICAgIHVzZTogW1xuICAgICAgICB7XG4gICAgICAgICAgbG9hZGVyOiAnY2FjaGUtbG9hZGVyJyxcbiAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlRGlyZWN0b3J5IH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxvYWRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXIvd2VicGFjay1sb2FkZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHsgc291cmNlTWFwOiBidWlsZE9wdGlvbnMuc291cmNlTWFwIH1cbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIC8vIEFsbG93IGxvYWRlcnMgdG8gYmUgaW4gYSBub2RlX21vZHVsZXMgbmVzdGVkIGluc2lkZSB0aGUgQ0xJIHBhY2thZ2VcbiAgY29uc3QgbG9hZGVyTm9kZU1vZHVsZXMgPSBbJ25vZGVfbW9kdWxlcyddO1xuICBjb25zdCBwb3RlbnRpYWxOb2RlTW9kdWxlcyA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKGlzRGlyZWN0b3J5KHBvdGVudGlhbE5vZGVNb2R1bGVzKSkge1xuICAgIGxvYWRlck5vZGVNb2R1bGVzLnB1c2gocG90ZW50aWFsTm9kZU1vZHVsZXMpO1xuICB9XG5cbiAgLy8gTG9hZCByeGpzIHBhdGggYWxpYXNlcy5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL1JlYWN0aXZlWC9yeGpzL2Jsb2IvbWFzdGVyL2RvYy9sZXR0YWJsZS1vcGVyYXRvcnMubWQjYnVpbGQtYW5kLXRyZWVzaGFraW5nXG4gIGxldCBhbGlhcyA9IHt9O1xuICB0cnkge1xuICAgIGNvbnN0IHJ4anNQYXRoTWFwcGluZ0ltcG9ydCA9IHdjby5zdXBwb3J0RVMyMDE1XG4gICAgICA/ICdyeGpzL19lc20yMDE1L3BhdGgtbWFwcGluZydcbiAgICAgIDogJ3J4anMvX2VzbTUvcGF0aC1tYXBwaW5nJztcbiAgICBjb25zdCByeFBhdGhzID0gcmVxdWlyZVByb2plY3RNb2R1bGUocHJvamVjdFJvb3QsIHJ4anNQYXRoTWFwcGluZ0ltcG9ydCk7XG4gICAgYWxpYXMgPSByeFBhdGhzKG5vZGVNb2R1bGVzKTtcbiAgfSBjYXRjaCAoZSkgeyB9XG5cbiAgcmV0dXJuIHtcbiAgICBtb2RlOiBidWlsZE9wdGlvbnMub3B0aW1pemF0aW9uTGV2ZWwgPT09IDAgPyAnZGV2ZWxvcG1lbnQnIDogJ3Byb2R1Y3Rpb24nLFxuICAgIGRldnRvb2w6IGZhbHNlLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGV4dGVuc2lvbnM6IFsnLnRzJywgJy5qcyddLFxuICAgICAgc3ltbGlua3M6ICFidWlsZE9wdGlvbnMucHJlc2VydmVTeW1saW5rcyxcbiAgICAgIG1vZHVsZXM6IFthcHBSb290LCAnbm9kZV9tb2R1bGVzJ10sXG4gICAgICBhbGlhc1xuICAgIH0sXG4gICAgcmVzb2x2ZUxvYWRlcjoge1xuICAgICAgbW9kdWxlczogbG9hZGVyTm9kZU1vZHVsZXNcbiAgICB9LFxuICAgIGNvbnRleHQ6IHByb2plY3RSb290LFxuICAgIGVudHJ5OiBlbnRyeVBvaW50cyxcbiAgICBvdXRwdXQ6IHtcbiAgICAgIHBhdGg6IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgYnVpbGRPcHRpb25zLm91dHB1dFBhdGggYXMgc3RyaW5nKSxcbiAgICAgIHB1YmxpY1BhdGg6IGJ1aWxkT3B0aW9ucy5kZXBsb3lVcmwsXG4gICAgICBmaWxlbmFtZTogYFtuYW1lXSR7aGFzaEZvcm1hdC5jaHVua30uanNgLFxuICAgIH0sXG4gICAgcGVyZm9ybWFuY2U6IHtcbiAgICAgIGhpbnRzOiBmYWxzZSxcbiAgICB9LFxuICAgIG1vZHVsZToge1xuICAgICAgcnVsZXM6IFtcbiAgICAgICAgeyB0ZXN0OiAvXFwuaHRtbCQvLCBsb2FkZXI6ICdyYXctbG9hZGVyJyB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGVzdDogL1xcLihlb3R8c3ZnfGN1cikkLyxcbiAgICAgICAgICBsb2FkZXI6ICdmaWxlLWxvYWRlcicsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgbmFtZTogYFtuYW1lXSR7aGFzaEZvcm1hdC5maWxlfS5bZXh0XWAsXG4gICAgICAgICAgICBsaW1pdDogMTAwMDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0ZXN0OiAvXFwuKGpwZ3xwbmd8d2VicHxnaWZ8b3RmfHR0Znx3b2ZmfHdvZmYyfGFuaSkkLyxcbiAgICAgICAgICBsb2FkZXI6ICd1cmwtbG9hZGVyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBuYW1lOiBgW25hbWVdJHtoYXNoRm9ybWF0LmZpbGV9LltleHRdYCxcbiAgICAgICAgICAgIGxpbWl0OiAxMDAwMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRlc3Q6IC9bXFwvXFxcXF1AYW5ndWxhcltcXC9cXFxcXS4rXFwuanMkLyxcbiAgICAgICAgICBzaWRlRWZmZWN0czogZmFsc2UsXG4gICAgICAgICAgcGFyc2VyOiB7IHN5c3RlbTogdHJ1ZSB9LFxuICAgICAgICAgIC4uLmJ1aWxkT3B0aW1pemVyVXNlUnVsZSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRlc3Q6IC9cXC5qcyQvLFxuICAgICAgICAgIC4uLmJ1aWxkT3B0aW1pemVyVXNlUnVsZSxcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICB9LFxuICAgIG9wdGltaXphdGlvbjoge1xuICAgICAgbm9FbWl0T25FcnJvcnM6IHRydWUsXG4gICAgICBtaW5pbWl6ZXI6IFtcbiAgICAgICAgbmV3IEhhc2hlZE1vZHVsZUlkc1BsdWdpbigpLFxuICAgICAgICAvLyBUT0RPOiBjaGVjayB3aXRoIE1pa2Ugd2hhdCB0aGlzIGZlYXR1cmUgbmVlZHMuXG4gICAgICAgIG5ldyBCdW5kbGVCdWRnZXRQbHVnaW4oeyBidWRnZXRzOiBhcHBDb25maWcuYnVkZ2V0cyB9KSxcbiAgICAgICAgbmV3IENsZWFuQ3NzV2VicGFja1BsdWdpbih7XG4gICAgICAgICAgc291cmNlTWFwOiBidWlsZE9wdGlvbnMuc291cmNlTWFwLFxuICAgICAgICAgIC8vIGNvbXBvbmVudCBzdHlsZXMgcmV0YWluIHRoZWlyIG9yaWdpbmFsIGZpbGUgbmFtZVxuICAgICAgICAgIHRlc3Q6IChmaWxlKSA9PiAvXFwuKD86Y3NzfHNjc3N8c2Fzc3xsZXNzfHN0eWwpJC8udGVzdChmaWxlKSxcbiAgICAgICAgfSksXG4gICAgICAgIG5ldyBVZ2xpZnlKU1BsdWdpbih7XG4gICAgICAgICAgc291cmNlTWFwOiBidWlsZE9wdGlvbnMuc291cmNlTWFwLFxuICAgICAgICAgIHBhcmFsbGVsOiB0cnVlLFxuICAgICAgICAgIGNhY2hlOiB0cnVlLFxuICAgICAgICAgIHVnbGlmeU9wdGlvbnM6IHtcbiAgICAgICAgICAgIGVjbWE6IHdjby5zdXBwb3J0RVMyMDE1ID8gNiA6IDUsXG4gICAgICAgICAgICB3YXJuaW5nczogYnVpbGRPcHRpb25zLnZlcmJvc2UsXG4gICAgICAgICAgICBzYWZhcmkxMDogdHJ1ZSxcbiAgICAgICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgICAgIHB1cmVfZ2V0dGVyczogYnVpbGRPcHRpb25zLmJ1aWxkT3B0aW1pemVyLFxuICAgICAgICAgICAgICAvLyBQVVJFIGNvbW1lbnRzIHdvcmsgYmVzdCB3aXRoIDMgcGFzc2VzLlxuICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2VicGFjay9pc3N1ZXMvMjg5OSNpc3N1ZWNvbW1lbnQtMzE3NDI1OTI2LlxuICAgICAgICAgICAgICBwYXNzZXM6IGJ1aWxkT3B0aW9ucy5idWlsZE9wdGltaXplciA/IDMgOiAxLFxuICAgICAgICAgICAgICAvLyBXb3JrYXJvdW5kIGtub3duIHVnbGlmeS1lcyBpc3N1ZVxuICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21pc2hvby9VZ2xpZnlKUzIvaXNzdWVzLzI5NDkjaXNzdWVjb21tZW50LTM2ODA3MDMwN1xuICAgICAgICAgICAgICBpbmxpbmU6IHdjby5zdXBwb3J0RVMyMDE1ID8gMSA6IDMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgIGFzY2lpX29ubHk6IHRydWUsXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiBmYWxzZSxcbiAgICAgICAgICAgICAgd2Via2l0OiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgXSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IGV4dHJhUGx1Z2lucyxcbiAgfTtcbn1cbiJdfQ==