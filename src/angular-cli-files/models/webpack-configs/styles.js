"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const webpack_1 = require("../../plugins/webpack");
const utils_1 = require("./utils");
const find_up_1 = require("../../utilities/find-up");
const webpack_2 = require("../../plugins/webpack");
const postcssUrl = require('postcss-url');
const autoprefixer = require('autoprefixer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
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
    // load component css as raw strings
    const rules = baseRules.map(({ test, use }) => ({
        exclude: globalStylePaths, test, use: [
            { loader: 'raw-loader' },
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
                    { loader: webpack_2.RawCssLoader },
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
                use: [
                    buildOptions.extractCss ? MiniCssExtractPlugin.loader : 'style-loader',
                    ...extractTextPlugin.use,
                ]
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
        extraPlugins.push(new MiniCssExtractPlugin({ filename: `[name]${hashFormat.script}.css` }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGVzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL3N0eWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBQWlCO0FBQ2pCLCtEQUErRDs7QUFHL0QsNkJBQTZCO0FBQzdCLG1EQUFpRjtBQUNqRixtQ0FBZ0U7QUFFaEUscURBQWlEO0FBQ2pELG1EQUFxRDtBQUVyRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDMUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDaEUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDakQsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQztBQXdCakYseUJBQWdDLEdBQXlCO0lBQ3ZELE1BQU0sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxHQUFHLEdBQUcsQ0FBQztJQUVyRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUQsTUFBTSxXQUFXLEdBQWdDLEVBQUUsQ0FBQztJQUNwRCxNQUFNLGdCQUFnQixHQUFhLEVBQUUsQ0FBQztJQUN0QyxNQUFNLFlBQVksR0FBVSxFQUFFLENBQUM7SUFDL0IsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQztJQUU1Qyx3Q0FBd0M7SUFDeEMsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLENBQUM7SUFDN0IsNEJBQTRCO0lBQzVCLE1BQU0sVUFBVSxHQUFHLDJC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O1FBQ3JELFlBQVksQ0FBQyxJQUFJLENBQ2YsSUFBSSxvQkFBb0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLFVBQVUsQ0FBQyxNQUFNLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RSxvREFBb0Q7UUFDcEQsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLGtEQUF3QyxFQUFFLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsTUFBTSxDQUFDO1FBQ0wscUZBQXFGO1FBQ3JGLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7UUFDdEIsS0FBSyxFQUFFLFdBQVc7UUFDbEIsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ2pCLE9BQU8sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQW1CLENBQUM7S0FDeEMsQ0FBQztBQUNKLENBQUM7QUFoUEQsMENBZ1BDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGVcbi8vIFRPRE86IGNsZWFudXAgdGhpcyBmaWxlLCBpdCdzIGNvcGllZCBhcyBpcyBmcm9tIEFuZ3VsYXIgQ0xJLlxuXG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFN1cHByZXNzRXh0cmFjdGVkVGV4dENodW5rc1dlYnBhY2tQbHVnaW4gfSBmcm9tICcuLi8uLi9wbHVnaW5zL3dlYnBhY2snO1xuaW1wb3J0IHsgZXh0cmFFbnRyeVBhcnNlciwgZ2V0T3V0cHV0SGFzaEZvcm1hdCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgV2VicGFja0NvbmZpZ09wdGlvbnMgfSBmcm9tICcuLi9idWlsZC1vcHRpb25zJztcbmltcG9ydCB7IGZpbmRVcCB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9maW5kLXVwJztcbmltcG9ydCB7IFJhd0Nzc0xvYWRlciB9IGZyb20gJy4uLy4uL3BsdWdpbnMvd2VicGFjayc7XG5cbmNvbnN0IHBvc3Rjc3NVcmwgPSByZXF1aXJlKCdwb3N0Y3NzLXVybCcpO1xuY29uc3QgYXV0b3ByZWZpeGVyID0gcmVxdWlyZSgnYXV0b3ByZWZpeGVyJyk7XG5jb25zdCBNaW5pQ3NzRXh0cmFjdFBsdWdpbiA9IHJlcXVpcmUoJ21pbmktY3NzLWV4dHJhY3QtcGx1Z2luJyk7XG5jb25zdCBwb3N0Y3NzSW1wb3J0cyA9IHJlcXVpcmUoJ3Bvc3Rjc3MtaW1wb3J0Jyk7XG5jb25zdCBQb3N0Y3NzQ2xpUmVzb3VyY2VzID0gcmVxdWlyZSgnLi4vLi4vcGx1Z2lucy93ZWJwYWNrJykuUG9zdGNzc0NsaVJlc291cmNlcztcblxuLyoqXG4gKiBFbnVtZXJhdGUgbG9hZGVycyBhbmQgdGhlaXIgZGVwZW5kZW5jaWVzIGZyb20gdGhpcyBmaWxlIHRvIGxldCB0aGUgZGVwZW5kZW5jeSB2YWxpZGF0b3JcbiAqIGtub3cgdGhleSBhcmUgdXNlZC5cbiAqXG4gKiByZXF1aXJlKCdleHBvcnRzLWxvYWRlcicpXG4gKiByZXF1aXJlKCdzdHlsZS1sb2FkZXInKVxuICogcmVxdWlyZSgncG9zdGNzcy1sb2FkZXInKVxuICogcmVxdWlyZSgnY3NzLWxvYWRlcicpXG4gKiByZXF1aXJlKCdzdHlsdXMnKVxuICogcmVxdWlyZSgnc3R5bHVzLWxvYWRlcicpXG4gKiByZXF1aXJlKCdsZXNzJylcbiAqIHJlcXVpcmUoJ2xlc3MtbG9hZGVyJylcbiAqIHJlcXVpcmUoJ25vZGUtc2FzcycpXG4gKiByZXF1aXJlKCdzYXNzLWxvYWRlcicpXG4gKi9cblxuaW50ZXJmYWNlIFBvc3Rjc3NVcmxBc3NldCB7XG4gIHVybDogc3RyaW5nO1xuICBoYXNoOiBzdHJpbmc7XG4gIGFic29sdXRlUGF0aDogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3R5bGVzQ29uZmlnKHdjbzogV2VicGFja0NvbmZpZ09wdGlvbnMpIHtcbiAgY29uc3QgeyBwcm9qZWN0Um9vdCwgYnVpbGRPcHRpb25zLCBhcHBDb25maWcgfSA9IHdjbztcblxuICBjb25zdCBhcHBSb290ID0gcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCBhcHBDb25maWcucm9vdCk7XG4gIGNvbnN0IGVudHJ5UG9pbnRzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZ1tdIH0gPSB7fTtcbiAgY29uc3QgZ2xvYmFsU3R5bGVQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZXh0cmFQbHVnaW5zOiBhbnlbXSA9IFtdO1xuICBjb25zdCBjc3NTb3VyY2VNYXAgPSBidWlsZE9wdGlvbnMuc291cmNlTWFwO1xuXG4gIC8vIE1heGltdW0gcmVzb3VyY2Ugc2l6ZSB0byBpbmxpbmUgKEtpQilcbiAgY29uc3QgbWF4aW11bUlubGluZVNpemUgPSAxMDtcbiAgLy8gRGV0ZXJtaW5lIGhhc2hpbmcgZm9ybWF0LlxuICBjb25zdCBoYXNoRm9ybWF0ID0gZ2V0T3V0cHV0SGFzaEZvcm1hdChidWlsZE9wdGlvbnMub3V0cHV0SGFzaGluZyBhcyBzdHJpbmcpO1xuICAvLyBDb252ZXJ0IGFic29sdXRlIHJlc291cmNlIFVSTHMgdG8gYWNjb3VudCBmb3IgYmFzZS1ocmVmIGFuZCBkZXBsb3ktdXJsLlxuICBjb25zdCBiYXNlSHJlZiA9IHdjby5idWlsZE9wdGlvbnMuYmFzZUhyZWYgfHwgJyc7XG4gIGNvbnN0IGRlcGxveVVybCA9IHdjby5idWlsZE9wdGlvbnMuZGVwbG95VXJsIHx8ICcnO1xuXG4gIGNvbnN0IHBvc3Rjc3NQbHVnaW5DcmVhdG9yID0gZnVuY3Rpb24gKGxvYWRlcjogd2VicGFjay5sb2FkZXIuTG9hZGVyQ29udGV4dCkge1xuICAgIHJldHVybiBbXG4gICAgICBwb3N0Y3NzSW1wb3J0cyh7XG4gICAgICAgIHJlc29sdmU6ICh1cmw6IHN0cmluZywgY29udGV4dDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGhhZFRpbGRlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodXJsICYmIHVybC5zdGFydHNXaXRoKCd+JykpIHtcbiAgICAgICAgICAgICAgdXJsID0gdXJsLnN1YnN0cigxKTtcbiAgICAgICAgICAgICAgaGFkVGlsZGUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9hZGVyLnJlc29sdmUoY29udGV4dCwgKGhhZFRpbGRlID8gJycgOiAnLi8nKSArIHVybCwgKGVycjogRXJyb3IsIHJlc3VsdDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoaGFkVGlsZGUpIHtcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsb2FkZXIucmVzb2x2ZShjb250ZXh0LCB1cmwsIChlcnI6IEVycm9yLCByZXN1bHQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBsb2FkOiAoZmlsZW5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxvYWRlci5mcy5yZWFkRmlsZShmaWxlbmFtZSwgKGVycjogRXJyb3IsIGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZShjb250ZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHBvc3Rjc3NVcmwoe1xuICAgICAgICBmaWx0ZXI6ICh7IHVybCB9OiBQb3N0Y3NzVXJsQXNzZXQpID0+IHVybC5zdGFydHNXaXRoKCd+JyksXG4gICAgICAgIHVybDogKHsgdXJsIH06IFBvc3Rjc3NVcmxBc3NldCkgPT4ge1xuICAgICAgICAgIC8vIE5vdGU6IFRoaXMgd2lsbCBvbmx5IGZpbmQgdGhlIGZpcnN0IG5vZGVfbW9kdWxlcyBmb2xkZXIuXG4gICAgICAgICAgY29uc3Qgbm9kZU1vZHVsZXMgPSBmaW5kVXAoJ25vZGVfbW9kdWxlcycsIHByb2plY3RSb290KTtcbiAgICAgICAgICBpZiAoIW5vZGVNb2R1bGVzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBsb2NhdGUgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeS4nKVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihub2RlTW9kdWxlcywgdXJsLnN1YnN0cigxKSk7XG4gICAgICAgICAgcmV0dXJuIHBhdGgucmVsYXRpdmUobG9hZGVyLmNvbnRleHQsIGZ1bGxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgcG9zdGNzc1VybChbXG4gICAgICAgIHtcbiAgICAgICAgICAvLyBPbmx5IGNvbnZlcnQgcm9vdCByZWxhdGl2ZSBVUkxzLCB3aGljaCBDU1MtTG9hZGVyIHdvbid0IHByb2Nlc3MgaW50byByZXF1aXJlKCkuXG4gICAgICAgICAgZmlsdGVyOiAoeyB1cmwgfTogUG9zdGNzc1VybEFzc2V0KSA9PiB1cmwuc3RhcnRzV2l0aCgnLycpICYmICF1cmwuc3RhcnRzV2l0aCgnLy8nKSxcbiAgICAgICAgICB1cmw6ICh7IHVybCB9OiBQb3N0Y3NzVXJsQXNzZXQpID0+IHtcbiAgICAgICAgICAgIGlmIChkZXBsb3lVcmwubWF0Y2goLzpcXC9cXC8vKSB8fCBkZXBsb3lVcmwuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICAgICAgICAgIC8vIElmIGRlcGxveVVybCBpcyBhYnNvbHV0ZSBvciByb290IHJlbGF0aXZlLCBpZ25vcmUgYmFzZUhyZWYgJiB1c2UgZGVwbG95VXJsIGFzIGlzLlxuICAgICAgICAgICAgICByZXR1cm4gYCR7ZGVwbG95VXJsLnJlcGxhY2UoL1xcLyQvLCAnJyl9JHt1cmx9YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmFzZUhyZWYubWF0Y2goLzpcXC9cXC8vKSkge1xuICAgICAgICAgICAgICAvLyBJZiBiYXNlSHJlZiBjb250YWlucyBhIHNjaGVtZSwgaW5jbHVkZSBpdCBhcyBpcy5cbiAgICAgICAgICAgICAgcmV0dXJuIGJhc2VIcmVmLnJlcGxhY2UoL1xcLyQvLCAnJykgK1xuICAgICAgICAgICAgICAgIGAvJHtkZXBsb3lVcmx9LyR7dXJsfWAucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gSm9pbiB0b2dldGhlciBiYXNlLWhyZWYsIGRlcGxveS11cmwgYW5kIHRoZSBvcmlnaW5hbCBVUkwuXG4gICAgICAgICAgICAgIC8vIEFsc28gZGVkdXBlIG11bHRpcGxlIHNsYXNoZXMgaW50byBzaW5nbGUgb25lcy5cbiAgICAgICAgICAgICAgcmV0dXJuIGAvJHtiYXNlSHJlZn0vJHtkZXBsb3lVcmx9LyR7dXJsfWAucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIC8vIFRPRE86IGlubGluZSAuY3VyIGlmIG5vdCBzdXBwb3J0aW5nIElFICh1c2UgYnJvd3NlcnNsaXN0IHRvIGNoZWNrKVxuICAgICAgICAgIGZpbHRlcjogKGFzc2V0OiBQb3N0Y3NzVXJsQXNzZXQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBtYXhpbXVtSW5saW5lU2l6ZSA+IDAgJiYgIWFzc2V0Lmhhc2ggJiYgIWFzc2V0LmFic29sdXRlUGF0aC5lbmRzV2l0aCgnLmN1cicpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdXJsOiAnaW5saW5lJyxcbiAgICAgICAgICAvLyBOT1RFOiBtYXhTaXplIGlzIGluIEtCXG4gICAgICAgICAgbWF4U2l6ZTogbWF4aW11bUlubGluZVNpemUsXG4gICAgICAgICAgZmFsbGJhY2s6ICdyZWJhc2UnLFxuICAgICAgICB9LFxuICAgICAgICB7IHVybDogJ3JlYmFzZScgfSxcbiAgICAgIF0pLFxuICAgICAgUG9zdGNzc0NsaVJlc291cmNlcyh7XG4gICAgICAgIGRlcGxveVVybDogbG9hZGVyLmxvYWRlcnNbbG9hZGVyLmxvYWRlckluZGV4XS5vcHRpb25zLmlkZW50ID09ICdleHRyYWN0ZWQnID8gJycgOiBkZXBsb3lVcmwsXG4gICAgICAgIGxvYWRlcixcbiAgICAgICAgZmlsZW5hbWU6IGBbbmFtZV0ke2hhc2hGb3JtYXQuZmlsZX0uW2V4dF1gLFxuICAgICAgfSksXG4gICAgICBhdXRvcHJlZml4ZXIoeyBncmlkOiB0cnVlIH0pLFxuICAgIF07XG4gIH07XG5cbiAgLy8gdXNlIGluY2x1ZGVQYXRocyBmcm9tIGFwcENvbmZpZ1xuICBjb25zdCBpbmNsdWRlUGF0aHM6IHN0cmluZ1tdID0gW107XG4gIGxldCBsZXNzUGF0aE9wdGlvbnM6IHsgcGF0aHM6IHN0cmluZ1tdIH0gPSB7IHBhdGhzOiBbXSB9O1xuXG4gIGlmIChhcHBDb25maWcuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zXG4gICAgJiYgYXBwQ29uZmlnLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHNcbiAgICAmJiBhcHBDb25maWcuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocy5sZW5ndGggPiAwXG4gICkge1xuICAgIGFwcENvbmZpZy5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMuaW5jbHVkZVBhdGhzLmZvckVhY2goKGluY2x1ZGVQYXRoOiBzdHJpbmcpID0+XG4gICAgICBpbmNsdWRlUGF0aHMucHVzaChwYXRoLnJlc29sdmUoYXBwUm9vdCwgaW5jbHVkZVBhdGgpKSk7XG4gICAgbGVzc1BhdGhPcHRpb25zID0ge1xuICAgICAgcGF0aHM6IGluY2x1ZGVQYXRocyxcbiAgICB9O1xuICB9XG5cbiAgLy8gcHJvY2VzcyBnbG9iYWwgc3R5bGVzXG4gIGlmIChhcHBDb25maWcuc3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBnbG9iYWxTdHlsZXMgPSBleHRyYUVudHJ5UGFyc2VyKGFwcENvbmZpZy5zdHlsZXMsIGFwcFJvb3QsICdzdHlsZXMnKTtcbiAgICAvLyBhZGQgc3R5bGUgZW50cnkgcG9pbnRzXG4gICAgZ2xvYmFsU3R5bGVzLmZvckVhY2goc3R5bGUgPT5cbiAgICAgIGVudHJ5UG9pbnRzW3N0eWxlLmVudHJ5IGFzIGFueV1cbiAgICAgICAgPyBlbnRyeVBvaW50c1tzdHlsZS5lbnRyeSBhcyBhbnldLnB1c2goc3R5bGUucGF0aCBhcyBzdHJpbmcpXG4gICAgICAgIDogZW50cnlQb2ludHNbc3R5bGUuZW50cnkgYXMgYW55XSA9IFtzdHlsZS5wYXRoIGFzIGFueV1cbiAgICApO1xuICAgIC8vIGFkZCBnbG9iYWwgY3NzIHBhdGhzXG4gICAgZ2xvYmFsU3R5bGVQYXRocy5wdXNoKC4uLmdsb2JhbFN0eWxlcy5tYXAoKHN0eWxlKSA9PiBzdHlsZS5wYXRoIGFzIGFueSkpO1xuICB9XG5cbiAgLy8gc2V0IGJhc2UgcnVsZXMgdG8gZGVyaXZlIGZpbmFsIHJ1bGVzIGZyb21cbiAgY29uc3QgYmFzZVJ1bGVzOiB3ZWJwYWNrLk5ld1VzZVJ1bGVbXSA9IFtcbiAgICB7IHRlc3Q6IC9cXC5jc3MkLywgdXNlOiBbXSB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5zY3NzJHxcXC5zYXNzJC8sIHVzZTogW3tcbiAgICAgICAgbG9hZGVyOiAnc2Fzcy1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgc291cmNlTWFwOiBjc3NTb3VyY2VNYXAsXG4gICAgICAgICAgLy8gYm9vdHN0cmFwLXNhc3MgcmVxdWlyZXMgYSBtaW5pbXVtIHByZWNpc2lvbiBvZiA4XG4gICAgICAgICAgcHJlY2lzaW9uOiA4LFxuICAgICAgICAgIGluY2x1ZGVQYXRoc1xuICAgICAgICB9XG4gICAgICB9XVxuICAgIH0sXG4gICAge1xuICAgICAgdGVzdDogL1xcLmxlc3MkLywgdXNlOiBbe1xuICAgICAgICBsb2FkZXI6ICdsZXNzLWxvYWRlcicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBzb3VyY2VNYXA6IGNzc1NvdXJjZU1hcCxcbiAgICAgICAgICAuLi5sZXNzUGF0aE9wdGlvbnMsXG4gICAgICAgIH1cbiAgICAgIH1dXG4gICAgfSxcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwuc3R5bCQvLCB1c2U6IFt7XG4gICAgICAgIGxvYWRlcjogJ3N0eWx1cy1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgc291cmNlTWFwOiBjc3NTb3VyY2VNYXAsXG4gICAgICAgICAgcGF0aHM6IGluY2x1ZGVQYXRoc1xuICAgICAgICB9XG4gICAgICB9XVxuICAgIH1cbiAgXTtcblxuICAvLyBsb2FkIGNvbXBvbmVudCBjc3MgYXMgcmF3IHN0cmluZ3NcbiAgY29uc3QgcnVsZXM6IHdlYnBhY2suUnVsZVtdID0gYmFzZVJ1bGVzLm1hcCgoeyB0ZXN0LCB1c2UgfSkgPT4gKHtcbiAgICBleGNsdWRlOiBnbG9iYWxTdHlsZVBhdGhzLCB0ZXN0LCB1c2U6IFtcbiAgICAgIHsgbG9hZGVyOiAncmF3LWxvYWRlcicgfSxcbiAgICAgIHtcbiAgICAgICAgbG9hZGVyOiAncG9zdGNzcy1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgaWRlbnQ6ICdlbWJlZGRlZCcsXG4gICAgICAgICAgcGx1Z2luczogcG9zdGNzc1BsdWdpbkNyZWF0b3IsXG4gICAgICAgICAgc291cmNlTWFwOiBjc3NTb3VyY2VNYXBcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC4uLih1c2UgYXMgd2VicGFjay5Mb2FkZXJbXSlcbiAgICBdXG4gIH0pKTtcblxuICAvLyBsb2FkIGdsb2JhbCBjc3MgYXMgY3NzIGZpbGVzXG4gIGlmIChnbG9iYWxTdHlsZVBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICBydWxlcy5wdXNoKC4uLmJhc2VSdWxlcy5tYXAoKHsgdGVzdCwgdXNlIH0pID0+IHtcbiAgICAgIGNvbnN0IGV4dHJhY3RUZXh0UGx1Z2luID0ge1xuICAgICAgICB1c2U6IFtcbiAgICAgICAgICB7IGxvYWRlcjogUmF3Q3NzTG9hZGVyIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgbG9hZGVyOiAncG9zdGNzcy1sb2FkZXInLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBpZGVudDogYnVpbGRPcHRpb25zLmV4dHJhY3RDc3MgPyAnZXh0cmFjdGVkJyA6ICdlbWJlZGRlZCcsXG4gICAgICAgICAgICAgIHBsdWdpbnM6IHBvc3Rjc3NQbHVnaW5DcmVhdG9yLFxuICAgICAgICAgICAgICBzb3VyY2VNYXA6IGNzc1NvdXJjZU1hcFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgLi4uKHVzZSBhcyB3ZWJwYWNrLkxvYWRlcltdKVxuICAgICAgICBdLFxuICAgICAgICAvLyBwdWJsaWNQYXRoIG5lZWRlZCBhcyBhIHdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvaXNzdWVzLzQwMzVcbiAgICAgICAgcHVibGljUGF0aDogJydcbiAgICAgIH07XG4gICAgICBjb25zdCByZXQ6IGFueSA9IHtcbiAgICAgICAgaW5jbHVkZTogZ2xvYmFsU3R5bGVQYXRocyxcbiAgICAgICAgdGVzdCxcbiAgICAgICAgdXNlOiBbXG4gICAgICAgICAgYnVpbGRPcHRpb25zLmV4dHJhY3RDc3MgPyBNaW5pQ3NzRXh0cmFjdFBsdWdpbi5sb2FkZXIgOiAnc3R5bGUtbG9hZGVyJyxcbiAgICAgICAgICAuLi5leHRyYWN0VGV4dFBsdWdpbi51c2UsXG4gICAgICAgIF1cbiAgICAgIH07XG4gICAgICAvLyBTYXZlIHRoZSBvcmlnaW5hbCBvcHRpb25zIGFzIGFyZ3VtZW50cyBmb3IgZWplY3QuXG4gICAgICAvLyBpZiAoYnVpbGRPcHRpb25zLmV4dHJhY3RDc3MpIHtcbiAgICAgIC8vICAgcmV0W3BsdWdpbkFyZ3NdID0gZXh0cmFjdFRleHRQbHVnaW47XG4gICAgICAvLyB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChidWlsZE9wdGlvbnMuZXh0cmFjdENzcykge1xuICAgIC8vIGV4dHJhY3QgZ2xvYmFsIGNzcyBmcm9tIGpzIGZpbGVzIGludG8gb3duIGNzcyBmaWxlXG4gICAgZXh0cmFQbHVnaW5zLnB1c2goXG4gICAgICBuZXcgTWluaUNzc0V4dHJhY3RQbHVnaW4oeyBmaWxlbmFtZTogYFtuYW1lXSR7aGFzaEZvcm1hdC5zY3JpcHR9LmNzc2AgfSkpO1xuICAgIC8vIHN1cHByZXNzIGVtcHR5IC5qcyBmaWxlcyBpbiBjc3Mgb25seSBlbnRyeSBwb2ludHNcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgU3VwcHJlc3NFeHRyYWN0ZWRUZXh0Q2h1bmtzV2VicGFja1BsdWdpbigpKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgLy8gV29ya2Fyb3VuZCBzdHlsdXMtbG9hZGVyIGRlZmVjdDogaHR0cHM6Ly9naXRodWIuY29tL3NoYW1hL3N0eWx1cy1sb2FkZXIvaXNzdWVzLzE4OVxuICAgIGxvYWRlcjogeyBzdHlsdXM6IHt9IH0sXG4gICAgZW50cnk6IGVudHJ5UG9pbnRzLFxuICAgIG1vZHVsZTogeyBydWxlcyB9LFxuICAgIHBsdWdpbnM6IFtdLmNvbmNhdChleHRyYVBsdWdpbnMgYXMgYW55KVxuICB9O1xufVxuIl19