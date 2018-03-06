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
    const options = config.webpackBuildFacade.options;
    const appRoot = path.join(config.basePath, options.root);
    successCb = config.webpackBuildFacade.successCb;
    failureCb = config.webpackBuildFacade.failureCb;
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
            // Input is always resolved relative to the appRoot.
            pattern.input = path.resolve(appRoot, pattern.input || '');
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
    const webpackConfig = config.webpackBuildFacade.webpackConfig;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FybWEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL2FuZ3VsYXItY2xpLWZpbGVzL3BsdWdpbnMva2FybWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGlCQUFpQjtBQUNqQiwrREFBK0Q7O0FBRS9ELDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLG1DQUFtQztBQUNuQyxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBRy9ELDREQUF3RDtBQUN4RCx5RUFBbUU7QUFFbkU7Ozs7OztHQU1HO0FBR0gsSUFBSSxPQUFPLEdBQVUsRUFBRSxDQUFDO0FBQ3hCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztBQUN0QixJQUFJLFNBQXFCLENBQUM7QUFDMUIsSUFBSSxTQUFxQixDQUFDO0FBRTFCLHNDQUFzQztBQUN0Qyx1QkFBdUIsS0FBWSxFQUFFLFFBQWUsRUFBRSxPQUFPLEdBQUcsS0FBSztJQUNuRSxNQUFNLFFBQVEsR0FBRztRQUNmLFFBQVEsRUFBRSxJQUFJO1FBQ2QsTUFBTSxFQUFFLElBQUk7UUFDWixPQUFPLEVBQUUsSUFBSTtLQUNkLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxRQUFRO1NBRTVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7U0FFcEUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQU0sUUFBUSxFQUFLLElBQUksRUFBRyxDQUFDLENBQUM7SUFFM0MsbURBQW1EO0lBQ25ELHVEQUF1RDtJQUN2RCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1osS0FBSyxDQUFD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QUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQVcsRUFBRSxHQUFXLEVBQUUsRUFBRTtnQkFDOUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMvQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7QUFFRixpQkFBaUIsQ0FBQyxPQUFPLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUVoRSxNQUFNLENBQUMsT0FBTyxHQUFHO0lBQ2YseUNBQXlDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDO0lBQzVELDREQUE0RCxFQUFFLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDO0lBQ3pGLHdEQUF3RCxFQUFFLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQztJQUNqRixtREFBbUQsRUFBRSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUM7Q0FDakYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXG4vLyBUT0RPOiBjbGVhbnVwIHRoaXMgZmlsZSwgaXQncyBjb3BpZWQgYXMgaXMgZnJvbSBBbmd1bGFyIENMSS5cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuY29uc3Qgd2VicGFja0Rldk1pZGRsZXdhcmUgPSByZXF1aXJlKCd3ZWJwYWNrLWRldi1taWRkbGV3YXJlJyk7XG5cbmltcG9ydCB7IEFzc2V0UGF0dGVybiB9IGZyb20gJy4uL21vZGVscy93ZWJwYWNrLWNvbmZpZ3MvdXRpbHMnO1xuaW1wb3J0IHsgaXNEaXJlY3RvcnkgfSBmcm9tICcuLi91dGlsaXRpZXMvaXMtZGlyZWN0b3J5JztcbmltcG9ydCB7IEthcm1hV2VicGFja0ZhaWx1cmVDYiB9IGZyb20gJy4va2FybWEtd2VicGFjay1mYWlsdXJlLWNiJztcblxuLyoqXG4gKiBFbnVtZXJhdGUgbmVlZGVkIChidXQgbm90IHJlcXVpcmUvaW1wb3J0ZWQpIGRlcGVuZGVuY2llcyBmcm9tIHRoaXMgZmlsZVxuICogIHRvIGxldCB0aGUgZGVwZW5kZW5jeSB2YWxpZGF0b3Iga25vdyB0aGV5IGFyZSB1c2VkLlxuICpcbiAqIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpXG4gKiByZXF1aXJlKCdrYXJtYS1zb3VyY2UtbWFwLXN1cHBvcnQnKVxuICovXG5cblxubGV0IGJsb2NrZWQ6IGFueVtdID0gW107XG5sZXQgaXNCbG9ja2VkID0gZmFsc2U7XG5sZXQgc3VjY2Vzc0NiOiAoKSA9PiB2b2lkO1xubGV0IGZhaWx1cmVDYjogKCkgPT4gdm9pZDtcblxuLy8gQWRkIGZpbGVzIHRvIHRoZSBLYXJtYSBmaWxlcyBhcnJheS5cbmZ1bmN0aW9uIGFkZEthcm1hRmlsZXMoZmlsZXM6IGFueVtdLCBuZXdGaWxlczogYW55W10sIHByZXBlbmQgPSBmYWxzZSkge1xuICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICBpbmNsdWRlZDogdHJ1ZSxcbiAgICBzZXJ2ZWQ6IHRydWUsXG4gICAgd2F0Y2hlZDogdHJ1ZVxuICB9O1xuXG4gIGNvbnN0IHByb2Nlc3NlZEZpbGVzID0gbmV3RmlsZXNcbiAgICAvLyBSZW1vdmUgZ2xvYnMgdGhhdCBkbyBub3QgbWF0Y2ggYW55IGZpbGVzLCBvdGhlcndpc2UgS2FybWEgd2lsbCBzaG93IGEgd2FybmluZyBmb3IgdGhlc2UuXG4gICAgLmZpbHRlcihmaWxlID0+IGdsb2Iuc3luYyhmaWxlLnBhdHRlcm4sIHsgbm9kaXI6IHRydWUgfSkubGVuZ3RoICE9IDApXG4gICAgLy8gRmlsbCBpbiBwYXR0ZXJuIHByb3BlcnRpZXMgd2l0aCBkZWZhdWx0cy5cbiAgICAubWFwKGZpbGUgPT4gKHsgLi4uZGVmYXVsdHMsIC4uLmZpbGUgfSkpO1xuXG4gIC8vIEl0J3MgaW1wb3J0YW50IHRvIG5vdCByZXBsYWNlIHRoZSBhcnJheSwgYmVjYXVzZVxuICAvLyBrYXJtYSBhbHJlYWR5IGhhcyBhIHJlZmVyZW5jZSB0byB0aGUgZXhpc3RpbmcgYXJyYXkuXG4gIGlmIChwcmVwZW5kKSB7XG4gICAgZmlsZXMudW5zaGlmdCguLi5wcm9jZXNzZWRGaWxlcyk7XG4gIH0gZWxzZSB7XG4gICAgZmlsZXMucHVzaCguLi5wcm9jZXNzZWRGaWxlcyk7XG4gIH1cbn1cblxuY29uc3QgaW5pdDogYW55ID0gKGNvbmZpZzogYW55LCBlbWl0dGVyOiBhbnksIGN1c3RvbUZpbGVIYW5kbGVyczogYW55KSA9PiB7XG4gIGNvbnN0IG9wdGlvbnM6IGFueSA9IGNvbmZpZy53ZWJwYWNrQnVpbGRGYWNhZGUub3B0aW9ucztcbiAgY29uc3QgYXBwUm9vdCA9IHBhdGguam9pbihjb25maWcuYmFzZVBhdGgsIG9wdGlvbnMucm9vdCk7XG4gIHN1Y2Nlc3NDYiA9IGNvbmZpZy53ZWJwYWNrQnVpbGRGYWNhZGUuc3VjY2Vzc0NiO1xuICBmYWlsdXJlQ2IgPSBjb25maWcud2VicGFja0J1aWxkRmFjYWRlLmZhaWx1cmVDYjtcblxuICBjb25maWcucmVwb3J0ZXJzLnVuc2hpZnQoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrLS1ldmVudC1yZXBvcnRlcicpO1xuICAvLyBBZGQgYSByZXBvcnRlciB0aGF0IGZpeGVzIHNvdXJjZW1hcCB1cmxzLlxuICBpZiAob3B0aW9ucy5zb3VyY2VNYXApIHtcbiAgICBjb25maWcucmVwb3J0ZXJzLnVuc2hpZnQoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrLS1zb3VyY2VtYXAtcmVwb3J0ZXInKTtcblxuICAgIC8vIENvZGUgdGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vdHNjaGF1Yi9rYXJtYS1zb3VyY2UtbWFwLXN1cHBvcnQuXG4gICAgLy8gV2UgY2FuJ3QgdXNlIGl0IGRpcmVjdGx5IGJlY2F1c2Ugd2UgbmVlZCB0byBhZGQgaXQgY29uZGl0aW9uYWxseSBpbiB0aGlzIGZpbGUsIGFuZCBrYXJtYVxuICAgIC8vIGZyYW1ld29ya3MgY2Fubm90IGJlIGFkZGVkIGR5bmFtaWNhbGx5LlxuICAgIGNvbnN0IHNtc1BhdGggPSBwYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKSk7XG4gICAgY29uc3Qga3Ntc1BhdGggPSBwYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdrYXJtYS1zb3VyY2UtbWFwLXN1cHBvcnQnKSk7XG5cbiAgICBhZGRLYXJtYUZpbGVzKGNvbmZpZy5maWxlcywgW1xuICAgICAgeyBwYXR0ZXJuOiBwYXRoLmpvaW4oc21zUGF0aCwgJ2Jyb3dzZXItc291cmNlLW1hcC1zdXBwb3J0LmpzJyksIHdhdGNoZWQ6IGZhbHNlIH0sXG4gICAgICB7IHBhdHRlcm46IHBhdGguam9pbihrc21zUGF0aCwgJ2NsaWVudC5qcycpLCB3YXRjaGVkOiBmYWxzZSB9XG4gICAgXSwgdHJ1ZSk7XG4gIH1cblxuICAvLyBBZGQgYXNzZXRzLiBUaGlzIGxvZ2ljIGlzIG1pbWljcyB0aGUgb25lIHByZXNlbnQgaW4gR2xvYkNvcHlXZWJwYWNrUGx1Z2luLlxuICBpZiAob3B0aW9ucy5hc3NldHMpIHtcbiAgICBjb25maWcucHJveGllcyA9IGNvbmZpZy5wcm94aWVzIHx8IHt9O1xuICAgIG9wdGlvbnMuYXNzZXRzLmZvckVhY2goKHBhdHRlcm46IEFzc2V0UGF0dGVybikgPT4ge1xuICAgICAgLy8gQ29udmVydCBhbGwgc3RyaW5nIHBhdHRlcm5zIHRvIFBhdHRlcm4gdHlwZS5cbiAgICAgIHBhdHRlcm4gPSB0eXBlb2YgcGF0dGVybiA9PT0gJ3N0cmluZycgPyB7IGdsb2I6IHBhdHRlcm4gfSA6IHBhdHRlcm47XG4gICAgICAvLyBBZGQgZGVmYXVsdHMuXG4gICAgICAvLyBJbnB1dCBpcyBhbHdheXMgcmVzb2x2ZWQgcmVsYXRpdmUgdG8gdGhlIGFwcFJvb3QuXG4gICAgICBwYXR0ZXJuLmlucHV0ID0gcGF0aC5yZXNvbHZlKGFwcFJvb3QsIHBhdHRlcm4uaW5wdXQgfHwgJycpO1xuICAgICAgcGF0dGVybi5vdXRwdXQgPSBwYXR0ZXJuLm91dHB1dCB8fCAnJztcbiAgICAgIHBhdHRlcm4uZ2xvYiA9IHBhdHRlcm4uZ2xvYiB8fCAnJztcblxuICAgICAgLy8gQnVpbGQga2FybWEgZmlsZSBwYXR0ZXJuLlxuICAgICAgY29uc3QgYXNzZXRQYXRoID0gcGF0aC5qb2luKHBhdHRlcm4uaW5wdXQsIHBhdHRlcm4uZ2xvYik7XG4gICAgICBjb25zdCBmaWxlUGF0dGVybiA9IGlzRGlyZWN0b3J5KGFzc2V0UGF0aCkgPyBhc3NldFBhdGggKyAnLyoqJyA6IGFzc2V0UGF0aDtcbiAgICAgIGFkZEthcm1hRmlsZXMoY29uZmlnLmZpbGVzLCBbeyBwYXR0ZXJuOiBmaWxlUGF0dGVybiwgaW5jbHVkZWQ6IGZhbHNlIH1dKTtcblxuICAgICAgLy8gVGhlIGBmaWxlc2AgZW50cnkgc2VydmVzIHRoZSBmaWxlIGZyb20gYC9iYXNlL3thc3NldC5pbnB1dH0ve2Fzc2V0Lmdsb2J9YC5cbiAgICAgIC8vIFdlIG5lZWQgdG8gYWRkIGEgVVJMIHJld3JpdGUgdGhhdCBleHBvc2VzIHRoZSBhc3NldCBhcyBgL3thc3NldC5vdXRwdXR9L3thc3NldC5nbG9ifWAuXG4gICAgICBsZXQgcmVsYXRpdmVQYXRoOiBzdHJpbmcsIHByb3h5UGF0aDogc3RyaW5nO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRQYXRoKSkge1xuICAgICAgICByZWxhdGl2ZVBhdGggPSBwYXRoLnJlbGF0aXZlKGNvbmZpZy5iYXNlUGF0aCwgYXNzZXRQYXRoKTtcbiAgICAgICAgcHJveHlQYXRoID0gcGF0aC5qb2luKHBhdHRlcm4ub3V0cHV0LCBwYXR0ZXJuLmdsb2IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIGdsb2JzIChwYXRocyB0aGF0IGRvbid0IGV4aXN0KSwgcHJveHkgcGF0dGVybi5vdXRwdXQgdG8gcGF0dGVybi5pbnB1dC5cbiAgICAgICAgcmVsYXRpdmVQYXRoID0gcGF0aC5yZWxhdGl2ZShjb25maWcuYmFzZVBhdGgsIHBhdHRlcm4uaW5wdXQpO1xuICAgICAgICBwcm94eVBhdGggPSBwYXRoLmpvaW4ocGF0dGVybi5vdXRwdXQpO1xuXG4gICAgICB9XG4gICAgICAvLyBQcm94eSBwYXRocyBtdXN0IGhhdmUgb25seSBmb3J3YXJkIHNsYXNoZXMuXG4gICAgICBwcm94eVBhdGggPSBwcm94eVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgY29uZmlnLnByb3hpZXNbJy8nICsgcHJveHlQYXRoXSA9ICcvYmFzZS8nICsgcmVsYXRpdmVQYXRoO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIHdlYnBhY2sgY29uZmlnLlxuICBjb25zdCB3ZWJwYWNrQ29uZmlnID0gY29uZmlnLndlYnBhY2tCdWlsZEZhY2FkZS53ZWJwYWNrQ29uZmlnO1xuICBjb25zdCB3ZWJwYWNrTWlkZGxld2FyZUNvbmZpZyA9IHtcbiAgICBub0luZm86IHRydWUsIC8vIEhpZGUgd2VicGFjayBvdXRwdXQgYmVjYXVzZSBpdHMgbm9pc3kuXG4gICAgd2F0Y2hPcHRpb25zOiB7IHBvbGw6IG9wdGlvbnMucG9sbCB9LFxuICAgIHB1YmxpY1BhdGg6ICcvX2thcm1hX3dlYnBhY2tfLycsXG4gICAgc3RhdHM6IHsgLy8gQWxzbyBwcmV2ZW50IGNodW5rIGFuZCBtb2R1bGUgZGlzcGxheSBvdXRwdXQsIGNsZWFuZXIgbG9vay4gT25seSBlbWl0IGVycm9ycy5cbiAgICAgIGFzc2V0czogZmFsc2UsXG4gICAgICBjb2xvcnM6IHRydWUsXG4gICAgICB2ZXJzaW9uOiBmYWxzZSxcbiAgICAgIGhhc2g6IGZhbHNlLFxuICAgICAgdGltaW5nczogZmFsc2UsXG4gICAgICBjaHVua3M6IGZhbHNlLFxuICAgICAgY2h1bmtNb2R1bGVzOiBmYWxzZVxuICAgIH1cbiAgfTtcblxuICAvLyBGaW5pc2ggS2FybWEgcnVuIGVhcmx5IGluIGNhc2Ugb2YgY29tcGlsYXRpb24gZXJyb3IuXG4gIGNvbnN0IGNvbXBpbGF0aW9uRXJyb3JDYiA9ICgpID0+IGVtaXR0ZXIuZW1pdCgncnVuX2NvbXBsZXRlJywgW10sIHsgZXhpdENvZGU6IDEgfSk7XG4gIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBLYXJtYVdlYnBhY2tGYWlsdXJlQ2IoY29tcGlsYXRpb25FcnJvckNiKSk7XG5cbiAgLy8gVXNlIGV4aXN0aW5nIGNvbmZpZyBpZiBhbnkuXG4gIGNvbmZpZy53ZWJwYWNrID0gT2JqZWN0LmFzc2lnbih3ZWJwYWNrQ29uZmlnLCBjb25maWcud2VicGFjayk7XG4gIGNvbmZpZy53ZWJwYWNrTWlkZGxld2FyZSA9IE9iamVjdC5hc3NpZ24od2VicGFja01pZGRsZXdhcmVDb25maWcsIGNvbmZpZy53ZWJwYWNrTWlkZGxld2FyZSk7XG5cbiAgLy8gV2hlbiB1c2luZyBjb2RlLWNvdmVyYWdlLCBhdXRvLWFkZCBjb3ZlcmFnZS1pc3RhbmJ1bC5cbiAgY29uZmlnLnJlcG9ydGVycyA9IGNvbmZpZy5yZXBvcnRlcnMgfHwgW107XG4gIGlmIChvcHRpb25zLmNvZGVDb3ZlcmFnZSAmJiBjb25maWcucmVwb3J0ZXJzLmluZGV4T2YoJ2NvdmVyYWdlLWlzdGFuYnVsJykgPT09IC0xKSB7XG4gICAgY29uZmlnLnJlcG9ydGVycy5wdXNoKCdjb3ZlcmFnZS1pc3RhbmJ1bCcpO1xuICB9XG5cbiAgLy8gT3VyIGN1c3RvbSBjb250ZXh0IGFuZCBkZWJ1ZyBmaWxlcyBsaXN0IHRoZSB3ZWJwYWNrIGJ1bmRsZXMgZGlyZWN0bHkgaW5zdGVhZCBvZiB1c2luZ1xuICAvLyB0aGUga2FybWEgZmlsZXMgYXJyYXkuXG4gIGNvbmZpZy5jdXN0b21Db250ZXh0RmlsZSA9IGAke19fZGlybmFtZX0va2FybWEtY29udGV4dC5odG1sYDtcbiAgY29uZmlnLmN1c3RvbURlYnVnRmlsZSA9IGAke19fZGlybmFtZX0va2FybWEtZGVidWcuaHRtbGA7XG5cbiAgLy8gQWRkIHRoZSByZXF1ZXN0IGJsb2NrZXIuXG4gIGNvbmZpZy5iZWZvcmVNaWRkbGV3YXJlID0gY29uZmlnLmJlZm9yZU1pZGRsZXdhcmUgfHwgW107XG4gIGNvbmZpZy5iZWZvcmVNaWRkbGV3YXJlLnB1c2goJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrLS1ibG9ja2VyJyk7XG5cbiAgLy8gRGVsZXRlIGdsb2JhbCBzdHlsZXMgZW50cnksIHdlIGRvbid0IHdhbnQgdG8gbG9hZCB0aGVtLlxuICBkZWxldGUgd2VicGFja0NvbmZpZy5lbnRyeS5zdHlsZXM7XG5cbiAgLy8gVGhlIHdlYnBhY2sgdGllciBvd25zIHRoZSB3YXRjaCBiZWhhdmlvciBzbyB3ZSB3YW50IHRvIGZvcmNlIGl0IGluIHRoZSBjb25maWcuXG4gIHdlYnBhY2tDb25maWcud2F0Y2ggPSBvcHRpb25zLndhdGNoO1xuICBpZiAoIW9wdGlvbnMud2F0Y2gpIHtcbiAgICAvLyBUaGVyZSdzIG5vIG9wdGlvbiB0byB0dXJuIG9mZiBmaWxlIHdhdGNoaW5nIGluIHdlYnBhY2stZGV2LXNlcnZlciwgYnV0XG4gICAgLy8gd2UgY2FuIG92ZXJyaWRlIHRoZSBmaWxlIHdhdGNoZXIgaW5zdGVhZC5cbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMudW5zaGlmdCh7XG4gICAgICBhcHBseTogKGNvbXBpbGVyOiBhbnkpID0+IHsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1lbnZpcm9ubWVudCcsICgpID0+IHtcbiAgICAgICAgICBjb21waWxlci53YXRjaEZpbGVTeXN0ZW0gPSB7IHdhdGNoOiAoKSA9PiB7IH0gfTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG4gIC8vIEZpbGVzIG5lZWQgdG8gYmUgc2VydmVkIGZyb20gYSBjdXN0b20gcGF0aCBmb3IgS2FybWEuXG4gIHdlYnBhY2tDb25maWcub3V0cHV0LnBhdGggPSAnL19rYXJtYV93ZWJwYWNrXy8nO1xuICB3ZWJwYWNrQ29uZmlnLm91dHB1dC5wdWJsaWNQYXRoID0gJy9fa2FybWFfd2VicGFja18vJztcblxuICBsZXQgY29tcGlsZXI6IGFueTtcbiAgdHJ5IHtcbiAgICBjb21waWxlciA9IHdlYnBhY2sod2VicGFja0NvbmZpZyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZSk7XG4gICAgaWYgKGUuZGV0YWlscykge1xuICAgICAgY29uc29sZS5lcnJvcihlLmRldGFpbHMpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgWydpbnZhbGlkJywgJ3dhdGNoLXJ1bicsICdydW4nXS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgY29tcGlsZXIucGx1Z2luKG5hbWUsIGZ1bmN0aW9uIChfOiBhbnksIGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgICBpc0Jsb2NrZWQgPSB0cnVlO1xuXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbXBpbGVyLnBsdWdpbignZG9uZScsIChzdGF0czogYW55KSA9PiB7XG4gICAgLy8gRG9uJ3QgcmVmcmVzaCBrYXJtYSB3aGVuIHRoZXJlIGFyZSB3ZWJwYWNrIGVycm9ycy5cbiAgICBpZiAoc3RhdHMuY29tcGlsYXRpb24uZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZW1pdHRlci5yZWZyZXNoRmlsZXMoKTtcbiAgICAgIGlzQmxvY2tlZCA9IGZhbHNlO1xuICAgICAgYmxvY2tlZC5mb3JFYWNoKChjYikgPT4gY2IoKSk7XG4gICAgICBibG9ja2VkID0gW107XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBtaWRkbGV3YXJlID0gbmV3IHdlYnBhY2tEZXZNaWRkbGV3YXJlKGNvbXBpbGVyLCB3ZWJwYWNrTWlkZGxld2FyZUNvbmZpZyk7XG5cbiAgLy8gRm9yd2FyZCByZXF1ZXN0cyB0byB3ZWJwYWNrIHNlcnZlci5cbiAgY3VzdG9tRmlsZUhhbmRsZXJzLnB1c2goe1xuICAgIHVybFJlZ2V4OiAvXlxcL19rYXJtYV93ZWJwYWNrX1xcLy4qLyxcbiAgICBoYW5kbGVyOiBmdW5jdGlvbiBoYW5kbGVyKHJlcTogYW55LCByZXM6IGFueSkge1xuICAgICAgbWlkZGxld2FyZShyZXEsIHJlcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBFbnN1cmUgc2NyaXB0IGFuZCBzdHlsZSBidW5kbGVzIGFyZSBzZXJ2ZWQuXG4gICAgICAgIC8vIFRoZXkgYXJlIG1lbnRpb25lZCBpbiB0aGUgY3VzdG9tIGthcm1hIGNvbnRleHQgcGFnZSBhbmQgd2UgZG9uJ3Qgd2FudCB0aGVtIHRvIDQwNC5cbiAgICAgICAgY29uc3QgYWx3YXlzU2VydmUgPSBbXG4gICAgICAgICAgJy9fa2FybWFfd2VicGFja18vcnVudGltZS5qcycsXG4gICAgICAgICAgJy9fa2FybWFfd2VicGFja18vcG9seWZpbGxzLmpzJyxcbiAgICAgICAgICAnL19rYXJtYV93ZWJwYWNrXy9zY3JpcHRzLmpzJyxcbiAgICAgICAgICAnL19rYXJtYV93ZWJwYWNrXy92ZW5kb3IuanMnLFxuICAgICAgICBdO1xuICAgICAgICBpZiAoYWx3YXlzU2VydmUuaW5kZXhPZihyZXEudXJsKSAhPSAtMSkge1xuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xuICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcbiAgICAgICAgICByZXMuZW5kKCdOb3QgZm91bmQnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBlbWl0dGVyLm9uKCdleGl0JywgKGRvbmU6IGFueSkgPT4ge1xuICAgIG1pZGRsZXdhcmUuY2xvc2UoKTtcbiAgICBkb25lKCk7XG4gIH0pO1xufTtcblxuaW5pdC4kaW5qZWN0ID0gWydjb25maWcnLCAnZW1pdHRlcicsICdjdXN0b21GaWxlSGFuZGxlcnMnXTtcblxuLy8gQmxvY2sgcmVxdWVzdHMgdW50aWwgdGhlIFdlYnBhY2sgY29tcGlsYXRpb24gaXMgZG9uZS5cbmZ1bmN0aW9uIHJlcXVlc3RCbG9ja2VyKCkge1xuICByZXR1cm4gZnVuY3Rpb24gKF9yZXF1ZXN0OiBhbnksIF9yZXNwb25zZTogYW55LCBuZXh0OiAoKSA9PiB2b2lkKSB7XG4gICAgaWYgKGlzQmxvY2tlZCkge1xuICAgICAgYmxvY2tlZC5wdXNoKG5leHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9O1xufVxuXG4vLyBFbWl0cyBidWlsZGVyIGV2ZW50cy5cbmNvbnN0IGV2ZW50UmVwb3J0ZXI6IGFueSA9IGZ1bmN0aW9uICh0aGlzOiBhbnksIGJhc2VSZXBvcnRlckRlY29yYXRvcjogYW55KSB7XG4gIGJhc2VSZXBvcnRlckRlY29yYXRvcih0aGlzKTtcblxuICB0aGlzLm9uUnVuQ29tcGxldGUgPSBmdW5jdGlvbiAoX2Jyb3dzZXJzOiBhbnksIHJlc3VsdHM6IGFueSkge1xuICAgIGlmIChyZXN1bHRzLmV4aXRDb2RlID09PSAwKSB7XG4gICAgICBzdWNjZXNzQ2IgJiYgc3VjY2Vzc0NiKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZhaWx1cmVDYiAmJiBmYWlsdXJlQ2IoKTtcbiAgICB9XG4gIH1cbn07XG5cbmV2ZW50UmVwb3J0ZXIuJGluamVjdCA9IFsnYmFzZVJlcG9ydGVyRGVjb3JhdG9yJ107XG5cbi8vIFN0cmlwIHRoZSBzZXJ2ZXIgYWRkcmVzcyBhbmQgd2VicGFjayBzY2hlbWUgKHdlYnBhY2s6Ly8pIGZyb20gZXJyb3IgbG9nLlxuY29uc3Qgc291cmNlTWFwUmVwb3J0ZXI6IGFueSA9IGZ1bmN0aW9uICh0aGlzOiBhbnksIGJhc2VSZXBvcnRlckRlY29yYXRvcjogYW55LCBjb25maWc6IGFueSkge1xuICBiYXNlUmVwb3J0ZXJEZWNvcmF0b3IodGhpcyk7XG5cbiAgY29uc3QgcmVwb3J0ZXJOYW1lID0gJ0Bhbmd1bGFyL2NsaSc7XG4gIGNvbnN0IGhhc1RyYWlsaW5nUmVwb3J0ZXJzID0gY29uZmlnLnJlcG9ydGVycy5zbGljZSgtMSkucG9wKCkgIT09IHJlcG9ydGVyTmFtZTtcblxuICAvLyBDb3BpZWQgZnJvbSBcImthcm1hLWphc21pbmUtZGlmZi1yZXBvcnRlclwiIHNvdXJjZSBjb2RlOlxuICAvLyBJbiBjYXNlLCB3aGVuIG11bHRpcGxlIHJlcG9ydGVycyBhcmUgdXNlZCBpbiBjb25qdW5jdGlvblxuICAvLyB3aXRoIGluaXRTb3VyY2VtYXBSZXBvcnRlciwgdGhleSBib3RoIHdpbGwgc2hvdyByZXBldGl0aXZlIGxvZ1xuICAvLyBtZXNzYWdlcyB3aGVuIGRpc3BsYXlpbmcgZXZlcnl0aGluZyB0aGF0IHN1cHBvc2VkIHRvIHdyaXRlIHRvIHRlcm1pbmFsLlxuICAvLyBTbyBqdXN0IHN1cHByZXNzIGFueSBsb2dzIGZyb20gaW5pdFNvdXJjZW1hcFJlcG9ydGVyIGJ5IGRvaW5nIG5vdGhpbmcgb25cbiAgLy8gYnJvd3NlciBsb2csIGJlY2F1c2UgaXQgaXMgYW4gdXRpbGl0eSByZXBvcnRlcixcbiAgLy8gdW5sZXNzIGl0J3MgYWxvbmUgaW4gdGhlIFwicmVwb3J0ZXJzXCIgb3B0aW9uIGFuZCBiYXNlIHJlcG9ydGVyIGlzIHVzZWQuXG4gIGlmIChoYXNUcmFpbGluZ1JlcG9ydGVycykge1xuICAgIHRoaXMud3JpdGVDb21tb25Nc2cgPSBmdW5jdGlvbiAoKSB7IH07XG4gIH1cblxuICBjb25zdCB1cmxSZWdleHAgPSAvXFwoaHR0cDpcXC9cXC9sb2NhbGhvc3Q6XFxkK1xcL19rYXJtYV93ZWJwYWNrX1xcL3dlYnBhY2s6XFwvL2dpO1xuXG4gIHRoaXMub25TcGVjQ29tcGxldGUgPSBmdW5jdGlvbiAoX2Jyb3dzZXI6IGFueSwgcmVzdWx0OiBhbnkpIHtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5sb2cubGVuZ3RoID4gMCkge1xuICAgICAgcmVzdWx0LmxvZy5mb3JFYWNoKChsb2c6IHN0cmluZywgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgcmVzdWx0LmxvZ1tpZHhdID0gbG9nLnJlcGxhY2UodXJsUmVnZXhwLCAnJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59O1xuXG5zb3VyY2VNYXBSZXBvcnRlci4kaW5qZWN0ID0gWydiYXNlUmVwb3J0ZXJEZWNvcmF0b3InLCAnY29uZmlnJ107XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAnZnJhbWV3b3JrOkBhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrJzogWydmYWN0b3J5JywgaW5pdF0sXG4gICdyZXBvcnRlcjpAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjay0tc291cmNlbWFwLXJlcG9ydGVyJzogWyd0eXBlJywgc291cmNlTWFwUmVwb3J0ZXJdLFxuICAncmVwb3J0ZXI6QGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2stLWV2ZW50LXJlcG9ydGVyJzogWyd0eXBlJywgZXZlbnRSZXBvcnRlcl0sXG4gICdtaWRkbGV3YXJlOkBhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrLS1ibG9ja2VyJzogWydmYWN0b3J5JywgcmVxdWVzdEJsb2NrZXJdXG59O1xuIl19