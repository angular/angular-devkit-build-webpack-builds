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
const path_1 = require("path");
const fromPromise_1 = require("rxjs/observable/fromPromise");
const of_1 = require("rxjs/observable/of");
const operators_1 = require("rxjs/operators");
const url = require("url");
const require_project_module_1 = require("../angular-cli-files/utilities/require-project-module");
const utils_1 = require("../utils");
class ProtractorBuilder {
    constructor(context) {
        this.context = context;
    }
    run(target) {
        const root = core_1.getSystemPath(target.root);
        const options = target.options;
        // TODO: verify using of(null) to kickstart things is a pattern.
        return of_1.of(null).pipe(operators_1.concatMap(() => options.devServerTarget ? this._startDevServer(options) : of_1.of(null)), operators_1.concatMap(() => options.webdriverUpdate ? this._updateWebdriver(root) : of_1.of(null)), operators_1.concatMap(() => this._runProtractor(root, options)), operators_1.take(1));
    }
    _startDevServer(options) {
        const [project, targetName, configuration] = options.devServerTarget.split(':');
        // Override browser build watch setting.
        const overrides = { watch: false, host: options.host, port: options.port };
        const browserTargetOptions = { project, target: targetName, configuration, overrides };
        const devServerTarget = this.context.architect
            .getTarget(browserTargetOptions);
        let devServerDescription;
        let baseUrl;
        return this.context.architect.getBuilderDescription(devServerTarget).pipe(operators_1.concatMap(description => {
            devServerDescription = description;
            return this.context.architect.validateBuilderOptions(devServerTarget, devServerDescription);
        }), operators_1.concatMap(() => {
            // Compute baseUrl from devServerOptions.
            if (options.devServerTarget && devServerTarget.options.publicHost) {
                let publicHost = devServerTarget.options.publicHost;
                if (!/^\w+:\/\//.test(publicHost)) {
                    publicHost = `${devServerTarget.options.ssl
                        ? 'https'
                        : 'http'}://${publicHost}`;
                }
                const clientUrl = url.parse(publicHost);
                baseUrl = url.format(clientUrl);
            }
            else if (options.devServerTarget) {
                baseUrl = url.format({
                    protocol: devServerTarget.options.ssl ? 'https' : 'http',
                    hostname: options.host,
                    port: devServerTarget.options.port.toString(),
                });
            }
            // Save the computed baseUrl back so that Protractor can use it.
            options.baseUrl = baseUrl;
            return of_1.of(this.context.architect.getBuilder(devServerDescription, this.context));
        }), operators_1.concatMap(builder => builder.run(devServerTarget)));
    }
    _updateWebdriver(root) {
        // The webdriver-manager update command can only be accessed via a deep import.
        const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';
        let webdriverUpdate; // tslint:disable-line:no-any
        try {
            // When using npm, webdriver is within protractor/node_modules.
            webdriverUpdate = require_project_module_1.requireProjectModule(root, `protractor/node_modules/${webdriverDeepImport}`);
        }
        catch (e) {
            try {
                // When using yarn, webdriver is found as a root module.
                webdriverUpdate = require_project_module_1.requireProjectModule(root, webdriverDeepImport);
            }
            catch (e) {
                throw new Error(core_1.tags.stripIndents `
          Cannot automatically find webdriver-manager to update.
          Update webdriver-manager manually and run 'ng e2e --no-webdriver-update' instead.
        `);
            }
        }
        // run `webdriver-manager update --standalone false --gecko false --quiet`
        // if you change this, update the command comment in prev line, and in `eject` task
        return fromPromise_1.fromPromise(webdriverUpdate.program.run({
            standalone: false,
            gecko: false,
            quiet: true,
        }));
    }
    _runProtractor(root, options) {
        const additionalProtractorConfig = {
            elementExplorer: options.elementExplorer,
            baseUrl: options.baseUrl,
            spec: options.specs.length ? options.specs : undefined,
            suite: options.suite,
        };
        // TODO: Protractor manages process.exit itself, so this target will allways quit the
        // process. To work around this we run it in a subprocess.
        // https://github.com/angular/protractor/issues/4160
        return utils_1.runModuleAsObservableFork(root, 'protractor/built/launcher', 'init', [path_1.resolve(root, options.protractorConfig), additionalProtractorConfig]);
    }
}
exports.ProtractorBuilder = ProtractorBuilder;
exports.default = ProtractorBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3Byb3RyYWN0b3IvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFTSCwrQ0FBMkQ7QUFDM0QsK0JBQStCO0FBRS9CLDZEQUEwRDtBQUMxRCwyQ0FBd0M7QUFDeEMsOENBQWlEO0FBQ2pELDJCQUEyQjtBQUMzQixrR0FBNkY7QUFFN0Ysb0NBQXFEO0FBZXJEO0lBRUUsWUFBbUIsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFBSSxDQUFDO0lBRS9DLEdBQUcsQ0FBQyxNQUF3QztRQUUxQyxNQUFNLElBQUksR0FBRyxvQkFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBRS9CLGdFQUFnRTtRQUNoRSxNQUFNLENBQUMsT0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDbEIscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDbkYscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUNqRixxQkFBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQ25ELGdCQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1IsQ0FBQztJQUNKLENBQUM7SUFF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QkFBMkIsRUFDM0IsTUFBTSxFQUNOLENBQUMsY0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUN0RSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBL0dELDhDQStHQztBQUVELGtCQUFlLGlCQUFpQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyLFxuICBCdWlsZGVyQ29udGV4dCxcbiAgQnVpbGRlckRlc2NyaXB0aW9uLFxuICBUYXJnZXQsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgZ2V0U3lzdGVtUGF0aCwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgZnJvbVByb21pc2UgfSBmcm9tICdyeGpzL29ic2VydmFibGUvZnJvbVByb21pc2UnO1xuaW1wb3J0IHsgb2YgfSBmcm9tICdyeGpzL29ic2VydmFibGUvb2YnO1xuaW1wb3J0IHsgY29uY2F0TWFwLCB0YWtlIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vZGV2LXNlcnZlcic7XG5pbXBvcnQgeyBydW5Nb2R1bGVBc09ic2VydmFibGVGb3JrIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvdHJhY3RvckJ1aWxkZXJPcHRpb25zIHtcbiAgcHJvdHJhY3RvckNvbmZpZzogc3RyaW5nO1xuICBkZXZTZXJ2ZXJUYXJnZXQ/OiBzdHJpbmc7XG4gIHNwZWNzOiBzdHJpbmdbXTtcbiAgc3VpdGU/OiBzdHJpbmc7XG4gIGVsZW1lbnRFeHBsb3JlcjogYm9vbGVhbjtcbiAgd2ViZHJpdmVyVXBkYXRlOiBib29sZWFuO1xuICBwb3J0PzogbnVtYmVyO1xuICBob3N0OiBzdHJpbmc7XG4gIGJhc2VVcmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFByb3RyYWN0b3JCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxQcm90cmFjdG9yQnVpbGRlck9wdGlvbnM+IHtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29udGV4dDogQnVpbGRlckNvbnRleHQpIHsgfVxuXG4gIHJ1bih0YXJnZXQ6IFRhcmdldDxQcm90cmFjdG9yQnVpbGRlck9wdGlvbnM+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG5cbiAgICBjb25zdCByb290ID0gZ2V0U3lzdGVtUGF0aCh0YXJnZXQucm9vdCk7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHRhcmdldC5vcHRpb25zO1xuXG4gICAgLy8gVE9ETzogdmVyaWZ5IHVzaW5nIG9mKG51bGwpIHRvIGtpY2tzdGFydCB0aGluZ3MgaXMgYSBwYXR0ZXJuLlxuICAgIHJldHVybiBvZihudWxsKS5waXBlKFxuICAgICAgY29uY2F0TWFwKCgpID0+IG9wdGlvbnMuZGV2U2VydmVyVGFyZ2V0ID8gdGhpcy5fc3RhcnREZXZTZXJ2ZXIob3B0aW9ucykgOiBvZihudWxsKSksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gb3B0aW9ucy53ZWJkcml2ZXJVcGRhdGUgPyB0aGlzLl91cGRhdGVXZWJkcml2ZXIocm9vdCkgOiBvZihudWxsKSksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gdGhpcy5fcnVuUHJvdHJhY3Rvcihyb290LCBvcHRpb25zKSksXG4gICAgICB0YWtlKDEpLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9zdGFydERldlNlcnZlcihvcHRpb25zOiBQcm90cmFjdG9yQnVpbGRlck9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJvamVjdCwgdGFyZ2V0TmFtZSwgY29uZmlndXJhdGlvbl0gPSAob3B0aW9ucy5kZXZTZXJ2ZXJUYXJnZXQgYXMgc3RyaW5nKS5zcGxpdCgnOicpO1xuICAgIC8vIE92ZXJyaWRlIGJyb3dzZXIgYnVpbGQgd2F0Y2ggc2V0dGluZy5cbiAgICBjb25zdCBvdmVycmlkZXMgPSB7IHdhdGNoOiBmYWxzZSwgaG9zdDogb3B0aW9ucy5ob3N0LCBwb3J0OiBvcHRpb25zLnBvcnQgfTtcbiAgICBjb25zdCBicm93c2VyVGFyZ2V0T3B0aW9ucyA9IHsgcHJvamVjdCwgdGFyZ2V0OiB0YXJnZXROYW1lLCBjb25maWd1cmF0aW9uLCBvdmVycmlkZXMgfTtcbiAgICBjb25zdCBkZXZTZXJ2ZXJUYXJnZXQgPSB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0XG4gICAgICAuZ2V0VGFyZ2V0PERldlNlcnZlckJ1aWxkZXJPcHRpb25zPihicm93c2VyVGFyZ2V0T3B0aW9ucyk7XG4gICAgbGV0IGRldlNlcnZlckRlc2NyaXB0aW9uOiBCdWlsZGVyRGVzY3JpcHRpb247XG4gICAgbGV0IGJhc2VVcmw6IHN0cmluZztcblxuICAgIHJldHVybiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihkZXZTZXJ2ZXJUYXJnZXQpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoZGVzY3JpcHRpb24gPT4ge1xuICAgICAgICBkZXZTZXJ2ZXJEZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LnZhbGlkYXRlQnVpbGRlck9wdGlvbnMoZGV2U2VydmVyVGFyZ2V0LFxuICAgICAgICAgIGRldlNlcnZlckRlc2NyaXB0aW9uKTtcbiAgICAgIH0pLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHtcbiAgICAgICAgLy8gQ29tcHV0ZSBiYXNlVXJsIGZyb20gZGV2U2VydmVyT3B0aW9ucy5cbiAgICAgICAgaWYgKG9wdGlvbnMuZGV2U2VydmVyVGFyZ2V0ICYmIGRldlNlcnZlclRhcmdldC5vcHRpb25zLnB1YmxpY0hvc3QpIHtcbiAgICAgICAgICBsZXQgcHVibGljSG9zdCA9IGRldlNlcnZlclRhcmdldC5vcHRpb25zLnB1YmxpY0hvc3Q7XG4gICAgICAgICAgaWYgKCEvXlxcdys6XFwvXFwvLy50ZXN0KHB1YmxpY0hvc3QpKSB7XG4gICAgICAgICAgICBwdWJsaWNIb3N0ID0gYCR7ZGV2U2VydmVyVGFyZ2V0Lm9wdGlvbnMuc3NsXG4gICAgICAgICAgICAgID8gJ2h0dHBzJ1xuICAgICAgICAgICAgICA6ICdodHRwJ306Ly8ke3B1YmxpY0hvc3R9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgY2xpZW50VXJsID0gdXJsLnBhcnNlKHB1YmxpY0hvc3QpO1xuICAgICAgICAgIGJhc2VVcmwgPSB1cmwuZm9ybWF0KGNsaWVudFVybCk7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5kZXZTZXJ2ZXJUYXJnZXQpIHtcbiAgICAgICAgICBiYXNlVXJsID0gdXJsLmZvcm1hdCh7XG4gICAgICAgICAgICBwcm90b2NvbDogZGV2U2VydmVyVGFyZ2V0Lm9wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJyxcbiAgICAgICAgICAgIGhvc3RuYW1lOiBvcHRpb25zLmhvc3QsXG4gICAgICAgICAgICBwb3J0OiBkZXZTZXJ2ZXJUYXJnZXQub3B0aW9ucy5wb3J0LnRvU3RyaW5nKCksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBjb21wdXRlZCBiYXNlVXJsIGJhY2sgc28gdGhhdCBQcm90cmFjdG9yIGNhbiB1c2UgaXQuXG4gICAgICAgIG9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmw7XG5cbiAgICAgICAgcmV0dXJuIG9mKHRoaXMuY29udGV4dC5hcmNoaXRlY3QuZ2V0QnVpbGRlcihkZXZTZXJ2ZXJEZXNjcmlwdGlvbiwgdGhpcy5jb250ZXh0KSk7XG4gICAgICB9KSxcbiAgICAgIGNvbmNhdE1hcChidWlsZGVyID0+IGJ1aWxkZXIucnVuKGRldlNlcnZlclRhcmdldCkpLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF91cGRhdGVXZWJkcml2ZXIocm9vdDogc3RyaW5nKSB7XG4gICAgLy8gVGhlIHdlYmRyaXZlci1tYW5hZ2VyIHVwZGF0ZSBjb21tYW5kIGNhbiBvbmx5IGJlIGFjY2Vzc2VkIHZpYSBhIGRlZXAgaW1wb3J0LlxuICAgIGNvbnN0IHdlYmRyaXZlckRlZXBJbXBvcnQgPSAnd2ViZHJpdmVyLW1hbmFnZXIvYnVpbHQvbGliL2NtZHMvdXBkYXRlJztcbiAgICBsZXQgd2ViZHJpdmVyVXBkYXRlOiBhbnk7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG5cbiAgICB0cnkge1xuICAgICAgLy8gV2hlbiB1c2luZyBucG0sIHdlYmRyaXZlciBpcyB3aXRoaW4gcHJvdHJhY3Rvci9ub2RlX21vZHVsZXMuXG4gICAgICB3ZWJkcml2ZXJVcGRhdGUgPSByZXF1aXJlUHJvamVjdE1vZHVsZShyb290LFxuICAgICAgICBgcHJvdHJhY3Rvci9ub2RlX21vZHVsZXMvJHt3ZWJkcml2ZXJEZWVwSW1wb3J0fWApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFdoZW4gdXNpbmcgeWFybiwgd2ViZHJpdmVyIGlzIGZvdW5kIGFzIGEgcm9vdCBtb2R1bGUuXG4gICAgICAgIHdlYmRyaXZlclVwZGF0ZSA9IHJlcXVpcmVQcm9qZWN0TW9kdWxlKHJvb3QsIHdlYmRyaXZlckRlZXBJbXBvcnQpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGFncy5zdHJpcEluZGVudHNgXG4gICAgICAgICAgQ2Fubm90IGF1dG9tYXRpY2FsbHkgZmluZCB3ZWJkcml2ZXItbWFuYWdlciB0byB1cGRhdGUuXG4gICAgICAgICAgVXBkYXRlIHdlYmRyaXZlci1tYW5hZ2VyIG1hbnVhbGx5IGFuZCBydW4gJ25nIGUyZSAtLW5vLXdlYmRyaXZlci11cGRhdGUnIGluc3RlYWQuXG4gICAgICAgIGApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJ1biBgd2ViZHJpdmVyLW1hbmFnZXIgdXBkYXRlIC0tc3RhbmRhbG9uZSBmYWxzZSAtLWdlY2tvIGZhbHNlIC0tcXVpZXRgXG4gICAgLy8gaWYgeW91IGNoYW5nZSB0aGlzLCB1cGRhdGUgdGhlIGNvbW1hbmQgY29tbWVudCBpbiBwcmV2IGxpbmUsIGFuZCBpbiBgZWplY3RgIHRhc2tcbiAgICByZXR1cm4gZnJvbVByb21pc2Uod2ViZHJpdmVyVXBkYXRlLnByb2dyYW0ucnVuKHtcbiAgICAgIHN0YW5kYWxvbmU6IGZhbHNlLFxuICAgICAgZ2Vja286IGZhbHNlLFxuICAgICAgcXVpZXQ6IHRydWUsXG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcnVuUHJvdHJhY3Rvcihyb290OiBzdHJpbmcsIG9wdGlvbnM6IFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucyk6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IGFkZGl0aW9uYWxQcm90cmFjdG9yQ29uZmlnID0ge1xuICAgICAgZWxlbWVudEV4cGxvcmVyOiBvcHRpb25zLmVsZW1lbnRFeHBsb3JlcixcbiAgICAgIGJhc2VVcmw6IG9wdGlvbnMuYmFzZVVybCxcbiAgICAgIHNwZWM6IG9wdGlvbnMuc3BlY3MubGVuZ3RoID8gb3B0aW9ucy5zcGVjcyA6IHVuZGVmaW5lZCxcbiAgICAgIHN1aXRlOiBvcHRpb25zLnN1aXRlLFxuICAgIH07XG5cbiAgICAvLyBUT0RPOiBQcm90cmFjdG9yIG1hbmFnZXMgcHJvY2Vzcy5leGl0IGl0c2VsZiwgc28gdGhpcyB0YXJnZXQgd2lsbCBhbGx3YXlzIHF1aXQgdGhlXG4gICAgLy8gcHJvY2Vzcy4gVG8gd29yayBhcm91bmQgdGhpcyB3ZSBydW4gaXQgaW4gYSBzdWJwcm9jZXNzLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3Byb3RyYWN0b3IvaXNzdWVzLzQxNjBcbiAgICByZXR1cm4gcnVuTW9kdWxlQXNPYnNlcnZhYmxlRm9yayhcbiAgICAgIHJvb3QsXG4gICAgICAncHJvdHJhY3Rvci9idWlsdC9sYXVuY2hlcicsXG4gICAgICAnaW5pdCcsXG4gICAgICBbcmVzb2x2ZShyb290LCBvcHRpb25zLnByb3RyYWN0b3JDb25maWcpLCBhZGRpdGlvbmFsUHJvdHJhY3RvckNvbmZpZ10sXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcm90cmFjdG9yQnVpbGRlcjtcbiJdfQ==