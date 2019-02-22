"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
exports.defaultLoggingCb = (stats, config, logger) => logger.info(stats.toString(config.stats));
class WebpackBuilder {
    constructor(context) {
        this.context = context;
    }
    run(builderConfig) {
        const configPath = core_1.resolve(this.context.workspace.root, core_1.normalize(builderConfig.options.webpackConfig));
        return this.loadWebpackConfig(core_1.getSystemPath(configPath)).pipe(operators_1.concatMap(config => this.runWebpack(config)));
    }
    loadWebpackConfig(webpackConfigPath) {
        return rxjs_1.from(Promise.resolve().then(() => require(webpackConfigPath)));
    }
    createWebpackCompiler(config) {
        return webpack(config);
    }
    runWebpack(config, loggingCb = exports.defaultLoggingCb) {
        return new rxjs_1.Observable(obs => {
            const webpackCompiler = this.createWebpackCompiler(config);
            const callback = (err, stats) => {
                if (err) {
                    return obs.error(err);
                }
                // Log stats.
                loggingCb(stats, config, this.context.logger);
                obs.next({ success: !stats.hasErrors() });
                if (!config.watch) {
                    obs.complete();
                }
            };
            try {
                if (config.watch) {
                    const watchOptions = config.watchOptions || {};
                    const watching = webpackCompiler.watch(watchOptions, callback);
                    // Teardown logic. Close the watcher when unsubscribed from.
                    return () => watching.close(() => { });
                }
                else {
                    webpackCompiler.run(callback);
                }
            }
            catch (err) {
                if (err) {
                    this.context.logger.error('\nAn error occured during the build:\n' + ((err && err.stack) || err));
                }
                throw err;
            }
        });
    }
}
exports.WebpackBuilder = WebpackBuilder;
exports.default = WebpackBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3dlYnBhY2svaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFhQSwrQ0FBd0Y7QUFDeEYsK0JBQXdDO0FBQ3hDLDhDQUEyQztBQUMzQyxtQ0FBbUM7QUFRdEIsUUFBQSxnQkFBZ0IsR0FBb0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQ3pFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUU1QyxNQUFhLGNBQWM7SUFFekIsWUFBbUIsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7SUFBSSxDQUFDO0lBRS9DLEdBQUcsQ0FBQyxhQUF5RDtRQUMzRCxNQUFNLFVBQVUsR0FBRyxjQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUNwRCxnQkFBUyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUVsRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUMzRCxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUM3QyxDQUFDO0lBQ0osQ0FBQztJQUVNLGlCQUFpQixDQUFDLGlCQUF5QjtRQUNoRCxPQUFPLFdBQUksc0NBQVEsaUJBQWlCLEdBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRVMscUJBQXFCLENBQUMsTUFBNkI7UUFDM0QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVNLFVBQVUsQ0FDZixNQUE2QixFQUFFLFNBQVMsR0FBRyx3QkFBZ0I7UUFFM0QsT0FBTyxJQUFJLGlCQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDMUIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTNELE1BQU0sUUFBUSxHQUFzQyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDakUsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUN2QjtnQkFFRCxhQUFhO2dCQUNiLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRTlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUUxQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTtvQkFDakIsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO2lCQUNoQjtZQUNILENBQUMsQ0FBQztZQUVGLElBQUk7Z0JBQ0YsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO29CQUNoQixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztvQkFDL0MsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBRS9ELDREQUE0RDtvQkFDNUQsT0FBTyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUN4QztxQkFBTTtvQkFDTCxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUMvQjthQUNGO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osSUFBSSxHQUFHLEVBQUU7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUN2Qix3Q0FBd0MsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUMzRTtnQkFDRCxNQUFNLEdBQUcsQ0FBQzthQUNYO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3REQsd0NBNkRDO0FBRUQsa0JBQWUsY0FBYyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlcixcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb24sXG4gIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IFBhdGgsIGdldFN5c3RlbVBhdGgsIGxvZ2dpbmcsIG5vcm1hbGl6ZSwgcmVzb2x2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE9ic2VydmFibGUsIGZyb20gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNvbmNhdE1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgV2VicGFja0J1aWxkZXJTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBMb2dnaW5nQ2FsbGJhY2sge1xuICAoc3RhdHM6IHdlYnBhY2suU3RhdHMsIGNvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uLCBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyKTogdm9pZDtcbn1cblxuZXhwb3J0IGNvbnN0IGRlZmF1bHRMb2dnaW5nQ2I6IExvZ2dpbmdDYWxsYmFjayA9IChzdGF0cywgY29uZmlnLCBsb2dnZXIpID0+XG4gIGxvZ2dlci5pbmZvKHN0YXRzLnRvU3RyaW5nKGNvbmZpZy5zdGF0cykpO1xuXG5leHBvcnQgY2xhc3MgV2VicGFja0J1aWxkZXIgaW1wbGVtZW50cyBCdWlsZGVyPFdlYnBhY2tCdWlsZGVyU2NoZW1hPiB7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KSB7IH1cblxuICBydW4oYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248V2VicGFja0J1aWxkZXJTY2hlbWE+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IHJlc29sdmUodGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290LFxuICAgICAgbm9ybWFsaXplKGJ1aWxkZXJDb25maWcub3B0aW9ucy53ZWJwYWNrQ29uZmlnKSk7XG5cbiAgICByZXR1cm4gdGhpcy5sb2FkV2VicGFja0NvbmZpZyhnZXRTeXN0ZW1QYXRoKGNvbmZpZ1BhdGgpKS5waXBlKFxuICAgICAgY29uY2F0TWFwKGNvbmZpZyA9PiB0aGlzLnJ1bldlYnBhY2soY29uZmlnKSksXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBsb2FkV2VicGFja0NvbmZpZyh3ZWJwYWNrQ29uZmlnUGF0aDogc3RyaW5nKTogT2JzZXJ2YWJsZTx3ZWJwYWNrLkNvbmZpZ3VyYXRpb24+IHtcbiAgICByZXR1cm4gZnJvbShpbXBvcnQod2VicGFja0NvbmZpZ1BhdGgpKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjcmVhdGVXZWJwYWNrQ29tcGlsZXIoY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pOiB3ZWJwYWNrLkNvbXBpbGVyIHtcbiAgICByZXR1cm4gd2VicGFjayhjb25maWcpO1xuICB9XG5cbiAgcHVibGljIHJ1bldlYnBhY2soXG4gICAgY29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sIGxvZ2dpbmdDYiA9IGRlZmF1bHRMb2dnaW5nQ2IsXG4gICk6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgY29uc3Qgd2VicGFja0NvbXBpbGVyID0gdGhpcy5jcmVhdGVXZWJwYWNrQ29tcGlsZXIoY29uZmlnKTtcblxuICAgICAgY29uc3QgY2FsbGJhY2s6IHdlYnBhY2suY29tcGlsZXIuQ29tcGlsZXJDYWxsYmFjayA9IChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gb2JzLmVycm9yKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2cgc3RhdHMuXG4gICAgICAgIGxvZ2dpbmdDYihzdGF0cywgY29uZmlnLCB0aGlzLmNvbnRleHQubG9nZ2VyKTtcblxuICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6ICFzdGF0cy5oYXNFcnJvcnMoKSB9KTtcblxuICAgICAgICBpZiAoIWNvbmZpZy53YXRjaCkge1xuICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICBpZiAoY29uZmlnLndhdGNoKSB7XG4gICAgICAgICAgY29uc3Qgd2F0Y2hPcHRpb25zID0gY29uZmlnLndhdGNoT3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICBjb25zdCB3YXRjaGluZyA9IHdlYnBhY2tDb21waWxlci53YXRjaCh3YXRjaE9wdGlvbnMsIGNhbGxiYWNrKTtcblxuICAgICAgICAgIC8vIFRlYXJkb3duIGxvZ2ljLiBDbG9zZSB0aGUgd2F0Y2hlciB3aGVuIHVuc3Vic2NyaWJlZCBmcm9tLlxuICAgICAgICAgIHJldHVybiAoKSA9PiB3YXRjaGluZy5jbG9zZSgoKSA9PiB7IH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdlYnBhY2tDb21waWxlci5ydW4oY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAnXFxuQW4gZXJyb3Igb2NjdXJlZCBkdXJpbmcgdGhlIGJ1aWxkOlxcbicgKyAoKGVyciAmJiBlcnIuc3RhY2spIHx8IGVycikpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXZWJwYWNrQnVpbGRlcjtcbiJdfQ==