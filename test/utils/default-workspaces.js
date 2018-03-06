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
// Workspace and options need to be created from functions because JSON Schema validation
// will mutate change the objects.
function makeWorkspace(WorkspaceTargets) {
    if (!Array.isArray(WorkspaceTargets)) {
        WorkspaceTargets = [WorkspaceTargets];
    }
    const workspace = {
        name: 'spec',
        version: 1,
        root: '',
        defaultProject: 'app',
        projects: {
            app: {
                root: 'src',
                projectType: 'application',
                targets: {},
            },
        },
    };
    WorkspaceTargets.forEach(WorkspaceTarget => {
        workspace.projects.app.targets[WorkspaceTarget.builder] = {
            builder: `${core_1.getSystemPath(relativeBuilderPath)}:${WorkspaceTarget.builder}`,
            options: WorkspaceTarget.options,
        };
        // Last spec target is the default.
        workspace.projects.app.defaultTarget = WorkspaceTarget.builder;
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
    },
};
exports.tslintWorkspaceTarget = {
    builder: 'tslint',
    options: {
        tsConfig: 'tsconfig.app.json',
        exclude: ['**/node_modules/**'],
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC13b3Jrc3BhY2VzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3Rlc3QvdXRpbHMvZGVmYXVsdC13b3Jrc3BhY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBR0gsK0NBQWdGO0FBV2hGLE1BQU0sVUFBVSxHQUFHLGdCQUFTLENBQUUsTUFBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsNkJBQTZCO0FBQzNFLFFBQUEsYUFBYSxHQUFHLFdBQUksQ0FBQyxVQUFVLEVBQzFDLHNEQUFzRCxDQUFDLENBQUM7QUFDMUQsTUFBTSxXQUFXLEdBQUcsV0FBSSxDQUFDLFVBQVUsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO0FBQzlFLE1BQU0sbUJBQW1CLEdBQUcsZUFBUSxDQUFDLHFCQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFHakUseUZBQXlGO0FBQ3pGLGtDQUFrQztBQUNsQyx1QkFDRSxnQkFBNkQ7SUFFN0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLGdCQUFnQixHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQWM7UUFDM0IsSUFBSSxFQUFFLE1BQU07UUFDWixPQUFPLEVBQUUsQ0FBQztRQUNWLElBQUksRUFBRSxFQUFFO1FBQ1IsY0FBYyxFQUFFLEtBQUs7UUFDckIsUUFBUSxFQUFFO1lBQ1IsR0FBRyxFQUFFO2dCQUNILElBQUksRUFBRSxLQUFLO2dCQUNYLFdBQVcsRUFBRSxhQUFhO2dCQUMxQixPQUFPLEVBQUUsRUFBRTthQUNaO1NBQ0Y7S0FDRixDQUFDO0lBRUYsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQ3pDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FB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c291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBXb3Jrc3BhY2UsIFdvcmtzcGFjZVRhcmdldCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgZ2V0U3lzdGVtUGF0aCwgam9pbiwgbm9ybWFsaXplLCByZWxhdGl2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIEJyb3dzZXJCdWlsZGVyT3B0aW9ucyxcbiAgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gIEV4dHJhY3RJMThuQnVpbGRlck9wdGlvbnMsXG4gIEthcm1hQnVpbGRlck9wdGlvbnMsXG4gIFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucyxcbiAgVHNsaW50QnVpbGRlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL3NyYyc7XG5cblxuY29uc3QgZGV2a2l0Um9vdCA9IG5vcm1hbGl6ZSgoZ2xvYmFsIGFzIGFueSkuX0RldktpdFJvb3QpOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuZXhwb3J0IGNvbnN0IHdvcmtzcGFjZVJvb3QgPSBqb2luKGRldmtpdFJvb3QsXG4gICd0ZXN0cy9AYW5ndWxhcl9kZXZraXQvYnVpbGRfd2VicGFjay9oZWxsby13b3JsZC1hcHAvJyk7XG5jb25zdCBidWlsZGVyUGF0aCA9IGpvaW4oZGV2a2l0Um9vdCwgJ3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2snKTtcbmNvbnN0IHJlbGF0aXZlQnVpbGRlclBhdGggPSByZWxhdGl2ZSh3b3Jrc3BhY2VSb290LCBidWlsZGVyUGF0aCk7XG5cblxuLy8gV29ya3NwYWNlIGFuZCBvcHRpb25zIG5lZWQgdG8gYmUgY3JlYXRlZCBmcm9tIGZ1bmN0aW9ucyBiZWNhdXNlIEpTT04gU2NoZW1hIHZhbGlkYXRpb25cbi8vIHdpbGwgbXV0YXRlIGNoYW5nZSB0aGUgb2JqZWN0cy5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlV29ya3NwYWNlKFxuICBXb3Jrc3BhY2VUYXJnZXRzOiBXb3Jrc3BhY2VUYXJnZXQ8e30+IHwgV29ya3NwYWNlVGFyZ2V0PHt9PltdLFxuKTogV29ya3NwYWNlIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KFdvcmtzcGFjZVRhcmdldHMpKSB7XG4gICAgV29ya3NwYWNlVGFyZ2V0cyA9IFtXb3Jrc3BhY2VUYXJnZXRzXTtcbiAgfVxuXG4gIGNvbnN0IHdvcmtzcGFjZTogV29ya3NwYWNlID0ge1xuICAgIG5hbWU6ICdzcGVjJyxcbiAgICB2ZXJzaW9uOiAxLFxuICAgIHJvb3Q6ICcnLFxuICAgIGRlZmF1bHRQcm9qZWN0OiAnYXBwJyxcbiAgICBwcm9qZWN0czoge1xuICAgICAgYXBwOiB7XG4gICAgICAgIHJvb3Q6ICdzcmMnLFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgICAgdGFyZ2V0czoge30sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgV29ya3NwYWNlVGFyZ2V0cy5mb3JFYWNoKFdvcmtzcGFjZVRhcmdldCA9PiB7XG4gICAgd29ya3NwYWNlLnByb2plY3RzLmFwcC50YXJnZXRzW1dvcmtzcGFjZVRhcmdldC5idWlsZGVyXSA9IHtcbiAgICAgIGJ1aWxkZXI6IGAke2dldFN5c3RlbVBhdGgocmVsYXRpdmVCdWlsZGVyUGF0aCl9OiR7V29ya3NwYWNlVGFyZ2V0LmJ1aWxkZXJ9YCxcbiAgICAgIG9wdGlvbnM6IFdvcmtzcGFjZVRhcmdldC5vcHRpb25zLFxuICAgIH0gYXMgV29ya3NwYWNlVGFyZ2V0O1xuICAgIC8vIExhc3Qgc3BlYyB0YXJnZXQgaXMgdGhlIGRlZmF1bHQuXG4gICAgd29ya3NwYWNlLnByb2plY3RzLmFwcC5kZWZhdWx0VGFyZ2V0ID0gV29ya3NwYWNlVGFyZ2V0LmJ1aWxkZXI7XG4gIH0pO1xuXG4gIHJldHVybiB3b3Jrc3BhY2U7XG59XG5cbmV4cG9ydCBjb25zdCBicm93c2VyV29ya3NwYWNlVGFyZ2V0OiBXb3Jrc3BhY2VUYXJnZXQ8UGFydGlhbDxCcm93c2VyQnVpbGRlck9wdGlvbnM+PiA9IHtcbiAgYnVpbGRlcjogJ2Jyb3dzZXInLFxuICBvcHRpb25zOiB7XG4gICAgb3V0cHV0UGF0aDogJy4uL2Rpc3QnLFxuICAgIGluZGV4OiAnaW5kZXguaHRtbCcsXG4gICAgbWFpbjogJ21haW4udHMnLFxuICAgIHBvbHlmaWxsczogJ3BvbHlmaWxscy50cycsXG4gICAgdHNDb25maWc6ICd0c2NvbmZpZy5hcHAuanNvbicsXG4gICAgcHJvZ3Jlc3M6IGZhbHNlLFxuICAgIGFvdDogZmFsc2UsXG4gICAgc3R5bGVzOiBbeyBpbnB1dDogJ3N0eWxlcy5jc3MnLCBsYXp5OiBmYWxzZSB9XSxcbiAgICBzY3JpcHRzOiBbXSxcbiAgICBhc3NldHM6IFtcbiAgICAgIHsgZ2xvYjogJ2Zhdmljb24uaWNvJywgaW5wdXQ6ICcuLycsIG91dHB1dDogJy4vJywgYWxsb3dPdXRzaWRlT3V0RGlyOiBmYWxzZSB9LFxuICAgICAgeyBnbG9iOiAnKiovKicsIGlucHV0OiAnYXNzZXRzJywgb3V0cHV0OiAnYXNzZXRzJywgYWxsb3dPdXRzaWRlT3V0RGlyOiBmYWxzZSB9LFxuICAgIF0sXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgZGV2U2VydmVyV29ya3NwYWNlVGFyZ2V0OiBXb3Jrc3BhY2VUYXJnZXQ8UGFydGlhbDxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz4+ID0ge1xuICBidWlsZGVyOiAnZGV2U2VydmVyJyxcbiAgb3B0aW9uczoge1xuICAgIGJyb3dzZXJUYXJnZXQ6ICdhcHA6YnJvd3NlcicsXG4gICAgd2F0Y2g6IGZhbHNlLFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IGV4dHJhY3RJMThuV29ya3NwYWNlVGFyZ2V0OiBXb3Jrc3BhY2VUYXJnZXQ8UGFydGlhbDxFeHRyYWN0STE4bkJ1aWxkZXJPcHRpb25zPj4gPSB7XG4gIGJ1aWxkZXI6ICdleHRyYWN0STE4bicsXG4gIG9wdGlvbnM6IHtcbiAgICBicm93c2VyVGFyZ2V0OiAnYXBwOmJyb3dzZXInLFxuICB9LFxufTtcblxuZXhwb3J0IGNvbnN0IGthcm1hV29ya3NwYWNlVGFyZ2V0OiBXb3Jrc3BhY2VUYXJnZXQ8UGFydGlhbDxLYXJtYUJ1aWxkZXJPcHRpb25zPj4gPSB7XG4gIGJ1aWxkZXI6ICdrYXJtYScsXG4gIG9wdGlvbnM6IHtcbiAgICBtYWluOiAndGVzdC50cycsXG4gICAgcG9seWZpbGxzOiAncG9seWZpbGxzLnRzJyxcbiAgICAvLyBVc2UgQ2hyb21lIEhlYWRsZXNzIGZvciBDSSBlbnZzLlxuICAgIGJyb3dzZXJzOiAnQ2hyb21lSGVhZGxlc3MnLFxuICAgIHRzQ29uZmlnOiAndHNjb25maWcuc3BlYy5qc29uJyxcbiAgICBrYXJtYUNvbmZpZzogJy4uL2thcm1hLmNvbmYuanMnLFxuICAgIHByb2dyZXNzOiBmYWxzZSxcbiAgICBzdHlsZXM6IFt7IGlucHV0OiAnc3R5bGVzLmNzcycsIGxhenk6IGZhbHNlIH1dLFxuICAgIHNjcmlwdHM6IFtdLFxuICAgIGFzc2V0czogW1xuICAgICAgeyBnbG9iOiAnZmF2aWNvbi5pY28nLCBpbnB1dDogJy4vJywgb3V0cHV0OiAnLi8nLCBhbGxvd091dHNpZGVPdXREaXI6IGZhbHNlIH0sXG4gICAgICB7IGdsb2I6ICcqKi8qJywgaW5wdXQ6ICdhc3NldHMnLCBvdXRwdXQ6ICdhc3NldHMnLCBhbGxvd091dHNpZGVPdXREaXI6IGZhbHNlIH0sXG4gICAgXSxcbiAgfSxcbn07XG5cbmV4cG9ydCBjb25zdCBwcm90cmFjdG9yV29ya3NwYWNlVGFyZ2V0OiBXb3Jrc3BhY2VUYXJnZXQ8UGFydGlhbDxQcm90cmFjdG9yQnVpbGRlck9wdGlvbnM+PiA9IHtcbiAgYnVpbGRlcjogJ3Byb3RyYWN0b3InLFxuICBvcHRpb25zOiB7XG4gICAgcHJvdHJhY3RvckNvbmZpZzogJy4uL3Byb3RyYWN0b3IuY29uZi5qcycsXG4gICAgZGV2U2VydmVyVGFyZ2V0OiAnYXBwOmRldlNlcnZlcicsXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3QgdHNsaW50V29ya3NwYWNlVGFyZ2V0OiBXb3Jrc3BhY2VUYXJnZXQ8UGFydGlhbDxUc2xpbnRCdWlsZGVyT3B0aW9ucz4+ID0ge1xuICBidWlsZGVyOiAndHNsaW50JyxcbiAgb3B0aW9uczoge1xuICAgIHRzQ29uZmlnOiAndHNjb25maWcuYXBwLmpzb24nLFxuICAgIGV4Y2x1ZGU6IFsnKiovbm9kZV9tb2R1bGVzLyoqJ10sXG4gIH0sXG59O1xuIl19