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
    run(builderConfig) {
        const root = this.context.workspace.root;
        const systemRoot = core_1.getSystemPath(root);
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const options = builderConfig.options;
        if (!options.tsConfig && options.typeCheck) {
            throw new Error('A "project" must be specified to enable type checking.');
        }
        return new Observable_1.Observable(obs => {
            const projectTslint = require_project_module_1.requireProjectModule(core_1.getSystemPath(projectRoot), 'tslint');
            const tslintConfigPath = options.tslintConfig
                ? path.resolve(systemRoot, options.tslintConfig)
                : null;
            const Linter = projectTslint.Linter;
            const Configuration = projectTslint.Configuration;
            let program = undefined;
            if (options.tsConfig) {
                program = Linter.createProgram(path.resolve(systemRoot, options.tsConfig));
            }
            const files = getFilesToLint(systemRoot, options, Linter, program);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3RzbGludC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQVFILCtDQUE4RDtBQUM5RCwyQkFBa0M7QUFDbEMsNkJBQTZCO0FBQzdCLHlDQUFzQztBQUN0Qyw2QkFBNkI7QUFDN0IsZ0RBQTZDO0FBRzdDLGtHQUE2RjtBQUM3Rix3RUFBb0U7QUFlcEU7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLGFBQXlEO1FBRTNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUN6QyxNQUFNLFVBQVUsR0FBRyxvQkFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFFdEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksdUJBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMxQixNQUFNLGFBQWEsR0FBRyw2Q0FBb0IsQ0FDeEMsb0JBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLENBQWtCLENBQUM7WUFDekQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsWUFBWTtnQkFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE9B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WixPQUE2QixFQUM3QixPQUFvQjtJQUVwQiw0RUFBNEU7SUFDNUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNaLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztZQUM3QyxNQUFNLE9BQU8sR0FBRyxTQUFTLElBQUksNENBQTRDLE9BQU8sQ0FBQyxRQUFRLElBQUksQ0FBQztZQUM5RixNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFRCwrRkFBK0Y7UUFDL0Ysb0JBQW9CO0lBQ3RCLENBQUM7SUFFRCxzRkFBc0Y7SUFDdEYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLG9CQUFRLENBQUMsaUJBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDLENBQUM7SUFDcEQsQ0FBQztBQUNILENBQUM7QUFFRCxrQkFBZSxhQUFhLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBCdWlsZGVyQ29udGV4dCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBnZXRTeXN0ZW1QYXRoLCByZXNvbHZlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IE1pbmltYXRjaCB9IGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQgKiBhcyB0c2xpbnQgZnJvbSAndHNsaW50JzsgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1pbXBsaWNpdC1kZXBlbmRlbmNpZXNcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnOyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWltcGxpY2l0LWRlcGVuZGVuY2llc1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5pbXBvcnQgeyBzdHJpcEJvbSB9IGZyb20gJy4uL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9zdHJpcC1ib20nO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNsaW50QnVpbGRlck9wdGlvbnMge1xuICB0c2xpbnRDb25maWc/OiBzdHJpbmc7XG4gIHRzQ29uZmlnPzogc3RyaW5nO1xuICBmaXg6IGJvb2xlYW47XG4gIHR5cGVDaGVjazogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG4gIHNpbGVudDogYm9vbGVhbjtcbiAgZm9ybWF0OiBzdHJpbmc7XG4gIGV4Y2x1ZGU6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBUc2xpbnRCdWlsZGVyIGltcGxlbWVudHMgQnVpbGRlcjxUc2xpbnRCdWlsZGVyT3B0aW9ucz4ge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCkgeyB9XG5cbiAgcnVuKGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPFRzbGludEJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuXG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2Uucm9vdDtcbiAgICBjb25zdCBzeXN0ZW1Sb290ID0gZ2V0U3lzdGVtUGF0aChyb290KTtcbiAgICBjb25zdCBwcm9qZWN0Um9vdCA9IHJlc29sdmUocm9vdCwgYnVpbGRlckNvbmZpZy5yb290KTtcbiAgICBjb25zdCBvcHRpb25zID0gYnVpbGRlckNvbmZpZy5vcHRpb25zO1xuXG4gICAgaWYgKCFvcHRpb25zLnRzQ29uZmlnICYmIG9wdGlvbnMudHlwZUNoZWNrKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgXCJwcm9qZWN0XCIgbXVzdCBiZSBzcGVjaWZpZWQgdG8gZW5hYmxlIHR5cGUgY2hlY2tpbmcuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICBjb25zdCBwcm9qZWN0VHNsaW50ID0gcmVxdWlyZVByb2plY3RNb2R1bGUoXG4gICAgICAgIGdldFN5c3RlbVBhdGgocHJvamVjdFJvb3QpLCAndHNsaW50JykgYXMgdHlwZW9mIHRzbGludDtcbiAgICAgIGNvbnN0IHRzbGludENvbmZpZ1BhdGggPSBvcHRpb25zLnRzbGludENvbmZpZ1xuICAgICAgICA/IHBhdGgucmVzb2x2ZShzeXN0ZW1Sb290LCBvcHRpb25zLnRzbGludENvbmZpZylcbiAgICAgICAgOiBudWxsO1xuICAgICAgY29uc3QgTGludGVyID0gcHJvamVjdFRzbGludC5MaW50ZXI7XG4gICAgICBjb25zdCBDb25maWd1cmF0aW9uID0gcHJvamVjdFRzbGludC5Db25maWd1cmF0aW9uO1xuXG4gICAgICBsZXQgcHJvZ3JhbTogdHMuUHJvZ3JhbSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChvcHRpb25zLnRzQ29uZmlnKSB7XG4gICAgICAgIHByb2dyYW0gPSBMaW50ZXIuY3JlYXRlUHJvZ3JhbShwYXRoLnJlc29sdmUoc3lzdGVtUm9vdCwgb3B0aW9ucy50c0NvbmZpZykpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmaWxlcyA9IGdldEZpbGVzVG9MaW50KHN5c3RlbVJvb3QsIG9wdGlvbnMsIExpbnRlciwgcHJvZ3JhbSk7XG4gICAgICBjb25zdCBsaW50T3B0aW9ucyA9IHtcbiAgICAgICAgZml4OiBvcHRpb25zLmZpeCxcbiAgICAgICAgZm9ybWF0dGVyOiBvcHRpb25zLmZvcm1hdCxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGxpbnRlciA9IG5ldyBMaW50ZXIobGludE9wdGlvbnMsIHByb2dyYW0pO1xuXG4gICAgICBsZXQgbGFzdERpcmVjdG9yeTtcbiAgICAgIGxldCBjb25maWdMb2FkO1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRzID0gZ2V0RmlsZUNvbnRlbnRzKGZpbGUsIG9wdGlvbnMsIHByb2dyYW0pO1xuXG4gICAgICAgIC8vIE9ubHkgY2hlY2sgZm9yIGEgbmV3IHRzbGludCBjb25maWcgaWYgdGhlIHBhdGggY2hhbmdlcy5cbiAgICAgICAgY29uc3QgY3VycmVudERpcmVjdG9yeSA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgICAgaWYgKGN1cnJlbnREaXJlY3RvcnkgIT09IGxhc3REaXJlY3RvcnkpIHtcbiAgICAgICAgICBjb25maWdMb2FkID0gQ29uZmlndXJhdGlvbi5maW5kQ29uZmlndXJhdGlvbih0c2xpbnRDb25maWdQYXRoLCBmaWxlKTtcbiAgICAgICAgICBsYXN0RGlyZWN0b3J5ID0gY3VycmVudERpcmVjdG9yeTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb250ZW50cyAmJiBjb25maWdMb2FkKSB7XG4gICAgICAgICAgbGludGVyLmxpbnQoZmlsZSwgY29udGVudHMsIGNvbmZpZ0xvYWQucmVzdWx0cyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gbGludGVyLmdldFJlc3VsdCgpO1xuXG4gICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIGNvbnN0IEZvcm1hdHRlciA9IHByb2plY3RUc2xpbnQuZmluZEZvcm1hdHRlcihvcHRpb25zLmZvcm1hdCk7XG4gICAgICAgIGlmICghRm9ybWF0dGVyKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGxpbnQgZm9ybWF0IFwiJHtvcHRpb25zLmZvcm1hdH1cIi5gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgRm9ybWF0dGVyKCk7XG5cbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gZm9ybWF0dGVyLmZvcm1hdChyZXN1bHQuZmFpbHVyZXMsIHJlc3VsdC5maXhlcyk7XG4gICAgICAgIGlmIChvdXRwdXQpIHtcbiAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8ob3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBQcmludCBmb3JtYXR0ZXIgb3V0cHV0IGRpcmVjdGx5IGZvciBub24gaHVtYW4tcmVhZGFibGUgZm9ybWF0cy5cbiAgICAgIGlmIChbJ3Byb3NlJywgJ3ZlcmJvc2UnLCAnc3R5bGlzaCddLmluZGV4T2Yob3B0aW9ucy5mb3JtYXQpID09IC0xKSB7XG4gICAgICAgIG9wdGlvbnMuc2lsZW50ID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdC53YXJuaW5nQ291bnQgPiAwICYmICFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLndhcm4oJ0xpbnQgd2FybmluZ3MgZm91bmQgaW4gdGhlIGxpc3RlZCBmaWxlcy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdC5lcnJvckNvdW50ID4gMCAmJiAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcignTGludCBlcnJvcnMgZm91bmQgaW4gdGhlIGxpc3RlZCBmaWxlcy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdC53YXJuaW5nQ291bnQgPT09IDAgJiYgcmVzdWx0LmVycm9yQ291bnQgPT09IDAgJiYgIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbygnQWxsIGZpbGVzIHBhc3MgbGludGluZy4nKTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3VjY2VzcyA9IG9wdGlvbnMuZm9yY2UgfHwgcmVzdWx0LmVycm9yQ291bnQgPT09IDA7XG4gICAgICBvYnMubmV4dCh7IHN1Y2Nlc3MgfSk7XG5cbiAgICAgIHJldHVybiBvYnMuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGaWxlc1RvTGludChcbiAgcm9vdDogc3RyaW5nLFxuICBvcHRpb25zOiBUc2xpbnRCdWlsZGVyT3B0aW9ucyxcbiAgbGludGVyOiB0eXBlb2YgdHNsaW50LkxpbnRlcixcbiAgcHJvZ3JhbT86IHRzLlByb2dyYW0sXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGlnbm9yZSA9IG9wdGlvbnMuZXhjbHVkZTtcblxuICBpZiAob3B0aW9ucy5maWxlcy5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZmlsZXNcbiAgICAgIC5tYXAoZmlsZSA9PiBnbG9iLnN5bmMoZmlsZSwgeyBjd2Q6IHJvb3QsIGlnbm9yZSwgbm9kaXI6IHRydWUgfSkpXG4gICAgICAucmVkdWNlKChwcmV2LCBjdXJyKSA9PiBwcmV2LmNvbmNhdChjdXJyKSwgW10pXG4gICAgICAubWFwKGZpbGUgPT4gcGF0aC5qb2luKHJvb3QsIGZpbGUpKTtcbiAgfVxuXG4gIGlmICghcHJvZ3JhbSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGxldCBwcm9ncmFtRmlsZXMgPSBsaW50ZXIuZ2V0RmlsZU5hbWVzKHByb2dyYW0pO1xuXG4gIGlmIChpZ25vcmUgJiYgaWdub3JlLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBpZ25vcmVNYXRjaGVycyA9IGlnbm9yZS5tYXAocGF0dGVybiA9PiBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIHsgZG90OiB0cnVlIH0pKTtcblxuICAgIHByb2dyYW1GaWxlcyA9IHByb2dyYW1GaWxlc1xuICAgICAgLmZpbHRlcihmaWxlID0+ICFpZ25vcmVNYXRjaGVycy5zb21lKG1hdGNoZXIgPT4gbWF0Y2hlci5tYXRjaChmaWxlKSkpO1xuICB9XG5cbiAgcmV0dXJuIHByb2dyYW1GaWxlcztcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZUNvbnRlbnRzKFxuICBmaWxlOiBzdHJpbmcsXG4gIG9wdGlvbnM6IFRzbGludEJ1aWxkZXJPcHRpb25zLFxuICBwcm9ncmFtPzogdHMuUHJvZ3JhbSxcbik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIC8vIFRoZSBsaW50ZXIgcmV0cmlldmVzIHRoZSBTb3VyY2VGaWxlIFRTIG5vZGUgZGlyZWN0bHkgaWYgYSBwcm9ncmFtIGlzIHVzZWRcbiAgaWYgKHByb2dyYW0pIHtcbiAgICBpZiAocHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGUpID09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBGaWxlICcke2ZpbGV9JyBpcyBub3QgcGFydCBvZiB0aGUgVHlwZVNjcmlwdCBwcm9qZWN0ICcke29wdGlvbnMudHNDb25maWd9Jy5gO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8vIFRPRE86IHRoaXMgcmV0dXJuIGhhZCB0byBiZSBjb21tZW50ZWQgb3V0IG90aGVyd2lzZSBubyBmaWxlIHdvdWxkIGJlIGxpbnRlZCwgZmlndXJlIG91dCB3aHkuXG4gICAgLy8gcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIE5PVEU6IFRoZSB0c2xpbnQgQ0xJIGNoZWNrcyBmb3IgYW5kIGV4Y2x1ZGVzIE1QRUcgdHJhbnNwb3J0IHN0cmVhbXM7IHRoaXMgZG9lcyBub3QuXG4gIHRyeSB7XG4gICAgcmV0dXJuIHN0cmlwQm9tKHJlYWRGaWxlU3luYyhmaWxlLCAndXRmLTgnKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZWFkIGZpbGUgJyR7ZmlsZX0nLmApO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRzbGludEJ1aWxkZXI7XG4iXX0=