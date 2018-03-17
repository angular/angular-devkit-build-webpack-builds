"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const webpack = require("webpack");
const webpackDevMiddleware = require('webpack-dev-middleware');
const is_directory_1 = require("../utilities/is-directory");
const karma_webpack_failure_cb_1 = require("./karma-webpack-failure-cb");
/**
 * Enumerate needed (but not require/imported) dependencies from this file
 *  to let the dependency validator know they are used.
 *
 * require('source-map-support')
 * require('karma-source-map-support')
 */
let blocked = [];
let isBlocked = false;
let successCb;
let failureCb;
// Add files to the Karma files array.
function addKarmaFiles(files, newFiles, prepend = false) {
    const defaults = {
        included: true,
        served: true,
        watched: true
    };
    const processedFiles = newFiles
        .filter(file => glob.sync(file.pattern, { nodir: true }).length != 0)
        .map(file => (Object.assign({}, defaults, file)));
    // It's important to not replace the array, because
    // karma already has a reference to the existing array.
    if (prepend) {
        files.unshift(...processedFiles);
    }
    else {
        files.push(...processedFiles);
    }
}
const init = (config, emitter, customFileHandlers) => {
    const options = config.buildWebpack.options;
    const projectRoot = config.buildWebpack.projectRoot;
    successCb = config.buildWebpack.successCb;
    failureCb = config.buildWebpack.failureCb;
    config.reporters.unshift('@angular-devkit/build-webpack--event-reporter');
    // Add a reporter that fixes sourcemap urls.
    if (options.sourceMap) {
        config.reporters.unshift('@angular-devkit/build-webpack--sourcemap-reporter');
        // Code taken from https://github.com/tschaub/karma-source-map-support.
        // We can't use it directly because we need to add it conditionally in this file, and karma
        // frameworks cannot be added dynamically.
        const smsPath = path.dirname(require.resolve('source-map-support'));
        const ksmsPath = path.dirname(require.resolve('karma-source-map-support'));
        addKarmaFiles(config.files, [
            { pattern: path.join(smsPath, 'browser-source-map-support.js'), watched: false },
            { pattern: path.join(ksmsPath, 'client.js'), watched: false }
        ], true);
    }
    // Add assets. This logic is mimics the one present in GlobCopyWebpackPlugin.
    if (options.assets) {
        config.proxies = config.proxies || {};
        options.assets.forEach((pattern) => {
            // Convert all string patterns to Pattern type.
            pattern = typeof pattern === 'string' ? { glob: pattern } : pattern;
            // Add defaults.
            // Input is always resolved relative to the projectRoot.
            pattern.input = path.resolve(projectRoot, pattern.input || '');
            pattern.output = pattern.output || '';
            pattern.glob = pattern.glob || '';
            // Build karma file pattern.
            const assetPath = path.join(pattern.input, pattern.glob);
            const filePattern = is_directory_1.isDirectory(assetPath) ? assetPath + '/**' : assetPath;
            addKarmaFiles(config.files, [{ pattern: filePattern, included: false }]);
            // The `files` entry serves the file from `/base/{asset.input}/{asset.glob}`.
            // We need to add a URL rewrite that exposes the asset as `/{asset.output}/{asset.glob}`.
            let relativePath, proxyPath;
            if (fs.existsSync(assetPath)) {
                relativePath = path.relative(config.basePath, assetPath);
                proxyPath = path.join(pattern.output, pattern.glob);
            }
            else {
                // For globs (paths that don't exist), proxy pattern.output to pattern.input.
                relativePath = path.relative(config.basePath, pattern.input);
                proxyPath = path.join(pattern.output);
            }
            // Proxy paths must have only forward slashes.
            proxyPath = proxyPath.replace(/\\/g, '/');
            config.proxies['/' + proxyPath] = '/base/' + relativePath;
        });
    }
    // Add webpack config.
    const webpackConfig = config.buildWebpack.webpackConfig;
    const webpackMiddlewareConfig = {
        noInfo: true,
        watchOptions: { poll: options.poll },
        publicPath: '/_karma_webpack_/',
        stats: {
            assets: false,
            colors: true,
            version: false,
            hash: false,
            timings: false,
            chunks: false,
            chunkModules: false
        }
    };
    // Finish Karma run early in case of compilation error.
    const compilationErrorCb = () => emitter.emit('run_complete', [], { exitCode: 1 });
    webpackConfig.plugins.push(new karma_webpack_failure_cb_1.KarmaWebpackFailureCb(compilationErrorCb));
    // Use existing config if any.
    config.webpack = Object.assign(webpackConfig, config.webpack);
    config.webpackMiddleware = Object.assign(webpackMiddlewareConfig, config.webpackMiddleware);
    // When using code-coverage, auto-add coverage-istanbul.
    config.reporters = config.reporters || [];
    if (options.codeCoverage && config.reporters.indexOf('coverage-istanbul') === -1) {
        config.reporters.push('coverage-istanbul');
    }
    // Our custom context and debug files list the webpack bundles directly instead of using
    // the karma files array.
    config.customContextFile = `${__dirname}/karma-context.html`;
    config.customDebugFile = `${__dirname}/karma-debug.html`;
    // Add the request blocker.
    config.beforeMiddleware = config.beforeMiddleware || [];
    config.beforeMiddleware.push('@angular-devkit/build-webpack--blocker');
    // Delete global styles entry, we don't want to load them.
    delete webpackConfig.entry.styles;
    // The webpack tier owns the watch behavior so we want to force it in the config.
    webpackConfig.watch = options.watch;
    if (!options.watch) {
        // There's no option to turn off file watching in webpack-dev-server, but
        // we can override the file watcher instead.
        webpackConfig.plugins.unshift({
            apply: (compiler) => {
                compiler.plugin('after-environment', () => {
                    compiler.watchFileSystem = { watch: () => { } };
                });
            },
        });
    }
    // Files need to be served from a custom path for Karma.
    webpackConfig.output.path = '/_karma_webpack_/';
    webpackConfig.output.publicPath = '/_karma_webpack_/';
    let compiler;
    try {
        compiler = webpack(webpackConfig);
    }
    catch (e) {
        console.error(e.stack || e);
        if (e.details) {
            console.error(e.details);
        }
        throw e;
    }
    ['invalid', 'watch-run', 'run'].forEach(function (name) {
        compiler.plugin(name, function (_, callback) {
            isBlocked = true;
            if (typeof callback === 'function') {
                callback();
            }
        });
    });
    compiler.plugin('done', (stats) => {
        // Don't refresh karma when there are webpack errors.
        if (stats.compilation.errors.length === 0) {
            emitter.refreshFiles();
            isBlocked = false;
            blocked.forEach((cb) => cb());
            blocked = [];
        }
    });
    const middleware = new webpackDevMiddleware(compiler, webpackMiddlewareConfig);
    // Forward requests to webpack server.
    customFileHandlers.push({
        urlRegex: /^\/_karma_webpack_\/.*/,
        handler: function handler(req, res) {
            middleware(req, res, function () {
                // Ensure script and style bundles are served.
                // They are mentioned in the custom karma context page and we don't want them to 404.
                const alwaysServe = [
                    '/_karma_webpack_/runtime.js',
                    '/_karma_webpack_/polyfills.js',
                    '/_karma_webpack_/scripts.js',
                    '/_karma_webpack_/vendor.js',
                ];
                if (alwaysServe.indexOf(req.url) != -1) {
                    res.statusCode = 200;
                    res.end();
                }
                else {
                    res.statusCode = 404;
                    res.end('Not found');
                }
            });
        }
    });
    emitter.on('exit', (done) => {
        middleware.close();
        done();
    });
};
init.$inject = ['config', 'emitter', 'customFileHandlers'];
// Block requests until the Webpack compilation is done.
function requestBlocker() {
    return function (_request, _response, next) {
        if (isBlocked) {
            blocked.push(next);
        }
        else {
            next();
        }
    };
}
// Emits builder events.
const eventReporter = function (baseReporterDecorator) {
    baseReporterDecorator(this);
    this.onRunComplete = function (_browsers, results) {
        if (results.exitCode === 0) {
            successCb && successCb();
        }
        else {
            failureCb && failureCb();
        }
    };
};
eventReporter.$inject = ['baseReporterDecorator'];
// Strip the server address and webpack scheme (webpack://) from error log.
const sourceMapReporter = function (baseReporterDecorator, config) {
    baseReporterDecorator(this);
    const reporterName = '@angular/cli';
    const hasTrailingReporters = config.reporters.slice(-1).pop() !== reporterName;
    // Copied from "karma-jasmine-diff-reporter" source code:
    // In case, when multiple reporters are used in conjunction
    // with initSourcemapReporter, they both will show repetitive log
    // messages when displaying everything that supposed to write to terminal.
    // So just suppress any logs from initSourcemapReporter by doing nothing on
    // browser log, because it is an utility reporter,
    // unless it's alone in the "reporters" option and base reporter is used.
    if (hasTrailingReporters) {
        this.writeCommonMsg = function () { };
    }
    const urlRegexp = /\(http:\/\/localhost:\d+\/_karma_webpack_\/webpack:\//gi;
    this.onSpecComplete = function (_browser, result) {
        if (!result.success && result.log.length > 0) {
            result.log.forEach((log, idx) => {
                result.log[idx] = log.replace(urlRegexp, '');
            });
        }
    };
};
sourceMapReporter.$inject = ['baseReporterDecorator', 'config'];
module.exports = {
    'framework:@angular-devkit/build-webpack': ['factory', init],
    'reporter:@angular-devkit/build-webpack--sourcemap-reporter': ['type', sourceMapReporter],
    'reporter:@angular-devkit/build-webpack--event-reporter': ['type', eventReporter],
    'middleware:@angular-devkit/build-webpack--blocker': ['factory', requestBlocker]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FybWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2FuZ3VsYXItY2xpLWZpbGVzL3BsdWdpbnMva2FybWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGlCQUFpQjtBQUNqQiwrREFBK0Q7O0FBRS9ELDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLG1DQUFtQztBQUNuQyxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBRy9ELDREQUF3RDtBQUN4RCx5RUFBbUU7QUFFbkU7Ozs7OztHQU1HO0FBR0gsSUFBSSxPQUFPLEdBQVUsRUFBRSxDQUFDO0FBQ3hCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUN0QixJQUFJLFNBQXFCLENBQUM7QUFDMUIsSUFBSSxTQUFxQixDQUFDO0FBRTFCLHNDQUFzQztBQUN0Qyx1QkFBdUIsS0FBWSxFQUFFLFFBQWUsRUFBRSxPQUFPLEdBQUcsS0FBSztJQUNuRSxNQUFNLFFBQVEsR0FBRztRQUNmLFFBQVEsRUFBRSxJQUFJO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixPQUFPLEVBQUUsSUFBSTtLQUNkLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxRQUFRO1NBRTVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7U0FFcEUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQU0sUUFBUSxFQUFLLElBQUksRUFBRyxDQUFDLENBQUM7SUFFM0MsbURBQW1EO0lBQ25ELHVEQUF1RDtJQUN2RCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1osS0FBSyxDQUFD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LE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBVyxFQUFFLEdBQVcsRUFBRSxFQUFFO2dCQUM5QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQztBQUVGLGlCQUFpQixDQUFDLE9BQU8sR0FBRyxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBRWhFLE1BQU0sQ0FBQyxPQUFPLEdBQUc7SUFDZix5Q0FBeUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUM7SUFDNUQsNERBQTRELEVBQUUsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUM7SUFDekYsd0RBQXdELEVBQUUsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDO0lBQ2pGLG1EQUFtRCxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQztDQUNqRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGVcbi8vIFRPRE86IGNsZWFudXAgdGhpcyBmaWxlLCBpdCdzIGNvcGllZCBhcyBpcyBmcm9tIEFuZ3VsYXIgQ0xJLlxuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5jb25zdCB3ZWJwYWNrRGV2TWlkZGxld2FyZSA9IHJlcXVpcmUoJ3dlYnBhY2stZGV2LW1pZGRsZXdhcmUnKTtcblxuaW1wb3J0IHsgQXNzZXRQYXR0ZXJuIH0gZnJvbSAnLi4vbW9kZWxzL3dlYnBhY2stY29uZmlncy91dGlscyc7XG5pbXBvcnQgeyBpc0RpcmVjdG9yeSB9IGZyb20gJy4uL3V0aWxpdGllcy9pcy1kaXJlY3RvcnknO1xuaW1wb3J0IHsgS2FybWFXZWJwYWNrRmFpbHVyZUNiIH0gZnJvbSAnLi9rYXJtYS13ZWJwYWNrLWZhaWx1cmUtY2InO1xuXG4vKipcbiAqIEVudW1lcmF0ZSBuZWVkZWQgKGJ1dCBub3QgcmVxdWlyZS9pbXBvcnRlZCkgZGVwZW5kZW5jaWVzIGZyb20gdGhpcyBmaWxlXG4gKiAgdG8gbGV0IHRoZSBkZXBlbmRlbmN5IHZhbGlkYXRvciBrbm93IHRoZXkgYXJlIHVzZWQuXG4gKlxuICogcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JylcbiAqIHJlcXVpcmUoJ2thcm1hLXNvdXJjZS1tYXAtc3VwcG9ydCcpXG4gKi9cblxuXG5sZXQgYmxvY2tlZDogYW55W10gPSBbXTtcbmxldCBpc0Jsb2NrZWQgPSBmYWxzZTtcbmxldCBzdWNjZXNzQ2I6ICgpID0+IHZvaWQ7XG5sZXQgZmFpbHVyZUNiOiAoKSA9PiB2b2lkO1xuXG4vLyBBZGQgZmlsZXMgdG8gdGhlIEthcm1hIGZpbGVzIGFycmF5LlxuZnVuY3Rpb24gYWRkS2FybWFGaWxlcyhmaWxlczogYW55W10sIG5ld0ZpbGVzOiBhbnlbXSwgcHJlcGVuZCA9IGZhbHNlKSB7XG4gIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgIGluY2x1ZGVkOiB0cnVlLFxuICAgIHNlcnZlZDogdHJ1ZSxcbiAgICB3YXRjaGVkOiB0cnVlXG4gIH07XG5cbiAgY29uc3QgcHJvY2Vzc2VkRmlsZXMgPSBuZXdGaWxlc1xuICAgIC8vIFJlbW92ZSBnbG9icyB0aGF0IGRvIG5vdCBtYXRjaCBhbnkgZmlsZXMsIG90aGVyd2lzZSBLYXJtYSB3aWxsIHNob3cgYSB3YXJuaW5nIGZvciB0aGVzZS5cbiAgICAuZmlsdGVyKGZpbGUgPT4gZ2xvYi5zeW5jKGZpbGUucGF0dGVybiwgeyBub2RpcjogdHJ1ZSB9KS5sZW5ndGggIT0gMClcbiAgICAvLyBGaWxsIGluIHBhdHRlcm4gcHJvcGVydGllcyB3aXRoIGRlZmF1bHRzLlxuICAgIC5tYXAoZmlsZSA9PiAoeyAuLi5kZWZhdWx0cywgLi4uZmlsZSB9KSk7XG5cbiAgLy8gSXQncyBpbXBvcnRhbnQgdG8gbm90IHJlcGxhY2UgdGhlIGFycmF5LCBiZWNhdXNlXG4gIC8vIGthcm1hIGFscmVhZHkgaGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBleGlzdGluZyBhcnJheS5cbiAgaWYgKHByZXBlbmQpIHtcbiAgICBmaWxlcy51bnNoaWZ0KC4uLnByb2Nlc3NlZEZpbGVzKTtcbiAgfSBlbHNlIHtcbiAgICBmaWxlcy5wdXNoKC4uLnByb2Nlc3NlZEZpbGVzKTtcbiAgfVxufVxuXG5jb25zdCBpbml0OiBhbnkgPSAoY29uZmlnOiBhbnksIGVtaXR0ZXI6IGFueSwgY3VzdG9tRmlsZUhhbmRsZXJzOiBhbnkpID0+IHtcbiAgY29uc3Qgb3B0aW9ucyA9IGNvbmZpZy5idWlsZFdlYnBhY2sub3B0aW9ucztcbiAgY29uc3QgcHJvamVjdFJvb3QgPSBjb25maWcuYnVpbGRXZWJwYWNrLnByb2plY3RSb290O1xuICBzdWNjZXNzQ2IgPSBjb25maWcuYnVpbGRXZWJwYWNrLnN1Y2Nlc3NDYjtcbiAgZmFpbHVyZUNiID0gY29uZmlnLmJ1aWxkV2VicGFjay5mYWlsdXJlQ2I7XG5cbiAgY29uZmlnLnJlcG9ydGVycy51bnNoaWZ0KCdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjay0tZXZlbnQtcmVwb3J0ZXInKTtcbiAgLy8gQWRkIGEgcmVwb3J0ZXIgdGhhdCBmaXhlcyBzb3VyY2VtYXAgdXJscy5cbiAgaWYgKG9wdGlvbnMuc291cmNlTWFwKSB7XG4gICAgY29uZmlnLnJlcG9ydGVycy51bnNoaWZ0KCdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjay0tc291cmNlbWFwLXJlcG9ydGVyJyk7XG5cbiAgICAvLyBDb2RlIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3RzY2hhdWIva2FybWEtc291cmNlLW1hcC1zdXBwb3J0LlxuICAgIC8vIFdlIGNhbid0IHVzZSBpdCBkaXJlY3RseSBiZWNhdXNlIHdlIG5lZWQgdG8gYWRkIGl0IGNvbmRpdGlvbmFsbHkgaW4gdGhpcyBmaWxlLCBhbmQga2FybWFcbiAgICAvLyBmcmFtZXdvcmtzIGNhbm5vdCBiZSBhZGRlZCBkeW5hbWljYWxseS5cbiAgICBjb25zdCBzbXNQYXRoID0gcGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnc291cmNlLW1hcC1zdXBwb3J0JykpO1xuICAgIGNvbnN0IGtzbXNQYXRoID0gcGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgna2FybWEtc291cmNlLW1hcC1zdXBwb3J0JykpO1xuXG4gICAgYWRkS2FybWFGaWxlcyhjb25maWcuZmlsZXMsIFtcbiAgICAgIHsgcGF0dGVybjogcGF0aC5qb2luKHNtc1BhdGgsICdicm93c2VyLXNvdXJjZS1tYXAtc3VwcG9ydC5qcycpLCB3YXRjaGVkOiBmYWxzZSB9LFxuICAgICAgeyBwYXR0ZXJuOiBwYXRoLmpvaW4oa3Ntc1BhdGgsICdjbGllbnQuanMnKSwgd2F0Y2hlZDogZmFsc2UgfVxuICAgIF0sIHRydWUpO1xuICB9XG5cbiAgLy8gQWRkIGFzc2V0cy4gVGhpcyBsb2dpYyBpcyBtaW1pY3MgdGhlIG9uZSBwcmVzZW50IGluIEdsb2JDb3B5V2VicGFja1BsdWdpbi5cbiAgaWYgKG9wdGlvbnMuYXNzZXRzKSB7XG4gICAgY29uZmlnLnByb3hpZXMgPSBjb25maWcucHJveGllcyB8fCB7fTtcbiAgICBvcHRpb25zLmFzc2V0cy5mb3JFYWNoKChwYXR0ZXJuOiBBc3NldFBhdHRlcm4pID0+IHtcbiAgICAgIC8vIENvbnZlcnQgYWxsIHN0cmluZyBwYXR0ZXJucyB0byBQYXR0ZXJuIHR5cGUuXG4gICAgICBwYXR0ZXJuID0gdHlwZW9mIHBhdHRlcm4gPT09ICdzdHJpbmcnID8geyBnbG9iOiBwYXR0ZXJuIH0gOiBwYXR0ZXJuO1xuICAgICAgLy8gQWRkIGRlZmF1bHRzLlxuICAgICAgLy8gSW5wdXQgaXMgYWx3YXlzIHJlc29sdmVkIHJlbGF0aXZlIHRvIHRoZSBwcm9qZWN0Um9vdC5cbiAgICAgIHBhdHRlcm4uaW5wdXQgPSBwYXRoLnJlc29sdmUocHJvamVjdFJvb3QsIHBhdHRlcm4uaW5wdXQgfHwgJycpO1xuICAgICAgcGF0dGVybi5vdXRwdXQgPSBwYXR0ZXJuLm91dHB1dCB8fCAnJztcbiAgICAgIHBhdHRlcm4uZ2xvYiA9IHBhdHRlcm4uZ2xvYiB8fCAnJztcblxuICAgICAgLy8gQnVpbGQga2FybWEgZmlsZSBwYXR0ZXJuLlxuICAgICAgY29uc3QgYXNzZXRQYXRoID0gcGF0aC5qb2luKHBhdHRlcm4uaW5wdXQsIHBhdHRlcm4uZ2xvYik7XG4gICAgICBjb25zdCBmaWxlUGF0dGVybiA9IGlzRGlyZWN0b3J5KGFzc2V0UGF0aCkgPyBhc3NldFBhdGggKyAnLyoqJyA6IGFzc2V0UGF0aDtcbiAgICAgIGFkZEthcm1hRmlsZXMoY29uZmlnLmZpbGVzLCBbeyBwYXR0ZXJuOiBmaWxlUGF0dGVybiwgaW5jbHVkZWQ6IGZhbHNlIH1dKTtcblxuICAgICAgLy8gVGhlIGBmaWxlc2AgZW50cnkgc2VydmVzIHRoZSBmaWxlIGZyb20gYC9iYXNlL3thc3NldC5pbnB1dH0ve2Fzc2V0Lmdsb2J9YC5cbiAgICAgIC8vIFdlIG5lZWQgdG8gYWRkIGEgVVJMIHJld3JpdGUgdGhhdCBleHBvc2VzIHRoZSBhc3NldCBhcyBgL3thc3NldC5vdXRwdXR9L3thc3NldC5nbG9ifWAuXG4gICAgICBsZXQgcmVsYXRpdmVQYXRoOiBzdHJpbmcsIHByb3h5UGF0aDogc3RyaW5nO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRQYXRoKSkge1xuICAgICAgICByZWxhdGl2ZVBhdGggPSBwYXRoLnJlbGF0aXZlKGNvbmZpZy5iYXNlUGF0aCwgYXNzZXRQYXRoKTtcbiAgICAgICAgcHJveHlQYXRoID0gcGF0aC5qb2luKHBhdHRlcm4ub3V0cHV0LCBwYXR0ZXJuLmdsb2IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIGdsb2JzIChwYXRocyB0aGF0IGRvbid0IGV4aXN0KSwgcHJveHkgcGF0dGVybi5vdXRwdXQgdG8gcGF0dGVybi5pbnB1dC5cbiAgICAgICAgcmVsYXRpdmVQYXRoID0gcGF0aC5yZWxhdGl2ZShjb25maWcuYmFzZVBhdGgsIHBhdHRlcm4uaW5wdXQpO1xuICAgICAgICBwcm94eVBhdGggPSBwYXRoLmpvaW4ocGF0dGVybi5vdXRwdXQpO1xuXG4gICAgICB9XG4gICAgICAvLyBQcm94eSBwYXRocyBtdXN0IGhhdmUgb25seSBmb3J3YXJkIHNsYXNoZXMuXG4gICAgICBwcm94eVBhdGggPSBwcm94eVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgY29uZmlnLnByb3hpZXNbJy8nICsgcHJveHlQYXRoXSA9ICcvYmFzZS8nICsgcmVsYXRpdmVQYXRoO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIHdlYnBhY2sgY29uZmlnLlxuICBjb25zdCB3ZWJwYWNrQ29uZmlnID0gY29uZmlnLmJ1aWxkV2VicGFjay53ZWJwYWNrQ29uZmlnO1xuICBjb25zdCB3ZWJwYWNrTWlkZGxld2FyZUNvbmZpZyA9IHtcbiAgICBub0luZm86IHRydWUsIC8vIEhpZGUgd2VicGFjayBvdXRwdXQgYmVjYXVzZSBpdHMgbm9pc3kuXG4gICAgd2F0Y2hPcHRpb25zOiB7IHBvbGw6IG9wdGlvbnMucG9sbCB9LFxuICAgIHB1YmxpY1BhdGg6ICcvX2thcm1hX3dlYnBhY2tfLycsXG4gICAgc3RhdHM6IHsgLy8gQWxzbyBwcmV2ZW50IGNodW5rIGFuZCBtb2R1bGUgZGlzcGxheSBvdXRwdXQsIGNsZWFuZXIgbG9vay4gT25seSBlbWl0IGVycm9ycy5cbiAgICAgIGFzc2V0czogZmFsc2UsXG4gICAgICBjb2xvcnM6IHRydWUsXG4gICAgICB2ZXJzaW9uOiBmYWxzZSxcbiAgICAgIGhhc2g6IGZhbHNlLFxuICAgICAgdGltaW5nczogZmFsc2UsXG4gICAgICBjaHVua3M6IGZhbHNlLFxuICAgICAgY2h1bmtNb2R1bGVzOiBmYWxzZVxuICAgIH1cbiAgfTtcblxuICAvLyBGaW5pc2ggS2FybWEgcnVuIGVhcmx5IGluIGNhc2Ugb2YgY29tcGlsYXRpb24gZXJyb3IuXG4gIGNvbnN0IGNvbXBpbGF0aW9uRXJyb3JDYiA9ICgpID0+IGVtaXR0ZXIuZW1pdCgncnVuX2NvbXBsZXRlJywgW10sIHsgZXhpdENvZGU6IDEgfSk7XG4gIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBLYXJtYVdlYnBhY2tGYWlsdXJlQ2IoY29tcGlsYXRpb25FcnJvckNiKSk7XG5cbiAgLy8gVXNlIGV4aXN0aW5nIGNvbmZpZyBpZiBhbnkuXG4gIGNvbmZpZy53ZWJwYWNrID0gT2JqZWN0LmFzc2lnbih3ZWJwYWNrQ29uZmlnLCBjb25maWcud2VicGFjayk7XG4gIGNvbmZpZy53ZWJwYWNrTWlkZGxld2FyZSA9IE9iamVjdC5hc3NpZ24od2VicGFja01pZGRsZXdhcmVDb25maWcsIGNvbmZpZy53ZWJwYWNrTWlkZGxld2FyZSk7XG5cbiAgLy8gV2hlbiB1c2luZyBjb2RlLWNvdmVyYWdlLCBhdXRvLWFkZCBjb3ZlcmFnZS1pc3RhbmJ1bC5cbiAgY29uZmlnLnJlcG9ydGVycyA9IGNvbmZpZy5yZXBvcnRlcnMgfHwgW107XG4gIGlmIChvcHRpb25zLmNvZGVDb3ZlcmFnZSAmJiBjb25maWcucmVwb3J0ZXJzLmluZGV4T2YoJ2NvdmVyYWdlLWlzdGFuYnVsJykgPT09IC0xKSB7XG4gICAgY29uZmlnLnJlcG9ydGVycy5wdXNoKCdjb3ZlcmFnZS1pc3RhbmJ1bCcpO1xuICB9XG5cbiAgLy8gT3VyIGN1c3RvbSBjb250ZXh0IGFuZCBkZWJ1ZyBmaWxlcyBsaXN0IHRoZSB3ZWJwYWNrIGJ1bmRsZXMgZGlyZWN0bHkgaW5zdGVhZCBvZiB1c2luZ1xuICAvLyB0aGUga2FybWEgZmlsZXMgYXJyYXkuXG4gIGNvbmZpZy5jdXN0b21Db250ZXh0RmlsZSA9IGAke19fZGlybmFtZX0va2FybWEtY29udGV4dC5odG1sYDtcbiAgY29uZmlnLmN1c3RvbURlYnVnRmlsZSA9IGAke19fZGlybmFtZX0va2FybWEtZGVidWcuaHRtbGA7XG5cbiAgLy8gQWRkIHRoZSByZXF1ZXN0IGJsb2NrZXIuXG4gIGNvbmZpZy5iZWZvcmVNaWRkbGV3YXJlID0gY29uZmlnLmJlZm9yZU1pZGRsZXdhcmUgfHwgW107XG4gIGNvbmZpZy5iZWZvcmVNaWRkbGV3YXJlLnB1c2goJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrLS1ibG9ja2VyJyk7XG5cbiAgLy8gRGVsZXRlIGdsb2JhbCBzdHlsZXMgZW50cnksIHdlIGRvbid0IHdhbnQgdG8gbG9hZCB0aGVtLlxuICBkZWxldGUgd2VicGFja0NvbmZpZy5lbnRyeS5zdHlsZXM7XG5cbiAgLy8gVGhlIHdlYnBhY2sgdGllciBvd25zIHRoZSB3YXRjaCBiZWhhdmlvciBzbyB3ZSB3YW50IHRvIGZvcmNlIGl0IGluIHRoZSBjb25maWcuXG4gIHdlYnBhY2tDb25maWcud2F0Y2ggPSBvcHRpb25zLndhdGNoO1xuICBpZiAoIW9wdGlvbnMud2F0Y2gpIHtcbiAgICAvLyBUaGVyZSdzIG5vIG9wdGlvbiB0byB0dXJuIG9mZiBmaWxlIHdhdGNoaW5nIGluIHdlYnBhY2stZGV2LXNlcnZlciwgYnV0XG4gICAgLy8gd2UgY2FuIG92ZXJyaWRlIHRoZSBmaWxlIHdhdGNoZXIgaW5zdGVhZC5cbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMudW5zaGlmdCh7XG4gICAgICBhcHBseTogKGNvbXBpbGVyOiBhbnkpID0+IHsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1lbnZpcm9ubWVudCcsICgpID0+IHtcbiAgICAgICAgICBjb21waWxlci53YXRjaEZpbGVTeXN0ZW0gPSB7IHdhdGNoOiAoKSA9PiB7IH0gfTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG4gIC8vIEZpbGVzIG5lZWQgdG8gYmUgc2VydmVkIGZyb20gYSBjdXN0b20gcGF0aCBmb3IgS2FybWEuXG4gIHdlYnBhY2tDb25maWcub3V0cHV0LnBhdGggPSAnL19rYXJtYV93ZWJwYWNrXy8nO1xuICB3ZWJwYWNrQ29uZmlnLm91dHB1dC5wdWJsaWNQYXRoID0gJy9fa2FybWFfd2VicGFja18vJztcblxuICBsZXQgY29tcGlsZXI6IGFueTtcbiAgdHJ5IHtcbiAgICBjb21waWxlciA9IHdlYnBhY2sod2VicGFja0NvbmZpZyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZSk7XG4gICAgaWYgKGUuZGV0YWlscykge1xuICAgICAgY29uc29sZS5lcnJvcihlLmRldGFpbHMpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgWydpbnZhbGlkJywgJ3dhdGNoLXJ1bicsICdydW4nXS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgY29tcGlsZXIucGx1Z2luKG5hbWUsIGZ1bmN0aW9uIChfOiBhbnksIGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgICBpc0Jsb2NrZWQgPSB0cnVlO1xuXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbXBpbGVyLnBsdWdpbignZG9uZScsIChzdGF0czogYW55KSA9PiB7XG4gICAgLy8gRG9uJ3QgcmVmcmVzaCBrYXJtYSB3aGVuIHRoZXJlIGFyZSB3ZWJwYWNrIGVycm9ycy5cbiAgICBpZiAoc3RhdHMuY29tcGlsYXRpb24uZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZW1pdHRlci5yZWZyZXNoRmlsZXMoKTtcbiAgICAgIGlzQmxvY2tlZCA9IGZhbHNlO1xuICAgICAgYmxvY2tlZC5mb3JFYWNoKChjYikgPT4gY2IoKSk7XG4gICAgICBibG9ja2VkID0gW107XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBtaWRkbGV3YXJlID0gbmV3IHdlYnBhY2tEZXZNaWRkbGV3YXJlKGNvbXBpbGVyLCB3ZWJwYWNrTWlkZGxld2FyZUNvbmZpZyk7XG5cbiAgLy8gRm9yd2FyZCByZXF1ZXN0cyB0byB3ZWJwYWNrIHNlcnZlci5cbiAgY3VzdG9tRmlsZUhhbmRsZXJzLnB1c2goe1xuICAgIHVybFJlZ2V4OiAvXlxcL19rYXJtYV93ZWJwYWNrX1xcLy4qLyxcbiAgICBoYW5kbGVyOiBmdW5jdGlvbiBoYW5kbGVyKHJlcTogYW55LCByZXM6IGFueSkge1xuICAgICAgbWlkZGxld2FyZShyZXEsIHJlcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBFbnN1cmUgc2NyaXB0IGFuZCBzdHlsZSBidW5kbGVzIGFyZSBzZXJ2ZWQuXG4gICAgICAgIC8vIFRoZXkgYXJlIG1lbnRpb25lZCBpbiB0aGUgY3VzdG9tIGthcm1hIGNvbnRleHQgcGFnZSBhbmQgd2UgZG9uJ3Qgd2FudCB0aGVtIHRvIDQwNC5cbiAgICAgICAgY29uc3QgYWx3YXlzU2VydmUgPSBbXG4gICAgICAgICAgJy9fa2FybWFfd2VicGFja18vcnVudGltZS5qcycsXG4gICAgICAgICAgJy9fa2FybWFfd2VicGFja18vcG9seWZpbGxzLmpzJyxcbiAgICAgICAgICAnL19rYXJtYV93ZWJwYWNrXy9zY3JpcHRzLmpzJyxcbiAgICAgICAgICAnL19rYXJtYV93ZWJwYWNrXy92ZW5kb3IuanMnLFxuICAgICAgICBdO1xuICAgICAgICBpZiAoYWx3YXlzU2VydmUuaW5kZXhPZihyZXEudXJsKSAhPSAtMSkge1xuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xuICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcbiAgICAgICAgICByZXMuZW5kKCdOb3QgZm91bmQnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBlbWl0dGVyLm9uKCdleGl0JywgKGRvbmU6IGFueSkgPT4ge1xuICAgIG1pZGRsZXdhcmUuY2xvc2UoKTtcbiAgICBkb25lKCk7XG4gIH0pO1xufTtcblxuaW5pdC4kaW5qZWN0ID0gWydjb25maWcnLCAnZW1pdHRlcicsICdjdXN0b21GaWxlSGFuZGxlcnMnXTtcblxuLy8gQmxvY2sgcmVxdWVzdHMgdW50aWwgdGhlIFdlYnBhY2sgY29tcGlsYXRpb24gaXMgZG9uZS5cbmZ1bmN0aW9uIHJlcXVlc3RCbG9ja2VyKCkge1xuICByZXR1cm4gZnVuY3Rpb24gKF9yZXF1ZXN0OiBhbnksIF9yZXNwb25zZTogYW55LCBuZXh0OiAoKSA9PiB2b2lkKSB7XG4gICAgaWYgKGlzQmxvY2tlZCkge1xuICAgICAgYmxvY2tlZC5wdXNoKG5leHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9O1xufVxuXG4vLyBFbWl0cyBidWlsZGVyIGV2ZW50cy5cbmNvbnN0IGV2ZW50UmVwb3J0ZXI6IGFueSA9IGZ1bmN0aW9uICh0aGlzOiBhbnksIGJhc2VSZXBvcnRlckRlY29yYXRvcjogYW55KSB7XG4gIGJhc2VSZXBvcnRlckRlY29yYXRvcih0aGlzKTtcblxuICB0aGlzLm9uUnVuQ29tcGxldGUgPSBmdW5jdGlvbiAoX2Jyb3dzZXJzOiBhbnksIHJlc3VsdHM6IGFueSkge1xuICAgIGlmIChyZXN1bHRzLmV4aXRDb2RlID09PSAwKSB7XG4gICAgICBzdWNjZXNzQ2IgJiYgc3VjY2Vzc0NiKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZhaWx1cmVDYiAmJiBmYWlsdXJlQ2IoKTtcbiAgICB9XG4gIH1cbn07XG5cbmV2ZW50UmVwb3J0ZXIuJGluamVjdCA9IFsnYmFzZVJlcG9ydGVyRGVjb3JhdG9yJ107XG5cbi8vIFN0cmlwIHRoZSBzZXJ2ZXIgYWRkcmVzcyBhbmQgd2VicGFjayBzY2hlbWUgKHdlYnBhY2s6Ly8pIGZyb20gZXJyb3IgbG9nLlxuY29uc3Qgc291cmNlTWFwUmVwb3J0ZXI6IGFueSA9IGZ1bmN0aW9uICh0aGlzOiBhbnksIGJhc2VSZXBvcnRlckRlY29yYXRvcjogYW55LCBjb25maWc6IGFueSkge1xuICBiYXNlUmVwb3J0ZXJEZWNvcmF0b3IodGhpcyk7XG5cbiAgY29uc3QgcmVwb3J0ZXJOYW1lID0gJ0Bhbmd1bGFyL2NsaSc7XG4gIGNvbnN0IGhhc1RyYWlsaW5nUmVwb3J0ZXJzID0gY29uZmlnLnJlcG9ydGVycy5zbGljZSgtMSkucG9wKCkgIT09IHJlcG9ydGVyTmFtZTtcblxuICAvLyBDb3BpZWQgZnJvbSBcImthcm1hLWphc21pbmUtZGlmZi1yZXBvcnRlclwiIHNvdXJjZSBjb2RlOlxuICAvLyBJbiBjYXNlLCB3aGVuIG11bHRpcGxlIHJlcG9ydGVycyBhcmUgdXNlZCBpbiBjb25qdW5jdGlvblxuICAvLyB3aXRoIGluaXRTb3VyY2VtYXBSZXBvcnRlciwgdGhleSBib3RoIHdpbGwgc2hvdyByZXBldGl0aXZlIGxvZ1xuICAvLyBtZXNzYWdlcyB3aGVuIGRpc3BsYXlpbmcgZXZlcnl0aGluZyB0aGF0IHN1cHBvc2VkIHRvIHdyaXRlIHRvIHRlcm1pbmFsLlxuICAvLyBTbyBqdXN0IHN1cHByZXNzIGFueSBsb2dzIGZyb20gaW5pdFNvdXJjZW1hcFJlcG9ydGVyIGJ5IGRvaW5nIG5vdGhpbmcgb25cbiAgLy8gYnJvd3NlciBsb2csIGJlY2F1c2UgaXQgaXMgYW4gdXRpbGl0eSByZXBvcnRlcixcbiAgLy8gdW5sZXNzIGl0J3MgYWxvbmUgaW4gdGhlIFwicmVwb3J0ZXJzXCIgb3B0aW9uIGFuZCBiYXNlIHJlcG9ydGVyIGlzIHVzZWQuXG4gIGlmIChoYXNUcmFpbGluZ1JlcG9ydGVycykge1xuICAgIHRoaXMud3JpdGVDb21tb25Nc2cgPSBmdW5jdGlvbiAoKSB7IH07XG4gIH1cblxuICBjb25zdCB1cmxSZWdleHAgPSAvXFwoaHR0cDpcXC9cXC9sb2NhbGhvc3Q6XFxkK1xcL19rYXJtYV93ZWJwYWNrX1xcL3dlYnBhY2s6XFwvL2dpO1xuXG4gIHRoaXMub25TcGVjQ29tcGxldGUgPSBmdW5jdGlvbiAoX2Jyb3dzZXI6IGFueSwgcmVzdWx0OiBhbnkpIHtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5sb2cubGVuZ3RoID4gMCkge1xuICAgICAgcmVzdWx0LmxvZy5mb3JFYWNoKChsb2c6IHN0cmluZywgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgcmVzdWx0LmxvZ1tpZHhdID0gbG9nLnJlcGxhY2UodXJsUmVnZXhwLCAnJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59O1xuXG5zb3VyY2VNYXBSZXBvcnRlci4kaW5qZWN0ID0gWydiYXNlUmVwb3J0ZXJEZWNvcmF0b3InLCAnY29uZmlnJ107XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAnZnJhbWV3b3JrOkBhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrJzogWydmYWN0b3J5JywgaW5pdF0sXG4gICdyZXBvcnRlcjpAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjay0tc291cmNlbWFwLXJlcG9ydGVyJzogWyd0eXBlJywgc291cmNlTWFwUmVwb3J0ZXJdLFxuICAncmVwb3J0ZXI6QGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2stLWV2ZW50LXJlcG9ydGVyJzogWyd0eXBlJywgZXZlbnRSZXBvcnRlcl0sXG4gICdtaWRkbGV3YXJlOkBhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrLS1ibG9ja2VyJzogWydmYWN0b3J5JywgcmVxdWVzdEJsb2NrZXJdXG59O1xuIl19