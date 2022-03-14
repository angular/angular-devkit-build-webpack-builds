"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebpackConfig = exports.getEmittedFiles = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const url_1 = require("url");
function getEmittedFiles(compilation) {
    var _a;
    const files = [];
    const chunkFileNames = new Set();
    // adds all chunks to the list of emitted files such as lazy loaded modules
    for (const chunk of compilation.chunks) {
        for (const file of chunk.files) {
            if (chunkFileNames.has(file)) {
                continue;
            }
            chunkFileNames.add(file);
            files.push({
                id: (_a = chunk.id) === null || _a === void 0 ? void 0 : _a.toString(),
                name: chunk.name,
                file,
                extension: path.extname(file),
                initial: chunk.isOnlyInitial(),
            });
        }
    }
    // add all other files
    for (const file of Object.keys(compilation.assets)) {
        // Chunk files have already been added to the files list above
        if (chunkFileNames.has(file)) {
            continue;
        }
        files.push({ file, extension: path.extname(file), initial: false, asset: true });
    }
    return files;
}
exports.getEmittedFiles = getEmittedFiles;
/**
 * This uses a dynamic import to load a module which may be ESM.
 * CommonJS code can load ESM code via a dynamic import. Unfortunately, TypeScript
 * will currently, unconditionally downlevel dynamic import into a require call.
 * require calls cannot load ESM code and will result in a runtime error. To workaround
 * this, a Function constructor is used to prevent TypeScript from changing the dynamic import.
 * Once TypeScript provides support for keeping the dynamic import this workaround can
 * be dropped.
 *
 * @param modulePath The path of the module to load.
 * @returns A Promise that resolves to the dynamically imported module.
 */
