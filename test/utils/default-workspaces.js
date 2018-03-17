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
const devkitRoot = core_1.normalize(global._DevKitRoot); // tslint:disable-line:no-any
exports.workspaceRoot = core_1.join(devkitRoot, 'tests/@angular_devkit/build_webpack/hello-world-app/');
const builderPath = core_1.join(devkitRoot, 'packages/angular_devkit/build_webpack');
const relativeBuilderPath = core_1.relative(exports.workspaceRoot, builderPath);
function makeWorkspace(WorkspaceTargets) {
    const workspace = {
        version: 1,
        projects: {
            app: {
                root: 'src',
                projectType: 'application',
                architect: {},
            },
        },
    };
    WorkspaceTargets.forEach(WorkspaceTarget => {
        workspace.projects.app.architect[WorkspaceTarget.builder] = {
            builder: `${core_1.getSystemPath(relativeBuilderPath)}:${WorkspaceTarget.builder}`,
            options: WorkspaceTarget.options,
        };
    });
    return workspace;
}
exports.makeWorkspace = makeWorkspace;
exports.browserWorkspaceTarget = {
    builder: 'browser',
    options: {
        outputPath: '../dist',
        index: 'index.html',
        main: 'main.ts',
        polyfills: 'polyfills.ts',
        tsConfig: 'tsconfig.app.json',
        progress: false,
        aot: false,
        styles: [{ input: 'styles.css', lazy: false }],
        scripts: [],
        assets: [
            { glob: 'favicon.ico', input: './', output: './', allowOutsideOutDir: false },
            { glob: '**/*', input: 'assets', output: 'assets', allowOutsideOutDir: false },
        ],
    },
};
exports.devServerWorkspaceTarget = {
    builder: 'devServer',
    options: {
        browserTarget: 'app:browser',
        watch: false,
    },
};
exports.extractI18nWorkspaceTarget = {
    builder: 'extractI18n',
    options: {
        browserTarget: 'app:browser',
    },
};
exports.karmaWorkspaceTarget = {
    builder: 'karma',
    options: {
        main: 'test.ts',
        polyfills: 'polyfills.ts',
        // Use Chrome Headless for CI envs.
        browsers: 'ChromeHeadless',
        tsConfig: 'tsconfig.spec.json',
        karmaConfig: '../karma.conf.js',
        progress: false,
        styles: [{ input: 'styles.css', lazy: false }],
        scripts: [],
        assets: [
            { glob: 'favicon.ico', input: './', output: './', allowOutsideOutDir: false },
            { glob: '**/*', input: 'assets', output: 'assets', allowOutsideOutDir: false },
        ],
    },
};
exports.protractorWorkspaceTarget = {
    builder: 'protractor',
    options: {
        protractorConfig: '../protractor.conf.js',
        devServerTarget: 'app:devServer',
        // Webdriver is updated with a specific version on devkit install.
        // This is preferable to updating each time because it can download a new version of
        // chromedriver that is incompatible with the Chrome version on CI.
        webdriverUpdate: false,
    },
};
exports.tslintWorkspaceTarget = {
    builder: 'tslint',
    options: {
        tsConfig: 'tsconfig.app.json',
        exclude: ['**/node_modules/**'],
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC13b3Jrc3BhY2VzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3Rlc3QvdXRpbHMvZGVmYXVsdC13b3Jrc3BhY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBR0gsK0NBQThGO0FBVzlGLE1BQU0sVUFBVSxHQUFHLGdCQUFTLENBQUUsTUFBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsNkJBQTZCO0FBQzNFLFFBQUEsYUFBYSxHQUFHLFdBQUksQ0FBQyxVQUFVLEVBQzFDLHNEQUFzRCxDQUFDLENBQUM7QUFDMUQsTUFBTSxXQUFXLEdBQUcsV0FBSSxDQUFDLFVBQVUsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO0FBQzlFLE1BQU0sbUJBQW1CLEdBQUcsZUFBUSxDQUFDLHFCQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFFakUsdUJBQThCLGdCQUEwQjtJQUN0RCxNQUFNLFNBQVMsR0FBRztRQUNoQixPQUFPLEVBQUUsQ0FBQztRQUNWLFFBQVEsRUFBRTtZQUNSLEdBQUcsRUFBRTtnQkFDSCxJQUFJLEVBQUUsS0FBSztnQkFDWCxXQUFXLEVBQUUsYUFBYTtnQkFDMUIsU0FBUyxFQUFFLEVBQTZCO2FBQ3pDO1NBQ0Y7S0FDRixDQUFDO0lBRUYsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQ3pDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDMUQsT0FBTyxFQUFFLEdBQUcsb0JBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxPQUFPLEVBQUU7WUFDM0UsT0FBTyxFQUFFLGVBQWUsQ0FBQyxPQUFPO1NBQ3ZCLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxTQUF1RCxDQUFDO0FBQ2pFLENBQUM7QUFwQkQsc0NBb0JDO0FBRVksUUFBQSxzQkFBc0IsR0FBMkM7SUFDNUUsT0FBTyxFQUFFLFNBQVM7SUFDbEIsT0FBTyxFQUFFO1FBQ1AsVUFBVSxFQUFFLFNBQVM7UUFDckIsS0FBSyxFQUFFLFlBQVk7UUFDbkIsSUFBSSxFQUFFLFNBQVM7UUFDZixTQUFTLEVBQUUsY0FBYztRQUN6QixRQUFRLEVBQUUsbUJBQW1CO1FBQzdCLFFBQVEsRUFBRSxLQUFLO1FBQ2YsR0FBRyxFQUFFLEtBQUs7UUFDVixNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQzlDLE9BQU8sRUFBRSxFQUFFO1FBQ1gsTUFBTSxFQUFFO1lBQ04sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUU7WUFDN0UsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUU7U0FDL0U7S0FDRjtDQUNGLENBQUM7QUFFVyxRQUFBLHdCQUF3QixHQUE2QztJQUNoRixPQUFPLEVBQUUsV0FBVztJQUNwQixPQUFPLEVBQUU7UUFDUCxhQUFhLEVBQUUsYUFBYTtRQUM1QixLQUFLLEVBQUUsS0FBSztLQUNiO0NBQ0YsQ0FBQztBQUVXLFFBQUEsMEJBQTBCLEdBQStDO0lBQ3BGLE9BQU8sRUFBRSxhQUFhO0lBQ3RCLE9BQU8sRUFBRTtRQUNQLGFBQWEsRUFBRSxhQUFhO0tBQzdCO0NBQ0YsQ0FBQztBQUVXLFFBQUEsb0JBQW9CLEdBQXlDO0lBQ3hFLE9BQU8sRUFBRSxPQUFPO0lBQ2hCLE9BQU8sRUFBRTtRQUNQLElBQUksRUFBRSxTQUFTO1FBQ2YsU0FBUyxFQUFFLGNBQWM7UUFDekIsbUNBQW1DO1FBQ25DLFFBQVEsRUFBRSxnQkFBZ0I7UUFDMUIsUUFBUSxFQUFFLG9CQUFvQjtRQUM5QixXQUFXLEVBQUUsa0JBQWtCO1FBQy9CLFFBQVEsRUFBRSxLQUFLO1FBQ2YsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUM5QyxPQUFPLEVBQUUsRUFBRTtRQUNYLE1BQU0sRUFBRTtZQUNOLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxFQUFFO1lBQzdFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxFQUFFO1NBQy9FO0tBQ0Y7Q0FDRixDQUFDO0FBRVcsUUFBQSx5QkFBeUIsR0FBOEM7SUFDbEYsT0FBTyxFQUFFLFlBQVk7SUFDckIsT0FBTyxFQUFFO1FBQ1AsZ0JBQWdCLEVBQUUsdUJBQXVCO1FBQ3pDLGVBQWUsRUFBRSxlQUFlO1FBQ2hDLGtFQUFrRTtRQUNsRSxvRkFBb0Y7UUFDcEYsbUVBQW1FO1FBQ25FLGVBQWUsRUFBRSxLQUFLO0tBQ3ZCO0NBQ0YsQ0FBQztBQUVXLFFBQUEscUJBQXFCLEdBQTBDO0lBQzFFLE9BQU8sRUFBRSxRQUFRO0lBQ2pCLE9BQU8sRUFBRTtRQUNQLFFBQVEsRUFBRSxtQkFBbUI7UUFDN0IsT0FBTyxFQUFFLENBQUMsb0JBQW9CLENBQUM7S0FDaEM7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGV4cGVyaW1lbnRhbCwgZ2V0U3lzdGVtUGF0aCwgam9pbiwgbm9ybWFsaXplLCByZWxhdGl2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIEJyb3dzZXJCdWlsZGVyT3B0aW9ucyxcbiAgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gIEV4dHJhY3RJMThuQnVpbGRlck9wdGlvbnMsXG4gIEthcm1hQnVpbGRlck9wdGlvbnMsXG4gIFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucyxcbiAgVHNsaW50QnVpbGRlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL3NyYyc7XG5cblxuY29uc3QgZGV2a2l0Um9vdCA9IG5vcm1hbGl6ZSgoZ2xvYmFsIGFzIGFueSkuX0RldktpdFJvb3QpOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuZXhwb3J0IGNvbnN0IHdvcmtzcGFjZVJvb3QgPSBqb2luKGRldmtpdFJvb3QsXG4gICd0ZXN0cy9AYW5ndWxhcl9kZXZraXQvYnVpbGRfd2VicGFjay9oZWxsby13b3JsZC1hcHAvJyk7XG5jb25zdCBidWlsZGVyUGF0aCA9IGpvaW4oZGV2a2l0Um9vdCwgJ3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2snKTtcbmNvbnN0IHJlbGF0aXZlQnVpbGRlclBhdGggPSByZWxhdGl2ZSh3b3Jrc3BhY2VSb290LCBidWlsZGVyUGF0aCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlV29ya3NwYWNlKFdvcmtzcGFjZVRhcmdldHM6IFRhcmdldFtdICk6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlSnNvbiB7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IHtcbiAgICB2ZXJzaW9uOiAxLFxuICAgIHByb2plY3RzOiB7XG4gICAgICBhcHA6IHtcbiAgICAgICAgcm9vdDogJ3NyYycsXG4gICAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgICBhcmNoaXRlY3Q6IHt9IGFzIHsgW2s6IHN0cmluZ106IFRhcmdldCB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIFdvcmtzcGFjZVRhcmdldHMuZm9yRWFjaChXb3Jrc3BhY2VUYXJnZXQgPT4ge1xuICAgIHdvcmtzcGFjZS5wcm9qZWN0cy5hcHAuYXJjaGl0ZWN0W1dvcmtzcGFjZVRhcmdldC5idWlsZGVyXSA9IHtcbiAgICAgIGJ1aWxkZXI6IGAke2dldFN5c3RlbVBhdGgocmVsYXRpdmVCdWlsZGVyUGF0aCl9OiR7V29ya3NwYWNlVGFyZ2V0LmJ1aWxkZXJ9YCxcbiAgICAgIG9wdGlvbnM6IFdvcmtzcGFjZVRhcmdldC5vcHRpb25zLFxuICAgIH0gYXMgVGFyZ2V0O1xuICB9KTtcblxuICByZXR1cm4gd29ya3NwYWNlIGFzIHt9IGFzIGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlSnNvbjtcbn1cblxuZXhwb3J0IGNvbnN0IGJyb3dzZXJXb3Jrc3BhY2VUYXJnZXQ6IFRhcmdldDxQYXJ0aWFsPEJyb3dzZXJCdWlsZGVyT3B0aW9ucz4+ID0ge1xuICBidWlsZGVyOiAnYnJvd3NlcicsXG4gIG9wdGlvbnM6IHtcbiAgICBvdXRwdXRQYXRoOiAnLi4vZGlzdCcsXG4gICAgaW5kZXg6ICdpbmRleC5odG1sJyxcbiAgICBtYWluOiAnbWFpbi50cycsXG4gICAgcG9seWZpbGxzOiAncG9seWZpbGxzLnRzJyxcbiAgICB0c0NvbmZpZzogJ3RzY29uZmlnLmFwcC5qc29uJyxcbiAgICBwcm9ncmVzczogZmFsc2UsXG4gICAgYW90OiBmYWxzZSxcbiAgICBzdHlsZXM6IFt7IGlucHV0OiAnc3R5bGVzLmNzcycsIGxhenk6IGZhbHNlIH1dLFxuICAgIHNjcmlwdHM6IFtdLFxuICAgIGFzc2V0czogW1xuICAgICAgeyBnbG9iOiAnZmF2aWNvbi5pY28nLCBpbnB1dDogJy4vJywgb3V0cHV0OiAnLi8nLCBhbGxvd091dHNpZGVPdXREaXI6IGZhbHNlIH0sXG4gICAgICB7IGdsb2I6ICcqKi8qJywgaW5wdXQ6ICdhc3NldHMnLCBvdXRwdXQ6ICdhc3NldHMnLCBhbGxvd091dHNpZGVPdXREaXI6IGZhbHNlIH0sXG4gICAgXSxcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBkZXZTZXJ2ZXJXb3Jrc3BhY2VUYXJnZXQ6IFRhcmdldDxQYXJ0aWFsPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPj4gPSB7XG4gIGJ1aWxkZXI6ICdkZXZTZXJ2ZXInLFxuICBvcHRpb25zOiB7XG4gICAgYnJvd3NlclRhcmdldDogJ2FwcDpicm93c2VyJyxcbiAgICB3YXRjaDogZmFsc2UsXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgZXh0cmFjdEkxOG5Xb3Jrc3BhY2VUYXJnZXQ6IFRhcmdldDxQYXJ0aWFsPEV4dHJhY3RJMThuQnVpbGRlck9wdGlvbnM+PiA9IHtcbiAgYnVpbGRlcjogJ2V4dHJhY3RJMThuJyxcbiAgb3B0aW9uczoge1xuICAgIGJyb3dzZXJUYXJnZXQ6ICdhcHA6YnJvd3NlcicsXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3Qga2FybWFXb3Jrc3BhY2VUYXJnZXQ6IFRhcmdldDxQYXJ0aWFsPEthcm1hQnVpbGRlck9wdGlvbnM+PiA9IHtcbiAgYnVpbGRlcjogJ2thcm1hJyxcbiAgb3B0aW9uczoge1xuICAgIG1haW46ICd0ZXN0LnRzJyxcbiAgICBwb2x5ZmlsbHM6ICdwb2x5ZmlsbHMudHMnLFxuICAgIC8vIFVzZSBDaHJvbWUgSGVhZGxlc3MgZm9yIENJIGVudnMuXG4gICAgYnJvd3NlcnM6ICdDaHJvbWVIZWFkbGVzcycsXG4gICAgdHNDb25maWc6ICd0c2NvbmZpZy5zcGVjLmpzb24nLFxuICAgIGthcm1hQ29uZmlnOiAnLi4va2FybWEuY29uZi5qcycsXG4gICAgcHJvZ3Jlc3M6IGZhbHNlLFxuICAgIHN0eWxlczogW3sgaW5wdXQ6ICdzdHlsZXMuY3NzJywgbGF6eTogZmFsc2UgfV0sXG4gICAgc2NyaXB0czogW10sXG4gICAgYXNzZXRzOiBbXG4gICAgICB7IGdsb2I6ICdmYXZpY29uLmljbycsIGlucHV0OiAnLi8nLCBvdXRwdXQ6ICcuLycsIGFsbG93T3V0c2lkZU91dERpcjogZmFsc2UgfSxcbiAgICAgIHsgZ2xvYjogJyoqLyonLCBpbnB1dDogJ2Fzc2V0cycsIG91dHB1dDogJ2Fzc2V0cycsIGFsbG93T3V0c2lkZU91dERpcjogZmFsc2UgfSxcbiAgICBdLFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IHByb3RyYWN0b3JXb3Jrc3BhY2VUYXJnZXQ6IFRhcmdldDxQYXJ0aWFsPFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucz4+ID0ge1xuICBidWlsZGVyOiAncHJvdHJhY3RvcicsXG4gIG9wdGlvbnM6IHtcbiAgICBwcm90cmFjdG9yQ29uZmlnOiAnLi4vcHJvdHJhY3Rvci5jb25mLmpzJyxcbiAgICBkZXZTZXJ2ZXJUYXJnZXQ6ICdhcHA6ZGV2U2VydmVyJyxcbiAgICAvLyBXZWJkcml2ZXIgaXMgdXBkYXRlZCB3aXRoIGEgc3BlY2lmaWMgdmVyc2lvbiBvbiBkZXZraXQgaW5zdGFsbC5cbiAgICAvLyBUaGlzIGlzIHByZWZlcmFibGUgdG8gdXBkYXRpbmcgZWFjaCB0aW1lIGJlY2F1c2UgaXQgY2FuIGRvd25sb2FkIGEgbmV3IHZlcnNpb24gb2ZcbiAgICAvLyBjaHJvbWVkcml2ZXIgdGhhdCBpcyBpbmNvbXBhdGlibGUgd2l0aCB0aGUgQ2hyb21lIHZlcnNpb24gb24gQ0kuXG4gICAgd2ViZHJpdmVyVXBkYXRlOiBmYWxzZSxcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCB0c2xpbnRXb3Jrc3BhY2VUYXJnZXQ6IFRhcmdldDxQYXJ0aWFsPFRzbGludEJ1aWxkZXJPcHRpb25zPj4gPSB7XG4gIGJ1aWxkZXI6ICd0c2xpbnQnLFxuICBvcHRpb25zOiB7XG4gICAgdHNDb25maWc6ICd0c2NvbmZpZy5hcHAuanNvbicsXG4gICAgZXhjbHVkZTogWycqKi9ub2RlX21vZHVsZXMvKionXSxcbiAgfSxcbn07XG4iXX0=