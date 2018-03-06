"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const webpack_1 = require("../../plugins/webpack");
const utils_1 = require("./utils");
const find_up_1 = require("../../utilities/find-up");
const postcssUrl = require('postcss-url');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const postcssImports = require('postcss-import');
const PostcssCliResources = require('../../plugins/webpack').PostcssCliResources;
function getStylesConfig(wco) {
    const { projectRoot, buildOptions, appConfig } = wco;
    const appRoot = path.resolve(projectRoot, appConfig.root);
    const entryPoints = {};
    const globalStylePaths = [];
    const extraPlugins = [];
    const cssSourceMap = buildOptions.sourceMap;
    // Maximum resource size to inline (KiB)
    const maximumInlineSize = 10;
    // Determine hashing format.
    const hashFormat = utils_1.getOutputHashFormat(buildOptions.outputHashing);
    // Convert absolute resource URLs to account for base-href and deploy-url.
    const baseHref = wco.buildOptions.baseHref || '';
    const deployUrl = wco.buildOptions.deployUrl || '';
    const postcssPluginCreator = function (loader) {
        return [
            postcssImports({
                resolve: (url, context) => {
                    return new Promise((resolve, reject) => {
                        let hadTilde = false;
                        if (url && url.startsWith('~')) {
                            url = url.substr(1);
                            hadTilde = true;
                        }
                        loader.resolve(context, (hadTilde ? '' : './') + url, (err, result) => {
                            if (err) {
                                if (hadTilde) {
                                    reject(err);
                                    return;
                                }
                                loader.resolve(context, url, (err, result) => {
                                    if (err) {
                                        reject(err);
                                    }
                                    else {
                                        resolve(result);
                                    }
                                });
                            }
                            else {
                                resolve(result);
                            }
                        });
                    });
                },
                load: (filename) => {
                    return new Promise((resolve, reject) => {
                        loader.fs.readFile(filename, (err, data) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            const content = data.toString();
                            resolve(content);
                        });
                    });
                }
            }),
            postcssUrl({
                filter: ({ url }) => url.startsWith('~'),
                url: ({ url }) => {
                    // Note: This will only find the first node_modules folder.
                    const nodeModules = find_up_1.findUp('node_modules', projectRoot);
                    if (!nodeModules) {
                        throw new Error('Cannot locate node_modules directory.');
                    }
                    const fullPath = path.join(nodeModules, url.substr(1));
                    return path.relative(loader.context, fullPath).replace(/\\/g, '/');
                }
            }),
            postcssUrl([
                {
                    // Only convert root relative URLs, which CSS-Loader won't process into require().
                    filter: ({ url }) => url.startsWith('/') && !url.startsWith('//'),
                    url: ({ url }) => {
                        if (deployUrl.match(/:\/\//) || deployUrl.startsWith('/')) {
                            // If deployUrl is absolute or root relative, ignore baseHref & use deployUrl as is.
                            return `${deployUrl.replace(/\/$/, '')}${url}`;
                        }
                        else if (baseHref.match(/:\/\//)) {
                            // If baseHref contains a scheme, include it as is.
                            return baseHref.replace(/\/$/, '') +
                                `/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
                        }
                        else {
                            // Join together base-href, deploy-url and the original URL.
                            // Also dedupe multiple slashes into single ones.
                            return `/${baseHref}/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
                        }
                    }
                },
                {
                    // TODO: inline .cur if not supporting IE (use browserslist to check)
                    filter: (asset) => {
                        return maximumInlineSize > 0 && !asset.hash && !asset.absolutePath.endsWith('.cur');
                    },
                    url: 'inline',
                    // NOTE: maxSize is in KB
                    maxSize: maximumInlineSize,
                    fallback: 'rebase',
                },
                { url: 'rebase' },
            ]),
            PostcssCliResources({
                deployUrl: loader.loaders[loader.loaderIndex].options.ident == 'extracted' ? '' : deployUrl,
                loader,
                filename: `[name]${hashFormat.file}.[ext]`,
            }),
            autoprefixer({ grid: true }),
        ];
    };
    // use includePaths from appConfig
    const includePaths = [];
    let lessPathOptions = { paths: [] };
    if (appConfig.stylePreprocessorOptions
        && appConfig.stylePreprocessorOptions.includePaths
        && appConfig.stylePreprocessorOptions.includePaths.length > 0) {
        appConfig.stylePreprocessorOptions.includePaths.forEach((includePath) => includePaths.push(path.resolve(appRoot, includePath)));
        lessPathOptions = {
            paths: includePaths,
        };
    }
    // process global styles
    if (appConfig.styles.length > 0) {
        const globalStyles = utils_1.extraEntryParser(appConfig.styles, appRoot, 'styles');
        // add style entry points
        globalStyles.forEach(style => entryPoints[style.entry]
            ? entryPoints[style.entry].push(style.path)
            : entryPoints[style.entry] = [style.path]);
        // add global css paths
        globalStylePaths.push(...globalStyles.map((style) => style.path));
    }
    // set base rules to derive final rules from
    const baseRules = [
        { test: /\.css$/, use: [] },
        {
            test: /\.scss$|\.sass$/, use: [{
                    loader: 'sass-loader',
                    options: {
                        sourceMap: cssSourceMap,
                        // bootstrap-sass requires a minimum precision of 8
                        precision: 8,
                        includePaths
                    }
                }]
        },
        {
            test: /\.less$/, use: [{
                    loader: 'less-loader',
                    options: Object.assign({ sourceMap: cssSourceMap }, lessPathOptions)
                }]
        },
        {
            test: /\.styl$/, use: [{
                    loader: 'stylus-loader',
                    options: {
                        sourceMap: cssSourceMap,
                        paths: includePaths
                    }
                }]
        }
    ];
    const commonLoaders = [
        { loader: 'raw-loader' },
    ];
    // load component css as raw strings
    const rules = baseRules.map(({ test, use }) => ({
        exclude: globalStylePaths, test, use: [
            ...commonLoaders,
            {
                loader: 'postcss-loader',
                options: {
                    ident: 'embedded',
                    plugins: postcssPluginCreator,
                    sourceMap: cssSourceMap
                }
            },
            ...use
        ]
    }));
    // load global css as css files
    if (globalStylePaths.length > 0) {
        rules.push(...baseRules.map(({ test, use }) => {
            const extractTextPlugin = {
                use: [
                    ...commonLoaders,
                    {
                        loader: 'postcss-loader',
                        options: {
                            ident: buildOptions.extractCss ? 'extracted' : 'embedded',
                            plugins: postcssPluginCreator,
                            sourceMap: cssSourceMap
                        }
                    },
                    ...use
                ],
                // publicPath needed as a workaround https://github.com/angular/angular-cli/issues/4035
                publicPath: ''
            };
            const ret = {
                include: globalStylePaths,
                test,
                use: buildOptions.extractCss ? ExtractTextPlugin.extract(extractTextPlugin)
                    : ['style-loader', ...extractTextPlugin.use]
            };
            // Save the original options as arguments for eject.
            // if (buildOptions.extractCss) {
            //   ret[pluginArgs] = extractTextPlugin;
            // }
            return ret;
        }));
    }
    if (buildOptions.extractCss) {
        // extract global css from js files into own css file
        extraPlugins.push(new ExtractTextPlugin({ filename: `[name]${hashFormat.extract}.css` }));
        // suppress empty .js files in css only entry points
        extraPlugins.push(new webpack_1.SuppressExtractedTextChunksWebpackPlugin());
    }
    return {
        // Workaround stylus-loader defect: https://github.com/shama/stylus-loader/issues/189
        loader: { stylus: {} },
        entry: entryPoints,
        module: { rules },
        plugins: [].concat(extraPlugins)
    };
}
exports.getStylesConfig = getStylesConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGVzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL3N0eWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBQWlCO0FBQ2pCLCtEQUErRDs7QUFHL0QsNkJBQTZCO0FBQzdCLG1EQUFpRjtBQUNqRixtQ0FBZ0U7QUFFaEUscURBQWlEO0FBRWpELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0MsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUNqRSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNqRCxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLG1CQUFtQixDQUFDO0FBd0JqRix5QkFBZ0MsR0FBeUI7SUFDdkQsTUFBTSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLEdBQUcsR0FBRyxDQUFDO0lBRXJELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxRCxNQUFNLFdBQVcsR0FBZ0MsRUFBRSxDQUFDO0lBQ3BELE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFDO0lBQ3RDLE1BQU0sWUFBWSxHQUFVLEVBQUUsQ0FBQztJQUMvQixNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDO0lBRTVDLHdDQUF3QztJQUN4QyxNQUFNLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztJQUM3Qiw0QkFBNEI7SUFDNUIsTUFBTSxVQUFVLEdBQUcsMkJBQW1CLENBQUMsWUFB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QyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzVCLHFEQUFxRDtRQUNyRCxZQUFZLENBQUMsSUFBSSxDQUNmLElBQUksaUJBQWlCLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxVQUFVLENBQUMsT0FBTyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUUsb0RBQW9EO1FBQ3BELFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxrREFBd0MsRUFBRSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELE1BQU0sQ0FBQztRQUNMLHFGQUFxRjtRQUNyRixNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO1FBQ3RCLEtBQUssRUFBRSxXQUFXO1FBQ2xCLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRTtRQUNqQixPQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFtQixDQUFDO0tBQ3hDLENBQUM7QUFDSixDQUFDO0FBbFBELDBDQWtQQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXG4vLyBUT0RPOiBjbGVhbnVwIHRoaXMgZmlsZSwgaXQncyBjb3BpZWQgYXMgaXMgZnJvbSBBbmd1bGFyIENMSS5cblxuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBTdXBwcmVzc0V4dHJhY3RlZFRleHRDaHVua3NXZWJwYWNrUGx1Z2luIH0gZnJvbSAnLi4vLi4vcGx1Z2lucy93ZWJwYWNrJztcbmltcG9ydCB7IGV4dHJhRW50cnlQYXJzZXIsIGdldE91dHB1dEhhc2hGb3JtYXQgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFdlYnBhY2tDb25maWdPcHRpb25zIH0gZnJvbSAnLi4vYnVpbGQtb3B0aW9ucyc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvZmluZC11cCc7XG5cbmNvbnN0IHBvc3Rjc3NVcmwgPSByZXF1aXJlKCdwb3N0Y3NzLXVybCcpO1xuY29uc3QgYXV0b3ByZWZpeGVyID0gcmVxdWlyZSgnYXV0b3ByZWZpeGVyJyk7XG5jb25zdCBFeHRyYWN0VGV4dFBsdWdpbiA9IHJlcXVpcmUoJ2V4dHJhY3QtdGV4dC13ZWJwYWNrLXBsdWdpbicpO1xuY29uc3QgcG9zdGNzc0ltcG9ydHMgPSByZXF1aXJlKCdwb3N0Y3NzLWltcG9ydCcpO1xuY29uc3QgUG9zdGNzc0NsaVJlc291cmNlcyA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnMvd2VicGFjaycpLlBvc3Rjc3NDbGlSZXNvdXJjZXM7XG5cbi8qKlxuICogRW51bWVyYXRlIGxvYWRlcnMgYW5kIHRoZWlyIGRlcGVuZGVuY2llcyBmcm9tIHRoaXMgZmlsZSB0byBsZXQgdGhlIGRlcGVuZGVuY3kgdmFsaWRhdG9yXG4gKiBrbm93IHRoZXkgYXJlIHVzZWQuXG4gKlxuICogcmVxdWlyZSgnZXhwb3J0cy1sb2FkZXInKVxuICogcmVxdWlyZSgnc3R5bGUtbG9hZGVyJylcbiAqIHJlcXVpcmUoJ3Bvc3Rjc3MtbG9hZGVyJylcbiAqIHJlcXVpcmUoJ2Nzcy1sb2FkZXInKVxuICogcmVxdWlyZSgnc3R5bHVzJylcbiAqIHJlcXVpcmUoJ3N0eWx1cy1sb2FkZXInKVxuICogcmVxdWlyZSgnbGVzcycpXG4gKiByZXF1aXJlKCdsZXNzLWxvYWRlcicpXG4gKiByZXF1aXJlKCdub2RlLXNhc3MnKVxuICogcmVxdWlyZSgnc2Fzcy1sb2FkZXInKVxuICovXG5cbmludGVyZmFjZSBQb3N0Y3NzVXJsQXNzZXQge1xuICB1cmw6IHN0cmluZztcbiAgaGFzaDogc3RyaW5nO1xuICBhYnNvbHV0ZVBhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0eWxlc0NvbmZpZyh3Y286IFdlYnBhY2tDb25maWdPcHRpb25zKSB7XG4gIGNvbnN0IHsgcHJvamVjdFJvb3QsIGJ1aWxkT3B0aW9ucywgYXBwQ29uZmlnIH0gPSB3Y287XG5cbiAgY29uc3QgYXBwUm9vdCA9IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgYXBwQ29uZmlnLnJvb3QpO1xuICBjb25zdCBlbnRyeVBvaW50czogeyBba2V5OiBzdHJpbmddOiBzdHJpbmdbXSB9ID0ge307XG4gIGNvbnN0IGdsb2JhbFN0eWxlUGF0aHM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGV4dHJhUGx1Z2luczogYW55W10gPSBbXTtcbiAgY29uc3QgY3NzU291cmNlTWFwID0gYnVpbGRPcHRpb25zLnNvdXJjZU1hcDtcblxuICAvLyBNYXhpbXVtIHJlc291cmNlIHNpemUgdG8gaW5saW5lIChLaUIpXG4gIGNvbnN0IG1heGltdW1JbmxpbmVTaXplID0gMTA7XG4gIC8vIERldGVybWluZSBoYXNoaW5nIGZvcm1hdC5cbiAgY29uc3QgaGFzaEZvcm1hdCA9IGdldE91dHB1dEhhc2hGb3JtYXQoYnVpbGRPcHRpb25zLm91dHB1dEhhc2hpbmcgYXMgc3RyaW5nKTtcbiAgLy8gQ29udmVydCBhYnNvbHV0ZSByZXNvdXJjZSBVUkxzIHRvIGFjY291bnQgZm9yIGJhc2UtaHJlZiBhbmQgZGVwbG95LXVybC5cbiAgY29uc3QgYmFzZUhyZWYgPSB3Y28uYnVpbGRPcHRpb25zLmJhc2VIcmVmIHx8ICcnO1xuICBjb25zdCBkZXBsb3lVcmwgPSB3Y28uYnVpbGRPcHRpb25zLmRlcGxveVVybCB8fCAnJztcblxuICBjb25zdCBwb3N0Y3NzUGx1Z2luQ3JlYXRvciA9IGZ1bmN0aW9uIChsb2FkZXI6IHdlYnBhY2subG9hZGVyLkxvYWRlckNvbnRleHQpIHtcbiAgICByZXR1cm4gW1xuICAgICAgcG9zdGNzc0ltcG9ydHMoe1xuICAgICAgICByZXNvbHZlOiAodXJsOiBzdHJpbmcsIGNvbnRleHQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBoYWRUaWxkZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHVybCAmJiB1cmwuc3RhcnRzV2l0aCgnficpKSB7XG4gICAgICAgICAgICAgIHVybCA9IHVybC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgIGhhZFRpbGRlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvYWRlci5yZXNvbHZlKGNvbnRleHQsIChoYWRUaWxkZSA/ICcnIDogJy4vJykgKyB1cmwsIChlcnI6IEVycm9yLCByZXN1bHQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhZFRpbGRlKSB7XG4gICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbG9hZGVyLnJlc29sdmUoY29udGV4dCwgdXJsLCAoZXJyOiBFcnJvciwgcmVzdWx0OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgbG9hZDogKGZpbGVuYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsb2FkZXIuZnMucmVhZEZpbGUoZmlsZW5hbWUsIChlcnI6IEVycm9yLCBkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBkYXRhLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIHJlc29sdmUoY29udGVudCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBwb3N0Y3NzVXJsKHtcbiAgICAgICAgZmlsdGVyOiAoeyB1cmwgfTogUG9zdGNzc1VybEFzc2V0KSA9PiB1cmwuc3RhcnRzV2l0aCgnficpLFxuICAgICAgICB1cmw6ICh7IHVybCB9OiBQb3N0Y3NzVXJsQXNzZXQpID0+IHtcbiAgICAgICAgICAvLyBOb3RlOiBUaGlzIHdpbGwgb25seSBmaW5kIHRoZSBmaXJzdCBub2RlX21vZHVsZXMgZm9sZGVyLlxuICAgICAgICAgIGNvbnN0IG5vZGVNb2R1bGVzID0gZmluZFVwKCdub2RlX21vZHVsZXMnLCBwcm9qZWN0Um9vdCk7XG4gICAgICAgICAgaWYgKCFub2RlTW9kdWxlcykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgbG9jYXRlIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkuJylcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4obm9kZU1vZHVsZXMsIHVybC5zdWJzdHIoMSkpO1xuICAgICAgICAgIHJldHVybiBwYXRoLnJlbGF0aXZlKGxvYWRlci5jb250ZXh0LCBmdWxsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHBvc3Rjc3NVcmwoW1xuICAgICAgICB7XG4gICAgICAgICAgLy8gT25seSBjb252ZXJ0IHJvb3QgcmVsYXRpdmUgVVJMcywgd2hpY2ggQ1NTLUxvYWRlciB3b24ndCBwcm9jZXNzIGludG8gcmVxdWlyZSgpLlxuICAgICAgICAgIGZpbHRlcjogKHsgdXJsIH06IFBvc3Rjc3NVcmxBc3NldCkgPT4gdXJsLnN0YXJ0c1dpdGgoJy8nKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJy8vJyksXG4gICAgICAgICAgdXJsOiAoeyB1cmwgfTogUG9zdGNzc1VybEFzc2V0KSA9PiB7XG4gICAgICAgICAgICBpZiAoZGVwbG95VXJsLm1hdGNoKC86XFwvXFwvLykgfHwgZGVwbG95VXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAgICAgICAvLyBJZiBkZXBsb3lVcmwgaXMgYWJzb2x1dGUgb3Igcm9vdCByZWxhdGl2ZSwgaWdub3JlIGJhc2VIcmVmICYgdXNlIGRlcGxveVVybCBhcyBpcy5cbiAgICAgICAgICAgICAgcmV0dXJuIGAke2RlcGxveVVybC5yZXBsYWNlKC9cXC8kLywgJycpfSR7dXJsfWA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJhc2VIcmVmLm1hdGNoKC86XFwvXFwvLykpIHtcbiAgICAgICAgICAgICAgLy8gSWYgYmFzZUhyZWYgY29udGFpbnMgYSBzY2hlbWUsIGluY2x1ZGUgaXQgYXMgaXMuXG4gICAgICAgICAgICAgIHJldHVybiBiYXNlSHJlZi5yZXBsYWNlKC9cXC8kLywgJycpICtcbiAgICAgICAgICAgICAgICBgLyR7ZGVwbG95VXJsfS8ke3VybH1gLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIEpvaW4gdG9nZXRoZXIgYmFzZS1ocmVmLCBkZXBsb3ktdXJsIGFuZCB0aGUgb3JpZ2luYWwgVVJMLlxuICAgICAgICAgICAgICAvLyBBbHNvIGRlZHVwZSBtdWx0aXBsZSBzbGFzaGVzIGludG8gc2luZ2xlIG9uZXMuXG4gICAgICAgICAgICAgIHJldHVybiBgLyR7YmFzZUhyZWZ9LyR7ZGVwbG95VXJsfS8ke3VybH1gLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAvLyBUT0RPOiBpbmxpbmUgLmN1ciBpZiBub3Qgc3VwcG9ydGluZyBJRSAodXNlIGJyb3dzZXJzbGlzdCB0byBjaGVjaylcbiAgICAgICAgICBmaWx0ZXI6IChhc3NldDogUG9zdGNzc1VybEFzc2V0KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbWF4aW11bUlubGluZVNpemUgPiAwICYmICFhc3NldC5oYXNoICYmICFhc3NldC5hYnNvbHV0ZVBhdGguZW5kc1dpdGgoJy5jdXInKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHVybDogJ2lubGluZScsXG4gICAgICAgICAgLy8gTk9URTogbWF4U2l6ZSBpcyBpbiBLQlxuICAgICAgICAgIG1heFNpemU6IG1heGltdW1JbmxpbmVTaXplLFxuICAgICAgICAgIGZhbGxiYWNrOiAncmViYXNlJyxcbiAgICAgICAgfSxcbiAgICAgICAgeyB1cmw6ICdyZWJhc2UnIH0sXG4gICAgICBdKSxcbiAgICAgIFBvc3Rjc3NDbGlSZXNvdXJjZXMoe1xuICAgICAgICBkZXBsb3lVcmw6IGxvYWRlci5sb2FkZXJzW2xvYWRlci5sb2FkZXJJbmRleF0ub3B0aW9ucy5pZGVudCA9PSAnZXh0cmFjdGVkJyA/ICcnIDogZGVwbG95VXJsLFxuICAgICAgICBsb2FkZXIsXG4gICAgICAgIGZpbGVuYW1lOiBgW25hbWVdJHtoYXNoRm9ybWF0LmZpbGV9LltleHRdYCxcbiAgICAgIH0pLFxuICAgICAgYXV0b3ByZWZpeGVyKHsgZ3JpZDogdHJ1ZSB9KSxcbiAgICBdO1xuICB9O1xuXG4gIC8vIHVzZSBpbmNsdWRlUGF0aHMgZnJvbSBhcHBDb25maWdcbiAgY29uc3QgaW5jbHVkZVBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgbGVzc1BhdGhPcHRpb25zOiB7IHBhdGhzOiBzdHJpbmdbXSB9ID0geyBwYXRoczogW10gfTtcblxuICBpZiAoYXBwQ29uZmlnLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uc1xuICAgICYmIGFwcENvbmZpZy5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMuaW5jbHVkZVBhdGhzXG4gICAgJiYgYXBwQ29uZmlnLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHMubGVuZ3RoID4gMFxuICApIHtcbiAgICBhcHBDb25maWcuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocy5mb3JFYWNoKChpbmNsdWRlUGF0aDogc3RyaW5nKSA9PlxuICAgICAgaW5jbHVkZVBhdGhzLnB1c2gocGF0aC5yZXNvbHZlKGFwcFJvb3QsIGluY2x1ZGVQYXRoKSkpO1xuICAgIGxlc3NQYXRoT3B0aW9ucyA9IHtcbiAgICAgIHBhdGhzOiBpbmNsdWRlUGF0aHMsXG4gICAgfTtcbiAgfVxuXG4gIC8vIHByb2Nlc3MgZ2xvYmFsIHN0eWxlc1xuICBpZiAoYXBwQ29uZmlnLnN0eWxlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZ2xvYmFsU3R5bGVzID0gZXh0cmFFbnRyeVBhcnNlcihhcHBDb25maWcuc3R5bGVzLCBhcHBSb290LCAnc3R5bGVzJyk7XG4gICAgLy8gYWRkIHN0eWxlIGVudHJ5IHBvaW50c1xuICAgIGdsb2JhbFN0eWxlcy5mb3JFYWNoKHN0eWxlID0+XG4gICAgICBlbnRyeVBvaW50c1tzdHlsZS5lbnRyeSBhcyBhbnldXG4gICAgICAgID8gZW50cnlQb2ludHNbc3R5bGUuZW50cnkgYXMgYW55XS5wdXNoKHN0eWxlLnBhdGggYXMgc3RyaW5nKVxuICAgICAgICA6IGVudHJ5UG9pbnRzW3N0eWxlLmVudHJ5IGFzIGFueV0gPSBbc3R5bGUucGF0aCBhcyBhbnldXG4gICAgKTtcbiAgICAvLyBhZGQgZ2xvYmFsIGNzcyBwYXRoc1xuICAgIGdsb2JhbFN0eWxlUGF0aHMucHVzaCguLi5nbG9iYWxTdHlsZXMubWFwKChzdHlsZSkgPT4gc3R5bGUucGF0aCBhcyBhbnkpKTtcbiAgfVxuXG4gIC8vIHNldCBiYXNlIHJ1bGVzIHRvIGRlcml2ZSBmaW5hbCBydWxlcyBmcm9tXG4gIGNvbnN0IGJhc2VSdWxlczogd2VicGFjay5OZXdVc2VSdWxlW10gPSBbXG4gICAgeyB0ZXN0OiAvXFwuY3NzJC8sIHVzZTogW10gfSxcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwuc2NzcyR8XFwuc2FzcyQvLCB1c2U6IFt7XG4gICAgICAgIGxvYWRlcjogJ3Nhc3MtbG9hZGVyJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHNvdXJjZU1hcDogY3NzU291cmNlTWFwLFxuICAgICAgICAgIC8vIGJvb3RzdHJhcC1zYXNzIHJlcXVpcmVzIGEgbWluaW11bSBwcmVjaXNpb24gb2YgOFxuICAgICAgICAgIHByZWNpc2lvbjogOCxcbiAgICAgICAgICBpbmNsdWRlUGF0aHNcbiAgICAgICAgfVxuICAgICAgfV1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5sZXNzJC8sIHVzZTogW3tcbiAgICAgICAgbG9hZGVyOiAnbGVzcy1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgc291cmNlTWFwOiBjc3NTb3VyY2VNYXAsXG4gICAgICAgICAgLi4ubGVzc1BhdGhPcHRpb25zLFxuICAgICAgICB9XG4gICAgICB9XVxuICAgIH0sXG4gICAge1xuICAgICAgdGVzdDogL1xcLnN0eWwkLywgdXNlOiBbe1xuICAgICAgICBsb2FkZXI6ICdzdHlsdXMtbG9hZGVyJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHNvdXJjZU1hcDogY3NzU291cmNlTWFwLFxuICAgICAgICAgIHBhdGhzOiBpbmNsdWRlUGF0aHNcbiAgICAgICAgfVxuICAgICAgfV1cbiAgICB9XG4gIF07XG5cbiAgY29uc3QgY29tbW9uTG9hZGVyczogd2VicGFjay5Mb2FkZXJbXSA9IFtcbiAgICB7IGxvYWRlcjogJ3Jhdy1sb2FkZXInIH0sXG4gIF07XG5cbiAgLy8gbG9hZCBjb21wb25lbnQgY3NzIGFzIHJhdyBzdHJpbmdzXG4gIGNvbnN0IHJ1bGVzOiB3ZWJwYWNrLlJ1bGVbXSA9IGJhc2VSdWxlcy5tYXAoKHsgdGVzdCwgdXNlIH0pID0+ICh7XG4gICAgZXhjbHVkZTogZ2xvYmFsU3R5bGVQYXRocywgdGVzdCwgdXNlOiBbXG4gICAgICAuLi5jb21tb25Mb2FkZXJzLFxuICAgICAge1xuICAgICAgICBsb2FkZXI6ICdwb3N0Y3NzLWxvYWRlcicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBpZGVudDogJ2VtYmVkZGVkJyxcbiAgICAgICAgICBwbHVnaW5zOiBwb3N0Y3NzUGx1Z2luQ3JlYXRvcixcbiAgICAgICAgICBzb3VyY2VNYXA6IGNzc1NvdXJjZU1hcFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLi4uKHVzZSBhcyB3ZWJwYWNrLkxvYWRlcltdKVxuICAgIF1cbiAgfSkpO1xuXG4gIC8vIGxvYWQgZ2xvYmFsIGNzcyBhcyBjc3MgZmlsZXNcbiAgaWYgKGdsb2JhbFN0eWxlUGF0aHMubGVuZ3RoID4gMCkge1xuICAgIHJ1bGVzLnB1c2goLi4uYmFzZVJ1bGVzLm1hcCgoeyB0ZXN0LCB1c2UgfSkgPT4ge1xuICAgICAgY29uc3QgZXh0cmFjdFRleHRQbHVnaW4gPSB7XG4gICAgICAgIHVzZTogW1xuICAgICAgICAgIC4uLmNvbW1vbkxvYWRlcnMsXG4gICAgICAgICAge1xuICAgICAgICAgICAgbG9hZGVyOiAncG9zdGNzcy1sb2FkZXInLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBpZGVudDogYnVpbGRPcHRpb25zLmV4dHJhY3RDc3MgPyAnZXh0cmFjdGVkJyA6ICdlbWJlZGRlZCcsXG4gICAgICAgICAgICAgIHBsdWdpbnM6IHBvc3Rjc3NQbHVnaW5DcmVhdG9yLFxuICAgICAgICAgICAgICBzb3VyY2VNYXA6IGNzc1NvdXJjZU1hcFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgLi4uKHVzZSBhcyB3ZWJwYWNrLkxvYWRlcltdKVxuICAgICAgICBdLFxuICAgICAgICAvLyBwdWJsaWNQYXRoIG5lZWRlZCBhcyBhIHdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvaXNzdWVzLzQwMzVcbiAgICAgICAgcHVibGljUGF0aDogJydcbiAgICAgIH07XG4gICAgICBjb25zdCByZXQ6IGFueSA9IHtcbiAgICAgICAgaW5jbHVkZTogZ2xvYmFsU3R5bGVQYXRocyxcbiAgICAgICAgdGVzdCxcbiAgICAgICAgdXNlOiBidWlsZE9wdGlvbnMuZXh0cmFjdENzcyA/IEV4dHJhY3RUZXh0UGx1Z2luLmV4dHJhY3QoZXh0cmFjdFRleHRQbHVnaW4pXG4gICAgICAgICAgOiBbJ3N0eWxlLWxvYWRlcicsIC4uLmV4dHJhY3RUZXh0UGx1Z2luLnVzZV1cbiAgICAgIH07XG4gICAgICAvLyBTYXZlIHRoZSBvcmlnaW5hbCBvcHRpb25zIGFzIGFyZ3VtZW50cyBmb3IgZWplY3QuXG4gICAgICAvLyBpZiAoYnVpbGRPcHRpb25zLmV4dHJhY3RDc3MpIHtcbiAgICAgIC8vICAgcmV0W3BsdWdpbkFyZ3NdID0gZXh0cmFjdFRleHRQbHVnaW47XG4gICAgICAvLyB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChidWlsZE9wdGlvbnMuZXh0cmFjdENzcykge1xuICAgIC8vIGV4dHJhY3QgZ2xvYmFsIGNzcyBmcm9tIGpzIGZpbGVzIGludG8gb3duIGNzcyBmaWxlXG4gICAgZXh0cmFQbHVnaW5zLnB1c2goXG4gICAgICBuZXcgRXh0cmFjdFRleHRQbHVnaW4oeyBmaWxlbmFtZTogYFtuYW1lXSR7aGFzaEZvcm1hdC5leHRyYWN0fS5jc3NgIH0pKTtcbiAgICAvLyBzdXBwcmVzcyBlbXB0eSAuanMgZmlsZXMgaW4gY3NzIG9ubHkgZW50cnkgcG9pbnRzXG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IFN1cHByZXNzRXh0cmFjdGVkVGV4dENodW5rc1dlYnBhY2tQbHVnaW4oKSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC8vIFdvcmthcm91bmQgc3R5bHVzLWxvYWRlciBkZWZlY3Q6IGh0dHBzOi8vZ2l0aHViLmNvbS9zaGFtYS9zdHlsdXMtbG9hZGVyL2lzc3Vlcy8xODlcbiAgICBsb2FkZXI6IHsgc3R5bHVzOiB7fSB9LFxuICAgIGVudHJ5OiBlbnRyeVBvaW50cyxcbiAgICBtb2R1bGU6IHsgcnVsZXMgfSxcbiAgICBwbHVnaW5zOiBbXS5jb25jYXQoZXh0cmFQbHVnaW5zIGFzIGFueSlcbiAgfTtcbn1cbiJdfQ==