function loadEsmModule(modulePath) {
    return new Function('modulePath', `return import(modulePath);`)(modulePath);
}
async function getWebpackConfig(configPath) {
    if (!(0, fs_1.existsSync)(configPath)) {
        throw new Error(`Webpack configuration file ${configPath} does not exist.`);
    }
    switch (path.extname(configPath)) {
        case '.mjs':
            // Load the ESM configuration file using the TypeScript dynamic import workaround.
            // Once TypeScript provides support for keeping the dynamic import this workaround can be
            // changed to a direct dynamic import.
            return (await loadEsmModule((0, url_1.pathToFileURL)(configPath))).default;
        case '.cjs':
            return require(configPath);
        default:
            // The file could be either CommonJS or ESM.
            // CommonJS is tried first then ESM if loading fails.
            try {
                return require(configPath);
            }
            catch (e) {
                if (e.code === 'ERR_REQUIRE_ESM') {
                    // Load the ESM configuration file using the TypeScript dynamic import workaround.
                    // Once TypeScript provides support for keeping the dynamic import this workaround can be
                    // changed to a direct dynamic import.
                    return (await loadEsmModule((0, url_1.pathToFileURL)(configPath)))
                        .default;
                }
                throw e;
            }
    }
}
exports.getWebpackConfig = getWebpackConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkJBQWdDO0FBQ2hDLDJDQUE2QjtBQUM3Qiw2QkFBeUM7QUFZekMsU0FBZ0IsZUFBZSxDQUFDLFdBQXdCOztJQUN0RCxNQUFNLEtBQUssR0FBbUIsRUFBRSxDQUFDO0lBQ2pDLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFFekMsMkVBQTJFO0lBQzNFLEtBQUssTUFBTSxLQUFLLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRTtRQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDOUIsSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QixTQUFTO2FBQ1Y7WUFFRCxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsRUFBRSxFQUFFLE1BQUEsS0FBSyxDQUFDLEVBQUUsMENBQUUsUUFBUSxFQUFFO2dCQUN4QixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7Z0JBQ2hCLElBQUk7Z0JBQ0osU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUM3QixPQUFPLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRTthQUMvQixDQUFDLENBQUM7U0FDSjtLQUNGO0lBRUQsc0JBQXNCO0lBQ3RCLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDbEQsOERBQThEO1FBQzlELElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QixTQUFTO1NBQ1Y7UUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7S0FDbEY7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFqQ0QsMENBaUNDO0FBRUQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxTQUFTLGFBQWEsQ0FBSSxVQUF3QjtJQUNoRCxPQUFPLElBQUksUUFBUSxDQUFDLFlBQVksRUFBRSw0QkFBNEIsQ0FBQyxDQUFDLFVBQVUsQ0FBZSxDQUFDO0FBQzVGLENBQUM7QUFFTSxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsVUFBa0I7SUFDdkQsSUFBSSxDQUFDLElBQUEsZUFBVSxFQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLFVBQVUsa0JBQWtCLENBQUMsQ0FBQztLQUM3RTtJQUVELFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUNoQyxLQUFLLE1BQU07WUFDVCxrRkFBa0Y7WUFDbEYseUZBQXlGO1lBQ3pGLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsTUFBTSxhQUFhLENBQTZCLElBQUEsbUJBQWEsRUFBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQzlGLEtBQUssTUFBTTtZQUNULE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdCO1lBQ0UsNENBQTRDO1lBQzVDLHFEQUFxRDtZQUNyRCxJQUFJO2dCQUNGLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzVCO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGlCQUFpQixFQUFFO29CQUNoQyxrRkFBa0Y7b0JBQ2xGLHlGQUF5RjtvQkFDekYsc0NBQXNDO29CQUN0QyxPQUFPLENBQUMsTUFBTSxhQUFhLENBQTZCLElBQUEsbUJBQWEsRUFBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO3lCQUNoRixPQUFPLENBQUM7aUJBQ1o7Z0JBRUQsTUFBTSxDQUFDLENBQUM7YUFDVDtLQUNKO0FBQ0gsQ0FBQztBQTlCRCw0Q0E4QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBVUkwsIHBhdGhUb0ZpbGVVUkwgfSBmcm9tICd1cmwnO1xuaW1wb3J0IHsgQ29tcGlsYXRpb24sIENvbmZpZ3VyYXRpb24gfSBmcm9tICd3ZWJwYWNrJztcblxuZXhwb3J0IGludGVyZmFjZSBFbWl0dGVkRmlsZXMge1xuICBpZD86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbiAgZmlsZTogc3RyaW5nO1xuICBpbml0aWFsOiBib29sZWFuO1xuICBhc3NldD86IGJvb2xlYW47XG4gIGV4dGVuc2lvbjogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW1pdHRlZEZpbGVzKGNvbXBpbGF0aW9uOiBDb21waWxhdGlvbik6IEVtaXR0ZWRGaWxlc1tdIHtcbiAgY29uc3QgZmlsZXM6IEVtaXR0ZWRGaWxlc1tdID0gW107XG4gIGNvbnN0IGNodW5rRmlsZU5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgLy8gYWRkcyBhbGwgY2h1bmtzIHRvIHRoZSBsaXN0IG9mIGVtaXR0ZWQgZmlsZXMgc3VjaCBhcyBsYXp5IGxvYWRlZCBtb2R1bGVzXG4gIGZvciAoY29uc3QgY2h1bmsgb2YgY29tcGlsYXRpb24uY2h1bmtzKSB7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGNodW5rLmZpbGVzKSB7XG4gICAgICBpZiAoY2h1bmtGaWxlTmFtZXMuaGFzKGZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjaHVua0ZpbGVOYW1lcy5hZGQoZmlsZSk7XG4gICAgICBmaWxlcy5wdXNoKHtcbiAgICAgICAgaWQ6IGNodW5rLmlkPy50b1N0cmluZygpLFxuICAgICAgICBuYW1lOiBjaHVuay5uYW1lLFxuICAgICAgICBmaWxlLFxuICAgICAgICBleHRlbnNpb246IHBhdGguZXh0bmFtZShmaWxlKSxcbiAgICAgICAgaW5pdGlhbDogY2h1bmsuaXNPbmx5SW5pdGlhbCgpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gYWRkIGFsbCBvdGhlciBmaWxlc1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgT2JqZWN0LmtleXMoY29tcGlsYXRpb24uYXNzZXRzKSkge1xuICAgIC8vIENodW5rIGZpbGVzIGhhdmUgYWxyZWFkeSBiZWVuIGFkZGVkIHRvIHRoZSBmaWxlcyBsaXN0IGFib3ZlXG4gICAgaWYgKGNodW5rRmlsZU5hbWVzLmhhcyhmaWxlKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZmlsZXMucHVzaCh7IGZpbGUsIGV4dGVuc2lvbjogcGF0aC5leHRuYW1lKGZpbGUpLCBpbml0aWFsOiBmYWxzZSwgYXNzZXQ6IHRydWUgfSk7XG4gIH1cblxuICByZXR1cm4gZmlsZXM7XG59XG5cbi8qKlxuICogVGhpcyB1c2VzIGEgZHluYW1pYyBpbXBvcnQgdG8gbG9hZCBhIG1vZHVsZSB3aGljaCBtYXkgYmUgRVNNLlxuICogQ29tbW9uSlMgY29kZSBjYW4gbG9hZCBFU00gY29kZSB2aWEgYSBkeW5hbWljIGltcG9ydC4gVW5mb3J0dW5hdGVseSwgVHlwZVNjcmlwdFxuICogd2lsbCBjdXJyZW50bHksIHVuY29uZGl0aW9uYWxseSBkb3dubGV2ZWwgZHluYW1pYyBpbXBvcnQgaW50byBhIHJlcXVpcmUgY2FsbC5cbiAqIHJlcXVpcmUgY2FsbHMgY2Fubm90IGxvYWQgRVNNIGNvZGUgYW5kIHdpbGwgcmVzdWx0IGluIGEgcnVudGltZSBlcnJvci4gVG8gd29ya2Fyb3VuZFxuICogdGhpcywgYSBGdW5jdGlvbiBjb25zdHJ1Y3RvciBpcyB1c2VkIHRvIHByZXZlbnQgVHlwZVNjcmlwdCBmcm9tIGNoYW5naW5nIHRoZSBkeW5hbWljIGltcG9ydC5cbiAqIE9uY2UgVHlwZVNjcmlwdCBwcm92aWRlcyBzdXBwb3J0IGZvciBrZWVwaW5nIHRoZSBkeW5hbWljIGltcG9ydCB0aGlzIHdvcmthcm91bmQgY2FuXG4gKiBiZSBkcm9wcGVkLlxuICpcbiAqIEBwYXJhbSBtb2R1bGVQYXRoIFRoZSBwYXRoIG9mIHRoZSBtb2R1bGUgdG8gbG9hZC5cbiAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRoZSBkeW5hbWljYWxseSBpbXBvcnRlZCBtb2R1bGUuXG4gKi9cbmZ1bmN0aW9uIGxvYWRFc21Nb2R1bGU8VD4obW9kdWxlUGF0aDogc3RyaW5nIHwgVVJMKTogUHJvbWlzZTxUPiB7XG4gIHJldHVybiBuZXcgRnVuY3Rpb24oJ21vZHVsZVBhdGgnLCBgcmV0dXJuIGltcG9ydChtb2R1bGVQYXRoKTtgKShtb2R1bGVQYXRoKSBhcyBQcm9taXNlPFQ+O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0V2VicGFja0NvbmZpZyhjb25maWdQYXRoOiBzdHJpbmcpOiBQcm9taXNlPENvbmZpZ3VyYXRpb24+IHtcbiAgaWYgKCFleGlzdHNTeW5jKGNvbmZpZ1BhdGgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gZmlsZSAke2NvbmZpZ1BhdGh9IGRvZXMgbm90IGV4aXN0LmApO1xuICB9XG5cbiAgc3dpdGNoIChwYXRoLmV4dG5hbWUoY29uZmlnUGF0aCkpIHtcbiAgICBjYXNlICcubWpzJzpcbiAgICAgIC8vIExvYWQgdGhlIEVTTSBjb25maWd1cmF0aW9uIGZpbGUgdXNpbmcgdGhlIFR5cGVTY3JpcHQgZHluYW1pYyBpbXBvcnQgd29ya2Fyb3VuZC5cbiAgICAgIC8vIE9uY2UgVHlwZVNjcmlwdCBwcm92aWRlcyBzdXBwb3J0IGZvciBrZWVwaW5nIHRoZSBkeW5hbWljIGltcG9ydCB0aGlzIHdvcmthcm91bmQgY2FuIGJlXG4gICAgICAvLyBjaGFuZ2VkIHRvIGEgZGlyZWN0IGR5bmFtaWMgaW1wb3J0LlxuICAgICAgcmV0dXJuIChhd2FpdCBsb2FkRXNtTW9kdWxlPHsgZGVmYXVsdDogQ29uZmlndXJhdGlvbiB9PihwYXRoVG9GaWxlVVJMKGNvbmZpZ1BhdGgpKSkuZGVmYXVsdDtcbiAgICBjYXNlICcuY2pzJzpcbiAgICAgIHJldHVybiByZXF1aXJlKGNvbmZpZ1BhdGgpO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBUaGUgZmlsZSBjb3VsZCBiZSBlaXRoZXIgQ29tbW9uSlMgb3IgRVNNLlxuICAgICAgLy8gQ29tbW9uSlMgaXMgdHJpZWQgZmlyc3QgdGhlbiBFU00gaWYgbG9hZGluZyBmYWlscy5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiByZXF1aXJlKGNvbmZpZ1BhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZS5jb2RlID09PSAnRVJSX1JFUVVJUkVfRVNNJykge1xuICAgICAgICAgIC8vIExvYWQgdGhlIEVTTSBjb25maWd1cmF0aW9uIGZpbGUgdXNpbmcgdGhlIFR5cGVTY3JpcHQgZHluYW1pYyBpbXBvcnQgd29ya2Fyb3VuZC5cbiAgICAgICAgICAvLyBPbmNlIFR5cGVTY3JpcHQgcHJvdmlkZXMgc3VwcG9ydCBmb3Iga2VlcGluZyB0aGUgZHluYW1pYyBpbXBvcnQgdGhpcyB3b3JrYXJvdW5kIGNhbiBiZVxuICAgICAgICAgIC8vIGNoYW5nZWQgdG8gYSBkaXJlY3QgZHluYW1pYyBpbXBvcnQuXG4gICAgICAgICAgcmV0dXJuIChhd2FpdCBsb2FkRXNtTW9kdWxlPHsgZGVmYXVsdDogQ29uZmlndXJhdGlvbiB9PihwYXRoVG9GaWxlVVJMKGNvbmZpZ1BhdGgpKSlcbiAgICAgICAgICAgIC5kZWZhdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgfVxufVxuIl19