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
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        return check_port_1.checkPort(options.port, options.host).pipe(operators_1.concatMap((port) => {
            options.port = port;
            return this._getBrowserOptions(options);
        }), operators_1.concatMap((browserOptions) => new Observable_1.Observable(obs => {
            const browserBuilder = new _1.BrowserBuilder(this.context);
            const webpackConfig = browserBuilder.buildWebpackConfig(root, projectRoot, browserOptions);
            const webpackCompiler = webpack(webpackConfig);
            const statsConfig = utils_1.getWebpackStatsConfig(browserOptions.verbose);
            let webpackDevServerConfig;
            try {
                webpackDevServerConfig = this._buildServerConfig(root, projectRoot, options, browserOptions);
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
    _buildServerConfig(root, projectRoot, options, browserOptions) {
        const systemRoot = core_1.getSystemPath(root);
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
                index: `${servePath}/${path.relative(projectRoot, path.resolve(root, browserOptions.index))}`,
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
            this._addSslConfig(systemRoot, options, config);
        }
        if (options.proxyConfig) {
            this._addProxyConfig(systemRoot, options, config);
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
        const architect = this.context.architect;
        const [project, target, configuration] = options.browserTarget.split(':');
        // Override browser build watch setting.
        const overrides = { watch: options.watch };
        const browserTargetSpec = { project, target, configuration, overrides };
        const builderConfig = architect.getBuilderConfiguration(browserTargetSpec);
        return architect.getBuilderDescription(builderConfig).pipe(operators_1.concatMap(browserDescription => architect.validateBuilderOptions(builderConfig, browserDescription)), operators_1.map(browserConfig => browserConfig.options));
    }
}
exports.DevServerBuilder = DevServerBuilder;
exports.default = DevServerBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2Rldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFRSCwrQ0FBMEU7QUFDMUUsMkJBQThDO0FBQzlDLDZCQUE2QjtBQUM3QixnREFBNkM7QUFDN0MsOENBQWdEO0FBQ2hELDJCQUEyQjtBQUMzQixtQ0FBbUM7QUFDbkMsNkVBQTBGO0FBQzFGLDBFQUFzRTtBQUN0RSxnRUFJOEM7QUFDOUMsa0NBR3FCO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBZ0R2RDtJQUVFLFlBQW1CLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUksQ0FBQztJQUUvQyxHQUFHLENBQUMsYUFBNEQ7UUFDOUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFDekMsTUFBTSxXQUFXLEdBQUcsY0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEQsTUFBTSxDQUFDLHNCQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUMvQyxxQkFBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDakIsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFFcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsRUFDRixxQkFBUyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxJQUFJLHVCQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakQsTUFBTSxjQUFjLEdBQUcsSUFBSSxpQkFBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4RCxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUMzRixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDL0MsTUFBTSxXQUFXLEdBQUcsNkJBQXFCLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWxFLElBQUksc0JBQTRELENBQUM7WUFDakUsSUFBSSxDQUFDO2dCQUNILHNCQUFzQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FDOUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFZixNQUFNLENBQUM7WUFDVCxDQUFDO1lBRUQsMENBQTBDO1lBQzFDLElBQUksYUFBYSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLGNBQWMsQ0FBQztZQUNwRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztnQkFDcEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEMsVUFBVSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLE1BQU0sVUFBVSxFQUFFLENBQUM7Z0JBQ25FLENBQUM7Z0JBQ0QsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEMsT0FBTyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO2dCQUNwQyxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBRUQseUJBQXlCO1lBQ3pCLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7Z0JBQy9CLFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU07Z0JBQ3hDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSTtnQkFDakUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO2FBQzlCLENBQUMsQ0FBQztZQUVILDBCQUEwQjtZQUMxQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM3RSxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsOENBQThDLENBQUMsQ0FBQztZQUMzRSxDQUFDO1lBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDbkIseUVBQXlFO2dCQUN6RSw0Q0FBNEM7Z0JBQzVDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO29CQUM1QixrQ0FBa0M7b0JBQ2xDLEtBQUssRUFBRSxDQUFDLFFBQWEsRUFBRSxFQUFFO3dCQUN2QixRQUFRLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFOzRCQUN0RCxRQUFRLENBQUMsZUFBZSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUNsRCxDQUFDLENBQUMsQ0FBQztvQkFDTCxDQUFDO2lCQUNGLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUE7Ozs7Ozs7V0FPMUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsT0FBTyxDQUFBOzs0REFFZSxPQUFPLENBQUMsSUFBSTtZQUM1RCxPQUFPLENBQUMsSUFBSSwwQkFBMEIsYUFBYSxHQUFHLHNCQUFzQixDQUFDLFVBQVU7O1NBRTFGLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLElBQUksZ0JBQWdCLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFFN0Usa0NBQWtDO1lBQ2pDLGVBQXVCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUMsS0FBb0IsRUFBRSxFQUFFO2dCQUM5RSxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUM1QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUN2QyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQWEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDM0QsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUFxQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO29CQUNyRSxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQywyQkFBbUIsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDbkUsQ0FBQztnQkFDSCxDQUFDO2dCQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFFNUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLEdBQUcsQ0FBQyxhQUFhLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3pELENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQ1osT0FBTyxDQUFDLElBQUksRUFDWixDQUFDLEdBQVEsRUFBRSxFQUFFO2dCQUNYLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ1IsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakIsQ0FBQztZQUNILENBQUMsQ0FDRixDQUFDO1lBRUYsOEVBQThFO1lBQzlFLHlGQUF5RjtZQUN6RiwwRkFBMEY7WUFDMUYsdURBQXVEO1lBQ3ZELHFEQUFxRDtZQUNyRCw4Q0FBOEM7WUFDOUMsaUZBQWlGO1lBQ2pGLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEMsVUFBVSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxDQUFDLGFBQWE7WUFDcEQsQ0FBQztZQUVELDJEQUEyRDtZQUMzRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNULENBQUM7SUFFTyxrQkFBa0IsQ0FDeEIsSUFBVSxFQUNWLFdBQWlCLEVBQ2pCLE9BQWdDLEVBQ2hDLGNBQXFDO1FBRXJDLE1BQU0sVUFBVSxHQUFHLG9CQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTs7OztPQUlwQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFaEUsTUFBTSxNQUFNLEdBQXlDO1lBQ25ELE9BQU8sRUFBRSxFQUFFLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtZQUMvQyxrQkFBa0IsRUFBRTtnQkFDbEIsS0FBSyxFQUFFLEdBQUcsU0FBUyxJQUNqQixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQ25FLEVBQUU7Z0JBQ0osY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGlCQUFpQixFQUFFLENBQUMsV0FBVyxFQUFFLHVCQUF1QixDQUFDO2FBQzFEO1lBQ0QsS0FBSyxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDZCQUFxQixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztZQUNyRixRQUFRLEVBQUUsY0FBYyxDQUFDLGlCQUFpQixHQUFHLENBQUM7WUFDOUMsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSTthQUMxQjtZQUNELEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRztZQUNsQixPQUFPLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGNBQWMsQ0FBQyxpQkFBaUIsS0FBSyxDQUFDO2dCQUM5QyxRQUFRLEVBQUUsS0FBSzthQUNoQjtZQUNELFdBQVcsRUFBRSxLQUFLO1lBQ2xCLE1BQU0sRUFBRSxPQUFPLENBQUMsVUFBVTtZQUMxQixnQkFBZ0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCO1lBQzFDLFVBQVUsRUFBRSxTQUFTO1lBQ3JCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztTQUNqQixDQUFDO1FBRUYsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUVELE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVPLGNBQWMsQ0FDcEIsT0FBZ0MsRUFDaEMsY0FBcUMsRUFDckMsYUFBa0IsRUFBRSw2QkFBNkI7SUFDakQsYUFBcUI7UUFFckIscUVBQXFFO1FBQ3JFLG9FQUFvRTtRQUNwRSxJQUFJLG9CQUFvQixDQUFDO1FBQ3pCLElBQUksQ0FBQztZQUNILG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBQUMsS0FBSyxDQUFDLENBQUMsSUFBRCxDQUFDO1lBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsb0JBQW9CLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQztRQUNqRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNoQixNQUFNLGNBQWMsR0FBRyxzREFBc0QsQ0FBQztZQUU5RSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ3RCLFdBQUksQ0FBQyxPQUFPLENBQUEscUVBQXFFLENBQUMsQ0FBQztZQUVyRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQ3ZDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsWUFBWSxDQUFBOzs7O2dCQUlsQyxjQUFjOzJEQUM2QixDQUNsRCxDQUFDO2dCQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDdEIsV0FBSSxDQUFDLE9BQU8sQ0FBQSxpRUFBaUUsQ0FBQyxDQUFDO1lBQ25GLENBQUM7WUFDRCxXQUFXLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDM0MsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTt5REFDWSxDQUFDLENBQUM7WUFDckQsQ0FBQztRQUNILENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUFDLENBQUM7UUFDakUsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVPLGFBQWEsQ0FDbkIsSUFBWSxFQUNaLE9BQWdDLEVBQ2hDLE1BQTRDO1FBRTVDLElBQUksTUFBTSxHQUF1QixTQUFTLENBQUM7UUFDM0MsSUFBSSxPQUFPLEdBQXVCLFNBQVMsQ0FBQztRQUM1QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNuQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsTUFBZ0IsQ0FBQyxDQUFDO1lBQzdELEVBQUUsQ0FBQyxDQUFDLGVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sR0FBRyxpQkFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMxQyxDQUFDO1FBQ0gsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFpQixDQUFDLENBQUM7WUFDL0QsRUFBRSxDQUFDLENBQUMsZUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekIsT0FBTyxHQUFHLGlCQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQztZQUNwQixNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztRQUN4QixDQUFDO0lBQ0gsQ0FBQztJQUVPLGVBQWUsQ0FDckIsSUFBWSxFQUNaLE9BQWdDLEVBQ2hDLE1BQTRDO1FBRTVDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUNyQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsV0FBcUIsQ0FBQyxDQUFDO1FBQ3BFLEVBQUUsQ0FBQyxDQUFDLGVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsV0FBVyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixNQUFNLE9BQU8sR0FBRyxvQkFBb0IsR0FBRyxTQUFTLEdBQUcsa0JBQWtCLENBQUM7WUFDdEUsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBQ0QsTUFBTSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUM7SUFDN0IsQ0FBQztJQUVPLGVBQWUsQ0FBQyxPQUFnQyxFQUFFLGNBQXFDO1FBQzdGLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksU0FBUyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxnQkFBZ0IsR0FDcEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2hGLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztZQUNwRCxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7Ozs7V0FJbEMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUNELFNBQVMsR0FBRyxnQkFBZ0IsSUFBSSxFQUFFLENBQUM7UUFDckMsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVCLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLFNBQVMsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQzlCLENBQUM7UUFFRCxNQUFNLENBQUMsU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxRQUFpQixFQUFFLFNBQWtCO1FBQ2pFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUM1QixNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRixnRUFBZ0U7WUFDaEUsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsNkRBQTZEO1FBQzdELHdDQUF3QztRQUN4QyxNQUFNLGFBQWEsR0FBRyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7YUFDbkMsS0FBSyxDQUFDLEdBQUcsQ0FBQzthQUNWLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMvQixFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdEIsQ0FBQztRQUNELE1BQU0sa0JBQWtCLEdBQUcsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7UUFFN0YsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLGtCQUFrQixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hFLDBGQUEwRjtnQkFDMUYsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNkLENBQUM7WUFFRCxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCx1Q0FBdUM7UUFDdkMsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLEdBQUcsU0FBUyxJQUFJLEVBQUUsRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxPQUFnQztRQUN6RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUN6QyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxRSx3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNDLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUN4RSxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsdUJBQXVCLENBQ3JELGlCQUFpQixDQUFDLENBQUM7UUFFckIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQ3hELHFCQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUM3QixTQUFTLENBQUMsc0JBQXNCLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUMsRUFDdEUsZUFBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUM1QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBOVZELDRDQThWQztBQUdELGtCQUFlLGdCQUFnQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyLFxuICBCdWlsZGVyQ29uZmlndXJhdGlvbixcbiAgQnVpbGRlckNvbnRleHQsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgUGF0aCwgZ2V0U3lzdGVtUGF0aCwgcmVzb2x2ZSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJztcbmltcG9ydCB7IGNvbmNhdE1hcCwgbWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgZ2V0V2VicGFja1N0YXRzQ29uZmlnIH0gZnJvbSAnLi4vYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy91dGlscyc7XG5pbXBvcnQgeyBjaGVja1BvcnQgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvY2hlY2stcG9ydCc7XG5pbXBvcnQge1xuICBzdGF0c0Vycm9yc1RvU3RyaW5nLFxuICBzdGF0c1RvU3RyaW5nLFxuICBzdGF0c1dhcm5pbmdzVG9TdHJpbmcsXG59IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9zdGF0cyc7XG5pbXBvcnQge1xuICBCcm93c2VyQnVpbGRlcixcbiAgQnJvd3NlckJ1aWxkZXJPcHRpb25zLFxufSBmcm9tICcuLi9icm93c2VyLyc7XG5jb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKTtcbmNvbnN0IFdlYnBhY2tEZXZTZXJ2ZXIgPSByZXF1aXJlKCd3ZWJwYWNrLWRldi1zZXJ2ZXInKTtcblxuXG5leHBvcnQgaW50ZXJmYWNlIERldlNlcnZlckJ1aWxkZXJPcHRpb25zIHtcbiAgYnJvd3NlclRhcmdldDogc3RyaW5nO1xuICBwb3J0OiBudW1iZXI7XG4gIGhvc3Q6IHN0cmluZztcbiAgcHJveHlDb25maWc/OiBzdHJpbmc7XG4gIHNzbDogYm9vbGVhbjtcbiAgc3NsS2V5Pzogc3RyaW5nO1xuICBzc2xDZXJ0Pzogc3RyaW5nO1xuICBvcGVuOiBib29sZWFuO1xuICBsaXZlUmVsb2FkOiBib29sZWFuO1xuICBwdWJsaWNIb3N0Pzogc3RyaW5nO1xuICBzZXJ2ZVBhdGg/OiBzdHJpbmc7XG4gIGRpc2FibGVIb3N0Q2hlY2s6IGJvb2xlYW47XG4gIGhtcjogYm9vbGVhbjtcbiAgd2F0Y2g6IGJvb2xlYW47XG4gIGhtcldhcm5pbmc6IGJvb2xlYW47XG4gIHNlcnZlUGF0aERlZmF1bHRXYXJuaW5nOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgV2VicGFja0RldlNlcnZlckNvbmZpZ3VyYXRpb25PcHRpb25zIHtcbiAgY29udGVudEJhc2U/OiBib29sZWFuIHwgc3RyaW5nIHwgc3RyaW5nW107XG4gIGhvdD86IGJvb2xlYW47XG4gIGhpc3RvcnlBcGlGYWxsYmFjaz86IHsgW2tleTogc3RyaW5nXTogYW55IH0gfCBib29sZWFuOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuICBjb21wcmVzcz86IGJvb2xlYW47XG4gIHByb3h5PzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgc3RhdGljT3B0aW9ucz86IGFueTsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgcXVpZXQ/OiBib29sZWFuO1xuICBub0luZm8/OiBib29sZWFuO1xuICBsYXp5PzogYm9vbGVhbjtcbiAgZmlsZW5hbWU/OiBzdHJpbmc7XG4gIHdhdGNoT3B0aW9ucz86IHtcbiAgICBhZ2dyZWdhdGVUaW1lb3V0PzogbnVtYmVyO1xuICAgIHBvbGw/OiBudW1iZXI7XG4gIH07XG4gIHB1YmxpY1BhdGg/OiBzdHJpbmc7XG4gIGhlYWRlcnM/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xuICBzdGF0cz86IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9IHwgc3RyaW5nIHwgYm9vbGVhbjtcbiAgaHR0cHM/OiBib29sZWFuO1xuICBrZXk/OiBzdHJpbmc7XG4gIGNlcnQ/OiBzdHJpbmc7XG4gIG92ZXJsYXk/OiBib29sZWFuIHwgeyBlcnJvcnM6IGJvb2xlYW4sIHdhcm5pbmdzOiBib29sZWFuIH07XG4gIHB1YmxpYz86IHN0cmluZztcbiAgZGlzYWJsZUhvc3RDaGVjaz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBEZXZTZXJ2ZXJCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBidWlsZGVyQ29uZmlnLm9wdGlvbnM7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2Uucm9vdDtcbiAgICBjb25zdCBwcm9qZWN0Um9vdCA9IHJlc29sdmUocm9vdCwgYnVpbGRlckNvbmZpZy5yb290KTtcblxuICAgIHJldHVybiBjaGVja1BvcnQob3B0aW9ucy5wb3J0LCBvcHRpb25zLmhvc3QpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoKHBvcnQpID0+IHtcbiAgICAgICAgb3B0aW9ucy5wb3J0ID0gcG9ydDtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZ2V0QnJvd3Nlck9wdGlvbnMob3B0aW9ucyk7XG4gICAgICB9KSxcbiAgICAgIGNvbmNhdE1hcCgoYnJvd3Nlck9wdGlvbnMpID0+IG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICAgIGNvbnN0IGJyb3dzZXJCdWlsZGVyID0gbmV3IEJyb3dzZXJCdWlsZGVyKHRoaXMuY29udGV4dCk7XG4gICAgICAgIGNvbnN0IHdlYnBhY2tDb25maWcgPSBicm93c2VyQnVpbGRlci5idWlsZFdlYnBhY2tDb25maWcocm9vdCwgcHJvamVjdFJvb3QsIGJyb3dzZXJPcHRpb25zKTtcbiAgICAgICAgY29uc3Qgd2VicGFja0NvbXBpbGVyID0gd2VicGFjayh3ZWJwYWNrQ29uZmlnKTtcbiAgICAgICAgY29uc3Qgc3RhdHNDb25maWcgPSBnZXRXZWJwYWNrU3RhdHNDb25maWcoYnJvd3Nlck9wdGlvbnMudmVyYm9zZSk7XG5cbiAgICAgICAgbGV0IHdlYnBhY2tEZXZTZXJ2ZXJDb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXJDb25maWd1cmF0aW9uT3B0aW9ucztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB3ZWJwYWNrRGV2U2VydmVyQ29uZmlnID0gdGhpcy5fYnVpbGRTZXJ2ZXJDb25maWcoXG4gICAgICAgICAgICByb290LCBwcm9qZWN0Um9vdCwgb3B0aW9ucywgYnJvd3Nlck9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBvYnMuZXJyb3IoZXJyKTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc29sdmUgcHVibGljIGhvc3QgYW5kIGNsaWVudCBhZGRyZXNzLlxuICAgICAgICBsZXQgY2xpZW50QWRkcmVzcyA9IGAke29wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJ306Ly8wLjAuMC4wOjBgO1xuICAgICAgICBpZiAob3B0aW9ucy5wdWJsaWNIb3N0KSB7XG4gICAgICAgICAgbGV0IHB1YmxpY0hvc3QgPSBvcHRpb25zLnB1YmxpY0hvc3Q7XG4gICAgICAgICAgaWYgKCEvXlxcdys6XFwvXFwvLy50ZXN0KHB1YmxpY0hvc3QpKSB7XG4gICAgICAgICAgICBwdWJsaWNIb3N0ID0gYCR7b3B0aW9ucy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnfTovLyR7cHVibGljSG9zdH1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBjbGllbnRVcmwgPSB1cmwucGFyc2UocHVibGljSG9zdCk7XG4gICAgICAgICAgb3B0aW9ucy5wdWJsaWNIb3N0ID0gY2xpZW50VXJsLmhvc3Q7XG4gICAgICAgICAgY2xpZW50QWRkcmVzcyA9IHVybC5mb3JtYXQoY2xpZW50VXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc29sdmUgc2VydmUgYWRkcmVzcy5cbiAgICAgICAgY29uc3Qgc2VydmVyQWRkcmVzcyA9IHVybC5mb3JtYXQoe1xuICAgICAgICAgIHByb3RvY29sOiBvcHRpb25zLnNzbCA/ICdodHRwcycgOiAnaHR0cCcsXG4gICAgICAgICAgaG9zdG5hbWU6IG9wdGlvbnMuaG9zdCA9PT0gJzAuMC4wLjAnID8gJ2xvY2FsaG9zdCcgOiBvcHRpb25zLmhvc3QsXG4gICAgICAgICAgcG9ydDogb3B0aW9ucy5wb3J0LnRvU3RyaW5nKCksXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBsaXZlIHJlbG9hZCBjb25maWcuXG4gICAgICAgIGlmIChvcHRpb25zLmxpdmVSZWxvYWQpIHtcbiAgICAgICAgICB0aGlzLl9hZGRMaXZlUmVsb2FkKG9wdGlvbnMsIGJyb3dzZXJPcHRpb25zLCB3ZWJwYWNrQ29uZmlnLCBjbGllbnRBZGRyZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmhtcikge1xuICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybignTGl2ZSByZWxvYWQgaXMgZGlzYWJsZWQuIEhNUiBvcHRpb24gaWdub3JlZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0aW9ucy53YXRjaCkge1xuICAgICAgICAgIC8vIFRoZXJlJ3Mgbm8gb3B0aW9uIHRvIHR1cm4gb2ZmIGZpbGUgd2F0Y2hpbmcgaW4gd2VicGFjay1kZXYtc2VydmVyLCBidXRcbiAgICAgICAgICAvLyB3ZSBjYW4gb3ZlcnJpZGUgdGhlIGZpbGUgd2F0Y2hlciBpbnN0ZWFkLlxuICAgICAgICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy51bnNoaWZ0KHtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgICAgIGFwcGx5OiAoY29tcGlsZXI6IGFueSkgPT4ge1xuICAgICAgICAgICAgICBjb21waWxlci5ob29rcy5hZnRlckVudmlyb25tZW50LnRhcCgnYW5ndWxhci1jbGknLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29tcGlsZXIud2F0Y2hGaWxlU3lzdGVtID0geyB3YXRjaDogKCkgPT4geyB9IH07XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChicm93c2VyT3B0aW9ucy5vcHRpbWl6YXRpb25MZXZlbCA+IDApIHtcbiAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKHRhZ3Muc3RyaXBJbmRlbnRzYFxuICAgICAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgVGhpcyBpcyBhIHNpbXBsZSBzZXJ2ZXIgZm9yIHVzZSBpbiB0ZXN0aW5nIG9yIGRlYnVnZ2luZyBBbmd1bGFyIGFwcGxpY2F0aW9ucyBsb2NhbGx5LlxuICAgICAgICAgICAgSXQgaGFzbid0IGJlZW4gcmV2aWV3ZWQgZm9yIHNlY3VyaXR5IGlzc3Vlcy5cblxuICAgICAgICAgICAgRE9OJ1QgVVNFIElUIEZPUiBQUk9EVUNUSU9OIVxuICAgICAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgIGApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAqKlxuICAgICAgICAgIEFuZ3VsYXIgTGl2ZSBEZXZlbG9wbWVudCBTZXJ2ZXIgaXMgbGlzdGVuaW5nIG9uICR7b3B0aW9ucy5ob3N0fTpcbiAgICAgICAgICAke29wdGlvbnMucG9ydH0sIG9wZW4geW91ciBicm93c2VyIG9uICR7c2VydmVyQWRkcmVzc30ke3dlYnBhY2tEZXZTZXJ2ZXJDb25maWcucHVibGljUGF0aH1cbiAgICAgICAgICAqKlxuICAgICAgICBgKTtcblxuICAgICAgICBjb25zdCBzZXJ2ZXIgPSBuZXcgV2VicGFja0RldlNlcnZlcih3ZWJwYWNrQ29tcGlsZXIsIHdlYnBhY2tEZXZTZXJ2ZXJDb25maWcpO1xuXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgKHdlYnBhY2tDb21waWxlciBhcyBhbnkpLmhvb2tzLmRvbmUudGFwKCdhbmd1bGFyLWNsaScsIChzdGF0czogd2VicGFjay5TdGF0cykgPT4ge1xuICAgICAgICAgIGlmICghYnJvd3Nlck9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgICAgY29uc3QganNvbiA9IHN0YXRzLnRvSnNvbihzdGF0c0NvbmZpZyk7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8oc3RhdHNUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgICAgaWYgKHN0YXRzLmhhc1dhcm5pbmdzKCkpIHtcbiAgICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHN0YXRzV2FybmluZ3NUb1N0cmluZyhqc29uLCBzdGF0c0NvbmZpZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0YXRzLmhhc0Vycm9ycygpKSB7XG4gICAgICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhzdGF0c0Vycm9yc1RvU3RyaW5nKGpzb24sIHN0YXRzQ29uZmlnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIG9icy5uZXh0KHsgc3VjY2VzczogdHJ1ZSB9KTtcblxuICAgICAgICAgIGlmIChvcHRpb25zLm9wZW4pIHtcbiAgICAgICAgICAgIG9wbihzZXJ2ZXJBZGRyZXNzICsgd2VicGFja0RldlNlcnZlckNvbmZpZy5wdWJsaWNQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGh0dHBTZXJ2ZXIgPSBzZXJ2ZXIubGlzdGVuKFxuICAgICAgICAgIG9wdGlvbnMucG9ydCxcbiAgICAgICAgICBvcHRpb25zLmhvc3QsXG4gICAgICAgICAgKGVycjogYW55KSA9PiB7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIG9icy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gTm9kZSA4IGhhcyBhIGtlZXBBbGl2ZVRpbWVvdXQgYnVnIHdoaWNoIGRvZXNuJ3QgcmVzcGVjdCBhY3RpdmUgY29ubmVjdGlvbnMuXG4gICAgICAgIC8vIENvbm5lY3Rpb25zIHdpbGwgZW5kIGFmdGVyIH41IHNlY29uZHMgKGFyYml0cmFyeSksIG9mdGVuIG5vdCBsZXR0aW5nIHRoZSBmdWxsIGRvd25sb2FkXG4gICAgICAgIC8vIG9mIGxhcmdlIHBpZWNlcyBvZiBjb250ZW50LCBzdWNoIGFzIGEgdmVuZG9yIGphdmFzY3JpcHQgZmlsZS4gIFRoaXMgcmVzdWx0cyBpbiBicm93c2Vyc1xuICAgICAgICAvLyB0aHJvd2luZyBhIFwibmV0OjpFUlJfQ09OVEVOVF9MRU5HVEhfTUlTTUFUQ0hcIiBlcnJvci5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvaXNzdWVzLzcxOTdcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2lzc3Vlcy8xMzM5MVxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvY29tbWl0LzJjYjZmMmIyODFlYjk2YTdhYmUxNmQ1OGFmNmViYzljZTIzZDJlOTZcbiAgICAgICAgaWYgKC9edjguXFxkLlxcZCskLy50ZXN0KHByb2Nlc3MudmVyc2lvbikpIHtcbiAgICAgICAgICBodHRwU2VydmVyLmtlZXBBbGl2ZVRpbWVvdXQgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVhcmRvd24gbG9naWMuIENsb3NlIHRoZSBzZXJ2ZXIgd2hlbiB1bnN1YnNjcmliZWQgZnJvbS5cbiAgICAgICAgcmV0dXJuICgpID0+IHNlcnZlci5jbG9zZSgpO1xuICAgICAgfSkpKTtcbiAgfVxuXG4gIHByaXZhdGUgX2J1aWxkU2VydmVyQ29uZmlnKFxuICAgIHJvb3Q6IFBhdGgsXG4gICAgcHJvamVjdFJvb3Q6IFBhdGgsXG4gICAgb3B0aW9uczogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gICAgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyxcbiAgKSB7XG4gICAgY29uc3Qgc3lzdGVtUm9vdCA9IGdldFN5c3RlbVBhdGgocm9vdCk7XG4gICAgaWYgKG9wdGlvbnMuZGlzYWJsZUhvc3RDaGVjaykge1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBcbiAgICAgICAgV0FSTklORzogUnVubmluZyBhIHNlcnZlciB3aXRoIC0tZGlzYWJsZS1ob3N0LWNoZWNrIGlzIGEgc2VjdXJpdHkgcmlzay5cbiAgICAgICAgU2VlIGh0dHBzOi8vbWVkaXVtLmNvbS93ZWJwYWNrL3dlYnBhY2stZGV2LXNlcnZlci1taWRkbGV3YXJlLXNlY3VyaXR5LWlzc3Vlcy0xNDg5ZDk1MDg3NGFcbiAgICAgICAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICBgKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZVBhdGggPSB0aGlzLl9idWlsZFNlcnZlUGF0aChvcHRpb25zLCBicm93c2VyT3B0aW9ucyk7XG5cbiAgICBjb25zdCBjb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXJDb25maWd1cmF0aW9uT3B0aW9ucyA9IHtcbiAgICAgIGhlYWRlcnM6IHsgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyB9LFxuICAgICAgaGlzdG9yeUFwaUZhbGxiYWNrOiB7XG4gICAgICAgIGluZGV4OiBgJHtzZXJ2ZVBhdGh9LyR7XG4gICAgICAgICAgcGF0aC5yZWxhdGl2ZShwcm9qZWN0Um9vdCwgcGF0aC5yZXNvbHZlKHJvb3QsIGJyb3dzZXJPcHRpb25zLmluZGV4KSlcbiAgICAgICAgICB9YCxcbiAgICAgICAgZGlzYWJsZURvdFJ1bGU6IHRydWUsXG4gICAgICAgIGh0bWxBY2NlcHRIZWFkZXJzOiBbJ3RleHQvaHRtbCcsICdhcHBsaWNhdGlvbi94aHRtbCt4bWwnXSxcbiAgICAgIH0sXG4gICAgICBzdGF0czogYnJvd3Nlck9wdGlvbnMudmVyYm9zZSA/IGdldFdlYnBhY2tTdGF0c0NvbmZpZyhicm93c2VyT3B0aW9ucy52ZXJib3NlKSA6IGZhbHNlLFxuICAgICAgY29tcHJlc3M6IGJyb3dzZXJPcHRpb25zLm9wdGltaXphdGlvbkxldmVsID4gMCxcbiAgICAgIHdhdGNoT3B0aW9uczoge1xuICAgICAgICBwb2xsOiBicm93c2VyT3B0aW9ucy5wb2xsLFxuICAgICAgfSxcbiAgICAgIGh0dHBzOiBvcHRpb25zLnNzbCxcbiAgICAgIG92ZXJsYXk6IHtcbiAgICAgICAgZXJyb3JzOiBicm93c2VyT3B0aW9ucy5vcHRpbWl6YXRpb25MZXZlbCA9PT0gMCxcbiAgICAgICAgd2FybmluZ3M6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGNvbnRlbnRCYXNlOiBmYWxzZSxcbiAgICAgIHB1YmxpYzogb3B0aW9ucy5wdWJsaWNIb3N0LFxuICAgICAgZGlzYWJsZUhvc3RDaGVjazogb3B0aW9ucy5kaXNhYmxlSG9zdENoZWNrLFxuICAgICAgcHVibGljUGF0aDogc2VydmVQYXRoLFxuICAgICAgaG90OiBvcHRpb25zLmhtcixcbiAgICB9O1xuXG4gICAgaWYgKG9wdGlvbnMuc3NsKSB7XG4gICAgICB0aGlzLl9hZGRTc2xDb25maWcoc3lzdGVtUm9vdCwgb3B0aW9ucywgY29uZmlnKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5wcm94eUNvbmZpZykge1xuICAgICAgdGhpcy5fYWRkUHJveHlDb25maWcoc3lzdGVtUm9vdCwgb3B0aW9ucywgY29uZmlnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRkTGl2ZVJlbG9hZChcbiAgICBvcHRpb25zOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyxcbiAgICBicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJPcHRpb25zLFxuICAgIHdlYnBhY2tDb25maWc6IGFueSwgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICBjbGllbnRBZGRyZXNzOiBzdHJpbmcsXG4gICkge1xuICAgIC8vIFRoaXMgYWxsb3dzIGZvciBsaXZlIHJlbG9hZCBvZiBwYWdlIHdoZW4gY2hhbmdlcyBhcmUgbWFkZSB0byByZXBvLlxuICAgIC8vIGh0dHBzOi8vd2VicGFjay5qcy5vcmcvY29uZmlndXJhdGlvbi9kZXYtc2VydmVyLyNkZXZzZXJ2ZXItaW5saW5lXG4gICAgbGV0IHdlYnBhY2tEZXZTZXJ2ZXJQYXRoO1xuICAgIHRyeSB7XG4gICAgICB3ZWJwYWNrRGV2U2VydmVyUGF0aCA9IHJlcXVpcmUucmVzb2x2ZSgnd2VicGFjay1kZXYtc2VydmVyL2NsaWVudCcpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgXCJ3ZWJwYWNrLWRldi1zZXJ2ZXJcIiBwYWNrYWdlIGNvdWxkIG5vdCBiZSBmb3VuZC4nKTtcbiAgICB9XG4gICAgY29uc3QgZW50cnlQb2ludHMgPSBbYCR7d2VicGFja0RldlNlcnZlclBhdGh9PyR7Y2xpZW50QWRkcmVzc31gXTtcbiAgICBpZiAob3B0aW9ucy5obXIpIHtcbiAgICAgIGNvbnN0IHdlYnBhY2tIbXJMaW5rID0gJ2h0dHBzOi8vd2VicGFjay5qcy5vcmcvZ3VpZGVzL2hvdC1tb2R1bGUtcmVwbGFjZW1lbnQnO1xuXG4gICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgIHRhZ3Mub25lTGluZWBOT1RJQ0U6IEhvdCBNb2R1bGUgUmVwbGFjZW1lbnQgKEhNUikgaXMgZW5hYmxlZCBmb3IgdGhlIGRldiBzZXJ2ZXIuYCk7XG5cbiAgICAgIGNvbnN0IHNob3dXYXJuaW5nID0gb3B0aW9ucy5obXJXYXJuaW5nO1xuICAgICAgaWYgKHNob3dXYXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyh0YWdzLnN0cmlwSW5kZW50c2BcbiAgICAgICAgICBUaGUgcHJvamVjdCB3aWxsIHN0aWxsIGxpdmUgcmVsb2FkIHdoZW4gSE1SIGlzIGVuYWJsZWQsXG4gICAgICAgICAgYnV0IHRvIHRha2UgYWR2YW50YWdlIG9mIEhNUiBhZGRpdGlvbmFsIGFwcGxpY2F0aW9uIGNvZGUgaXMgcmVxdWlyZWQnXG4gICAgICAgICAgKG5vdCBpbmNsdWRlZCBpbiBhbiBBbmd1bGFyIENMSSBwcm9qZWN0IGJ5IGRlZmF1bHQpLidcbiAgICAgICAgICBTZWUgJHt3ZWJwYWNrSG1yTGlua31cbiAgICAgICAgICBmb3IgaW5mb3JtYXRpb24gb24gd29ya2luZyB3aXRoIEhNUiBmb3IgV2VicGFjay5gLFxuICAgICAgICApO1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgICAgdGFncy5vbmVMaW5lYFRvIGRpc2FibGUgdGhpcyB3YXJuaW5nIHVzZSBcIm5nIHNldCB3YXJuaW5ncy5obXJXYXJuaW5nPWZhbHNlXCIuYCk7XG4gICAgICB9XG4gICAgICBlbnRyeVBvaW50cy5wdXNoKCd3ZWJwYWNrL2hvdC9kZXYtc2VydmVyJyk7XG4gICAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgd2VicGFjay5Ib3RNb2R1bGVSZXBsYWNlbWVudFBsdWdpbigpKTtcbiAgICAgIGlmIChicm93c2VyT3B0aW9ucy5leHRyYWN0Q3NzKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgTk9USUNFOiAoSE1SKSBkb2VzIG5vdCBhbGxvdyBmb3IgQ1NTIGhvdCByZWxvYWRcbiAgICAgICAgICAgICAgICB3aGVuIHVzZWQgdG9nZXRoZXIgd2l0aCAnLS1leHRyYWN0LWNzcycuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghd2VicGFja0NvbmZpZy5lbnRyeS5tYWluKSB7IHdlYnBhY2tDb25maWcuZW50cnkubWFpbiA9IFtdOyB9XG4gICAgd2VicGFja0NvbmZpZy5lbnRyeS5tYWluLnVuc2hpZnQoLi4uZW50cnlQb2ludHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRkU3NsQ29uZmlnKFxuICAgIHJvb3Q6IHN0cmluZyxcbiAgICBvcHRpb25zOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyxcbiAgICBjb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXJDb25maWd1cmF0aW9uT3B0aW9ucyxcbiAgKSB7XG4gICAgbGV0IHNzbEtleTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBzc2xDZXJ0OiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKG9wdGlvbnMuc3NsS2V5KSB7XG4gICAgICBjb25zdCBrZXlQYXRoID0gcGF0aC5yZXNvbHZlKHJvb3QsIG9wdGlvbnMuc3NsS2V5IGFzIHN0cmluZyk7XG4gICAgICBpZiAoZXhpc3RzU3luYyhrZXlQYXRoKSkge1xuICAgICAgICBzc2xLZXkgPSByZWFkRmlsZVN5bmMoa2V5UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnNzbENlcnQpIHtcbiAgICAgIGNvbnN0IGNlcnRQYXRoID0gcGF0aC5yZXNvbHZlKHJvb3QsIG9wdGlvbnMuc3NsQ2VydCBhcyBzdHJpbmcpO1xuICAgICAgaWYgKGV4aXN0c1N5bmMoY2VydFBhdGgpKSB7XG4gICAgICAgIHNzbENlcnQgPSByZWFkRmlsZVN5bmMoY2VydFBhdGgsICd1dGYtOCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbmZpZy5odHRwcyA9IHRydWU7XG4gICAgaWYgKHNzbEtleSAhPSBudWxsICYmIHNzbENlcnQgIT0gbnVsbCkge1xuICAgICAgY29uZmlnLmtleSA9IHNzbEtleTtcbiAgICAgIGNvbmZpZy5jZXJ0ID0gc3NsQ2VydDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hZGRQcm94eUNvbmZpZyhcbiAgICByb290OiBzdHJpbmcsXG4gICAgb3B0aW9uczogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsXG4gICAgY29uZmlnOiBXZWJwYWNrRGV2U2VydmVyQ29uZmlndXJhdGlvbk9wdGlvbnMsXG4gICkge1xuICAgIGxldCBwcm94eUNvbmZpZyA9IHt9O1xuICAgIGNvbnN0IHByb3h5UGF0aCA9IHBhdGgucmVzb2x2ZShyb290LCBvcHRpb25zLnByb3h5Q29uZmlnIGFzIHN0cmluZyk7XG4gICAgaWYgKGV4aXN0c1N5bmMocHJveHlQYXRoKSkge1xuICAgICAgcHJveHlDb25maWcgPSByZXF1aXJlKHByb3h5UGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnUHJveHkgY29uZmlnIGZpbGUgJyArIHByb3h5UGF0aCArICcgZG9lcyBub3QgZXhpc3QuJztcbiAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICB9XG4gICAgY29uZmlnLnByb3h5ID0gcHJveHlDb25maWc7XG4gIH1cblxuICBwcml2YXRlIF9idWlsZFNlcnZlUGF0aChvcHRpb25zOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucykge1xuICAgIGxldCBzZXJ2ZVBhdGggPSBvcHRpb25zLnNlcnZlUGF0aDtcbiAgICBpZiAoIXNlcnZlUGF0aCAmJiBzZXJ2ZVBhdGggIT09ICcnKSB7XG4gICAgICBjb25zdCBkZWZhdWx0U2VydmVQYXRoID1cbiAgICAgICAgdGhpcy5fZmluZERlZmF1bHRTZXJ2ZVBhdGgoYnJvd3Nlck9wdGlvbnMuYmFzZUhyZWYsIGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCk7XG4gICAgICBjb25zdCBzaG93V2FybmluZyA9IG9wdGlvbnMuc2VydmVQYXRoRGVmYXVsdFdhcm5pbmc7XG4gICAgICBpZiAoZGVmYXVsdFNlcnZlUGF0aCA9PSBudWxsICYmIHNob3dXYXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBXQVJOSU5HOiAtLWRlcGxveS11cmwgYW5kL29yIC0tYmFzZS1ocmVmIGNvbnRhaW5cbiAgICAgICAgICAgIHVuc3VwcG9ydGVkIHZhbHVlcyBmb3Igbmcgc2VydmUuICBEZWZhdWx0IHNlcnZlIHBhdGggb2YgJy8nIHVzZWQuXG4gICAgICAgICAgICBVc2UgLS1zZXJ2ZS1wYXRoIHRvIG92ZXJyaWRlLlxuICAgICAgICAgIGApO1xuICAgICAgfVxuICAgICAgc2VydmVQYXRoID0gZGVmYXVsdFNlcnZlUGF0aCB8fCAnJztcbiAgICB9XG4gICAgaWYgKHNlcnZlUGF0aC5lbmRzV2l0aCgnLycpKSB7XG4gICAgICBzZXJ2ZVBhdGggPSBzZXJ2ZVBhdGguc3Vic3RyKDAsIHNlcnZlUGF0aC5sZW5ndGggLSAxKTtcbiAgICB9XG4gICAgaWYgKCFzZXJ2ZVBhdGguc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICBzZXJ2ZVBhdGggPSBgLyR7c2VydmVQYXRofWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlcnZlUGF0aDtcbiAgfVxuXG4gIHByaXZhdGUgX2ZpbmREZWZhdWx0U2VydmVQYXRoKGJhc2VIcmVmPzogc3RyaW5nLCBkZXBsb3lVcmw/OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBpZiAoIWJhc2VIcmVmICYmICFkZXBsb3lVcmwpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICBpZiAoL14oXFx3KzopP1xcL1xcLy8udGVzdChiYXNlSHJlZiB8fCAnJykgfHwgL14oXFx3KzopP1xcL1xcLy8udGVzdChkZXBsb3lVcmwgfHwgJycpKSB7XG4gICAgICAvLyBJZiBiYXNlSHJlZiBvciBkZXBsb3lVcmwgaXMgYWJzb2x1dGUsIHVuc3VwcG9ydGVkIGJ5IG5nIHNlcnZlXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBub3JtYWxpemUgYmFzZUhyZWZcbiAgICAvLyBmb3Igbmcgc2VydmUgdGhlIHN0YXJ0aW5nIGJhc2UgaXMgYWx3YXlzIGAvYCBzbyBhIHJlbGF0aXZlXG4gICAgLy8gYW5kIHJvb3QgcmVsYXRpdmUgdmFsdWUgYXJlIGlkZW50aWNhbFxuICAgIGNvbnN0IGJhc2VIcmVmUGFydHMgPSAoYmFzZUhyZWYgfHwgJycpXG4gICAgICAuc3BsaXQoJy8nKVxuICAgICAgLmZpbHRlcihwYXJ0ID0+IHBhcnQgIT09ICcnKTtcbiAgICBpZiAoYmFzZUhyZWYgJiYgIWJhc2VIcmVmLmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIGJhc2VIcmVmUGFydHMucG9wKCk7XG4gICAgfVxuICAgIGNvbnN0IG5vcm1hbGl6ZWRCYXNlSHJlZiA9IGJhc2VIcmVmUGFydHMubGVuZ3RoID09PSAwID8gJy8nIDogYC8ke2Jhc2VIcmVmUGFydHMuam9pbignLycpfS9gO1xuXG4gICAgaWYgKGRlcGxveVVybCAmJiBkZXBsb3lVcmxbMF0gPT09ICcvJykge1xuICAgICAgaWYgKGJhc2VIcmVmICYmIGJhc2VIcmVmWzBdID09PSAnLycgJiYgbm9ybWFsaXplZEJhc2VIcmVmICE9PSBkZXBsb3lVcmwpIHtcbiAgICAgICAgLy8gSWYgYmFzZUhyZWYgYW5kIGRlcGxveVVybCBhcmUgcm9vdCByZWxhdGl2ZSBhbmQgbm90IGVxdWl2YWxlbnQsIHVuc3VwcG9ydGVkIGJ5IG5nIHNlcnZlXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVwbG95VXJsO1xuICAgIH1cblxuICAgIC8vIEpvaW4gdG9nZXRoZXIgYmFzZUhyZWYgYW5kIGRlcGxveVVybFxuICAgIHJldHVybiBgJHtub3JtYWxpemVkQmFzZUhyZWZ9JHtkZXBsb3lVcmwgfHwgJyd9YDtcbiAgfVxuXG4gIHByaXZhdGUgX2dldEJyb3dzZXJPcHRpb25zKG9wdGlvbnM6IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG4gICAgY29uc3QgYXJjaGl0ZWN0ID0gdGhpcy5jb250ZXh0LmFyY2hpdGVjdDtcbiAgICBjb25zdCBbcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uXSA9IG9wdGlvbnMuYnJvd3NlclRhcmdldC5zcGxpdCgnOicpO1xuICAgIC8vIE92ZXJyaWRlIGJyb3dzZXIgYnVpbGQgd2F0Y2ggc2V0dGluZy5cbiAgICBjb25zdCBvdmVycmlkZXMgPSB7IHdhdGNoOiBvcHRpb25zLndhdGNoIH07XG4gICAgY29uc3QgYnJvd3NlclRhcmdldFNwZWMgPSB7IHByb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbiwgb3ZlcnJpZGVzIH07XG4gICAgY29uc3QgYnVpbGRlckNvbmZpZyA9IGFyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbjxCcm93c2VyQnVpbGRlck9wdGlvbnM+KFxuICAgICAgYnJvd3NlclRhcmdldFNwZWMpO1xuXG4gICAgcmV0dXJuIGFyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmZpZykucGlwZShcbiAgICAgIGNvbmNhdE1hcChicm93c2VyRGVzY3JpcHRpb24gPT5cbiAgICAgICAgYXJjaGl0ZWN0LnZhbGlkYXRlQnVpbGRlck9wdGlvbnMoYnVpbGRlckNvbmZpZywgYnJvd3NlckRlc2NyaXB0aW9uKSksXG4gICAgICBtYXAoYnJvd3NlckNvbmZpZyA9PiBicm93c2VyQ29uZmlnLm9wdGlvbnMpLFxuICAgICk7XG4gIH1cbn1cblxuXG5leHBvcnQgZGVmYXVsdCBEZXZTZXJ2ZXJCdWlsZGVyO1xuIl19