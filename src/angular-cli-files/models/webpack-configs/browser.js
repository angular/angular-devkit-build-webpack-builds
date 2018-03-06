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
    const { projectRoot, buildOptions, appConfig } = wco;
    const appRoot = path.resolve(projectRoot, appConfig.root);
    let extraPlugins = [];
    // figure out which are the lazy loaded entry points
    const lazyChunks = utils_1.lazyChunksFilter([
        ...utils_1.extraEntryParser(appConfig.scripts, appRoot, 'scripts'),
        ...utils_1.extraEntryParser(appConfig.styles, appRoot, 'styles')
    ]);
    // TODO: Enable this once HtmlWebpackPlugin supports Webpack 4
    const generateIndexHtml = false;
    if (generateIndexHtml) {
        extraPlugins.push(new HtmlWebpackPlugin({
            template: path.resolve(appRoot, appConfig.index),
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
    const globalStylesEntries = utils_1.extraEntryParser(appConfig.styles, appRoot, 'styles')
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
                input: path.resolve(appRoot, appConfig.index),
                output: appConfig.index,
                baseHref: buildOptions.baseHref,
                entrypoints: package_chunk_sort_1.generateEntryPoints(appConfig),
                deployUrl: buildOptions.deployUrl,
            }),
        ]),
        node: false,
    };
}
exports.getBrowserConfig = getBrowserConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfd2VicGFjay9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQkFBaUI7QUFDakIsK0RBQStEOztBQUUvRCxtQ0FBbUM7QUFDbkMsNkJBQTZCO0FBQzdCLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDekQsTUFBTSwwQkFBMEIsR0FBRyxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQztBQUM1RSxtRUFBOEQ7QUFDOUQsMkVBQTJGO0FBQzNGLG1FQUFvRTtBQUNwRSx1RkFBaUY7QUFDakYsbUNBQTZEO0FBRzdEOzs7OztJQUtJO0FBRUosMEJBQWlDLEdBQXlCO0lBQ3hELE1BQU0sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxHQUFHLEdBQUcsQ0FBQztJQUVyRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFMUQsSUFBSSxZQUFZLEdBQVUsRUFBRSxDQUFDO0lBRTdCLG9EQUFvRDtJQUNwRCxNQUFNLFVBQVUsR0FBRyx3QkFBZ0IsQ0FBQztRQUNsQyxHQUFHLHdCQUFnQixDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQztRQUMxRCxHQUFHLHdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQztLQUN6RCxDQUFDLENBQUM7SUFFSCw4REFBOEQ7SUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7SUFDaEMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLFlBQVksQ0FBQyxJQUFJLENB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QztRQUNGLElBQUksRUFBRSxLQUFLO0tBQ1osQ0FBQztBQUNKLENBQUM7QUEvR0QsNENBK0dDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGVcbi8vIFRPRE86IGNsZWFudXAgdGhpcyBmaWxlLCBpdCdzIGNvcGllZCBhcyBpcyBmcm9tIEFuZ3VsYXIgQ0xJLlxuXG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IEh0bWxXZWJwYWNrUGx1Z2luID0gcmVxdWlyZSgnaHRtbC13ZWJwYWNrLXBsdWdpbicpO1xuY29uc3QgU3VicmVzb3VyY2VJbnRlZ3JpdHlQbHVnaW4gPSByZXF1aXJlKCd3ZWJwYWNrLXN1YnJlc291cmNlLWludGVncml0eScpO1xuaW1wb3J0IHsgTGljZW5zZVdlYnBhY2tQbHVnaW4gfSBmcm9tICdsaWNlbnNlLXdlYnBhY2stcGx1Z2luJztcbmltcG9ydCB7IGdlbmVyYXRlRW50cnlQb2ludHMsIHBhY2thZ2VDaHVua1NvcnQgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1jaHVuay1zb3J0JztcbmltcG9ydCB7IEJhc2VIcmVmV2VicGFja1BsdWdpbiB9IGZyb20gJy4uLy4uL2xpYi9iYXNlLWhyZWYtd2VicGFjayc7XG5pbXBvcnQgeyBJbmRleEh0bWxXZWJwYWNrUGx1Z2luIH0gZnJvbSAnLi4vLi4vcGx1Z2lucy9pbmRleC1odG1sLXdlYnBhY2stcGx1Z2luJztcbmltcG9ydCB7IGV4dHJhRW50cnlQYXJzZXIsIGxhenlDaHVua3NGaWx0ZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFdlYnBhY2tDb25maWdPcHRpb25zIH0gZnJvbSAnLi4vYnVpbGQtb3B0aW9ucyc7XG5cbi8qKlxuKyAqIGxpY2Vuc2Utd2VicGFjay1wbHVnaW4gaGFzIGEgcGVlciBkZXBlbmRlbmN5IG9uIHdlYnBhY2stc291cmNlcywgbGlzdCBpdCBpbiBhIGNvbW1lbnQgdG9cbisgKiBsZXQgdGhlIGRlcGVuZGVuY3kgdmFsaWRhdG9yIGtub3cgaXQgaXMgdXNlZC5cbisgKlxuKyAqIHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpXG4rICovXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRCcm93c2VyQ29uZmlnKHdjbzogV2VicGFja0NvbmZpZ09wdGlvbnMpIHtcbiAgY29uc3QgeyBwcm9qZWN0Um9vdCwgYnVpbGRPcHRpb25zLCBhcHBDb25maWcgfSA9IHdjbztcblxuICBjb25zdCBhcHBSb290ID0gcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCBhcHBDb25maWcucm9vdCk7XG5cbiAgbGV0IGV4dHJhUGx1Z2luczogYW55W10gPSBbXTtcblxuICAvLyBmaWd1cmUgb3V0IHdoaWNoIGFyZSB0aGUgbGF6eSBsb2FkZWQgZW50cnkgcG9pbnRzXG4gIGNvbnN0IGxhenlDaHVua3MgPSBsYXp5Q2h1bmtzRmlsdGVyKFtcbiAgICAuLi5leHRyYUVudHJ5UGFyc2VyKGFwcENvbmZpZy5zY3JpcHRzLCBhcHBSb290LCAnc2NyaXB0cycpLFxuICAgIC4uLmV4dHJhRW50cnlQYXJzZXIoYXBwQ29uZmlnLnN0eWxlcywgYXBwUm9vdCwgJ3N0eWxlcycpXG4gIF0pO1xuXG4gIC8vIFRPRE86IEVuYWJsZSB0aGlzIG9uY2UgSHRtbFdlYnBhY2tQbHVnaW4gc3VwcG9ydHMgV2VicGFjayA0XG4gIGNvbnN0IGdlbmVyYXRlSW5kZXhIdG1sID0gZmFsc2U7XG4gIGlmIChnZW5lcmF0ZUluZGV4SHRtbCkge1xuICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyBIdG1sV2VicGFja1BsdWdpbih7XG4gICAgICB0ZW1wbGF0ZTogcGF0aC5yZXNvbHZlKGFwcFJvb3QsIGFwcENvbmZpZy5pbmRleCksXG4gICAgICBmaWxlbmFtZTogcGF0aC5yZXNvbHZlKGJ1aWxkT3B0aW9ucy5vdXRwdXRQYXRoLCBhcHBDb25maWcuaW5kZXgpLFxuICAgICAgY2h1bmtzU29ydE1vZGU6IHBhY2thZ2VDaHVua1NvcnQoYXBwQ29uZmlnKSxcbiAgICAgIGV4Y2x1ZGVDaHVua3M6IGxhenlDaHVua3MsXG4gICAgICB4aHRtbDogdHJ1ZSxcbiAgICAgIG1pbmlmeTogYnVpbGRPcHRpb25zLm9wdGltaXphdGlvbkxldmVsID09PSAxID8ge1xuICAgICAgICBjYXNlU2Vuc2l0aXZlOiB0cnVlLFxuICAgICAgICBjb2xsYXBzZVdoaXRlc3BhY2U6IHRydWUsXG4gICAgICAgIGtlZXBDbG9zaW5nU2xhc2g6IHRydWVcbiAgICAgIH0gOiBmYWxzZVxuICAgIH0pKTtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgQmFzZUhyZWZXZWJwYWNrUGx1Z2luKHtcbiAgICAgIGJhc2VIcmVmOiBidWlsZE9wdGlvbnMuYmFzZUhyZWYgYXMgc3RyaW5nXG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKGJ1aWxkT3B0aW9ucy5zb3VyY2VNYXApIHtcbiAgICAvLyBUT0RPOiBzZWUgaWYgdGhpcyBpcyBzdGlsbCBuZWVkZWQgd2l0aCB3ZWJwYWNrIDQgJ21vZGUnLlxuICAgIC8vIFNlZSBodHRwczovL3dlYnBhY2suanMub3JnL2NvbmZpZ3VyYXRpb24vZGV2dG9vbC8gZm9yIHNvdXJjZW1hcCB0eXBlcy5cbiAgICBpZiAoYnVpbGRPcHRpb25zLmV2YWxTb3VyY2VNYXAgJiYgYnVpbGRPcHRpb25zLm9wdGltaXphdGlvbkxldmVsID09PSAwKSB7XG4gICAgICAvLyBQcm9kdWNlIGV2YWwgc291cmNlbWFwcyBmb3IgZGV2ZWxvcG1lbnQgd2l0aCBzZXJ2ZSwgd2hpY2ggYXJlIGZhc3Rlci5cbiAgICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyB3ZWJwYWNrLkV2YWxTb3VyY2VNYXBEZXZUb29sUGx1Z2luKHtcbiAgICAgICAgbW9kdWxlRmlsZW5hbWVUZW1wbGF0ZTogJ1tyZXNvdXJjZS1wYXRoXScsXG4gICAgICAgIHNvdXJjZVJvb3Q6ICd3ZWJwYWNrOi8vLydcbiAgICAgIH0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUHJvZHVjZSBmdWxsIHNlcGFyYXRlIHNvdXJjZW1hcHMgZm9yIHByb2R1Y3Rpb24uXG4gICAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgd2VicGFjay5Tb3VyY2VNYXBEZXZUb29sUGx1Z2luKHtcbiAgICAgICAgZmlsZW5hbWU6ICdbZmlsZV0ubWFwW3F1ZXJ5XScsXG4gICAgICAgIG1vZHVsZUZpbGVuYW1lVGVtcGxhdGU6ICdbcmVzb3VyY2UtcGF0aF0nLFxuICAgICAgICBmYWxsYmFja01vZHVsZUZpbGVuYW1lVGVtcGxhdGU6ICdbcmVzb3VyY2UtcGF0aF0/W2hhc2hdJyxcbiAgICAgICAgc291cmNlUm9vdDogJ3dlYnBhY2s6Ly8vJ1xuICAgICAgfSkpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChidWlsZE9wdGlvbnMuc3VicmVzb3VyY2VJbnRlZ3JpdHkpIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgU3VicmVzb3VyY2VJbnRlZ3JpdHlQbHVnaW4oe1xuICAgICAgaGFzaEZ1bmNOYW1lczogWydzaGEzODQnXVxuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChidWlsZE9wdGlvbnMuZXh0cmFjdExpY2Vuc2VzKSB7XG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IExpY2Vuc2VXZWJwYWNrUGx1Z2luKHtcbiAgICAgIHBhdHRlcm46IC8uKi8sXG4gICAgICBzdXBwcmVzc0Vycm9yczogdHJ1ZSxcbiAgICAgIHBlckNodW5rT3V0cHV0OiBmYWxzZSxcbiAgICAgIG91dHB1dEZpbGVuYW1lOiBgM3JkcGFydHlsaWNlbnNlcy50eHRgXG4gICAgfSkpO1xuICB9XG5cbiAgY29uc3QgZ2xvYmFsU3R5bGVzRW50cmllcyA9IGV4dHJhRW50cnlQYXJzZXIoYXBwQ29uZmlnLnN0eWxlcywgYXBwUm9vdCwgJ3N0eWxlcycpXG4gICAgLm1hcChzdHlsZSA9PiBzdHlsZS5lbnRyeSk7XG5cbiAgcmV0dXJuIHtcbiAgICByZXNvbHZlOiB7XG4gICAgICBtYWluRmllbGRzOiBbXG4gICAgICAgIC4uLih3Y28uc3VwcG9ydEVTMjAxNSA/IFsnZXMyMDE1J10gOiBbXSksXG4gICAgICAgICdicm93c2VyJywgJ21vZHVsZScsICdtYWluJ1xuICAgICAgXVxuICAgIH0sXG4gICAgb3V0cHV0OiB7XG4gICAgICBjcm9zc09yaWdpbkxvYWRpbmc6IGJ1aWxkT3B0aW9ucy5zdWJyZXNvdXJjZUludGVncml0eSA/ICdhbm9ueW1vdXMnIDogZmFsc2VcbiAgICB9LFxuICAgIG9wdGltaXphdGlvbjoge1xuICAgICAgcnVudGltZUNodW5rOiAnc2luZ2xlJyxcbiAgICAgIHNwbGl0Q2h1bmtzOiB7XG4gICAgICAgIGNodW5rczogYnVpbGRPcHRpb25zLmNvbW1vbkNodW5rID8gJ2FsbCcgOiAnaW5pdGlhbCcsXG4gICAgICAgIGNhY2hlR3JvdXBzOiB7XG4gICAgICAgICAgdmVuZG9yczogZmFsc2UsXG4gICAgICAgICAgdmVuZG9yOiBidWlsZE9wdGlvbnMudmVuZG9yQ2h1bmsgJiYge1xuICAgICAgICAgICAgbmFtZTogJ3ZlbmRvcicsXG4gICAgICAgICAgICBjaHVua3M6ICdpbml0aWFsJyxcbiAgICAgICAgICAgIHRlc3Q6IChtb2R1bGU6IGFueSwgY2h1bmtzOiBBcnJheTx7IG5hbWU6IHN0cmluZyB9PikgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24gPyBtb2R1bGUubmFtZUZvckNvbmRpdGlvbigpIDogJyc7XG4gICAgICAgICAgICAgIHJldHVybiAvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10vLnRlc3QobW9kdWxlTmFtZSlcbiAgICAgICAgICAgICAgICAmJiAhY2h1bmtzLnNvbWUoKHsgbmFtZSB9KSA9PiBuYW1lID09PSAncG9seWZpbGxzJ1xuICAgICAgICAgICAgICAgICAgfHwgZ2xvYmFsU3R5bGVzRW50cmllcy5pbmNsdWRlcyhuYW1lKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHBsdWdpbnM6IGV4dHJhUGx1Z2lucy5jb25jYXQoW1xuICAgICAgbmV3IEluZGV4SHRtbFdlYnBhY2tQbHVnaW4oe1xuICAgICAgICBpbnB1dDogcGF0aC5yZXNvbHZlKGFwcFJvb3QsIGFwcENvbmZpZy5pbmRleCksXG4gICAgICAgIG91dHB1dDogYXBwQ29uZmlnLmluZGV4LFxuICAgICAgICBiYXNlSHJlZjogYnVpbGRPcHRpb25zLmJhc2VIcmVmLFxuICAgICAgICBlbnRyeXBvaW50czogZ2VuZXJhdGVFbnRyeVBvaW50cyhhcHBDb25maWcpLFxuICAgICAgICBkZXBsb3lVcmw6IGJ1aWxkT3B0aW9ucy5kZXBsb3lVcmwsXG4gICAgICB9KSxcbiAgICBdKSxcbiAgICBub2RlOiBmYWxzZSxcbiAgfTtcbn1cbiJdfQ==