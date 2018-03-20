"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
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
    let sourcemaps = false;
    if (buildOptions.sourceMap) {
        // See https://webpack.js.org/configuration/devtool/ for sourcemap types.
        if (buildOptions.evalSourceMap && buildOptions.optimizationLevel === 0) {
            // Produce eval sourcemaps for development with serve, which are faster.
            sourcemaps = 'eval';
        }
        else {
            // Produce full separate sourcemaps for production.
            sourcemaps = 'source-map';
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
        devtool: sourcemaps,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfd2VicGFjay9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQkFBaUI7QUFDakIsK0RBQStEOztBQUUvRCw2QkFBNkI7QUFDN0IsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN6RCxNQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0FBQzVFLG1FQUE4RDtBQUM5RCwyRUFBMkY7QUFDM0YsbUVBQW9FO0FBQ3BFLHVGQUFpRjtBQUNqRixtQ0FBNkQ7QUFHN0Q7Ozs7O0lBS0k7QUFFSiwwQkFBaUMsR0FBeUI7SUFDeEQsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxHQUFHLEdBQUcsQ0FBQztJQUczRCxJQUFJLFlBQVksR0FBVSxFQUFFLENBQUM7SUFFN0Isb0RBQW9EO0lBQ3BELE1BQU0sVUFBVSxHQUFHLHdCQUFnQixDQUFDO1FBQ2xDLEdBQUcsd0JBQWdCLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO1FBQ3ZELEdBQUcsd0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDO0tBQ3RELENBQUMsQ0FBQztJQUVILDhEQUE4RDtJQUM5RCxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUNoQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDdEIsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLGlCQUFpQixDQUFDO1lBQ3RDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FB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LE1BQVcsRUFBRSxNQUErQixFQUFFLEVBQUU7NEJBQ3JELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs0QkFDNUUsTUFBTSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7bUNBQzNDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxXQUFXO3VDQUM3QyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDN0MsQ0FBQztxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxPQUFPLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQztZQUMzQixJQUFJLGtEQUFzQixDQUFDO2dCQUN6QixLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQztnQkFDMUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdkUsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO2dCQUMvQixXQUFXLEVBQUUsd0NBQW1CLENBQUMsU0FBUyxDQUFDO2dCQUMzQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVM7YUFDbEMsQ0FBQztTQUNILENBQUM7UUFDRixJQUFJLEVBQUUsS0FBSztLQUNaLENBQUM7QUFDSixDQUFDO0FBdkdELDRDQXVHQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXG4vLyBUT0RPOiBjbGVhbnVwIHRoaXMgZmlsZSwgaXQncyBjb3BpZWQgYXMgaXMgZnJvbSBBbmd1bGFyIENMSS5cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IEh0bWxXZWJwYWNrUGx1Z2luID0gcmVxdWlyZSgnaHRtbC13ZWJwYWNrLXBsdWdpbicpO1xuY29uc3QgU3VicmVzb3VyY2VJbnRlZ3JpdHlQbHVnaW4gPSByZXF1aXJlKCd3ZWJwYWNrLXN1YnJlc291cmNlLWludGVncml0eScpO1xuaW1wb3J0IHsgTGljZW5zZVdlYnBhY2tQbHVnaW4gfSBmcm9tICdsaWNlbnNlLXdlYnBhY2stcGx1Z2luJztcbmltcG9ydCB7IGdlbmVyYXRlRW50cnlQb2ludHMsIHBhY2thZ2VDaHVua1NvcnQgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1jaHVuay1zb3J0JztcbmltcG9ydCB7IEJhc2VIcmVmV2VicGFja1BsdWdpbiB9IGZyb20gJy4uLy4uL2xpYi9iYXNlLWhyZWYtd2VicGFjayc7XG5pbXBvcnQgeyBJbmRleEh0bWxXZWJwYWNrUGx1Z2luIH0gZnJvbSAnLi4vLi4vcGx1Z2lucy9pbmRleC1odG1sLXdlYnBhY2stcGx1Z2luJztcbmltcG9ydCB7IGV4dHJhRW50cnlQYXJzZXIsIGxhenlDaHVua3NGaWx0ZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFdlYnBhY2tDb25maWdPcHRpb25zIH0gZnJvbSAnLi4vYnVpbGQtb3B0aW9ucyc7XG5cbi8qKlxuKyAqIGxpY2Vuc2Utd2VicGFjay1wbHVnaW4gaGFzIGEgcGVlciBkZXBlbmRlbmN5IG9uIHdlYnBhY2stc291cmNlcywgbGlzdCBpdCBpbiBhIGNvbW1lbnQgdG9cbisgKiBsZXQgdGhlIGRlcGVuZGVuY3kgdmFsaWRhdG9yIGtub3cgaXQgaXMgdXNlZC5cbisgKlxuKyAqIHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpXG4rICovXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRCcm93c2VyQ29uZmlnKHdjbzogV2VicGFja0NvbmZpZ09wdGlvbnMpIHtcbiAgY29uc3QgeyByb290LCBwcm9qZWN0Um9vdCwgYnVpbGRPcHRpb25zLCBhcHBDb25maWcgfSA9IHdjbztcblxuXG4gIGxldCBleHRyYVBsdWdpbnM6IGFueVtdID0gW107XG5cbiAgLy8gZmlndXJlIG91dCB3aGljaCBhcmUgdGhlIGxhenkgbG9hZGVkIGVudHJ5IHBvaW50c1xuICBjb25zdCBsYXp5Q2h1bmtzID0gbGF6eUNodW5rc0ZpbHRlcihbXG4gICAgLi4uZXh0cmFFbnRyeVBhcnNlcihhcHBDb25maWcuc2NyaXB0cywgcm9vdCwgJ3NjcmlwdHMnKSxcbiAgICAuLi5leHRyYUVudHJ5UGFyc2VyKGFwcENvbmZpZy5zdHlsZXMsIHJvb3QsICdzdHlsZXMnKVxuICBdKTtcblxuICAvLyBUT0RPOiBFbmFibGUgdGhpcyBvbmNlIEh0bWxXZWJwYWNrUGx1Z2luIHN1cHBvcnRzIFdlYnBhY2sgNFxuICBjb25zdCBnZW5lcmF0ZUluZGV4SHRtbCA9IGZhbHNlO1xuICBpZiAoZ2VuZXJhdGVJbmRleEh0bWwpIHtcbiAgICBleHRyYVBsdWdpbnMucHVzaChuZXcgSHRtbFdlYnBhY2tQbHVnaW4oe1xuICAgICAgdGVtcGxhdGU6IHBhdGgucmVzb2x2ZShyb290LCBhcHBDb25maWcuaW5kZXgpLFxuICAgICAgZmlsZW5hbWU6IHBhdGgucmVzb2x2ZShidWlsZE9wdGlvbnMub3V0cHV0UGF0aCwgYXBwQ29uZmlnLmluZGV4KSxcbiAgICAgIGNodW5rc1NvcnRNb2RlOiBwYWNrYWdlQ2h1bmtTb3J0KGFwcENvbmZpZyksXG4gICAgICBleGNsdWRlQ2h1bmtzOiBsYXp5Q2h1bmtzLFxuICAgICAgeGh0bWw6IHRydWUsXG4gICAgICBtaW5pZnk6IGJ1aWxkT3B0aW9ucy5vcHRpbWl6YXRpb25MZXZlbCA9PT0gMSA/IHtcbiAgICAgICAgY2FzZVNlbnNpdGl2ZTogdHJ1ZSxcbiAgICAgICAgY29sbGFwc2VXaGl0ZXNwYWNlOiB0cnVlLFxuICAgICAgICBrZWVwQ2xvc2luZ1NsYXNoOiB0cnVlXG4gICAgICB9IDogZmFsc2VcbiAgICB9KSk7XG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IEJhc2VIcmVmV2VicGFja1BsdWdpbih7XG4gICAgICBiYXNlSHJlZjogYnVpbGRPcHRpb25zLmJhc2VIcmVmIGFzIHN0cmluZ1xuICAgIH0pKTtcbiAgfVxuXG4gIGxldCBzb3VyY2VtYXBzOiBzdHJpbmcgfCBmYWxzZSA9IGZhbHNlO1xuICBpZiAoYnVpbGRPcHRpb25zLnNvdXJjZU1hcCkge1xuICAgIC8vIFNlZSBodHRwczovL3dlYnBhY2suanMub3JnL2NvbmZpZ3VyYXRpb24vZGV2dG9vbC8gZm9yIHNvdXJjZW1hcCB0eXBlcy5cbiAgICBpZiAoYnVpbGRPcHRpb25zLmV2YWxTb3VyY2VNYXAgJiYgYnVpbGRPcHRpb25zLm9wdGltaXphdGlvbkxldmVsID09PSAwKSB7XG4gICAgICAvLyBQcm9kdWNlIGV2YWwgc291cmNlbWFwcyBmb3IgZGV2ZWxvcG1lbnQgd2l0aCBzZXJ2ZSwgd2hpY2ggYXJlIGZhc3Rlci5cbiAgICAgIHNvdXJjZW1hcHMgPSAnZXZhbCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFByb2R1Y2UgZnVsbCBzZXBhcmF0ZSBzb3VyY2VtYXBzIGZvciBwcm9kdWN0aW9uLlxuICAgICAgc291cmNlbWFwcyA9ICdzb3VyY2UtbWFwJztcbiAgICB9XG4gIH1cblxuICBpZiAoYnVpbGRPcHRpb25zLnN1YnJlc291cmNlSW50ZWdyaXR5KSB7XG4gICAgZXh0cmFQbHVnaW5zLnB1c2gobmV3IFN1YnJlc291cmNlSW50ZWdyaXR5UGx1Z2luKHtcbiAgICAgIGhhc2hGdW5jTmFtZXM6IFsnc2hhMzg0J11cbiAgICB9KSk7XG4gIH1cblxuICBpZiAoYnVpbGRPcHRpb25zLmV4dHJhY3RMaWNlbnNlcykge1xuICAgIGV4dHJhUGx1Z2lucy5wdXNoKG5ldyBMaWNlbnNlV2VicGFja1BsdWdpbih7XG4gICAgICBwYXR0ZXJuOiAvLiovLFxuICAgICAgc3VwcHJlc3NFcnJvcnM6IHRydWUsXG4gICAgICBwZXJDaHVua091dHB1dDogZmFsc2UsXG4gICAgICBvdXRwdXRGaWxlbmFtZTogYDNyZHBhcnR5bGljZW5zZXMudHh0YFxuICAgIH0pKTtcbiAgfVxuXG4gIGNvbnN0IGdsb2JhbFN0eWxlc0VudHJpZXMgPSBleHRyYUVudHJ5UGFyc2VyKGFwcENvbmZpZy5zdHlsZXMsIHJvb3QsICdzdHlsZXMnKVxuICAgIC5tYXAoc3R5bGUgPT4gc3R5bGUuZW50cnkpO1xuXG4gIHJldHVybiB7XG4gICAgZGV2dG9vbDogc291cmNlbWFwcyxcbiAgICByZXNvbHZlOiB7XG4gICAgICBtYWluRmllbGRzOiBbXG4gICAgICAgIC4uLih3Y28uc3VwcG9ydEVTMjAxNSA/IFsnZXMyMDE1J10gOiBbXSksXG4gICAgICAgICdicm93c2VyJywgJ21vZHVsZScsICdtYWluJ1xuICAgICAgXVxuICAgIH0sXG4gICAgb3V0cHV0OiB7XG4gICAgICBjcm9zc09yaWdpbkxvYWRpbmc6IGJ1aWxkT3B0aW9ucy5zdWJyZXNvdXJjZUludGVncml0eSA/ICdhbm9ueW1vdXMnIDogZmFsc2VcbiAgICB9LFxuICAgIG9wdGltaXphdGlvbjoge1xuICAgICAgcnVudGltZUNodW5rOiAnc2luZ2xlJyxcbiAgICAgIHNwbGl0Q2h1bmtzOiB7XG4gICAgICAgIGNodW5rczogYnVpbGRPcHRpb25zLmNvbW1vbkNodW5rID8gJ2FsbCcgOiAnaW5pdGlhbCcsXG4gICAgICAgIGNhY2hlR3JvdXBzOiB7XG4gICAgICAgICAgdmVuZG9yczogZmFsc2UsXG4gICAgICAgICAgdmVuZG9yOiBidWlsZE9wdGlvbnMudmVuZG9yQ2h1bmsgJiYge1xuICAgICAgICAgICAgbmFtZTogJ3ZlbmRvcicsXG4gICAgICAgICAgICBjaHVua3M6ICdpbml0aWFsJyxcbiAgICAgICAgICAgIHRlc3Q6IChtb2R1bGU6IGFueSwgY2h1bmtzOiBBcnJheTx7IG5hbWU6IHN0cmluZyB9PikgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24gPyBtb2R1bGUubmFtZUZvckNvbmRpdGlvbigpIDogJyc7XG4gICAgICAgICAgICAgIHJldHVybiAvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10vLnRlc3QobW9kdWxlTmFtZSlcbiAgICAgICAgICAgICAgICAmJiAhY2h1bmtzLnNvbWUoKHsgbmFtZSB9KSA9PiBuYW1lID09PSAncG9seWZpbGxzJ1xuICAgICAgICAgICAgICAgICAgfHwgZ2xvYmFsU3R5bGVzRW50cmllcy5pbmNsdWRlcyhuYW1lKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHBsdWdpbnM6IGV4dHJhUGx1Z2lucy5jb25jYXQoW1xuICAgICAgbmV3IEluZGV4SHRtbFdlYnBhY2tQbHVnaW4oe1xuICAgICAgICBpbnB1dDogcGF0aC5yZXNvbHZlKHJvb3QsIGFwcENvbmZpZy5pbmRleCksXG4gICAgICAgIG91dHB1dDogcGF0aC5yZWxhdGl2ZShwcm9qZWN0Um9vdCwgcGF0aC5yZXNvbHZlKHJvb3QsIGFwcENvbmZpZy5pbmRleCkpLFxuICAgICAgICBiYXNlSHJlZjogYnVpbGRPcHRpb25zLmJhc2VIcmVmLFxuICAgICAgICBlbnRyeXBvaW50czogZ2VuZXJhdGVFbnRyeVBvaW50cyhhcHBDb25maWcpLFxuICAgICAgICBkZXBsb3lVcmw6IGJ1aWxkT3B0aW9ucy5kZXBsb3lVcmwsXG4gICAgICB9KSxcbiAgICBdKSxcbiAgICBub2RlOiBmYWxzZSxcbiAgfTtcbn1cbiJdfQ==