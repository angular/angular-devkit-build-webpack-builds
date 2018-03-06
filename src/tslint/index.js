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
const glob = require("glob");
const minimatch_1 = require("minimatch");
const path = require("path");
const Observable_1 = require("rxjs/Observable");
const require_project_module_1 = require("../angular-cli-files/utilities/require-project-module");
const strip_bom_1 = require("../angular-cli-files/utilities/strip-bom");
class TslintBuilder {
    constructor(context) {
        this.context = context;
    }
    run(target) {
        const root = core_1.getSystemPath(target.root);
        const options = target.options;
        if (!options.tsConfig && options.typeCheck) {
            throw new Error('A "project" must be specified to enable type checking.');
        }
        return new Observable_1.Observable(obs => {
            const projectTslint = require_project_module_1.requireProjectModule(root, 'tslint');
            const tslintConfigPath = options.tslintConfig
                ? path.resolve(root, options.tslintConfig)
                : null;
            const Linter = projectTslint.Linter;
            const Configuration = projectTslint.Configuration;
            let program = undefined;
            if (options.tsConfig) {
                program = Linter.createProgram(path.resolve(root, options.tsConfig));
            }
            const files = getFilesToLint(root, options, Linter, program);
            const lintOptions = {
                fix: options.fix,
                formatter: options.format,
            };
            const linter = new Linter(lintOptions, program);
            let lastDirectory;
            let configLoad;
            for (const file of files) {
                const contents = getFileContents(file, options, program);
                // Only check for a new tslint config if the path changes.
                const currentDirectory = path.dirname(file);
                if (currentDirectory !== lastDirectory) {
                    configLoad = Configuration.findConfiguration(tslintConfigPath, file);
                    lastDirectory = currentDirectory;
                }
                if (contents && configLoad) {
                    linter.lint(file, contents, configLoad.results);
                }
            }
            const result = linter.getResult();
            if (!options.silent) {
                const Formatter = projectTslint.findFormatter(options.format);
                if (!Formatter) {
                    throw new Error(`Invalid lint format "${options.format}".`);
                }
                const formatter = new Formatter();
                const output = formatter.format(result.failures, result.fixes);
                if (output) {
                    this.context.logger.info(output);
                }
            }
            // Print formatter output directly for non human-readable formats.
            if (['prose', 'verbose', 'stylish'].indexOf(options.format) == -1) {
                options.silent = true;
            }
            if (result.warningCount > 0 && !options.silent) {
                this.context.logger.warn('Lint warnings found in the listed files.');
            }
            if (result.errorCount > 0 && !options.silent) {
                this.context.logger.error('Lint errors found in the listed files.');
            }
            if (result.warningCount === 0 && result.errorCount === 0 && !options.silent) {
                this.context.logger.info('All files pass linting.');
            }
            const success = options.force || result.errorCount === 0;
            obs.next({ success });
            return obs.complete();
        });
    }
}
exports.TslintBuilder = TslintBuilder;
function getFilesToLint(root, options, linter, program) {
    const ignore = options.exclude;
    if (options.files.length > 0) {
        return options.files
            .map(file => glob.sync(file, { cwd: root, ignore, nodir: true }))
            .reduce((prev, curr) => prev.concat(curr), [])
            .map(file => path.join(root, file));
    }
    if (!program) {
        return [];
    }
    let programFiles = linter.getFileNames(program);
    if (ignore && ignore.length > 0) {
        const ignoreMatchers = ignore.map(pattern => new minimatch_1.Minimatch(pattern, { dot: true }));
        programFiles = programFiles
            .filter(file => !ignoreMatchers.some(matcher => matcher.match(file)));
    }
    return programFiles;
}
function getFileContents(file, options, program) {
    // The linter retrieves the SourceFile TS node directly if a program is used
    if (program) {
        if (program.getSourceFile(file) == undefined) {
            const message = `File '${file}' is not part of the TypeScript project '${options.tsConfig}'.`;
            throw new Error(message);
        }
        // TODO: this return had to be commented out otherwise no file would be linted, figure out why.
        // return undefined;
    }
    // NOTE: The tslint CLI checks for and excludes MPEG transport streams; this does not.
    try {
        return strip_bom_1.stripBom(fs_1.readFileSync(file, 'utf-8'));
    }
    catch (e) {
        throw new Error(`Could not read file '${file}'.`);
    }
}
exports.default = TslintBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3RzbGludC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUdILCtDQUFxRDtBQUNyRCwyQkFBa0M7QUFDbEMsNkJBQTZCO0FBQzdCLHlDQUFzQztBQUN0Qyw2QkFBNkI7QUFDN0IsZ0RBQTZDO0FBRzdDLGtHQUE2RjtBQUM3Rix3RUFBb0U7QUFlcEU7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLE1BQW9DO1FBRXRDLE1BQU0sSUFBSSxHQUFHLG9CQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFFL0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksdUJBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMxQixNQUFNLGFBQWEsR0FBRyw2Q0FBb0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFrQixDQUFDO1lBQzVFLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFlBQVk7Z0JBQzNDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDO2dCQUMxQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ1QsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztZQUNwQyxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsYUFBYSxDQUFDO1lBRWxELElB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Q0FBQyxDQUFDLENBQUM7WUFDN0MsTUFBTSxPQUFPLEdBQUcsU0FBUyxJQUFJLDRDQUE0QyxPQUFPLENBQUMsUUFBUSxJQUFJLENBQUM7WUFDOUYsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBRUQsK0ZBQStGO1FBQy9GLG9CQUFvQjtJQUN0QixDQUFDO0lBRUQsc0ZBQXNGO0lBQ3RGLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxvQkFBUSxDQUFDLGlCQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixJQUFJLElBQUksQ0FBQyxDQUFDO0lBQ3BELENBQUM7QUFDSCxDQUFDO0FBRUQsa0JBQWUsYUFBYSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBCdWlsZEV2ZW50LCBCdWlsZGVyLCBCdWlsZGVyQ29udGV4dCwgVGFyZ2V0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBnZXRTeXN0ZW1QYXRoIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IE1pbmltYXRjaCB9IGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQgKiBhcyB0c2xpbnQgZnJvbSAndHNsaW50JzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWltcGxpY2l0LWRlcGVuZGVuY2llc1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5pbXBvcnQgeyBzdHJpcEJvbSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9zdHJpcC1ib20nO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNsaW50QnVpbGRlck9wdGlvbnMge1xuICB0c2xpbnRDb25maWc/OiBzdHJpbmc7XG4gIHRzQ29uZmlnPzogc3RyaW5nO1xuICBmaXg6IGJvb2xlYW47XG4gIHR5cGVDaGVjazogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG4gIHNpbGVudDogYm9vbGVhbjtcbiAgZm9ybWF0OiBzdHJpbmc7XG4gIGV4Y2x1ZGU6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBUc2xpbnRCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxUc2xpbnRCdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKHRhcmdldDogVGFyZ2V0PFRzbGludEJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuXG4gICAgY29uc3Qgcm9vdCA9IGdldFN5c3RlbVBhdGgodGFyZ2V0LnJvb3QpO1xuICAgIGNvbnN0IG9wdGlvbnMgPSB0YXJnZXQub3B0aW9ucztcblxuICAgIGlmICghb3B0aW9ucy50c0NvbmZpZyAmJiBvcHRpb25zLnR5cGVDaGVjaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBIFwicHJvamVjdFwiIG11c3QgYmUgc3BlY2lmaWVkIHRvIGVuYWJsZSB0eXBlIGNoZWNraW5nLicpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgY29uc3QgcHJvamVjdFRzbGludCA9IHJlcXVpcmVQcm9qZWN0TW9kdWxlKHJvb3QsICd0c2xpbnQnKSBhcyB0eXBlb2YgdHNsaW50O1xuICAgICAgY29uc3QgdHNsaW50Q29uZmlnUGF0aCA9IG9wdGlvbnMudHNsaW50Q29uZmlnXG4gICAgICAgID8gcGF0aC5yZXNvbHZlKHJvb3QsIG9wdGlvbnMudHNsaW50Q29uZmlnKVxuICAgICAgICA6IG51bGw7XG4gICAgICBjb25zdCBMaW50ZXIgPSBwcm9qZWN0VHNsaW50LkxpbnRlcjtcbiAgICAgIGNvbnN0IENvbmZpZ3VyYXRpb24gPSBwcm9qZWN0VHNsaW50LkNvbmZpZ3VyYXRpb247XG5cbiAgICAgIGxldCBwcm9ncmFtOiB0cy5Qcm9ncmFtIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKG9wdGlvbnMudHNDb25maWcpIHtcbiAgICAgICAgcHJvZ3JhbSA9IExpbnRlci5jcmVhdGVQcm9ncmFtKHBhdGgucmVzb2x2ZShyb290LCBvcHRpb25zLnRzQ29uZmlnKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVzID0gZ2V0RmlsZXNUb0xpbnQocm9vdCwgb3B0aW9ucywgTGludGVyLCBwcm9ncmFtKTtcbiAgICAgIGNvbnN0IGxpbnRPcHRpb25zID0ge1xuICAgICAgICBmaXg6IG9wdGlvbnMuZml4LFxuICAgICAgICBmb3JtYXR0ZXI6IG9wdGlvbnMuZm9ybWF0LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgbGludGVyID0gbmV3IExpbnRlcihsaW50T3B0aW9ucywgcHJvZ3JhbSk7XG5cbiAgICAgIGxldCBsYXN0RGlyZWN0b3J5O1xuICAgICAgbGV0IGNvbmZpZ0xvYWQ7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgY29uc3QgY29udGVudHMgPSBnZXRGaWxlQ29udGVudHMoZmlsZSwgb3B0aW9ucywgcHJvZ3JhbSk7XG5cbiAgICAgICAgLy8gT25seSBjaGVjayBmb3IgYSBuZXcgdHNsaW50IGNvbmZpZyBpZiB0aGUgcGF0aCBjaGFuZ2VzLlxuICAgICAgICBjb25zdCBjdXJyZW50RGlyZWN0b3J5ID0gcGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgICAgICBpZiAoY3VycmVudERpcmVjdG9yeSAhPT0gbGFzdERpcmVjdG9yeSkge1xuICAgICAgICAgIGNvbmZpZ0xvYWQgPSBDb25maWd1cmF0aW9uLmZpbmRDb25maWd1cmF0aW9uKHRzbGludENvbmZpZ1BhdGgsIGZpbGUpO1xuICAgICAgICAgIGxhc3REaXJlY3RvcnkgPSBjdXJyZW50RGlyZWN0b3J5O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRlbnRzICYmIGNvbmZpZ0xvYWQpIHtcbiAgICAgICAgICBsaW50ZXIubGludChmaWxlLCBjb250ZW50cywgY29uZmlnTG9hZC5yZXN1bHRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBsaW50ZXIuZ2V0UmVzdWx0KCk7XG5cbiAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgY29uc3QgRm9ybWF0dGVyID0gcHJvamVjdFRzbGludC5maW5kRm9ybWF0dGVyKG9wdGlvbnMuZm9ybWF0KTtcbiAgICAgICAgaWYgKCFGb3JtYXR0ZXIpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgbGludCBmb3JtYXQgXCIke29wdGlvbnMuZm9ybWF0fVwiLmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBGb3JtYXR0ZXIoKTtcblxuICAgICAgICBjb25zdCBvdXRwdXQgPSBmb3JtYXR0ZXIuZm9ybWF0KHJlc3VsdC5mYWlsdXJlcywgcmVzdWx0LmZpeGVzKTtcbiAgICAgICAgaWYgKG91dHB1dCkge1xuICAgICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhvdXRwdXQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFByaW50IGZvcm1hdHRlciBvdXRwdXQgZGlyZWN0bHkgZm9yIG5vbiBodW1hbi1yZWFkYWJsZSBmb3JtYXRzLlxuICAgICAgaWYgKFsncHJvc2UnLCAndmVyYm9zZScsICdzdHlsaXNoJ10uaW5kZXhPZihvcHRpb25zLmZvcm1hdCkgPT0gLTEpIHtcbiAgICAgICAgb3B0aW9ucy5zaWxlbnQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzdWx0Lndhcm5pbmdDb3VudCA+IDAgJiYgIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIud2FybignTGludCB3YXJuaW5ncyBmb3VuZCBpbiB0aGUgbGlzdGVkIGZpbGVzLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzdWx0LmVycm9yQ291bnQgPiAwICYmICFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKCdMaW50IGVycm9ycyBmb3VuZCBpbiB0aGUgbGlzdGVkIGZpbGVzLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzdWx0Lndhcm5pbmdDb3VudCA9PT0gMCAmJiByZXN1bHQuZXJyb3JDb3VudCA9PT0gMCAmJiAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKCdBbGwgZmlsZXMgcGFzcyBsaW50aW5nLicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzdWNjZXNzID0gb3B0aW9ucy5mb3JjZSB8fCByZXN1bHQuZXJyb3JDb3VudCA9PT0gMDtcbiAgICAgIG9icy5uZXh0KHsgc3VjY2VzcyB9KTtcblxuICAgICAgcmV0dXJuIG9icy5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVzVG9MaW50KFxuICByb290OiBzdHJpbmcsXG4gIG9wdGlvbnM6IFRzbGludEJ1aWxkZXJPcHRpb25zLFxuICBsaW50ZXI6IHR5cGVvZiB0c2xpbnQuTGludGVyLFxuICBwcm9ncmFtPzogdHMuUHJvZ3JhbSxcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgaWdub3JlID0gb3B0aW9ucy5leGNsdWRlO1xuXG4gIGlmIChvcHRpb25zLmZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gb3B0aW9ucy5maWxlc1xuICAgICAgLm1hcChmaWxlID0+IGdsb2Iuc3luYyhmaWxlLCB7IGN3ZDogcm9vdCwgaWdub3JlLCBub2RpcjogdHJ1ZSB9KSlcbiAgICAgIC5yZWR1Y2UoKHByZXYsIGN1cnIpID0+IHByZXYuY29uY2F0KGN1cnIpLCBbXSlcbiAgICAgIC5tYXAoZmlsZSA9PiBwYXRoLmpvaW4ocm9vdCwgZmlsZSkpO1xuICB9XG5cbiAgaWYgKCFwcm9ncmFtKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgbGV0IHByb2dyYW1GaWxlcyA9IGxpbnRlci5nZXRGaWxlTmFtZXMocHJvZ3JhbSk7XG5cbiAgaWYgKGlnbm9yZSAmJiBpZ25vcmUubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGlnbm9yZU1hdGNoZXJzID0gaWdub3JlLm1hcChwYXR0ZXJuID0+IG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgeyBkb3Q6IHRydWUgfSkpO1xuXG4gICAgcHJvZ3JhbUZpbGVzID0gcHJvZ3JhbUZpbGVzXG4gICAgICAuZmlsdGVyKGZpbGUgPT4gIWlnbm9yZU1hdGNoZXJzLnNvbWUobWF0Y2hlciA9PiBtYXRjaGVyLm1hdGNoKGZpbGUpKSk7XG4gIH1cblxuICByZXR1cm4gcHJvZ3JhbUZpbGVzO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlQ29udGVudHMoXG4gIGZpbGU6IHN0cmluZyxcbiAgb3B0aW9uczogVHNsaW50QnVpbGRlck9wdGlvbnMsXG4gIHByb2dyYW0/OiB0cy5Qcm9ncmFtLFxuKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgLy8gVGhlIGxpbnRlciByZXRyaWV2ZXMgdGhlIFNvdXJjZUZpbGUgVFMgbm9kZSBkaXJlY3RseSBpZiBhIHByb2dyYW0gaXMgdXNlZFxuICBpZiAocHJvZ3JhbSkge1xuICAgIGlmIChwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZSkgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gYEZpbGUgJyR7ZmlsZX0nIGlzIG5vdCBwYXJ0IG9mIHRoZSBUeXBlU2NyaXB0IHByb2plY3QgJyR7b3B0aW9ucy50c0NvbmZpZ30nLmA7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogdGhpcyByZXR1cm4gaGFkIHRvIGJlIGNvbW1lbnRlZCBvdXQgb3RoZXJ3aXNlIG5vIGZpbGUgd291bGQgYmUgbGludGVkLCBmaWd1cmUgb3V0IHdoeS5cbiAgICAvLyByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gTk9URTogVGhlIHRzbGludCBDTEkgY2hlY2tzIGZvciBhbmQgZXhjbHVkZXMgTVBFRyB0cmFuc3BvcnQgc3RyZWFtczsgdGhpcyBkb2VzIG5vdC5cbiAgdHJ5IHtcbiAgICByZXR1cm4gc3RyaXBCb20ocmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlYWQgZmlsZSAnJHtmaWxlfScuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHNsaW50QnVpbGRlcjtcbiJdfQ==