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
        let devServerBuilderConfig;
        let devServerDescription;
        let baseUrl;
        return this.context.architect
            .getBuilderConfiguration(browserTargetOptions).pipe(operators_1.tap(cfg => devServerBuilderConfig = cfg), operators_1.concatMap(builderConfig => this.context.architect.getBuilderDescription(builderConfig)), operators_1.tap(description => devServerDescription = description), operators_1.concatMap(devServerDescription => this.context.architect.validateBuilderOptions(devServerBuilderConfig, devServerDescription)), operators_1.concatMap(() => {
            // Compute baseUrl from devServerOptions.
            if (options.devServerTarget && devServerBuilderConfig.options.publicHost) {
                let publicHost = devServerBuilderConfig.options.publicHost;
                if (!/^\w+:\/\//.test(publicHost)) {
                    publicHost = `${devServerBuilderConfig.options.ssl
                        ? 'https'
                        : 'http'}://${publicHost}`;
                }
                const clientUrl = url.parse(publicHost);
                baseUrl = url.format(clientUrl);
            }
            else if (options.devServerTarget) {
                baseUrl = url.format({
                    protocol: devServerBuilderConfig.options.ssl ? 'https' : 'http',
                    hostname: options.host,
                    port: devServerBuilderConfig.options.port.toString(),
                });
            }
            // Save the computed baseUrl back so that Protractor can use it.
            options.baseUrl = baseUrl;
            return of_1.of(this.context.architect.getBuilder(devServerDescription, this.context));
        }), operators_1.concatMap(builder => builder.run(devServerBuilderConfig)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3Byb3RyYWN0b3IvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFTSCwrQ0FBMkQ7QUFDM0QsK0JBQStCO0FBRS9CLDZEQUEwRDtBQUMxRCwyQ0FBd0M7QUFDeEMsOENBQXNEO0FBQ3RELDJCQUEyQjtBQUMzQixrR0FBNkY7QUFFN0Ysb0NBQXFEO0FBZXJEO0lBRUUsWUFBbUIsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFBSSxDQUFDO0lBRS9DLEdBQUcsQ0FBQyxNQUFzRDtRQUV4RCxNQUFNLElBQUksR0FBRyxvQkFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBRS9CLGdFQUFnRTtRQUNoRSxNQUFNLENBQUMsT0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDbEIscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDbkYscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUNqRixxQkFBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQ25ELGdCQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1IsQ0FBQztJQUNKLENBQUM7SUFF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QUN0RCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7U0FDckIsQ0FBQztRQUVGLHFGQUFxRjtRQUNyRiwwREFBMEQ7UUFDMUQsb0RBQW9EO1FBQ3BELE1BQU0sQ0FBQyxpQ0FBeUIsQ0FDOUIsSUFBSSxFQUNKLDJCQUEyQixFQUMzQixNQUFNLEVBQ04sQ0FBQyxjQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLDBCQUEwQixDQUFDLENBQ3RFLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE5R0QsOENBOEdDO0FBRUQsa0JBQWUsaUJBQWlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBCdWlsZGVyQ29udGV4dCxcbiAgQnVpbGRlckRlc2NyaXB0aW9uLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGdldFN5c3RlbVBhdGgsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJztcbmltcG9ydCB7IGZyb21Qcm9taXNlIH0gZnJvbSAncnhqcy9vYnNlcnZhYmxlL2Zyb21Qcm9taXNlJztcbmltcG9ydCB7IG9mIH0gZnJvbSAncnhqcy9vYnNlcnZhYmxlL29mJztcbmltcG9ydCB7IGNvbmNhdE1hcCwgdGFrZSwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vZGV2LXNlcnZlcic7XG5pbXBvcnQgeyBydW5Nb2R1bGVBc09ic2VydmFibGVGb3JrIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvdHJhY3RvckJ1aWxkZXJPcHRpb25zIHtcbiAgcHJvdHJhY3RvckNvbmZpZzogc3RyaW5nO1xuICBkZXZTZXJ2ZXJUYXJnZXQ/OiBzdHJpbmc7XG4gIHNwZWNzOiBzdHJpbmdbXTtcbiAgc3VpdGU/OiBzdHJpbmc7XG4gIGVsZW1lbnRFeHBsb3JlcjogYm9vbGVhbjtcbiAgd2ViZHJpdmVyVXBkYXRlOiBib29sZWFuO1xuICBwb3J0PzogbnVtYmVyO1xuICBob3N0OiBzdHJpbmc7XG4gIGJhc2VVcmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFByb3RyYWN0b3JCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxQcm90cmFjdG9yQnVpbGRlck9wdGlvbnM+IHtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29udGV4dDogQnVpbGRlckNvbnRleHQpIHsgfVxuXG4gIHJ1bih0YXJnZXQ6IEJ1aWxkZXJDb25maWd1cmF0aW9uPFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucz4pOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcblxuICAgIGNvbnN0IHJvb3QgPSBnZXRTeXN0ZW1QYXRoKHRhcmdldC5yb290KTtcbiAgICBjb25zdCBvcHRpb25zID0gdGFyZ2V0Lm9wdGlvbnM7XG5cbiAgICAvLyBUT0RPOiB2ZXJpZnkgdXNpbmcgb2YobnVsbCkgdG8ga2lja3N0YXJ0IHRoaW5ncyBpcyBhIHBhdHRlcm4uXG4gICAgcmV0dXJuIG9mKG51bGwpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoKCkgPT4gb3B0aW9ucy5kZXZTZXJ2ZXJUYXJnZXQgPyB0aGlzLl9zdGFydERldlNlcnZlcihvcHRpb25zKSA6IG9mKG51bGwpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBvcHRpb25zLndlYmRyaXZlclVwZGF0ZSA/IHRoaXMuX3VwZGF0ZVdlYmRyaXZlcihyb290KSA6IG9mKG51bGwpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiB0aGlzLl9ydW5Qcm90cmFjdG9yKHJvb3QsIG9wdGlvbnMpKSxcbiAgICAgIHRha2UoMSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgX3N0YXJ0RGV2U2VydmVyKG9wdGlvbnM6IFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucykge1xuICAgIGNvbnN0IFtwcm9qZWN0LCB0YXJnZXROYW1lLCBjb25maWd1cmF0aW9uXSA9IChvcHRpb25zLmRldlNlcnZlclRhcmdldCBhcyBzdHJpbmcpLnNwbGl0KCc6Jyk7XG4gICAgLy8gT3ZlcnJpZGUgYnJvd3NlciBidWlsZCB3YXRjaCBzZXR0aW5nLlxuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHsgd2F0Y2g6IGZhbHNlLCBob3N0OiBvcHRpb25zLmhvc3QsIHBvcnQ6IG9wdGlvbnMucG9ydCB9O1xuICAgIGNvbnN0IGJyb3dzZXJUYXJnZXRPcHRpb25zID0geyBwcm9qZWN0LCB0YXJnZXQ6IHRhcmdldE5hbWUsIGNvbmZpZ3VyYXRpb24sIG92ZXJyaWRlcyB9O1xuICAgIGxldCBkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz47XG4gICAgbGV0IGRldlNlcnZlckRlc2NyaXB0aW9uOiBCdWlsZGVyRGVzY3JpcHRpb247XG4gICAgbGV0IGJhc2VVcmw6IHN0cmluZztcblxuICAgIHJldHVybiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0XG4gICAgICAuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+KGJyb3dzZXJUYXJnZXRPcHRpb25zKS5waXBlKFxuICAgICAgICB0YXAoY2ZnID0+IGRldlNlcnZlckJ1aWxkZXJDb25maWcgPSBjZmcpLFxuICAgICAgICBjb25jYXRNYXAoYnVpbGRlckNvbmZpZyA9PiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZmlnKSksXG4gICAgICAgIHRhcChkZXNjcmlwdGlvbiA9PiBkZXZTZXJ2ZXJEZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uKSxcbiAgICAgICAgY29uY2F0TWFwKGRldlNlcnZlckRlc2NyaXB0aW9uID0+IHRoaXMuY29udGV4dC5hcmNoaXRlY3QudmFsaWRhdGVCdWlsZGVyT3B0aW9ucyhcbiAgICAgICAgICBkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnLCBkZXZTZXJ2ZXJEZXNjcmlwdGlvbikpLFxuICAgICAgICBjb25jYXRNYXAoKCkgPT4ge1xuICAgICAgICAgIC8vIENvbXB1dGUgYmFzZVVybCBmcm9tIGRldlNlcnZlck9wdGlvbnMuXG4gICAgICAgICAgaWYgKG9wdGlvbnMuZGV2U2VydmVyVGFyZ2V0ICYmIGRldlNlcnZlckJ1aWxkZXJDb25maWcub3B0aW9ucy5wdWJsaWNIb3N0KSB7XG4gICAgICAgICAgICBsZXQgcHVibGljSG9zdCA9IGRldlNlcnZlckJ1aWxkZXJDb25maWcub3B0aW9ucy5wdWJsaWNIb3N0O1xuICAgICAgICAgICAgaWYgKCEvXlxcdys6XFwvXFwvLy50ZXN0KHB1YmxpY0hvc3QpKSB7XG4gICAgICAgICAgICAgIHB1YmxpY0hvc3QgPSBgJHtkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnLm9wdGlvbnMuc3NsXG4gICAgICAgICAgICAgICAgPyAnaHR0cHMnXG4gICAgICAgICAgICAgICAgOiAnaHR0cCd9Oi8vJHtwdWJsaWNIb3N0fWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjbGllbnRVcmwgPSB1cmwucGFyc2UocHVibGljSG9zdCk7XG4gICAgICAgICAgICBiYXNlVXJsID0gdXJsLmZvcm1hdChjbGllbnRVcmwpO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5kZXZTZXJ2ZXJUYXJnZXQpIHtcbiAgICAgICAgICAgIGJhc2VVcmwgPSB1cmwuZm9ybWF0KHtcbiAgICAgICAgICAgICAgcHJvdG9jb2w6IGRldlNlcnZlckJ1aWxkZXJDb25maWcub3B0aW9ucy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnLFxuICAgICAgICAgICAgICBob3N0bmFtZTogb3B0aW9ucy5ob3N0LFxuICAgICAgICAgICAgICBwb3J0OiBkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnLm9wdGlvbnMucG9ydC50b1N0cmluZygpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2F2ZSB0aGUgY29tcHV0ZWQgYmFzZVVybCBiYWNrIHNvIHRoYXQgUHJvdHJhY3RvciBjYW4gdXNlIGl0LlxuICAgICAgICAgIG9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmw7XG5cbiAgICAgICAgICByZXR1cm4gb2YodGhpcy5jb250ZXh0LmFyY2hpdGVjdC5nZXRCdWlsZGVyKGRldlNlcnZlckRlc2NyaXB0aW9uLCB0aGlzLmNvbnRleHQpKTtcbiAgICAgICAgfSksXG4gICAgICAgIGNvbmNhdE1hcChidWlsZGVyID0+IGJ1aWxkZXIucnVuKGRldlNlcnZlckJ1aWxkZXJDb25maWcpKSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlV2ViZHJpdmVyKHJvb3Q6IHN0cmluZykge1xuICAgIC8vIFRoZSB3ZWJkcml2ZXItbWFuYWdlciB1cGRhdGUgY29tbWFuZCBjYW4gb25seSBiZSBhY2Nlc3NlZCB2aWEgYSBkZWVwIGltcG9ydC5cbiAgICBjb25zdCB3ZWJkcml2ZXJEZWVwSW1wb3J0ID0gJ3dlYmRyaXZlci1tYW5hZ2VyL2J1aWx0L2xpYi9jbWRzL3VwZGF0ZSc7XG4gICAgbGV0IHdlYmRyaXZlclVwZGF0ZTogYW55OyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIFdoZW4gdXNpbmcgbnBtLCB3ZWJkcml2ZXIgaXMgd2l0aGluIHByb3RyYWN0b3Ivbm9kZV9tb2R1bGVzLlxuICAgICAgd2ViZHJpdmVyVXBkYXRlID0gcmVxdWlyZVByb2plY3RNb2R1bGUocm9vdCxcbiAgICAgICAgYHByb3RyYWN0b3Ivbm9kZV9tb2R1bGVzLyR7d2ViZHJpdmVyRGVlcEltcG9ydH1gKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBXaGVuIHVzaW5nIHlhcm4sIHdlYmRyaXZlciBpcyBmb3VuZCBhcyBhIHJvb3QgbW9kdWxlLlxuICAgICAgICB3ZWJkcml2ZXJVcGRhdGUgPSByZXF1aXJlUHJvamVjdE1vZHVsZShyb290LCB3ZWJkcml2ZXJEZWVwSW1wb3J0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgIENhbm5vdCBhdXRvbWF0aWNhbGx5IGZpbmQgd2ViZHJpdmVyLW1hbmFnZXIgdG8gdXBkYXRlLlxuICAgICAgICAgIFVwZGF0ZSB3ZWJkcml2ZXItbWFuYWdlciBtYW51YWxseSBhbmQgcnVuICduZyBlMmUgLS1uby13ZWJkcml2ZXItdXBkYXRlJyBpbnN0ZWFkLlxuICAgICAgICBgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBydW4gYHdlYmRyaXZlci1tYW5hZ2VyIHVwZGF0ZSAtLXN0YW5kYWxvbmUgZmFsc2UgLS1nZWNrbyBmYWxzZSAtLXF1aWV0YFxuICAgIC8vIGlmIHlvdSBjaGFuZ2UgdGhpcywgdXBkYXRlIHRoZSBjb21tYW5kIGNvbW1lbnQgaW4gcHJldiBsaW5lLCBhbmQgaW4gYGVqZWN0YCB0YXNrXG4gICAgcmV0dXJuIGZyb21Qcm9taXNlKHdlYmRyaXZlclVwZGF0ZS5wcm9ncmFtLnJ1bih7XG4gICAgICBzdGFuZGFsb25lOiBmYWxzZSxcbiAgICAgIGdlY2tvOiBmYWxzZSxcbiAgICAgIHF1aWV0OiB0cnVlLFxuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgX3J1blByb3RyYWN0b3Iocm9vdDogc3RyaW5nLCBvcHRpb25zOiBQcm90cmFjdG9yQnVpbGRlck9wdGlvbnMpOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcbiAgICBjb25zdCBhZGRpdGlvbmFsUHJvdHJhY3RvckNvbmZpZyA9IHtcbiAgICAgIGVsZW1lbnRFeHBsb3Jlcjogb3B0aW9ucy5lbGVtZW50RXhwbG9yZXIsXG4gICAgICBiYXNlVXJsOiBvcHRpb25zLmJhc2VVcmwsXG4gICAgICBzcGVjOiBvcHRpb25zLnNwZWNzLmxlbmd0aCA/IG9wdGlvbnMuc3BlY3MgOiB1bmRlZmluZWQsXG4gICAgICBzdWl0ZTogb3B0aW9ucy5zdWl0ZSxcbiAgICB9O1xuXG4gICAgLy8gVE9ETzogUHJvdHJhY3RvciBtYW5hZ2VzIHByb2Nlc3MuZXhpdCBpdHNlbGYsIHNvIHRoaXMgdGFyZ2V0IHdpbGwgYWxsd2F5cyBxdWl0IHRoZVxuICAgIC8vIHByb2Nlc3MuIFRvIHdvcmsgYXJvdW5kIHRoaXMgd2UgcnVuIGl0IGluIGEgc3VicHJvY2Vzcy5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9wcm90cmFjdG9yL2lzc3Vlcy80MTYwXG4gICAgcmV0dXJuIHJ1bk1vZHVsZUFzT2JzZXJ2YWJsZUZvcmsoXG4gICAgICByb290LFxuICAgICAgJ3Byb3RyYWN0b3IvYnVpbHQvbGF1bmNoZXInLFxuICAgICAgJ2luaXQnLFxuICAgICAgW3Jlc29sdmUocm9vdCwgb3B0aW9ucy5wcm90cmFjdG9yQ29uZmlnKSwgYWRkaXRpb25hbFByb3RyYWN0b3JDb25maWddLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUHJvdHJhY3RvckJ1aWxkZXI7XG4iXX0=