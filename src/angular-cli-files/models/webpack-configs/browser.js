"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');
const license_webpack_plugin_1 = require("license-webpack-plugin");
const package_chunk_sort_1 = require("../../utilities/package-chunk-sort");
const base_href_webpack_1 = require("../../lib/base-href-webpack");
const index_html_webpack_plugin_1 = require("../../plugins/index-html-webpack-plugin");
const utils_1 = require("./utils");
/**
+ * license-webpack-plugin has a peer dependency on webpack-sources, list it in a comment to
+ * let the dependency validator know it is used.
+ *
+ * require('webpack-sources')
+ */
function getBrowserConfig(wco) {
    const { root, projectRoot, buildOptions, appConfig } = wco;
    let extraPlugins = [];
    // figure out which are the lazy loaded entry points
    const lazyChunks = utils_1.lazyChunksFilter([
        ...utils_1.extraEntryParser(appConfig.scripts, root, 'scripts'),
        ...utils_1.extraEntryParser(appConfig.styles, root, 'styles')
    ]);
    // TODO: Enable this once HtmlWebpackPlugin supports Webpack 4
    const generateIndexHtml = false;
    if (generateIndexHtml) {
        extraPlugins.push(new HtmlWebpackPlugin({
            template: path.resolve(root, appConfig.index),
            filename: path.resolve(buildOptions.outputPath, appConfig.index),
            chunksSortMode: package_chunk_sort_1.packageChunkSort(appConfig),
            excludeChunks: lazyChunks,
            xhtml: true,
            minify: buildOptions.optimizationLevel === 1 ? {
                caseSensitive: true,
                collapseWhitespace: true,
                keepClosingSlash: true
            } : false
        }));
        extraPlugins.push(new base_href_webpack_1.BaseHrefWebpackPlugin({
            baseHref: buildOptions.baseHref
        }));
    }
    if (buildOptions.sourceMap) {
        // TODO: see if this is still needed with webpack 4 'mode'.
        // See https://webpack.js.org/configuration/devtool/ for sourcemap types.
        if (buildOptions.evalSourceMap && buildOptions.optimizationLevel === 0) {
            // Produce eval sourcemaps for development with serve, which are faster.
            extraPlugins.push(new webpack.EvalSourceMapDevToolPlugin({
                moduleFilenameTemplate: '[resource-path]',
                sourceRoot: 'webpack:///'
            }));
        }
        else {
            // Produce full separate sourcemaps for production.
            extraPlugins.push(new webpack.SourceMapDevToolPlugin({
                filename: '[file].map[query]',
                moduleFilenameTemplate: '[resource-path]',
                fallbackModuleFilenameTemplate: '[resource-path]?[hash]',
                sourceRoot: 'webpack:///'
            }));
        }
    }
    if (buildOptions.subresourceIntegrity) {
        extraPlugins.push(new SubresourceIntegrityPlugin({
            hashFuncNames: ['sha384']
        }));
    }
    if (buildOptions.extractLicenses) {
        extraPlugins.push(new license_webpack_plugin_1.LicenseWebpackPlugin({
            pattern: /.*/,
            suppressErrors: true,
            perChunkOutput: false,
            outputFilename: `3rdpartylicenses.txt`
        }));
    }
    const globalStylesEntries = utils_1.extraEntryParser(appConfig.styles, root, 'styles')
        .map(style => style.entry);
    return {
        resolve: {
            mainFields: [
                ...(wco.supportES2015 ? ['es2015'] : []),
                'browser', 'module', 'main'
            ]
        },
        output: {
            crossOriginLoading: buildOptions.subresourceIntegrity ? 'anonymous' : false
        },
        optimization: {
            runtimeChunk: 'single',
            splitChunks: {
                chunks: buildOptions.commonChunk ? 'all' : 'initial',
                cacheGroups: {
                    vendors: false,
                    vendor: buildOptions.vendorChunk && {
                        name: 'vendor',
                        chunks: 'initial',
                        test: (module, chunks) => {
                            const moduleName = module.nameForCondition ? module.nameForCondition() : '';
                            return /[\\/]node_modules[\\/]/.test(moduleName)
                                && !chunks.some(({ name }) => name === 'polyfills'
                                    || globalStylesEntries.includes(name));
                        },
                    },
                }
            }
        },
        plugins: extraPlugins.concat([
            new index_html_webpack_plugin_1.IndexHtmlWebpackPlugin({
                input: path.resolve(root, appConfig.index),
                output: path.relative(projectRoot, path.resolve(root, appConfig.index)),
                baseHref: buildOptions.baseHref,
                entrypoints: package_chunk_sort_1.generateEntryPoints(appConfig),
                deployUrl: buildOptions.deployUrl,
            }),
        ]),
        node: false,
    };
}
exports.getBrowserConfig = getBrowserConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfd2VicGFjay9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQkFBaUI7QUFDakIsK0RBQStEOztBQUUvRCxtQ0FBbUM7QUFDbkMsNkJBQTZCO0FBQzdCLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDekQsTUFBTSwwQkFBMEIsR0FBRyxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQztBQUM1RSxtRUFBOEQ7QUFDOUQsMkVBQTJGO0FBQzNGLG1FQUFvRTtBQUNwRSx1RkFBaUY7QUFDakYsbUNBQTZEO0FBRzdEOzs7OztJQUtJO0FBRUosMEJBQWlDLEdBQXlCO0lBQ3hELE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFHM0QsSUFBSSxZQUFZLEdBQVUsRUFBRSxDQUFDO0lBRTdCLG9EQUFvRDtJQUNwRCxNQUFNLFVBQVUsR0FBRyx3QkFBZ0IsQ0FBQztRQUNsQyxHQUFHLHdCQUFnQixDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQztRQUN2RCxHQUFHLHdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQztLQUN0RCxDQUFDLENBQUM7SUFFSCw4REFBOEQ7SUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7SUFDaEMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBaUIsQ0FBQztZQUN0QyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUs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LENBQUM7UUFDRixJQUFJLEVBQUUsS0FBSztLQUNaLENBQUM7QUFDSixDQUFDO0FBOUdELDRDQThHQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXG4vLyBUT0RPOiBjbGVhbnVwIHRoaXMgZmlsZSwgaXQncyBjb3BpZWQgYXMgaXMgZnJvbSBBbmd1bGFyIENMSS5cblxuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBIdG1sV2VicGFja1BsdWdpbiA9IHJlcXVpcmUoJ2h0bWwtd2VicGFjay1wbHVnaW4nKTtcbmNvbnN0IFN1YnJlc291cmNlSW50ZWdyaXR5UGx1Z2luID0gcmVxdWlyZSgnd2VicGFjay1zdWJyZXNvdXJjZS1pbnRlZ3JpdHknKTtcbmltcG9ydCB7IExpY2Vuc2VXZWJwYWNrUGx1Z2luIH0gZnJvbSAnbGljZW5zZS13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBnZW5lcmF0ZUVudHJ5UG9pbnRzLCBwYWNrYWdlQ2h1bmtTb3J0IH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtY2h1bmstc29ydCc7XG5pbXBvcnQgeyBCYXNlSHJlZldlYnBhY2tQbHVnaW4gfSBmcm9tICcuLi8uLi9saWIvYmFzZS1ocmVmLXdlYnBhY2snO1xuaW1wb3J0IHsgSW5kZXhIdG1sV2VicGFja1BsdWdpbiB9IGZyb20gJy4uLy4uL3BsdWdpbnMvaW5kZXgtaHRtbC13ZWJwYWNrLXBsdWdpbic7XG5pbXBvcnQgeyBleHRyYUVudHJ5UGFyc2VyLCBsYXp5Q2h1bmtzRmlsdGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBXZWJwYWNrQ29uZmlnT3B0aW9ucyB9IGZyb20gJy4uL2J1aWxkLW9wdGlvbnMnO1xuXG4vKipcbisgKiBsaWNlbnNlLXdlYnBhY2stcGx1Z2luIGhhcyBhIHBlZXIgZGVwZW5kZW5jeSBvbiB3ZWJwYWNrLXNvdXJjZXMsIGxpc3QgaXQgaW4gYSBjb21tZW50IHRvXG4rICogbGV0IHRoZSBkZXBlbmRlbmN5IHZhbGlkYXRvciBrbm93IGl0IGlzIHVzZWQuXG4rICpcbisgKiByZXF1aXJlKCd3ZWJwYWNrLXNvdXJjZXMnKVxuKyAqL1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QnJvd3NlckNvbmZpZyh3Y286IFdlYnBhY2tDb25maWdPcHRpb25zKSB7XG4gIGNvbnN0IHsgcm9vdCwgcHJvamVjdFJvb3QsIGJ1aWxkT3B0aW9ucywgYXBwQ29uZmlnIH0gPSB3Y287XG5cblxuICBsZXQgZXh0cmFQbHVnaW5zOiBhbnlbXSA9IFtdO1xuXG4gIC8vIGZpZ3VyZSBvdXQgd2hpY2ggYXJlIHRoZSBsYXp5IGxvYWRlZCBlbnRyeSBwb2ludHNcbiAgY29uc3QgbGF6eUNodW5rcyA9IGxhenlDaHVua3NGaWx0ZXIoW1xuICAgIC4uLmV4dHJhRW50cnlQYXJzZXIoYXBwQ29uZmlnLnNjcmlwdHMsIHJvb3QsICdzY3JpcHRzJyksXG4gICAgLi4uZXh0cmFFbnRyeVBhcnNlcihhcHBDb25maWcuc3R5bGVzLCByb290LCAnc3R5bGVzJylcbiAgXSk7XG5cbiAgLy8gVE9ETzogRW5hYmxlIHRoaXMgb25jZSBIdG1sV2VicGFja1BsdWdpbiBzdXBwb3J0cyBXZWJwYWNrIDRcbiAgY29uc3QgZ2VuZXJhdGVJbmRleEh0bWwgPSBmYWxzZTtcbiAgaWYgKGdlbmVyYXRlSW5kZXhIdG1sKSB7XG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IEh0bWxXZWJwYWNrUGx1Z2luKHtcbiAgICAgIHRlbXBsYXRlOiBwYXRoLnJlc29sdmUocm9vdCwgYXBwQ29uZmlnLmluZGV4KSxcbiAgICAgIGZpbGVuYW1lOiBwYXRoLnJlc29sdmUoYnVpbGRPcHRpb25zLm91dHB1dFBhdGgsIGFwcENvbmZpZy5pbmRleCksXG4gICAgICBjaHVua3NTb3J0TW9kZTogcGFja2FnZUNodW5rU29ydChhcHBDb25maWcpLFxuICAgICAgZXhjbHVkZUNodW5rczogbGF6eUNodW5rcyxcbiAgICAgIHhodG1sOiB0cnVlLFxuICAgICAgbWluaWZ5OiBidWlsZE9wdGlvbnMub3B0aW1pemF0aW9uTGV2ZWwgPT09IDEgPyB7XG4gICAgICAgIGNhc2VTZW5zaXRpdmU6IHRydWUsXG4gICAgICAgIGNvbGxhcHNlV2hpdGVzcGFjZTogdHJ1ZSxcbiAgICAgICAga2VlcENsb3NpbmdTbGFzaDogdHJ1ZVxuICAgICAgfSA6IGZhbHNlXG4gICAgfSkpO1xuICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyBCYXNlSHJlZldlYnBhY2tQbHVnaW4oe1xuICAgICAgYmFzZUhyZWY6IGJ1aWxkT3B0aW9ucy5iYXNlSHJlZiBhcyBzdHJpbmdcbiAgICB9KSk7XG4gIH1cblxuICBpZiAoYnVpbGRPcHRpb25zLnNvdXJjZU1hcCkge1xuICAgIC8vIFRPRE86IHNlZSBpZiB0aGlzIGlzIHN0aWxsIG5lZWRlZCB3aXRoIHdlYnBhY2sgNCAnbW9kZScuXG4gICAgLy8gU2VlIGh0dHBzOi8vd2VicGFjay5qcy5vcmcvY29uZmlndXJhdGlvbi9kZXZ0b29sLyBmb3Igc291cmNlbWFwIHR5cGVzLlxuICAgIGlmIChidWlsZE9wdGlvbnMuZXZhbFNvdXJjZU1hcCAmJiBidWlsZE9wdGlvbnMub3B0aW1pemF0aW9uTGV2ZWwgPT09IDApIHtcbiAgICAgIC8vIFByb2R1Y2UgZXZhbCBzb3VyY2VtYXBzIGZvciBkZXZlbG9wbWVudCB3aXRoIHNlcnZlLCB3aGljaCBhcmUgZmFzdGVyLlxuICAgICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IHdlYnBhY2suRXZhbFNvdXJjZU1hcERldlRvb2xQbHVnaW4oe1xuICAgICAgICBtb2R1bGVGaWxlbmFtZVRlbXBsYXRlOiAnW3Jlc291cmNlLXBhdGhdJyxcbiAgICAgICAgc291cmNlUm9vdDogJ3dlYnBhY2s6Ly8vJ1xuICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQcm9kdWNlIGZ1bGwgc2VwYXJhdGUgc291cmNlbWFwcyBmb3IgcHJvZHVjdGlvbi5cbiAgICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyB3ZWJwYWNrLlNvdXJjZU1hcERldlRvb2xQbHVnaW4oe1xuICAgICAgICBmaWxlbmFtZTogJ1tmaWxlXS5tYXBbcXVlcnldJyxcbiAgICAgICAgbW9kdWxlRmlsZW5hbWVUZW1wbGF0ZTogJ1tyZXNvdXJjZS1wYXRoXScsXG4gICAgICAgIGZhbGxiYWNrTW9kdWxlRmlsZW5hbWVUZW1wbGF0ZTogJ1tyZXNvdXJjZS1wYXRoXT9baGFzaF0nLFxuICAgICAgICBzb3VyY2VSb290OiAnd2VicGFjazovLy8nXG4gICAgICB9KSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5zdWJyZXNvdXJjZUludGVncml0eSkge1xuICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyBTdWJyZXNvdXJjZUludGVncml0eVBsdWdpbih7XG4gICAgICBoYXNoRnVuY05hbWVzOiBbJ3NoYTM4NCddXG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5leHRyYWN0TGljZW5zZXMpIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgTGljZW5zZVdlYnBhY2tQbHVnaW4oe1xuICAgICAgcGF0dGVybjogLy4qLyxcbiAgICAgIHN1cHByZXNzRXJyb3JzOiB0cnVlLFxuICAgICAgcGVyQ2h1bmtPdXRwdXQ6IGZhbHNlLFxuICAgICAgb3V0cHV0RmlsZW5hbWU6IGAzcmRwYXJ0eWxpY2Vuc2VzLnR4dGBcbiAgICB9KSk7XG4gIH1cblxuICBjb25zdCBnbG9iYWxTdHlsZXNFbnRyaWVzID0gZXh0cmFFbnRyeVBhcnNlcihhcHBDb25maWcuc3R5bGVzLCByb290LCAnc3R5bGVzJylcbiAgICAubWFwKHN0eWxlID0+IHN0eWxlLmVudHJ5KTtcblxuICByZXR1cm4ge1xuICAgIHJlc29sdmU6IHtcbiAgICAgIG1haW5GaWVsZHM6IFtcbiAgICAgICAgLi4uKHdjby5zdXBwb3J0RVMyMDE1ID8gWydlczIwMTUnXSA6IFtdKSxcbiAgICAgICAgJ2Jyb3dzZXInLCAnbW9kdWxlJywgJ21haW4nXG4gICAgICBdXG4gICAgfSxcbiAgICBvdXRwdXQ6IHtcbiAgICAgIGNyb3NzT3JpZ2luTG9hZGluZzogYnVpbGRPcHRpb25zLnN1YnJlc291cmNlSW50ZWdyaXR5ID8gJ2Fub255bW91cycgOiBmYWxzZVxuICAgIH0sXG4gICAgb3B0aW1pemF0aW9uOiB7XG4gICAgICBydW50aW1lQ2h1bms6ICdzaW5nbGUnLFxuICAgICAgc3BsaXRDaHVua3M6IHtcbiAgICAgICAgY2h1bmtzOiBidWlsZE9wdGlvbnMuY29tbW9uQ2h1bmsgPyAnYWxsJyA6ICdpbml0aWFsJyxcbiAgICAgICAgY2FjaGVHcm91cHM6IHtcbiAgICAgICAgICB2ZW5kb3JzOiBmYWxzZSxcbiAgICAgICAgICB2ZW5kb3I6IGJ1aWxkT3B0aW9ucy52ZW5kb3JDaHVuayAmJiB7XG4gICAgICAgICAgICBuYW1lOiAndmVuZG9yJyxcbiAgICAgICAgICAgIGNodW5rczogJ2luaXRpYWwnLFxuICAgICAgICAgICAgdGVzdDogKG1vZHVsZTogYW55LCBjaHVua3M6IEFycmF5PHsgbmFtZTogc3RyaW5nIH0+KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBtb2R1bGUubmFtZUZvckNvbmRpdGlvbiA/IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uKCkgOiAnJztcbiAgICAgICAgICAgICAgcmV0dXJuIC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXS8udGVzdChtb2R1bGVOYW1lKVxuICAgICAgICAgICAgICAgICYmICFjaHVua3Muc29tZSgoeyBuYW1lIH0pID0+IG5hbWUgPT09ICdwb2x5ZmlsbHMnXG4gICAgICAgICAgICAgICAgICB8fCBnbG9iYWxTdHlsZXNFbnRyaWVzLmluY2x1ZGVzKG5hbWUpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgcGx1Z2luczogZXh0cmFQbHVnaW5zLmNvbmNhdChbXG4gICAgICBuZXcgSW5kZXhIdG1sV2VicGFja1BsdWdpbih7XG4gICAgICAgIGlucHV0OiBwYXRoLnJlc29sdmUocm9vdCwgYXBwQ29uZmlnLmluZGV4KSxcbiAgICAgICAgb3V0cHV0OiBwYXRoLnJlbGF0aXZlKHByb2plY3RSb290LCBwYXRoLnJlc29sdmUocm9vdCwgYXBwQ29uZmlnLmluZGV4KSksXG4gICAgICAgIGJhc2VIcmVmOiBidWlsZE9wdGlvbnMuYmFzZUhyZWYsXG4gICAgICAgIGVudHJ5cG9pbnRzOiBnZW5lcmF0ZUVudHJ5UG9pbnRzKGFwcENvbmZpZyksXG4gICAgICAgIGRlcGxveVVybDogYnVpbGRPcHRpb25zLmRlcGxveVVybCxcbiAgICAgIH0pLFxuICAgIF0pLFxuICAgIG5vZGU6IGZhbHNlLFxuICB9O1xufVxuIl19