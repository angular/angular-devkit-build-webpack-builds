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
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        // const projectSystemRoot = getSystemPath(projectRoot);
        // TODO: verify using of(null) to kickstart things is a pattern.
        return of_1.of(null).pipe(operators_1.concatMap(() => options.devServerTarget ? this._startDevServer(options) : of_1.of(null)), operators_1.concatMap(() => options.webdriverUpdate ? this._updateWebdriver(projectRoot) : of_1.of(null)), operators_1.concatMap(() => this._runProtractor(root, options)), operators_1.take(1));
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
    _updateWebdriver(projectRoot) {
        // The webdriver-manager update command can only be accessed via a deep import.
        const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';
        let webdriverUpdate; // tslint:disable-line:no-any
        try {
            // When using npm, webdriver is within protractor/node_modules.
            webdriverUpdate = require_project_module_1.requireProjectModule(core_1.getSystemPath(projectRoot), `protractor/node_modules/${webdriverDeepImport}`);
        }
        catch (e) {
            try {
                // When using yarn, webdriver is found as a root module.
                webdriverUpdate = require_project_module_1.requireProjectModule(core_1.getSystemPath(projectRoot), webdriverDeepImport);
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
        return utils_1.runModuleAsObservableFork(root, 'protractor/built/launcher', 'init', [
            core_1.getSystemPath(core_1.resolve(root, core_1.normalize(options.protractorConfig))),
            additionalProtractorConfig,
        ]);
    }
}
exports.ProtractorBuilder = ProtractorBuilder;
exports.default = ProtractorBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3Byb3RyYWN0b3IvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFTSCwrQ0FBcUY7QUFFckYsNkRBQTBEO0FBQzFELDJDQUF3QztBQUN4Qyw4Q0FBc0Q7QUFDdEQsMkJBQTJCO0FBQzNCLGtHQUE2RjtBQUU3RixvQ0FBcUQ7QUFlckQ7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLGFBQTZEO1FBRS9ELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELHdEQUF3RDtRQUV4RCxnRUFBZ0U7UUFDaEUsTUFBTSxDQUFDLE9BQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2xCLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQ25GLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDeEYscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUks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LENBQUMsT0FBTztZQUN4QixJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDdEQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1NBQ3JCLENBQUM7UUFFRixxRkFBcUY7UUFDckYsMERBQTBEO1FBQzFELG9EQUFvRDtRQUNwRCxNQUFNLENBQUMsaUNBQXlCLENBQzlCLElBQUksRUFDSiwyQkFBMkIsRUFDM0IsTUFBTSxFQUNOO1lBQ0Usb0JBQWEsQ0FBQyxjQUFPLENBQUMsSUFBSSxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUNqRSwwQkFBMEI7U0FDM0IsQ0FDRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBbkhELDhDQW1IQztBQUVELGtCQUFlLGlCQUFpQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyLFxuICBCdWlsZGVyQ29uZmlndXJhdGlvbixcbiAgQnVpbGRlckNvbnRleHQsXG4gIEJ1aWxkZXJEZXNjcmlwdGlvbixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBQYXRoLCBnZXRTeXN0ZW1QYXRoLCBub3JtYWxpemUsIHJlc29sdmUsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJztcbmltcG9ydCB7IGZyb21Qcm9taXNlIH0gZnJvbSAncnhqcy9vYnNlcnZhYmxlL2Zyb21Qcm9taXNlJztcbmltcG9ydCB7IG9mIH0gZnJvbSAncnhqcy9vYnNlcnZhYmxlL29mJztcbmltcG9ydCB7IGNvbmNhdE1hcCwgdGFrZSwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyByZXF1aXJlUHJvamVjdE1vZHVsZSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9yZXF1aXJlLXByb2plY3QtbW9kdWxlJztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vZGV2LXNlcnZlcic7XG5pbXBvcnQgeyBydW5Nb2R1bGVBc09ic2VydmFibGVGb3JrIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvdHJhY3RvckJ1aWxkZXJPcHRpb25zIHtcbiAgcHJvdHJhY3RvckNvbmZpZzogc3RyaW5nO1xuICBkZXZTZXJ2ZXJUYXJnZXQ/OiBzdHJpbmc7XG4gIHNwZWNzOiBzdHJpbmdbXTtcbiAgc3VpdGU/OiBzdHJpbmc7XG4gIGVsZW1lbnRFeHBsb3JlcjogYm9vbGVhbjtcbiAgd2ViZHJpdmVyVXBkYXRlOiBib29sZWFuO1xuICBwb3J0PzogbnVtYmVyO1xuICBob3N0OiBzdHJpbmc7XG4gIGJhc2VVcmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFByb3RyYWN0b3JCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxQcm90cmFjdG9yQnVpbGRlck9wdGlvbnM+IHtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29udGV4dDogQnVpbGRlckNvbnRleHQpIHsgfVxuXG4gIHJ1bihidWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxQcm90cmFjdG9yQnVpbGRlck9wdGlvbnM+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG5cbiAgICBjb25zdCBvcHRpb25zID0gYnVpbGRlckNvbmZpZy5vcHRpb25zO1xuICAgIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRleHQud29ya3NwYWNlLnJvb3Q7XG4gICAgY29uc3QgcHJvamVjdFJvb3QgPSByZXNvbHZlKHJvb3QsIGJ1aWxkZXJDb25maWcucm9vdCk7XG4gICAgLy8gY29uc3QgcHJvamVjdFN5c3RlbVJvb3QgPSBnZXRTeXN0ZW1QYXRoKHByb2plY3RSb290KTtcblxuICAgIC8vIFRPRE86IHZlcmlmeSB1c2luZyBvZihudWxsKSB0byBraWNrc3RhcnQgdGhpbmdzIGlzIGEgcGF0dGVybi5cbiAgICByZXR1cm4gb2YobnVsbCkucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBvcHRpb25zLmRldlNlcnZlclRhcmdldCA/IHRoaXMuX3N0YXJ0RGV2U2VydmVyKG9wdGlvbnMpIDogb2YobnVsbCkpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IG9wdGlvbnMud2ViZHJpdmVyVXBkYXRlID8gdGhpcy5fdXBkYXRlV2ViZHJpdmVyKHByb2plY3RSb290KSA6IG9mKG51bGwpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiB0aGlzLl9ydW5Qcm90cmFjdG9yKHJvb3QsIG9wdGlvbnMpKSxcbiAgICAgIHRha2UoMSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgX3N0YXJ0RGV2U2VydmVyKG9wdGlvbnM6IFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucykge1xuICAgIGNvbnN0IFtwcm9qZWN0LCB0YXJnZXROYW1lLCBjb25maWd1cmF0aW9uXSA9IChvcHRpb25zLmRldlNlcnZlclRhcmdldCBhcyBzdHJpbmcpLnNwbGl0KCc6Jyk7XG4gICAgLy8gT3ZlcnJpZGUgYnJvd3NlciBidWlsZCB3YXRjaCBzZXR0aW5nLlxuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHsgd2F0Y2g6IGZhbHNlLCBob3N0OiBvcHRpb25zLmhvc3QsIHBvcnQ6IG9wdGlvbnMucG9ydCB9O1xuICAgIGNvbnN0IGJyb3dzZXJUYXJnZXRPcHRpb25zID0geyBwcm9qZWN0LCB0YXJnZXQ6IHRhcmdldE5hbWUsIGNvbmZpZ3VyYXRpb24sIG92ZXJyaWRlcyB9O1xuICAgIGxldCBkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz47XG4gICAgbGV0IGRldlNlcnZlckRlc2NyaXB0aW9uOiBCdWlsZGVyRGVzY3JpcHRpb247XG4gICAgbGV0IGJhc2VVcmw6IHN0cmluZztcblxuICAgIHJldHVybiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0XG4gICAgICAuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+KGJyb3dzZXJUYXJnZXRPcHRpb25zKS5waXBlKFxuICAgICAgICB0YXAoY2ZnID0+IGRldlNlcnZlckJ1aWxkZXJDb25maWcgPSBjZmcpLFxuICAgICAgICBjb25jYXRNYXAoYnVpbGRlckNvbmZpZyA9PiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZmlnKSksXG4gICAgICAgIHRhcChkZXNjcmlwdGlvbiA9PiBkZXZTZXJ2ZXJEZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uKSxcbiAgICAgICAgY29uY2F0TWFwKGRldlNlcnZlckRlc2NyaXB0aW9uID0+IHRoaXMuY29udGV4dC5hcmNoaXRlY3QudmFsaWRhdGVCdWlsZGVyT3B0aW9ucyhcbiAgICAgICAgICBkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnLCBkZXZTZXJ2ZXJEZXNjcmlwdGlvbikpLFxuICAgICAgICBjb25jYXRNYXAoKCkgPT4ge1xuICAgICAgICAgIC8vIENvbXB1dGUgYmFzZVVybCBmcm9tIGRldlNlcnZlck9wdGlvbnMuXG4gICAgICAgICAgaWYgKG9wdGlvbnMuZGV2U2VydmVyVGFyZ2V0ICYmIGRldlNlcnZlckJ1aWxkZXJDb25maWcub3B0aW9ucy5wdWJsaWNIb3N0KSB7XG4gICAgICAgICAgICBsZXQgcHVibGljSG9zdCA9IGRldlNlcnZlckJ1aWxkZXJDb25maWcub3B0aW9ucy5wdWJsaWNIb3N0O1xuICAgICAgICAgICAgaWYgKCEvXlxcdys6XFwvXFwvLy50ZXN0KHB1YmxpY0hvc3QpKSB7XG4gICAgICAgICAgICAgIHB1YmxpY0hvc3QgPSBgJHtkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnLm9wdGlvbnMuc3NsXG4gICAgICAgICAgICAgICAgPyAnaHR0cHMnXG4gICAgICAgICAgICAgICAgOiAnaHR0cCd9Oi8vJHtwdWJsaWNIb3N0fWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjbGllbnRVcmwgPSB1cmwucGFyc2UocHVibGljSG9zdCk7XG4gICAgICAgICAgICBiYXNlVXJsID0gdXJsLmZvcm1hdChjbGllbnRVcmwpO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5kZXZTZXJ2ZXJUYXJnZXQpIHtcbiAgICAgICAgICAgIGJhc2VVcmwgPSB1cmwuZm9ybWF0KHtcbiAgICAgICAgICAgICAgcHJvdG9jb2w6IGRldlNlcnZlckJ1aWxkZXJDb25maWcub3B0aW9ucy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnLFxuICAgICAgICAgICAgICBob3N0bmFtZTogb3B0aW9ucy5ob3N0LFxuICAgICAgICAgICAgICBwb3J0OiBkZXZTZXJ2ZXJCdWlsZGVyQ29uZmlnLm9wdGlvbnMucG9ydC50b1N0cmluZygpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2F2ZSB0aGUgY29tcHV0ZWQgYmFzZVVybCBiYWNrIHNvIHRoYXQgUHJvdHJhY3RvciBjYW4gdXNlIGl0LlxuICAgICAgICAgIG9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmw7XG5cbiAgICAgICAgICByZXR1cm4gb2YodGhpcy5jb250ZXh0LmFyY2hpdGVjdC5nZXRCdWlsZGVyKGRldlNlcnZlckRlc2NyaXB0aW9uLCB0aGlzLmNvbnRleHQpKTtcbiAgICAgICAgfSksXG4gICAgICAgIGNvbmNhdE1hcChidWlsZGVyID0+IGJ1aWxkZXIucnVuKGRldlNlcnZlckJ1aWxkZXJDb25maWcpKSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlV2ViZHJpdmVyKHByb2plY3RSb290OiBQYXRoKSB7XG4gICAgLy8gVGhlIHdlYmRyaXZlci1tYW5hZ2VyIHVwZGF0ZSBjb21tYW5kIGNhbiBvbmx5IGJlIGFjY2Vzc2VkIHZpYSBhIGRlZXAgaW1wb3J0LlxuICAgIGNvbnN0IHdlYmRyaXZlckRlZXBJbXBvcnQgPSAnd2ViZHJpdmVyLW1hbmFnZXIvYnVpbHQvbGliL2NtZHMvdXBkYXRlJztcbiAgICBsZXQgd2ViZHJpdmVyVXBkYXRlOiBhbnk7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG5cbiAgICB0cnkge1xuICAgICAgLy8gV2hlbiB1c2luZyBucG0sIHdlYmRyaXZlciBpcyB3aXRoaW4gcHJvdHJhY3Rvci9ub2RlX21vZHVsZXMuXG4gICAgICB3ZWJkcml2ZXJVcGRhdGUgPSByZXF1aXJlUHJvamVjdE1vZHVsZShnZXRTeXN0ZW1QYXRoKHByb2plY3RSb290KSxcbiAgICAgICAgYHByb3RyYWN0b3Ivbm9kZV9tb2R1bGVzLyR7d2ViZHJpdmVyRGVlcEltcG9ydH1gKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBXaGVuIHVzaW5nIHlhcm4sIHdlYmRyaXZlciBpcyBmb3VuZCBhcyBhIHJvb3QgbW9kdWxlLlxuICAgICAgICB3ZWJkcml2ZXJVcGRhdGUgPSByZXF1aXJlUHJvamVjdE1vZHVsZShnZXRTeXN0ZW1QYXRoKHByb2plY3RSb290KSwgd2ViZHJpdmVyRGVlcEltcG9ydCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBDYW5ub3QgYXV0b21hdGljYWxseSBmaW5kIHdlYmRyaXZlci1tYW5hZ2VyIHRvIHVwZGF0ZS5cbiAgICAgICAgICBVcGRhdGUgd2ViZHJpdmVyLW1hbmFnZXIgbWFudWFsbHkgYW5kIHJ1biAnbmcgZTJlIC0tbm8td2ViZHJpdmVyLXVwZGF0ZScgaW5zdGVhZC5cbiAgICAgICAgYCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcnVuIGB3ZWJkcml2ZXItbWFuYWdlciB1cGRhdGUgLS1zdGFuZGFsb25lIGZhbHNlIC0tZ2Vja28gZmFsc2UgLS1xdWlldGBcbiAgICAvLyBpZiB5b3UgY2hhbmdlIHRoaXMsIHVwZGF0ZSB0aGUgY29tbWFuZCBjb21tZW50IGluIHByZXYgbGluZSwgYW5kIGluIGBlamVjdGAgdGFza1xuICAgIHJldHVybiBmcm9tUHJvbWlzZSh3ZWJkcml2ZXJVcGRhdGUucHJvZ3JhbS5ydW4oe1xuICAgICAgc3RhbmRhbG9uZTogZmFsc2UsXG4gICAgICBnZWNrbzogZmFsc2UsXG4gICAgICBxdWlldDogdHJ1ZSxcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIF9ydW5Qcm90cmFjdG9yKHJvb3Q6IFBhdGgsIG9wdGlvbnM6IFByb3RyYWN0b3JCdWlsZGVyT3B0aW9ucyk6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IGFkZGl0aW9uYWxQcm90cmFjdG9yQ29uZmlnID0ge1xuICAgICAgZWxlbWVudEV4cGxvcmVyOiBvcHRpb25zLmVsZW1lbnRFeHBsb3JlcixcbiAgICAgIGJhc2VVcmw6IG9wdGlvbnMuYmFzZVVybCxcbiAgICAgIHNwZWM6IG9wdGlvbnMuc3BlY3MubGVuZ3RoID8gb3B0aW9ucy5zcGVjcyA6IHVuZGVmaW5lZCxcbiAgICAgIHN1aXRlOiBvcHRpb25zLnN1aXRlLFxuICAgIH07XG5cbiAgICAvLyBUT0RPOiBQcm90cmFjdG9yIG1hbmFnZXMgcHJvY2Vzcy5leGl0IGl0c2VsZiwgc28gdGhpcyB0YXJnZXQgd2lsbCBhbGx3YXlzIHF1aXQgdGhlXG4gICAgLy8gcHJvY2Vzcy4gVG8gd29yayBhcm91bmQgdGhpcyB3ZSBydW4gaXQgaW4gYSBzdWJwcm9jZXNzLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3Byb3RyYWN0b3IvaXNzdWVzLzQxNjBcbiAgICByZXR1cm4gcnVuTW9kdWxlQXNPYnNlcnZhYmxlRm9yayhcbiAgICAgIHJvb3QsXG4gICAgICAncHJvdHJhY3Rvci9idWlsdC9sYXVuY2hlcicsXG4gICAgICAnaW5pdCcsXG4gICAgICBbXG4gICAgICAgIGdldFN5c3RlbVBhdGgocmVzb2x2ZShyb290LCBub3JtYWxpemUob3B0aW9ucy5wcm90cmFjdG9yQ29uZmlnKSkpLFxuICAgICAgICBhZGRpdGlvbmFsUHJvdHJhY3RvckNvbmZpZyxcbiAgICAgIF0sXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcm90cmFjdG9yQnVpbGRlcjtcbiJdfQ==