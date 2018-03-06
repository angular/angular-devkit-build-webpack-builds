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
const fs_1 = require("fs");
const path = require("path");
const Observable_1 = require("rxjs/Observable");
const operators_1 = require("rxjs/operators");
const url = require("url");
const webpack = require("webpack");
const utils_1 = require("../angular-cli-files/models/webpack-configs/utils");
const check_port_1 = require("../angular-cli-files/utilities/check-port");
const stats_1 = require("../angular-cli-files/utilities/stats");
const _1 = require("../browser/");
const opn = require('opn');
const WebpackDevServer = require('webpack-dev-server');
class DevServerBuilder {
    constructor(context) {
        this.context = context;
    }
    run(target) {
        const root = core_1.getSystemPath(target.root);
        const options = target.options;
        return check_port_1.checkPort(options.port, options.host).pipe(operators_1.concatMap((port) => {
            options.port = port;
            return this._getBrowserOptions(options);
        }), operators_1.concatMap((browserOptions) => new Observable_1.Observable(obs => {
            const browserBuilder = new _1.BrowserBuilder(this.context);
            const webpackConfig = browserBuilder.buildWebpackConfig(target.root, browserOptions);
            const webpackCompiler = webpack(webpackConfig);
            const statsConfig = utils_1.getWebpackStatsConfig(browserOptions.verbose);
            let webpackDevServerConfig;
            try {
                webpackDevServerConfig = this._buildServerConfig(root, options, browserOptions);
            }
            catch (err) {
                obs.error(err);
                return;
            }
            // Resolve public host and client address.
            let clientAddress = `${options.ssl ? 'https' : 'http'}://0.0.0.0:0`;
            if (options.publicHost) {
                let publicHost = options.publicHost;
                if (!/^\w+:\/\//.test(publicHost)) {
                    publicHost = `${options.ssl ? 'https' : 'http'}://${publicHost}`;
                }
                const clientUrl = url.parse(publicHost);
                options.publicHost = clientUrl.host;
                clientAddress = url.format(clientUrl);
            }
            // Resolve serve address.
            const serverAddress = url.format({
                protocol: options.ssl ? 'https' : 'http',
                hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
                port: options.port.toString(),
            });
            // Add live reload config.
            if (options.liveReload) {
                this._addLiveReload(options, browserOptions, webpackConfig, clientAddress);
            }
            else if (options.hmr) {
                this.context.logger.warn('Live reload is disabled. HMR option ignored.');
            }
            if (!options.watch) {
                // There's no option to turn off file watching in webpack-dev-server, but
                // we can override the file watcher instead.
                webpackConfig.plugins.unshift({
                    // tslint:disable-next-line:no-any
                    apply: (compiler) => {
                        compiler.hooks.afterEnvironment.tap('angular-cli', () => {
                            compiler.watchFileSystem = { watch: () => { } };
                        });
                    },
                });
            }
            if (browserOptions.optimizationLevel > 0) {
                this.context.logger.error(core_1.tags.stripIndents `
            ****************************************************************************************
            This is a simple server for use in testing or debugging Angular applications locally.
            It hasn't been reviewed for security issues.

            DON'T USE IT FOR PRODUCTION!
            ****************************************************************************************
          `);
            }
            this.context.logger.info(core_1.tags.oneLine `
          **
          Angular Live Development Server is listening on ${options.host}:
          ${options.port}, open your browser on ${serverAddress}${webpackDevServerConfig.publicPath}
          **
        `);
            const server = new WebpackDevServer(webpackCompiler, webpackDevServerConfig);
            // tslint:disable-next-line:no-any
            webpackCompiler.hooks.done.tap('angular-cli', (stats) => {
                if (!browserOptions.verbose) {
                    const json = stats.toJson(statsConfig);
                    this.context.logger.info(stats_1.statsToString(json, statsConfig));
                    if (stats.hasWarnings()) {
                        this.context.logger.info(stats_1.statsWarningsToString(json, statsConfig));
                    }
                    if (stats.hasErrors()) {
                        this.context.logger.info(stats_1.statsErrorsToString(json, statsConfig));
                    }
                }
                obs.next({ success: true });
                if (options.open) {
                    opn(serverAddress + webpackDevServerConfig.publicPath);
                }
            });
            const httpServer = server.listen(options.port, options.host, (err) => {
                if (err) {
                    obs.error(err);
                }
            });
            // Node 8 has a keepAliveTimeout bug which doesn't respect active connections.
            // Connections will end after ~5 seconds (arbitrary), often not letting the full download
            // of large pieces of content, such as a vendor javascript file.  This results in browsers
            // throwing a "net::ERR_CONTENT_LENGTH_MISMATCH" error.
            // https://github.com/angular/angular-cli/issues/7197
            // https://github.com/nodejs/node/issues/13391
            // https://github.com/nodejs/node/commit/2cb6f2b281eb96a7abe16d58af6ebc9ce23d2e96
            if (/^v8.\d.\d+$/.test(process.version)) {
                httpServer.keepAliveTimeout = 30000; // 30 seconds
            }
            // Teardown logic. Close the server when unsubscribed from.
            return () => server.close();
        })));
    }
    _buildServerConfig(root, options, browserOptions) {
        if (options.disableHostCheck) {
            this.context.logger.warn(core_1.tags.oneLine `
        WARNING: Running a server with --disable-host-check is a security risk.
        See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
        for more information.
      `);
        }
        const servePath = this._buildServePath(options, browserOptions);
        const config = {
            headers: { 'Access-Control-Allow-Origin': '*' },
            historyApiFallback: {
                index: `${servePath}/${browserOptions.index}`,
                disableDotRule: true,
                htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
            },
            stats: browserOptions.verbose ? utils_1.getWebpackStatsConfig(browserOptions.verbose) : false,
            compress: browserOptions.optimizationLevel > 0,
            watchOptions: {
                poll: browserOptions.poll,
            },
            https: options.ssl,
            overlay: {
                errors: browserOptions.optimizationLevel === 0,
                warnings: false,
            },
            contentBase: false,
            public: options.publicHost,
            disableHostCheck: options.disableHostCheck,
            publicPath: servePath,
            hot: options.hmr,
        };
        if (options.ssl) {
            this._addSslConfig(root, options, config);
        }
        if (options.proxyConfig) {
            this._addProxyConfig(root, options, config);
        }
        return config;
    }
    _addLiveReload(options, browserOptions, webpackConfig, // tslint:disable-line:no-any
    clientAddress) {
        // This allows for live reload of page when changes are made to repo.
        // https://webpack.js.org/configuration/dev-server/#devserver-inline
        let webpackDevServerPath;
        try {
            webpackDevServerPath = require.resolve('webpack-dev-server/client');
        }
        catch (_a) {
            throw new Error('The "webpack-dev-server" package could not be found.');
        }
        const entryPoints = [`${webpackDevServerPath}?${clientAddress}`];
        if (options.hmr) {
            const webpackHmrLink = 'https://webpack.js.org/guides/hot-module-replacement';
            this.context.logger.warn(core_1.tags.oneLine `NOTICE: Hot Module Replacement (HMR) is enabled for the dev server.`);
            const showWarning = options.hmrWarning;
            if (showWarning) {
                this.context.logger.info(core_1.tags.stripIndents `
          The project will still live reload when HMR is enabled,
          but to take advantage of HMR additional application code is required'
          (not included in an Angular CLI project by default).'
          See ${webpackHmrLink}
          for information on working with HMR for Webpack.`);
                this.context.logger.warn(core_1.tags.oneLine `To disable this warning use "ng set warnings.hmrWarning=false".`);
            }
            entryPoints.push('webpack/hot/dev-server');
            webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
            if (browserOptions.extractCss) {
                this.context.logger.warn(core_1.tags.oneLine `NOTICE: (HMR) does not allow for CSS hot reload
                when used together with '--extract-css'.`);
            }
        }
        if (!webpackConfig.entry.main) {
            webpackConfig.entry.main = [];
        }
        webpackConfig.entry.main.unshift(...entryPoints);
    }
    _addSslConfig(root, options, config) {
        let sslKey = undefined;
        let sslCert = undefined;
        if (options.sslKey) {
            const keyPath = path.resolve(root, options.sslKey);
            if (fs_1.existsSync(keyPath)) {
                sslKey = fs_1.readFileSync(keyPath, 'utf-8');
            }
        }
        if (options.sslCert) {
            const certPath = path.resolve(root, options.sslCert);
            if (fs_1.existsSync(certPath)) {
                sslCert = fs_1.readFileSync(certPath, 'utf-8');
            }
        }
        config.https = true;
        if (sslKey != null && sslCert != null) {
            config.key = sslKey;
            config.cert = sslCert;
        }
    }
    _addProxyConfig(root, options, config) {
        let proxyConfig = {};
        const proxyPath = path.resolve(root, options.proxyConfig);
        if (fs_1.existsSync(proxyPath)) {
            proxyConfig = require(proxyPath);
        }
        else {
            const message = 'Proxy config file ' + proxyPath + ' does not exist.';
            throw new Error(message);
        }
        config.proxy = proxyConfig;
    }
    _buildServePath(options, browserOptions) {
        let servePath = options.servePath;
        if (!servePath && servePath !== '') {
            const defaultServePath = this._findDefaultServePath(browserOptions.baseHref, browserOptions.deployUrl);
            const showWarning = options.servePathDefaultWarning;
            if (defaultServePath == null && showWarning) {
                this.context.logger.warn(core_1.tags.oneLine `
            WARNING: --deploy-url and/or --base-href contain
            unsupported values for ng serve.  Default serve path of '/' used.
            Use --serve-path to override.
          `);
            }
            servePath = defaultServePath || '';
        }
        if (servePath.endsWith('/')) {
            servePath = servePath.substr(0, servePath.length - 1);
        }
        if (!servePath.startsWith('/')) {
            servePath = `/${servePath}`;
        }
        return servePath;
    }
    _findDefaultServePath(baseHref, deployUrl) {
        if (!baseHref && !deployUrl) {
            return '';
        }
        if (/^(\w+:)?\/\//.test(baseHref || '') || /^(\w+:)?\/\//.test(deployUrl || '')) {
            // If baseHref or deployUrl is absolute, unsupported by ng serve
            return null;
        }
        // normalize baseHref
        // for ng serve the starting base is always `/` so a relative
        // and root relative value are identical
        const baseHrefParts = (baseHref || '')
            .split('/')
            .filter(part => part !== '');
        if (baseHref && !baseHref.endsWith('/')) {
            baseHrefParts.pop();
        }
        const normalizedBaseHref = baseHrefParts.length === 0 ? '/' : `/${baseHrefParts.join('/')}/`;
        if (deployUrl && deployUrl[0] === '/') {
            if (baseHref && baseHref[0] === '/' && normalizedBaseHref !== deployUrl) {
                // If baseHref and deployUrl are root relative and not equivalent, unsupported by ng serve
                return null;
            }
            return deployUrl;
        }
        // Join together baseHref and deployUrl
        return `${normalizedBaseHref}${deployUrl || ''}`;
    }
    _getBrowserOptions(options) {
        const [project, target, configuration] = options.browserTarget.split(':');
        // Override browser build watch setting.
        const overrides = { watch: options.watch };
        let browserTarget;
        const browserTargetOptions = { project, target, configuration, overrides };
        browserTarget = this.context.architect.getTarget(browserTargetOptions);
        return this.context.architect.getBuilderDescription(browserTarget).pipe(operators_1.concatMap(browserDescription => this.context.architect.validateBuilderOptions(browserTarget, browserDescription)));
    }
}
exports.DevServerBuilder = DevServerBuilder;
exports.default = DevServerBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2Rldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFHSCwrQ0FBMkQ7QUFDM0QsMkJBQThDO0FBQzlDLDZCQUE2QjtBQUM3QixnREFBNkM7QUFDN0MsOENBQTJDO0FBQzNDLDJCQUEyQjtBQUMzQixtQ0FBbUM7QUFDbkMsNkVBQTBGO0FBQzFGLDBFQUFzRTtBQUN0RSxnRUFJOEM7QUFDOUMsa0NBR3FCO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBZ0R2RDtJQUVFLFlBQW1CLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUksQ0FBQztJQUUvQyxHQUFHLENBQUMsTUFBdUM7UUFDekMsTUFBTSxJQUFJLEdBQUcsb0JBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUUvQixNQUFNLENBQUMsc0JBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQy9DLHFCQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNqQixPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUVwQixNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxFQUNGLHFCQUFTLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLElBQUksdUJBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNqRCxNQUFNLGNBQWMsR0FBRyxJQUFJ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Q29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBCdWlsZEV2ZW50LCBCdWlsZGVyLCBCdWlsZGVyQ29udGV4dCwgVGFyZ2V0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBnZXRTeXN0ZW1QYXRoLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgY29uY2F0TWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgZ2V0V2VicGFja1N0YXRzQ29uZmlnIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy91dGlscyc7XG5pbXBvcnQgeyBjaGVja1BvcnQgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvY2hlY2stcG9ydCc7XG5pbXBvcnQge1xuICBzdGF0c0Vycm9yc1RvU3RyaW5nLFxuICBzdGF0c1RvU3RyaW5nLFxuICBzdGF0c1dhcm5pbmdzVG9TdHJpbmcsXG59IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9zdGF0cyc7XG5pbXBvcnQge1xuICBCcm93c2VyQnVpbGRlcixcbiAgQnJvd3NlckJ1aWxkZXJPcHRpb25zLFxufSBmcm9tICcuLi9icm93c2VyLyc7XG5jb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKTtcbmNvbnN0IFdlYnBhY2tEZXZTZXJ2ZXIgPSByZXF1aXJlKCd3ZWJwYWNrLWRldi1zZXJ2ZXInKTtcblxuXG5leHBvcnQgaW50ZXJmYWNlIERldlNlcnZlckJ1aWxkZXJPcHRpb25zIHtcbiAgYnJvd3NlclRhcmdldDogc3RyaW5nO1xuICBwb3J0OiBudW1iZXI7XG4gIGhvc3Q6IHN0cmluZztcbiAgcHJveHlDb25maWc/OiBzdHJpbmc7XG4gIHNzbDogYm9vbGVhbjtcbiAgc3NsS2V5Pzogc3RyaW5nO1xuICBzc2xDZXJ0Pzogc3RyaW5nO1xuICBvcGVuOiBib29sZWFuO1xuICBsaXZlUmVsb2FkOiBib29sZWFuO1xuICBwdWJsaWNIb3N0Pzogc3RyaW5nO1xuICBzZXJ2ZVBhdGg/OiBzdHJpbmc7XG4gIGRpc2FibGVIb3N0Q2hlY2s6IGJvb2xlYW47XG4gIGhtcjogYm9vbGVhbjtcbiAgd2F0Y2g6IGJvb2xlYW47XG4gIGhtcldhcm5pbmc6IGJvb2xlYW47XG4gIHNlcnZlUGF0aERlZmF1bHRXYXJuaW5nOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgV2VicGFja0RldlNlcnZlckNvbmZpZ3VyYXRpb25PcHRpb25zIHtcbiAgY29udGVudEJhc2U/OiBib29sZWFuIHwgc3RyaW5nIHwgc3RyaW5nW107XG4gIGhvdD86IGJvb2xlYW47XG4gIGhpc3RvcnlBcGlGYWxsYmFjaz86IHsgW2tleTogc3RyaW5nXTogYW55IH0gfCBib29sZWFuOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuICBjb21wcmVzcz86IGJvb2xlYW47XG4gIHByb3h5PzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgc3RhdGljT3B0aW9ucz86IGFueTsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgcXVpZXQ/OiBib29sZWFuO1xuICBub0luZm8/OiBib29sZWFuO1xuICBsYXp5PzogYm9vbGVhbjtcbiAgZmlsZW5hbWU/OiBzdHJpbmc7XG4gIHdhdGNoT3B0aW9ucz86IHtcbiAgICBhZ2dyZWdhdGVUaW1lb3V0PzogbnVtYmVyO1xuICAgIHBvbGw/OiBudW1iZXI7XG4gIH07XG4gIHB1YmxpY1BhdGg/OiBzdHJpbmc7XG4gIGhlYWRlcnM/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xuICBzdGF0cz86IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9IHwgc3RyaW5nIHwgYm9vbGVhbjtcbiAgaHR0cHM/OiBib29sZWFuO1xuICBrZXk/OiBzdHJpbmc7XG4gIGNlcnQ/OiBzdHJpbmc7XG4gIG92ZXJsYXk/OiBib29sZWFuIHwgeyBlcnJvcnM6IGJvb2xlYW4sIHdhcm5pbmdzOiBib29sZWFuIH07XG4gIHB1YmxpYz86IHN0cmluZztcbiAgZGlzYWJsZUhvc3RDaGVjaz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBEZXZTZXJ2ZXJCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKHRhcmdldDogVGFyZ2V0PERldlNlcnZlckJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IHJvb3QgPSBnZXRTeXN0ZW1QYXRoKHRhcmdldC5yb290KTtcbiAgICBjb25zdCBvcHRpb25zID0gdGFyZ2V0Lm9wdGlvbnM7XG5cbiAgICByZXR1cm4gY2hlY2tQb3J0KG9wdGlvbnMucG9ydCwgb3B0aW9ucy5ob3N0KS5waXBlKFxuICAgICAgY29uY2F0TWFwKChwb3J0KSA9PiB7XG4gICAgICAgIG9wdGlvbnMucG9ydCA9IHBvcnQ7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldEJyb3dzZXJPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgfSksXG4gICAgICBjb25jYXRNYXAoKGJyb3dzZXJPcHRpb25zKSA9PiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgICBjb25zdCBicm93c2VyQnVpbGRlciA9IG5ldyBCcm93c2VyQnVpbGRlcih0aGlzLmNvbnRleHQpO1xuICAgICAgICBjb25zdCB3ZWJwYWNrQ29uZmlnID0gYnJvd3NlckJ1aWxkZXIuYnVpbGRXZWJwYWNrQ29uZmlnKHRhcmdldC5yb290LCBicm93c2VyT3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHdlYnBhY2tDb21waWxlciA9IHdlYnBhY2sod2VicGFja0NvbmZpZyk7XG4gICAgICAgIGNvbnN0IHN0YXRzQ29uZmlnID0gZ2V0V2VicGFja1N0YXRzQ29uZmlnKGJyb3dzZXJPcHRpb25zLnZlcmJvc2UpO1xuXG4gICAgICAgIGxldCB3ZWJwYWNrRGV2U2VydmVyQ29uZmlnOiBXZWJwYWNrRGV2U2VydmVyQ29uZmlndXJhdGlvbk9wdGlvbnM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgd2VicGFja0RldlNlcnZlckNvbmZpZyA9IHRoaXMuX2J1aWxkU2VydmVyQ29uZmlnKHJvb3QsIG9wdGlvbnMsIGJyb3dzZXJPcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgb2JzLmVycm9yKGVycik7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXNvbHZlIHB1YmxpYyBob3N0IGFuZCBjbGllbnQgYWRkcmVzcy5cbiAgICAgICAgbGV0IGNsaWVudEFkZHJlc3MgPSBgJHtvcHRpb25zLnNzbCA/ICdodHRwcycgOiAnaHR0cCd9Oi8vMC4wLjAuMDowYDtcbiAgICAgICAgaWYgKG9wdGlvbnMucHVibGljSG9zdCkge1xuICAgICAgICAgIGxldCBwdWJsaWNIb3N0ID0gb3B0aW9ucy5wdWJsaWNIb3N0O1xuICAgICAgICAgIGlmICghL15cXHcrOlxcL1xcLy8udGVzdChwdWJsaWNIb3N0KSkge1xuICAgICAgICAgICAgcHVibGljSG9zdCA9IGAke29wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJ306Ly8ke3B1YmxpY0hvc3R9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgY2xpZW50VXJsID0gdXJsLnBhcnNlKHB1YmxpY0hvc3QpO1xuICAgICAgICAgIG9wdGlvbnMucHVibGljSG9zdCA9IGNsaWVudFVybC5ob3N0O1xuICAgICAgICAgIGNsaWVudEFkZHJlc3MgPSB1cmwuZm9ybWF0KGNsaWVudFVybCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXNvbHZlIHNlcnZlIGFkZHJlc3MuXG4gICAgICAgIGNvbnN0IHNlcnZlckFkZHJlc3MgPSB1cmwuZm9ybWF0KHtcbiAgICAgICAgICBwcm90b2NvbDogb3B0aW9ucy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnLFxuICAgICAgICAgIGhvc3RuYW1lOiBvcHRpb25zLmhvc3QgPT09ICcwLjAuMC4wJyA/ICdsb2NhbGhvc3QnIDogb3B0aW9ucy5ob3N0LFxuICAgICAgICAgIHBvcnQ6IG9wdGlvbnMucG9ydC50b1N0cmluZygpLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgbGl2ZSByZWxvYWQgY29uZmlnLlxuICAgICAgICBpZiAob3B0aW9ucy5saXZlUmVsb2FkKSB7XG4gICAgICAgICAgdGhpcy5fYWRkTGl2ZVJlbG9hZChvcHRpb25zLCBicm93c2VyT3B0aW9ucywgd2VicGFja0NvbmZpZywgY2xpZW50QWRkcmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5obXIpIHtcbiAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oJ0xpdmUgcmVsb2FkIGlzIGRpc2FibGVkLiBITVIgb3B0aW9uIGlnbm9yZWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdGlvbnMud2F0Y2gpIHtcbiAgICAgICAgICAvLyBUaGVyZSdzIG5vIG9wdGlvbiB0byB0dXJuIG9mZiBmaWxlIHdhdGNoaW5nIGluIHdlYnBhY2stZGV2LXNlcnZlciwgYnV0XG4gICAgICAgICAgLy8gd2UgY2FuIG92ZXJyaWRlIHRoZSBmaWxlIHdhdGNoZXIgaW5zdGVhZC5cbiAgICAgICAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMudW5zaGlmdCh7XG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICBhcHBseTogKGNvbXBpbGVyOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgY29tcGlsZXIuaG9va3MuYWZ0ZXJFbnZpcm9ubWVudC50YXAoJ2FuZ3VsYXItY2xpJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbXBpbGVyLndhdGNoRmlsZVN5c3RlbSA9IHsgd2F0Y2g6ICgpID0+IHsgfSB9O1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYnJvd3Nlck9wdGlvbnMub3B0aW1pemF0aW9uTGV2ZWwgPiAwKSB7XG4gICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgICAgIFRoaXMgaXMgYSBzaW1wbGUgc2VydmVyIGZvciB1c2UgaW4gdGVzdGluZyBvciBkZWJ1Z2dpbmcgQW5ndWxhciBhcHBsaWNhdGlvbnMgbG9jYWxseS5cbiAgICAgICAgICAgIEl0IGhhc24ndCBiZWVuIHJldmlld2VkIGZvciBzZWN1cml0eSBpc3N1ZXMuXG5cbiAgICAgICAgICAgIERPTidUIFVTRSBJVCBGT1IgUFJPRFVDVElPTiFcbiAgICAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgICBgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyh0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgKipcbiAgICAgICAgICBBbmd1bGFyIExpdmUgRGV2ZWxvcG1lbnQgU2VydmVyIGlzIGxpc3RlbmluZyBvbiAke29wdGlvbnMuaG9zdH06XG4gICAgICAgICAgJHtvcHRpb25zLnBvcnR9LCBvcGVuIHlvdXIgYnJvd3NlciBvbiAke3NlcnZlckFkZHJlc3N9JHt3ZWJwYWNrRGV2U2VydmVyQ29uZmlnLnB1YmxpY1BhdGh9XG4gICAgICAgICAgKipcbiAgICAgICAgYCk7XG5cbiAgICAgICAgY29uc3Qgc2VydmVyID0gbmV3IFdlYnBhY2tEZXZTZXJ2ZXIod2VicGFja0NvbXBpbGVyLCB3ZWJwYWNrRGV2U2VydmVyQ29uZmlnKTtcblxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICh3ZWJwYWNrQ29tcGlsZXIgYXMgYW55KS5ob29rcy5kb25lLnRhcCgnYW5ndWxhci1jbGknLCAoc3RhdHM6IHdlYnBhY2suU3RhdHMpID0+IHtcbiAgICAgICAgICBpZiAoIWJyb3dzZXJPcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGpzb24gPSBzdGF0cy50b0pzb24oc3RhdHNDb25maWcpO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHN0YXRzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICAgIGlmIChzdGF0cy5oYXNXYXJuaW5ncygpKSB7XG4gICAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0c1dhcm5pbmdzVG9TdHJpbmcoanNvbiwgc3RhdHNDb25maWcpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGF0cy5oYXNFcnJvcnMoKSkge1xuICAgICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oc3RhdHNFcnJvcnNUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgICAgICBpZiAob3B0aW9ucy5vcGVuKSB7XG4gICAgICAgICAgICBvcG4oc2VydmVyQWRkcmVzcyArIHdlYnBhY2tEZXZTZXJ2ZXJDb25maWcucHVibGljUGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBodHRwU2VydmVyID0gc2VydmVyLmxpc3RlbihcbiAgICAgICAgICBvcHRpb25zLnBvcnQsXG4gICAgICAgICAgb3B0aW9ucy5ob3N0LFxuICAgICAgICAgIChlcnI6IGFueSkgPT4geyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICBvYnMuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIE5vZGUgOCBoYXMgYSBrZWVwQWxpdmVUaW1lb3V0IGJ1ZyB3aGljaCBkb2Vzbid0IHJlc3BlY3QgYWN0aXZlIGNvbm5lY3Rpb25zLlxuICAgICAgICAvLyBDb25uZWN0aW9ucyB3aWxsIGVuZCBhZnRlciB+NSBzZWNvbmRzIChhcmJpdHJhcnkpLCBvZnRlbiBub3QgbGV0dGluZyB0aGUgZnVsbCBkb3dubG9hZFxuICAgICAgICAvLyBvZiBsYXJnZSBwaWVjZXMgb2YgY29udGVudCwgc3VjaCBhcyBhIHZlbmRvciBqYXZhc2NyaXB0IGZpbGUuICBUaGlzIHJlc3VsdHMgaW4gYnJvd3NlcnNcbiAgICAgICAgLy8gdGhyb3dpbmcgYSBcIm5ldDo6RVJSX0NPTlRFTlRfTEVOR1RIX01JU01BVENIXCIgZXJyb3IuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL2lzc3Vlcy83MTk3XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvMTMzOTFcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2NvbW1pdC8yY2I2ZjJiMjgxZWI5NmE3YWJlMTZkNThhZjZlYmM5Y2UyM2QyZTk2XG4gICAgICAgIGlmICgvXnY4LlxcZC5cXGQrJC8udGVzdChwcm9jZXNzLnZlcnNpb24pKSB7XG4gICAgICAgICAgaHR0cFNlcnZlci5rZWVwQWxpdmVUaW1lb3V0ID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlYXJkb3duIGxvZ2ljLiBDbG9zZSB0aGUgc2VydmVyIHdoZW4gdW5zdWJzY3JpYmVkIGZyb20uXG4gICAgICAgIHJldHVybiAoKSA9PiBzZXJ2ZXIuY2xvc2UoKTtcbiAgICAgIH0pKSk7XG4gIH1cblxuICBwcml2YXRlIF9idWlsZFNlcnZlckNvbmZpZyhcbiAgICByb290OiBzdHJpbmcsXG4gICAgb3B0aW9uczogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gICAgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyxcbiAgKSB7XG4gICAgaWYgKG9wdGlvbnMuZGlzYWJsZUhvc3RDaGVjaykge1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgV0FSTklORzogUnVubmluZyBhIHNlcnZlciB3aXRoIC0tZGlzYWJsZS1ob3N0LWNoZWNrIGlzIGEgc2VjdXJpdHkgcmlzay5cbiAgICAgICAgU2VlIGh0dHBzOi8vbWVkaXVtLmNvbS93ZWJwYWNrL3dlYnBhY2stZGV2LXNlcnZlci1taWRkbGV3YXJlLXNlY3VyaXR5LWlzc3Vlcy0xNDg5ZDk1MDg3NGFcbiAgICAgICAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICBgKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZVBhdGggPSB0aGlzLl9idWlsZFNlcnZlUGF0aChvcHRpb25zLCBicm93c2VyT3B0aW9ucyk7XG5cbiAgICBjb25zdCBjb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXJDb25maWd1cmF0aW9uT3B0aW9ucyA9IHtcbiAgICAgIGhlYWRlcnM6IHsgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyB9LFxuICAgICAgaGlzdG9yeUFwaUZhbGxiYWNrOiB7XG4gICAgICAgIGluZGV4OiBgJHtzZXJ2ZVBhdGh9LyR7YnJvd3Nlck9wdGlvbnMuaW5kZXh9YCxcbiAgICAgICAgZGlzYWJsZURvdFJ1bGU6IHRydWUsXG4gICAgICAgIGh0bWxBY2NlcHRIZWFkZXJzOiBbJ3RleHQvaHRtbCcsICdhcHBsaWNhdGlvbi94aHRtbCt4bWwnXSxcbiAgICAgIH0sXG4gICAgICBzdGF0czogYnJvd3Nlck9wdGlvbnMudmVyYm9zZSA/IGdldFdlYnBhY2tTdGF0c0NvbmZpZyhicm93c2VyT3B0aW9ucy52ZXJib3NlKSA6IGZhbHNlLFxuICAgICAgY29tcHJlc3M6IGJyb3dzZXJPcHRpb25zLm9wdGltaXphdGlvbkxldmVsID4gMCxcbiAgICAgIHdhdGNoT3B0aW9uczoge1xuICAgICAgICBwb2xsOiBicm93c2VyT3B0aW9ucy5wb2xsLFxuICAgICAgfSxcbiAgICAgIGh0dHBzOiBvcHRpb25zLnNzbCxcbiAgICAgIG92ZXJsYXk6IHtcbiAgICAgICAgZXJyb3JzOiBicm93c2VyT3B0aW9ucy5vcHRpbWl6YXRpb25MZXZlbCA9PT0gMCxcbiAgICAgICAgd2FybmluZ3M6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGNvbnRlbnRCYXNlOiBmYWxzZSxcbiAgICAgIHB1YmxpYzogb3B0aW9ucy5wdWJsaWNIb3N0LFxuICAgICAgZGlzYWJsZUhvc3RDaGVjazogb3B0aW9ucy5kaXNhYmxlSG9zdENoZWNrLFxuICAgICAgcHVibGljUGF0aDogc2VydmVQYXRoLFxuICAgICAgaG90OiBvcHRpb25zLmhtcixcbiAgICB9O1xuXG4gICAgaWYgKG9wdGlvbnMuc3NsKSB7XG4gICAgICB0aGlzLl9hZGRTc2xDb25maWcocm9vdCwgb3B0aW9ucywgY29uZmlnKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5wcm94eUNvbmZpZykge1xuICAgICAgdGhpcy5fYWRkUHJveHlDb25maWcocm9vdCwgb3B0aW9ucywgY29uZmlnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRkTGl2ZVJlbG9hZChcbiAgICBvcHRpb25zOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyxcbiAgICBicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJPcHRpb25zLFxuICAgIHdlYnBhY2tDb25maWc6IGFueSwgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICBjbGllbnRBZGRyZXNzOiBzdHJpbmcsXG4gICkge1xuICAgIC8vIFRoaXMgYWxsb3dzIGZvciBsaXZlIHJlbG9hZCBvZiBwYWdlIHdoZW4gY2hhbmdlcyBhcmUgbWFkZSB0byByZXBvLlxuICAgIC8vIGh0dHBzOi8vd2VicGFjay5qcy5vcmcvY29uZmlndXJhdGlvbi9kZXYtc2VydmVyLyNkZXZzZXJ2ZXItaW5saW5lXG4gICAgbGV0IHdlYnBhY2tEZXZTZXJ2ZXJQYXRoO1xuICAgIHRyeSB7XG4gICAgICB3ZWJwYWNrRGV2U2VydmVyUGF0aCA9IHJlcXVpcmUucmVzb2x2ZSgnd2VicGFjay1kZXYtc2VydmVyL2NsaWVudCcpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgXCJ3ZWJwYWNrLWRldi1zZXJ2ZXJcIiBwYWNrYWdlIGNvdWxkIG5vdCBiZSBmb3VuZC4nKTtcbiAgICB9XG4gICAgY29uc3QgZW50cnlQb2ludHMgPSBbYCR7d2VicGFja0RldlNlcnZlclBhdGh9PyR7Y2xpZW50QWRkcmVzc31gXTtcbiAgICBpZiAob3B0aW9ucy5obXIpIHtcbiAgICAgIGNvbnN0IHdlYnBhY2tIbXJMaW5rID0gJ2h0dHBzOi8vd2VicGFjay5qcy5vcmcvZ3VpZGVzL2hvdC1tb2R1bGUtcmVwbGFjZW1lbnQnO1xuXG4gICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgIHRhZ3Mub25lTGluZWBOT1RJQ0U6IEhvdCBNb2R1bGUgUmVwbGFjZW1lbnQgKEhNUikgaXMgZW5hYmxlZCBmb3IgdGhlIGRldiBzZXJ2ZXIuYCk7XG5cbiAgICAgIGNvbnN0IHNob3dXYXJuaW5nID0gb3B0aW9ucy5obXJXYXJuaW5nO1xuICAgICAgaWYgKHNob3dXYXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBUaGUgcHJvamVjdCB3aWxsIHN0aWxsIGxpdmUgcmVsb2FkIHdoZW4gSE1SIGlzIGVuYWJsZWQsXG4gICAgICAgICAgYnV0IHRvIHRha2UgYWR2YW50YWdlIG9mIEhNUiBhZGRpdGlvbmFsIGFwcGxpY2F0aW9uIGNvZGUgaXMgcmVxdWlyZWQnXG4gICAgICAgICAgKG5vdCBpbmNsdWRlZCBpbiBhbiBBbmd1bGFyIENMSSBwcm9qZWN0IGJ5IGRlZmF1bHQpLidcbiAgICAgICAgICBTZWUgJHt3ZWJwYWNrSG1yTGlua31cbiAgICAgICAgICBmb3IgaW5mb3JtYXRpb24gb24gd29ya2luZyB3aXRoIEhNUiBmb3IgV2VicGFjay5gLFxuICAgICAgICApO1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgICAgdGFncy5vbmVMaW5lYFRvIGRpc2FibGUgdGhpcyB3YXJuaW5nIHVzZSBcIm5nIHNldCB3YXJuaW5ncy5obXJXYXJuaW5nPWZhbHNlXCIuYCk7XG4gICAgICB9XG4gICAgICBlbnRyeVBvaW50cy5wdXNoKCd3ZWJwYWNrL2hvdC9kZXYtc2VydmVyJyk7XG4gICAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgd2VicGFjay5Ib3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpbigpKTtcbiAgICAgIGlmIChicm93c2VyT3B0aW9ucy5leHRyYWN0Q3NzKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgTk9USUNFOiAoSE1SKSBkb2VzIG5vdCBhbGxvdyBmb3IgQ1NTIGhvdCByZWxvYWRcbiAgICAgICAgICAgICAgICB3aGVuIHVzZWQgdG9nZXRoZXIgd2l0aCAnLS1leHRyYWN0LWNzcycuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghd2VicGFja0NvbmZpZy5lbnRyeS5tYWluKSB7IHdlYnBhY2tDb25maWcuZW50cnkubWFpbiA9IFtdOyB9XG4gICAgd2VicGFja0NvbmZpZy5lbnRyeS5tYWluLnVuc2hpZnQoLi4uZW50cnlQb2ludHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRkU3NsQ29uZmlnKFxuICAgIHJvb3Q6IHN0cmluZyxcbiAgICBvcHRpb25zOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyxcbiAgICBjb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXJDb25maWd1cmF0aW9uT3B0aW9ucyxcbiAgKSB7XG4gICAgbGV0IHNzbEtleTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBzc2xDZXJ0OiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKG9wdGlvbnMuc3NsS2V5KSB7XG4gICAgICBjb25zdCBrZXlQYXRoID0gcGF0aC5yZXNvbHZlKHJvb3QsIG9wdGlvbnMuc3NsS2V5IGFzIHN0cmluZyk7XG4gICAgICBpZiAoZXhpc3RzU3luYyhrZXlQYXRoKSkge1xuICAgICAgICBzc2xLZXkgPSByZWFkRmlsZVN5bmMoa2V5UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnNzbENlcnQpIHtcbiAgICAgIGNvbnN0IGNlcnRQYXRoID0gcGF0aC5yZXNvbHZlKHJvb3QsIG9wdGlvbnMuc3NsQ2VydCBhcyBzdHJpbmcpO1xuICAgICAgaWYgKGV4aXN0c1N5bmMoY2VydFBhdGgpKSB7XG4gICAgICAgIHNzbENlcnQgPSByZWFkRmlsZVN5bmMoY2VydFBhdGgsICd1dGYtOCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbmZpZy5odHRwcyA9IHRydWU7XG4gICAgaWYgKHNzbEtleSAhPSBudWxsICYmIHNzbENlcnQgIT0gbnVsbCkge1xuICAgICAgY29uZmlnLmtleSA9IHNzbEtleTtcbiAgICAgIGNvbmZpZy5jZXJ0ID0gc3NsQ2VydDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hZGRQcm94eUNvbmZpZyhcbiAgICByb290OiBzdHJpbmcsXG4gICAgb3B0aW9uczogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gICAgY29uZmlnOiBXZWJwYWNrRGV2U2VydmVyQ29uZmlndXJhdGlvbk9wdGlvbnMsXG4gICkge1xuICAgIGxldCBwcm94eUNvbmZpZyA9IHt9O1xuICAgIGNvbnN0IHByb3h5UGF0aCA9IHBhdGgucmVzb2x2ZShyb290LCBvcHRpb25zLnByb3h5Q29uZmlnIGFzIHN0cmluZyk7XG4gICAgaWYgKGV4aXN0c1N5bmMocHJveHlQYXRoKSkge1xuICAgICAgcHJveHlDb25maWcgPSByZXF1aXJlKHByb3h5UGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnUHJveHkgY29uZmlnIGZpbGUgJyArIHByb3h5UGF0aCArICcgZG9lcyBub3QgZXhpc3QuJztcbiAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICB9XG4gICAgY29uZmlnLnByb3h5ID0gcHJveHlDb25maWc7XG4gIH1cblxuICBwcml2YXRlIF9idWlsZFNlcnZlUGF0aChvcHRpb25zOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucykge1xuICAgIGxldCBzZXJ2ZVBhdGggPSBvcHRpb25zLnNlcnZlUGF0aDtcbiAgICBpZiAoIXNlcnZlUGF0aCAmJiBzZXJ2ZVBhdGggIT09ICcnKSB7XG4gICAgICBjb25zdCBkZWZhdWx0U2VydmVQYXRoID1cbiAgICAgICAgdGhpcy5fZmluZERlZmF1bHRTZXJ2ZVBhdGgoYnJvd3Nlck9wdGlvbnMuYmFzZUhyZWYsIGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCk7XG4gICAgICBjb25zdCBzaG93V2FybmluZyA9IG9wdGlvbnMuc2VydmVQYXRoRGVmYXVsdFdhcm5pbmc7XG4gICAgICBpZiAoZGVmYXVsdFNlcnZlUGF0aCA9PSBudWxsICYmIHNob3dXYXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBXQVJOSU5HOiAtLWRlcGxveS11cmwgYW5kL29yIC0tYmFzZS1ocmVmIGNvbnRhaW5cbiAgICAgICAgICAgIHVuc3VwcG9ydGVkIHZhbHVlcyBmb3Igbmcgc2VydmUuICBEZWZhdWx0IHNlcnZlIHBhdGggb2YgJy8nIHVzZWQuXG4gICAgICAgICAgICBVc2UgLS1zZXJ2ZS1wYXRoIHRvIG92ZXJyaWRlLlxuICAgICAgICAgIGApO1xuICAgICAgfVxuICAgICAgc2VydmVQYXRoID0gZGVmYXVsdFNlcnZlUGF0aCB8fCAnJztcbiAgICB9XG4gICAgaWYgKHNlcnZlUGF0aC5lbmRzV2l0aCgnLycpKSB7XG4gICAgICBzZXJ2ZVBhdGggPSBzZXJ2ZVBhdGguc3Vic3RyKDAsIHNlcnZlUGF0aC5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgaWYgKCFzZXJ2ZVBhdGguc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICBzZXJ2ZVBhdGggPSBgLyR7c2VydmVQYXRofWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlcnZlUGF0aDtcbiAgfVxuXG4gIHByaXZhdGUgX2ZpbmREZWZhdWx0U2VydmVQYXRoKGJhc2VIcmVmPzogc3RyaW5nLCBkZXBsb3lVcmw/OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBpZiAoIWJhc2VIcmVmICYmICFkZXBsb3lVcmwpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICBpZiAoL14oXFx3KzopP1xcL1xcLy8udGVzdChiYXNlSHJlZiB8fCAnJykgfHwgL14oXFx3KzopP1xcL1xcLy8udGVzdChkZXBsb3lVcmwgfHwgJycpKSB7XG4gICAgICAvLyBJZiBiYXNlSHJlZiBvciBkZXBsb3lVcmwgaXMgYWJzb2x1dGUsIHVuc3VwcG9ydGVkIGJ5IG5nIHNlcnZlXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBub3JtYWxpemUgYmFzZUhyZWZcbiAgICAvLyBmb3Igbmcgc2VydmUgdGhlIHN0YXJ0aW5nIGJhc2UgaXMgYWx3YXlzIGAvYCBzbyBhIHJlbGF0aXZlXG4gICAgLy8gYW5kIHJvb3QgcmVsYXRpdmUgdmFsdWUgYXJlIGlkZW50aWNhbFxuICAgIGNvbnN0IGJhc2VIcmVmUGFydHMgPSAoYmFzZUhyZWYgfHwgJycpXG4gICAgICAuc3BsaXQoJy8nKVxuICAgICAgLmZpbHRlcihwYXJ0ID0+IHBhcnQgIT09ICcnKTtcbiAgICBpZiAoYmFzZUhyZWYgJiYgIWJhc2VIcmVmLmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIGJhc2VIcmVmUGFydHMucG9wKCk7XG4gICAgfVxuICAgIGNvbnN0IG5vcm1hbGl6ZWRCYXNlSHJlZiA9IGJhc2VIcmVmUGFydHMubGVuZ3RoID09PSAwID8gJy8nIDogYC8ke2Jhc2VIcmVmUGFydHMuam9pbignLycpfS9gO1xuXG4gICAgaWYgKGRlcGxveVVybCAmJiBkZXBsb3lVcmxbMF0gPT09ICcvJykge1xuICAgICAgaWYgKGJhc2VIcmVmICYmIGJhc2VIcmVmWzBdID09PSAnLycgJiYgbm9ybWFsaXplZEJhc2VIcmVmICE9PSBkZXBsb3lVcmwpIHtcbiAgICAgICAgLy8gSWYgYmFzZUhyZWYgYW5kIGRlcGxveVVybCBhcmUgcm9vdCByZWxhdGl2ZSBhbmQgbm90IGVxdWl2YWxlbnQsIHVuc3VwcG9ydGVkIGJ5IG5nIHNlcnZlXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVwbG95VXJsO1xuICAgIH1cblxuICAgIC8vIEpvaW4gdG9nZXRoZXIgYmFzZUhyZWYgYW5kIGRlcGxveVVybFxuICAgIHJldHVybiBgJHtub3JtYWxpemVkQmFzZUhyZWZ9JHtkZXBsb3lVcmwgfHwgJyd9YDtcbiAgfVxuXG4gIHByaXZhdGUgX2dldEJyb3dzZXJPcHRpb25zKG9wdGlvbnM6IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG4gICAgY29uc3QgW3Byb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbl0gPSBvcHRpb25zLmJyb3dzZXJUYXJnZXQuc3BsaXQoJzonKTtcbiAgICAvLyBPdmVycmlkZSBicm93c2VyIGJ1aWxkIHdhdGNoIHNldHRpbmcuXG4gICAgY29uc3Qgb3ZlcnJpZGVzID0geyB3YXRjaDogb3B0aW9ucy53YXRjaCB9O1xuICAgIGxldCBicm93c2VyVGFyZ2V0OiBUYXJnZXQ8QnJvd3NlckJ1aWxkZXJPcHRpb25zPjtcblxuICAgIGNvbnN0IGJyb3dzZXJUYXJnZXRPcHRpb25zID0geyBwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb24sIG92ZXJyaWRlcyB9O1xuICAgIGJyb3dzZXJUYXJnZXQgPSB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LmdldFRhcmdldDxCcm93c2VyQnVpbGRlck9wdGlvbnM+KGJyb3dzZXJUYXJnZXRPcHRpb25zKTtcblxuICAgIHJldHVybiB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihicm93c2VyVGFyZ2V0KS5waXBlKFxuICAgICAgY29uY2F0TWFwKGJyb3dzZXJEZXNjcmlwdGlvbiA9PlxuICAgICAgICB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0LnZhbGlkYXRlQnVpbGRlck9wdGlvbnMoYnJvd3NlclRhcmdldCwgYnJvd3NlckRlc2NyaXB0aW9uKSksXG4gICAgKTtcbiAgfVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IERldlNlcnZlckJ1aWxkZXI7XG4iXX0=