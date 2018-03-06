"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const glob = require("glob");
/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('istanbul-instrumenter-loader')
 *
 */
function getTestConfig(wco) {
    const { projectRoot, buildOptions, appConfig } = wco;
    const extraRules = [];
    const extraPlugins = [];
    // if (buildOptions.codeCoverage && CliConfig.fromProject()) {
    if (buildOptions.codeCoverage) {
        const codeCoverageExclude = buildOptions.codeCoverageExclude;
        let exclude = [
            /\.(e2e|spec)\.ts$/,
            /node_modules/
        ];
        if (codeCoverageExclude) {
            codeCoverageExclude.forEach((excludeGlob) => {
                const excludeFiles = glob
                    .sync(path.join(projectRoot, excludeGlob), { nodir: true })
                    .map(file => path.normalize(file));
                exclude.push(...excludeFiles);
            });
        }
        extraRules.push({
            test: /\.(js|ts)$/, loader: 'istanbul-instrumenter-loader',
            options: { esModules: true },
            enforce: 'post',
            exclude
        });
    }
    return {
        resolve: {
            mainFields: [
                ...(wco.supportES2015 ? ['es2015'] : []),
                'browser', 'module', 'main'
            ]
        },
        devtool: buildOptions.sourceMap ? 'inline-source-map' : 'eval',
        entry: {
            main: path.resolve(projectRoot, appConfig.root, appConfig.main)
        },
        module: {
            rules: [].concat(extraRules)
        },
        plugins: extraPlugins,
        optimization: {
            // runtimeChunk: 'single',
            splitChunks: {
                chunks: buildOptions.commonChunk ? 'all' : 'initial',
                cacheGroups: {
                    vendors: false,
                    vendor: {
                        name: 'vendor',
                        chunks: 'initial',
                        test: (module, chunks) => {
                            const moduleName = module.nameForCondition ? module.nameForCondition() : '';
                            return /[\\/]node_modules[\\/]/.test(moduleName)
                                && !chunks.some(({ name }) => name === 'polyfills');
                        },
                    },
                }
            }
        },
    };
}
exports.getTestConfig = getTestConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfd2VicGFjay9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQkFBaUI7QUFDakIsK0RBQStEOztBQUUvRCw2QkFBNkI7QUFDN0IsNkJBQTZCO0FBTTdCOzs7Ozs7R0FNRztBQUdILHVCQUE4QixHQUE2QztJQUN6RSxNQUFNLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFFckQsTUFBTSxVQUFVLEdBQVUsRUFBRSxDQUFDO0lBQzdCLE1BQU0sWUFBWSxHQUFVLEVBQUUsQ0FBQztJQUUvQiw4REFBOEQ7SUFDOUQsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUM7UUFDN0QsSUFBSSxPQUFPLEdBQXdCO1lBQ2pDLG1CQUFtQjtZQUNuQixjQUFjO1NBQ2YsQ0FBQztRQUVGLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUN4QixtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFtQixFQUFFLEVBQUU7Z0JBQ2xELE1BQU0sWUFBWSxHQUFHLElBQUk7cUJBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQztxQkFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNkLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLDhCQUE4QjtZQUMxRCxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQzVCLE9BQU8sRUFBRSxNQUFNO1lBQ2YsT0FBTztTQUNSLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxNQUFNLENBQUM7UUFDTCxPQUFPLEVBQUU7WUFDUCxVQUFVLEVBQUU7Z0JBQ1YsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNO2FBQzVCO1NBQ0Y7UUFDRCxPQUFPLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE1BQU07UUFDOUQsS0FBSyxFQUFFO1lBQ0wsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQztTQUNoRTtRQUNELE1BQU0sRUFBRTtZQUNOLEtBQUssRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQWlCLENBQUM7U0FDcEM7UUFDRCxPQUFPLEVBQUUsWUFBWTtRQUNyQixZQUFZLEVBQUU7WUFDWiwwQkFBMEI7WUFDMUIsV0FBVyxFQUFFO2dCQUNYLE1BQU0sRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQ3BELFdBQVcsRUFBRTtvQkFDWCxPQUFPLEVBQUUsS0FBSztvQkFDZCxNQUFNLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7d0JBQ2QsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLElBQUksRUFBRSxDQUFDLE1BQVcsRUFBRSxNQUErQixFQUFFLEVBQUU7NEJBQ3JELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs0QkFDNUUsTUFBTSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7bUNBQzNDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQzt3QkFDeEQsQ0FBQztxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7S0FDRixDQUFDO0FBQ0osQ0FBQztBQWpFRCxzQ0FpRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZVxuLy8gVE9ETzogY2xlYW51cCB0aGlzIGZpbGUsIGl0J3MgY29waWVkIGFzIGlzIGZyb20gQW5ndWxhciBDTEkuXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBnbG9iIGZyb20gJ2dsb2InO1xuXG4vLyBpbXBvcnQgeyBDbGlDb25maWcgfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgV2VicGFja0NvbmZpZ09wdGlvbnMsIFdlYnBhY2tUZXN0T3B0aW9ucyB9IGZyb20gJy4uL2J1aWxkLW9wdGlvbnMnO1xuXG5cbi8qKlxuICogRW51bWVyYXRlIGxvYWRlcnMgYW5kIHRoZWlyIGRlcGVuZGVuY2llcyBmcm9tIHRoaXMgZmlsZSB0byBsZXQgdGhlIGRlcGVuZGVuY3kgdmFsaWRhdG9yXG4gKiBrbm93IHRoZXkgYXJlIHVzZWQuXG4gKlxuICogcmVxdWlyZSgnaXN0YW5idWwtaW5zdHJ1bWVudGVyLWxvYWRlcicpXG4gKlxuICovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlc3RDb25maWcod2NvOiBXZWJwYWNrQ29uZmlnT3B0aW9uczxXZWJwYWNrVGVzdE9wdGlvbnM+KSB7XG4gIGNvbnN0IHsgcHJvamVjdFJvb3QsIGJ1aWxkT3B0aW9ucywgYXBwQ29uZmlnIH0gPSB3Y287XG5cbiAgY29uc3QgZXh0cmFSdWxlczogYW55W10gPSBbXTtcbiAgY29uc3QgZXh0cmFQbHVnaW5zOiBhbnlbXSA9IFtdO1xuXG4gIC8vIGlmIChidWlsZE9wdGlvbnMuY29kZUNvdmVyYWdlICYmIENsaUNvbmZpZy5mcm9tUHJvamVjdCgpKSB7XG4gIGlmIChidWlsZE9wdGlvbnMuY29kZUNvdmVyYWdlKSB7XG4gICAgY29uc3QgY29kZUNvdmVyYWdlRXhjbHVkZSA9IGJ1aWxkT3B0aW9ucy5jb2RlQ292ZXJhZ2VFeGNsdWRlO1xuICAgIGxldCBleGNsdWRlOiAoc3RyaW5nIHwgUmVnRXhwKVtdID0gW1xuICAgICAgL1xcLihlMmV8c3BlYylcXC50cyQvLFxuICAgICAgL25vZGVfbW9kdWxlcy9cbiAgICBdO1xuXG4gICAgaWYgKGNvZGVDb3ZlcmFnZUV4Y2x1ZGUpIHtcbiAgICAgIGNvZGVDb3ZlcmFnZUV4Y2x1ZGUuZm9yRWFjaCgoZXhjbHVkZUdsb2I6IHN0cmluZykgPT4ge1xuICAgICAgICBjb25zdCBleGNsdWRlRmlsZXMgPSBnbG9iXG4gICAgICAgICAgLnN5bmMocGF0aC5qb2luKHByb2plY3RSb290LCBleGNsdWRlR2xvYiksIHsgbm9kaXI6IHRydWUgfSlcbiAgICAgICAgICAubWFwKGZpbGUgPT4gcGF0aC5ub3JtYWxpemUoZmlsZSkpO1xuICAgICAgICBleGNsdWRlLnB1c2goLi4uZXhjbHVkZUZpbGVzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGV4dHJhUnVsZXMucHVzaCh7XG4gICAgICB0ZXN0OiAvXFwuKGpzfHRzKSQvLCBsb2FkZXI6ICdpc3RhbmJ1bC1pbnN0cnVtZW50ZXItbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHsgZXNNb2R1bGVzOiB0cnVlIH0sXG4gICAgICBlbmZvcmNlOiAncG9zdCcsXG4gICAgICBleGNsdWRlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlc29sdmU6IHtcbiAgICAgIG1haW5GaWVsZHM6IFtcbiAgICAgICAgLi4uKHdjby5zdXBwb3J0RVMyMDE1ID8gWydlczIwMTUnXSA6IFtdKSxcbiAgICAgICAgJ2Jyb3dzZXInLCAnbW9kdWxlJywgJ21haW4nXG4gICAgICBdXG4gICAgfSxcbiAgICBkZXZ0b29sOiBidWlsZE9wdGlvbnMuc291cmNlTWFwID8gJ2lubGluZS1zb3VyY2UtbWFwJyA6ICdldmFsJyxcbiAgICBlbnRyeToge1xuICAgICAgbWFpbjogcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCBhcHBDb25maWcucm9vdCwgYXBwQ29uZmlnLm1haW4pXG4gICAgfSxcbiAgICBtb2R1bGU6IHtcbiAgICAgIHJ1bGVzOiBbXS5jb25jYXQoZXh0cmFSdWxlcyBhcyBhbnkpXG4gICAgfSxcbiAgICBwbHVnaW5zOiBleHRyYVBsdWdpbnMsXG4gICAgb3B0aW1pemF0aW9uOiB7XG4gICAgICAvLyBydW50aW1lQ2h1bms6ICdzaW5nbGUnLFxuICAgICAgc3BsaXRDaHVua3M6IHtcbiAgICAgICAgY2h1bmtzOiBidWlsZE9wdGlvbnMuY29tbW9uQ2h1bmsgPyAnYWxsJyA6ICdpbml0aWFsJyxcbiAgICAgICAgY2FjaGVHcm91cHM6IHtcbiAgICAgICAgICB2ZW5kb3JzOiBmYWxzZSxcbiAgICAgICAgICB2ZW5kb3I6IHtcbiAgICAgICAgICAgIG5hbWU6ICd2ZW5kb3InLFxuICAgICAgICAgICAgY2h1bmtzOiAnaW5pdGlhbCcsXG4gICAgICAgICAgICB0ZXN0OiAobW9kdWxlOiBhbnksIGNodW5rczogQXJyYXk8eyBuYW1lOiBzdHJpbmcgfT4pID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uID8gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24oKSA6ICcnO1xuICAgICAgICAgICAgICByZXR1cm4gL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dLy50ZXN0KG1vZHVsZU5hbWUpXG4gICAgICAgICAgICAgICAgJiYgIWNodW5rcy5zb21lKCh7IG5hbWUgfSkgPT4gbmFtZSA9PT0gJ3BvbHlmaWxscycpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cbiJdfQ==