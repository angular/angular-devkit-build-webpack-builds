"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const path = require("path");
const Observable_1 = require("rxjs/Observable");
const webpack_configs_1 = require("../angular-cli-files/models/webpack-configs");
const read_tsconfig_1 = require("../angular-cli-files/utilities/read-tsconfig");
const require_project_module_1 = require("../angular-cli-files/utilities/require-project-module");
const webpackMerge = require('webpack-merge');
class KarmaBuilder {
    constructor(context) {
        this.context = context;
    }
    run(target) {
        const root = core_1.getSystemPath(target.root);
        const options = target.options;
        return new Observable_1.Observable(obs => {
            const karma = require_project_module_1.requireProjectModule(root, 'karma');
            const karmaConfig = path.resolve(root, options.karmaConfig);
            // TODO: adjust options to account for not passing them blindly to karma.
            // const karmaOptions: any = Object.assign({}, options);
            // tslint:disable-next-line:no-any
            const karmaOptions = {
                singleRun: !options.watch,
            };
            // Convert browsers from a string to an array
            if (options.browsers) {
                karmaOptions.browsers = options.browsers.split(',');
            }
            karmaOptions.webpackBuildFacade = {
                options: options,
                webpackConfig: this._buildWebpackConfig(root, options),
                // Pass onto Karma to emit BuildEvents.
                successCb: () => obs.next({ success: true }),
                failureCb: () => obs.next({ success: false }),
            };
            // TODO: inside the configs, always use the project root and not the workspace root.
            // Until then we pretend the app root is relative (``) but the same as `projectRoot`.
            karmaOptions.webpackBuildFacade.options.root = ''; // tslint:disable-line:no-any
            // Assign additional karmaConfig options to the local ngapp config
            karmaOptions.configFile = karmaConfig;
            // Complete the observable once the Karma server returns.
            const karmaServer = new karma.Server(karmaOptions, () => obs.complete());
            karmaServer.start();
            // Cleanup, signal Karma to exit.
            return () => {
                // Karma does not seem to have a way to exit the server gracefully.
                // See https://github.com/karma-runner/karma/issues/2867#issuecomment-369912167
                // TODO: make a PR for karma to add `karmaServer.close(code)`, that
                // calls `disconnectBrowsers(code);`
                // karmaServer.close();
            };
        });
    }
    _buildWebpackConfig(projectRoot, options) {
        // tslint:disable-next-line:no-any
        let wco;
        const tsconfigPath = path.resolve(projectRoot, options.tsConfig);
        const tsConfig = read_tsconfig_1.readTsconfig(tsconfigPath);
        const projectTs = require_project_module_1.requireProjectModule(projectRoot, 'typescript');
        const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
            && tsConfig.options.target !== projectTs.ScriptTarget.ES5;
        const compatOptions = Object.assign({}, options, { 
            // TODO: inside the configs, always use the project root and not the workspace root.
            // Until then we have to pretend the app root is relative (``) but the same as `projectRoot`.
            root: '', 
            // Some asset logic inside getCommonConfig needs outputPath to be set.
            outputPath: '' });
        wco = {
            projectRoot,
            // TODO: use only this.options, it contains all flags and configs items already.
            buildOptions: compatOptions,
            appConfig: compatOptions,
            tsConfig,
            supportES2015,
        };
        const webpackConfigs = [
            webpack_configs_1.getCommonConfig(wco),
            webpack_configs_1.getStylesConfig(wco),
            webpack_configs_1.getNonAotTestConfig(wco),
            webpack_configs_1.getTestConfig(wco),
        ];
        return webpackMerge(webpackConfigs);
    }
}
exports.KarmaBuilder = KarmaBuilder;
exports.default = KarmaBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2thcm1hL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBUUgsK0NBQXFEO0FBQ3JELDZCQUE2QjtBQUM3QixnREFBNkM7QUFFN0MsaUZBS3FEO0FBQ3JELGdGQUE0RTtBQUM1RSxrR0FBNkY7QUFLN0YsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBdUM5QztJQUNFLFlBQW1CLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUksQ0FBQztJQUUvQyxHQUFHLENBQUMsTUFBaUQ7UUFFbkQsTUFBTSxJQUFJLEdBQUcsb0JBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUUvQixNQUFNLENBQUMsSUFBSSx1QkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzFCLE1BQU0sS0FBSyxHQUFHLDZDQUFvQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFNUQseUVBQXlFO1lBQ3pFLHdEQUF3RDtZQUN4RCxrQ0FBa0M7WUFDbEMsTUFBTSxZQUFZLEdBQVE7Z0JBQ3hCLFNBQVMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLO2FBQzFCLENBQUM7WUFFRiw2Q0FBNkM7WUFDN0MsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLFlBQVksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEQsQ0FBQztZQUVELFlBQVksQ0FBQyxrQkFBa0IsR0FBRztnQkFDaEMsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLGFBQWEsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQztnQkFDdEQsdUNBQXVDO2dCQUN2QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDNUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7YUFDOUMsQ0FBQztZQUVGLG9GQUFvRjtZQUNwRixxRkFBcUY7WUFDcEYsWUFBWSxDQUFDLGtCQUFrQixDQUFDLE9BQWUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsNkJBQTZCO1lBRXpGLGtFQUFrRTtZQUNsRSxZQUFZLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQztZQUV0Qyx5REFBeUQ7WUFDekQsTUFBTSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN6RSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFcEIsaUNBQWlDO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ1YsbUVBQW1FO2dCQUNuRSwrRUFBK0U7Z0JBQy9FLG1FQUFtRTtnQkFDbkUsb0NBQW9DO2dCQUNwQyx1QkFBdUI7WUFDekIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sbUJBQW1CLENBQUMsV0FBbUIsRUFBRSxPQUE0QjtRQUMzRSxrQ0FBa0M7UUFDbEMsSUFBSSxHQUFRLENBQUM7UUFFYixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsUUFBa0IsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sUUFBUSxHQUFHLDRCQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFNUMsTUFBTSxTQUFTLEdBQUcsNkNBQW9CLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBYyxDQUFDO1FBRS9FLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRztlQUN2RSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztRQUU1RCxNQUFNLGFBQWEscUJBQ2QsT0FBTztZQUNWLG9GQUFvRjtZQUNwRiw2RkFBNkY7WUFDN0YsSUFBSSxFQUFFLEVBQUU7WUFDUixzRUFBc0U7WUFDdEUsVUFBVSxFQUFFLEVBQUUsR0FDZixDQUFDO1FBRUYsR0FBRyxHQUFHO1lBQ0osV0FBVztZQUNYLGdGQUFnRjtZQUNoRixZQUFZLEVBQUUsYUFBYTtZQUMzQixTQUFTLEVBQUUsYUFBYTtZQUN4QixRQUFRO1lBQ1IsYUFBYTtTQUNkLENBQUM7UUFFRixNQUFNLGNBQWMsR0FBUztZQUMzQixpQ0FBZSxDQUFDLEdBQUcsQ0FBQztZQUNwQixpQ0FBZSxDQUFDLEdBQUcsQ0FBQztZQUNwQixxQ0FBbUIsQ0FBQyxHQUFHLENBQUM7WUFDeEIsK0JBQWEsQ0FBQyxHQUFHLENBQUM7U0FDbkIsQ0FBQztRQUVGLE1BQU0sQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBN0ZELG9DQTZGQztBQUVELGtCQUFlLFlBQVksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlcixcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGdldFN5c3RlbVBhdGggfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCB7XG4gIGdldENvbW1vbkNvbmZpZyxcbiAgZ2V0Tm9uQW90VGVzdENvbmZpZyxcbiAgZ2V0U3R5bGVzQ29uZmlnLFxuICBnZXRUZXN0Q29uZmlnLFxufSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzJztcbmltcG9ydCB7IHJlYWRUc2NvbmZpZyB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZWFkLXRzY29uZmlnJztcbmltcG9ydCB7IHJlcXVpcmVQcm9qZWN0TW9kdWxlIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3JlcXVpcmUtcHJvamVjdC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgQXNzZXRQYXR0ZXJuLFxuICBFeHRyYUVudHJ5UG9pbnQsXG59IGZyb20gJy4uL2Jyb3dzZXInO1xuY29uc3Qgd2VicGFja01lcmdlID0gcmVxdWlyZSgnd2VicGFjay1tZXJnZScpO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgS2FybWFCdWlsZGVyT3B0aW9ucyB7XG4gIG1haW46IHN0cmluZztcbiAgdHNDb25maWc6IHN0cmluZzsgLy8gcHJldmlvdXNseSAndHNjb25maWcnLlxuICBrYXJtYUNvbmZpZzogc3RyaW5nOyAvLyBwcmV2aW91c2x5ICdjb25maWcnLlxuICB3YXRjaDogYm9vbGVhbjtcbiAgY29kZUNvdmVyYWdlOiBib29sZWFuO1xuICBjb2RlQ292ZXJhZ2VFeGNsdWRlOiBzdHJpbmdbXTtcbiAgcHJvZ3Jlc3M6IGJvb2xlYW47XG4gIHByZXNlcnZlU3ltbGlua3M/OiBib29sZWFuO1xuXG4gIC8vIE9wdGlvbnMgd2l0aCBubyBkZWZhdWx0cy5cbiAgcG9seWZpbGxzPzogc3RyaW5nO1xuICBwb2xsPzogbnVtYmVyO1xuICBwb3J0PzogbnVtYmVyO1xuICBicm93c2Vycz86IHN0cmluZztcblxuICAvLyBBIGNvdXBsZSBvZiBvcHRpb25zIGhhdmUgZGlmZmVyZW50IG5hbWVzLlxuICBzb3VyY2VNYXA6IGJvb2xlYW47IC8vIHByZXZpb3VzbHkgJ3NvdXJjZW1hcHMnLlxuXG4gIC8vIFRoZXNlIG9wdGlvbnMgd2VyZSBub3QgYXZhaWxhYmxlIGFzIGZsYWdzLlxuICBhc3NldHM6IEFzc2V0UGF0dGVybltdO1xuICBzY3JpcHRzOiBFeHRyYUVudHJ5UG9pbnRbXTtcbiAgc3R5bGVzOiBFeHRyYUVudHJ5UG9pbnRbXTtcbiAgc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zOiB7IGluY2x1ZGVQYXRoczogc3RyaW5nW10gfTtcblxuICAvLyBTb21lIG9wdGlvbnMgYXJlIG5vdCBuZWVkZWQgYW55bW9yZS5cbiAgLy8gYXBwPzogc3RyaW5nOyAvLyBhcHBzIGFyZW4ndCB1c2VkIHdpdGggYnVpbGQgZmFjYWRlXG4gIC8vIHNpbmdsZVJ1bj86IGJvb2xlYW47IC8vIHNhbWUgYXMgd2F0Y2hcbiAgLy8gY29sb3JzOiBib29sZWFuOyAvLyB3ZSBqdXN0IHBhc3NlZCBpdCB0byB0aGUga2FybWEgY29uZmlnXG4gIC8vIGxvZ0xldmVsPzogc3RyaW5nOyAvLyBzYW1lIGFzIGFib3ZlXG4gIC8vIHJlcG9ydGVycz86IHN0cmluZzsgLy8gc2FtZSBhcyBhYm92ZVxuXG4gIC8vIFRPRE86IGZpZ3VyZSBvdXQgd2hhdCB0byBkbyBhYm91dCB0aGVzZS5cbiAgZW52aXJvbm1lbnQ/OiBzdHJpbmc7IC8vIE1heWJlIHJlcGxhY2Ugd2l0aCAnZmlsZVJlcGxhY2VtZW50JyBvYmplY3Q/XG59XG5cbmV4cG9ydCBjbGFzcyBLYXJtYUJ1aWxkZXIgaW1wbGVtZW50cyBCdWlsZGVyPEthcm1hQnVpbGRlck9wdGlvbnM+IHtcbiAgY29uc3RydWN0b3IocHVibGljIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KSB7IH1cblxuICBydW4odGFyZ2V0OiBCdWlsZGVyQ29uZmlndXJhdGlvbjxLYXJtYUJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuXG4gICAgY29uc3Qgcm9vdCA9IGdldFN5c3RlbVBhdGgodGFyZ2V0LnJvb3QpO1xuICAgIGNvbnN0IG9wdGlvbnMgPSB0YXJnZXQub3B0aW9ucztcblxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgY29uc3Qga2FybWEgPSByZXF1aXJlUHJvamVjdE1vZHVsZShyb290LCAna2FybWEnKTtcbiAgICAgIGNvbnN0IGthcm1hQ29uZmlnID0gcGF0aC5yZXNvbHZlKHJvb3QsIG9wdGlvbnMua2FybWFDb25maWcpO1xuXG4gICAgICAvLyBUT0RPOiBhZGp1c3Qgb3B0aW9ucyB0byBhY2NvdW50IGZvciBub3QgcGFzc2luZyB0aGVtIGJsaW5kbHkgdG8ga2FybWEuXG4gICAgICAvLyBjb25zdCBrYXJtYU9wdGlvbnM6IGFueSA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgY29uc3Qga2FybWFPcHRpb25zOiBhbnkgPSB7XG4gICAgICAgIHNpbmdsZVJ1bjogIW9wdGlvbnMud2F0Y2gsXG4gICAgICB9O1xuXG4gICAgICAvLyBDb252ZXJ0IGJyb3dzZXJzIGZyb20gYSBzdHJpbmcgdG8gYW4gYXJyYXlcbiAgICAgIGlmIChvcHRpb25zLmJyb3dzZXJzKSB7XG4gICAgICAgIGthcm1hT3B0aW9ucy5icm93c2VycyA9IG9wdGlvbnMuYnJvd3NlcnMuc3BsaXQoJywnKTtcbiAgICAgIH1cblxuICAgICAga2FybWFPcHRpb25zLndlYnBhY2tCdWlsZEZhY2FkZSA9IHtcbiAgICAgICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICAgICAgd2VicGFja0NvbmZpZzogdGhpcy5fYnVpbGRXZWJwYWNrQ29uZmlnKHJvb3QsIG9wdGlvbnMpLFxuICAgICAgICAvLyBQYXNzIG9udG8gS2FybWEgdG8gZW1pdCBCdWlsZEV2ZW50cy5cbiAgICAgICAgc3VjY2Vzc0NiOiAoKSA9PiBvYnMubmV4dCh7IHN1Y2Nlc3M6IHRydWUgfSksXG4gICAgICAgIGZhaWx1cmVDYjogKCkgPT4gb2JzLm5leHQoeyBzdWNjZXNzOiBmYWxzZSB9KSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFRPRE86IGluc2lkZSB0aGUgY29uZmlncywgYWx3YXlzIHVzZSB0aGUgcHJvamVjdCByb290IGFuZCBub3QgdGhlIHdvcmtzcGFjZSByb290LlxuICAgICAgLy8gVW50aWwgdGhlbiB3ZSBwcmV0ZW5kIHRoZSBhcHAgcm9vdCBpcyByZWxhdGl2ZSAoYGApIGJ1dCB0aGUgc2FtZSBhcyBgcHJvamVjdFJvb3RgLlxuICAgICAgKGthcm1hT3B0aW9ucy53ZWJwYWNrQnVpbGRGYWNhZGUub3B0aW9ucyBhcyBhbnkpLnJvb3QgPSAnJzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcblxuICAgICAgLy8gQXNzaWduIGFkZGl0aW9uYWwga2FybWFDb25maWcgb3B0aW9ucyB0byB0aGUgbG9jYWwgbmdhcHAgY29uZmlnXG4gICAgICBrYXJtYU9wdGlvbnMuY29uZmlnRmlsZSA9IGthcm1hQ29uZmlnO1xuXG4gICAgICAvLyBDb21wbGV0ZSB0aGUgb2JzZXJ2YWJsZSBvbmNlIHRoZSBLYXJtYSBzZXJ2ZXIgcmV0dXJucy5cbiAgICAgIGNvbnN0IGthcm1hU2VydmVyID0gbmV3IGthcm1hLlNlcnZlcihrYXJtYU9wdGlvbnMsICgpID0+IG9icy5jb21wbGV0ZSgpKTtcbiAgICAgIGthcm1hU2VydmVyLnN0YXJ0KCk7XG5cbiAgICAgIC8vIENsZWFudXAsIHNpZ25hbCBLYXJtYSB0byBleGl0LlxuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgLy8gS2FybWEgZG9lcyBub3Qgc2VlbSB0byBoYXZlIGEgd2F5IHRvIGV4aXQgdGhlIHNlcnZlciBncmFjZWZ1bGx5LlxuICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2thcm1hLXJ1bm5lci9rYXJtYS9pc3N1ZXMvMjg2NyNpc3N1ZWNvbW1lbnQtMzY5OTEyMTY3XG4gICAgICAgIC8vIFRPRE86IG1ha2UgYSBQUiBmb3Iga2FybWEgdG8gYWRkIGBrYXJtYVNlcnZlci5jbG9zZShjb2RlKWAsIHRoYXRcbiAgICAgICAgLy8gY2FsbHMgYGRpc2Nvbm5lY3RCcm93c2Vycyhjb2RlKTtgXG4gICAgICAgIC8vIGthcm1hU2VydmVyLmNsb3NlKCk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfYnVpbGRXZWJwYWNrQ29uZmlnKHByb2plY3RSb290OiBzdHJpbmcsIG9wdGlvbnM6IEthcm1hQnVpbGRlck9wdGlvbnMpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgbGV0IHdjbzogYW55O1xuXG4gICAgY29uc3QgdHNjb25maWdQYXRoID0gcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCBvcHRpb25zLnRzQ29uZmlnIGFzIHN0cmluZyk7XG4gICAgY29uc3QgdHNDb25maWcgPSByZWFkVHNjb25maWcodHNjb25maWdQYXRoKTtcblxuICAgIGNvbnN0IHByb2plY3RUcyA9IHJlcXVpcmVQcm9qZWN0TW9kdWxlKHByb2plY3RSb290LCAndHlwZXNjcmlwdCcpIGFzIHR5cGVvZiB0cztcblxuICAgIGNvbnN0IHN1cHBvcnRFUzIwMTUgPSB0c0NvbmZpZy5vcHRpb25zLnRhcmdldCAhPT0gcHJvamVjdFRzLlNjcmlwdFRhcmdldC5FUzNcbiAgICAgICYmIHRzQ29uZmlnLm9wdGlvbnMudGFyZ2V0ICE9PSBwcm9qZWN0VHMuU2NyaXB0VGFyZ2V0LkVTNTtcblxuICAgIGNvbnN0IGNvbXBhdE9wdGlvbnMgPSB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgLy8gVE9ETzogaW5zaWRlIHRoZSBjb25maWdzLCBhbHdheXMgdXNlIHRoZSBwcm9qZWN0IHJvb3QgYW5kIG5vdCB0aGUgd29ya3NwYWNlIHJvb3QuXG4gICAgICAvLyBVbnRpbCB0aGVuIHdlIGhhdmUgdG8gcHJldGVuZCB0aGUgYXBwIHJvb3QgaXMgcmVsYXRpdmUgKGBgKSBidXQgdGhlIHNhbWUgYXMgYHByb2plY3RSb290YC5cbiAgICAgIHJvb3Q6ICcnLFxuICAgICAgLy8gU29tZSBhc3NldCBsb2dpYyBpbnNpZGUgZ2V0Q29tbW9uQ29uZmlnIG5lZWRzIG91dHB1dFBhdGggdG8gYmUgc2V0LlxuICAgICAgb3V0cHV0UGF0aDogJycsXG4gICAgfTtcblxuICAgIHdjbyA9IHtcbiAgICAgIHByb2plY3RSb290LFxuICAgICAgLy8gVE9ETzogdXNlIG9ubHkgdGhpcy5vcHRpb25zLCBpdCBjb250YWlucyBhbGwgZmxhZ3MgYW5kIGNvbmZpZ3MgaXRlbXMgYWxyZWFkeS5cbiAgICAgIGJ1aWxkT3B0aW9uczogY29tcGF0T3B0aW9ucyxcbiAgICAgIGFwcENvbmZpZzogY29tcGF0T3B0aW9ucyxcbiAgICAgIHRzQ29uZmlnLFxuICAgICAgc3VwcG9ydEVTMjAxNSxcbiAgICB9O1xuXG4gICAgY29uc3Qgd2VicGFja0NvbmZpZ3M6IHt9W10gPSBbXG4gICAgICBnZXRDb21tb25Db25maWcod2NvKSxcbiAgICAgIGdldFN0eWxlc0NvbmZpZyh3Y28pLFxuICAgICAgZ2V0Tm9uQW90VGVzdENvbmZpZyh3Y28pLFxuICAgICAgZ2V0VGVzdENvbmZpZyh3Y28pLFxuICAgIF07XG5cbiAgICByZXR1cm4gd2VicGFja01lcmdlKHdlYnBhY2tDb25maWdzKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBLYXJtYUJ1aWxkZXI7XG4iXX0=