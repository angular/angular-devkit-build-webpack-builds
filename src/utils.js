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
exports.getEmittedFiles = void 0;
const path = __importStar(require("path"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkNBQTZCO0FBVzdCLFNBQWdCLGVBQWUsQ0FBQyxXQUEwQzs7SUFDeEUsTUFBTSxLQUFLLEdBQW1CLEVBQUUsQ0FBQztJQUNqQyxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRXpDLDJFQUEyRTtJQUMzRSxLQUFLLE1BQU0sS0FBSyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7UUFDdEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO1lBQzlCLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDNUIsU0FBUzthQUNWO1lBRUQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNULEVBQUUsRUFBRSxNQUFBLEtBQUssQ0FBQyxFQUFFLDBDQUFFLFFBQVEsRUFBRTtnQkFDeEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO2dCQUNoQixJQUFJO2dCQUNKLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDN0IsT0FBTyxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUU7YUFDL0IsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtJQUVELHNCQUFzQjtJQUN0QixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ2xELDhEQUE4RDtRQUM5RCxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUIsU0FBUztTQUNWO1FBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQ2xGO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBakNELDBDQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEVtaXR0ZWRGaWxlcyB7XG4gIGlkPzogc3RyaW5nO1xuICBuYW1lPzogc3RyaW5nO1xuICBmaWxlOiBzdHJpbmc7XG4gIGluaXRpYWw6IGJvb2xlYW47XG4gIGFzc2V0PzogYm9vbGVhbjtcbiAgZXh0ZW5zaW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbWl0dGVkRmlsZXMoY29tcGlsYXRpb246IGltcG9ydCgnd2VicGFjaycpLkNvbXBpbGF0aW9uKTogRW1pdHRlZEZpbGVzW10ge1xuICBjb25zdCBmaWxlczogRW1pdHRlZEZpbGVzW10gPSBbXTtcbiAgY29uc3QgY2h1bmtGaWxlTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAvLyBhZGRzIGFsbCBjaHVua3MgdG8gdGhlIGxpc3Qgb2YgZW1pdHRlZCBmaWxlcyBzdWNoIGFzIGxhenkgbG9hZGVkIG1vZHVsZXNcbiAgZm9yIChjb25zdCBjaHVuayBvZiBjb21waWxhdGlvbi5jaHVua3MpIHtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgY2h1bmsuZmlsZXMpIHtcbiAgICAgIGlmIChjaHVua0ZpbGVOYW1lcy5oYXMoZmlsZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNodW5rRmlsZU5hbWVzLmFkZChmaWxlKTtcbiAgICAgIGZpbGVzLnB1c2goe1xuICAgICAgICBpZDogY2h1bmsuaWQ/LnRvU3RyaW5nKCksXG4gICAgICAgIG5hbWU6IGNodW5rLm5hbWUsXG4gICAgICAgIGZpbGUsXG4gICAgICAgIGV4dGVuc2lvbjogcGF0aC5leHRuYW1lKGZpbGUpLFxuICAgICAgICBpbml0aWFsOiBjaHVuay5pc09ubHlJbml0aWFsKCksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBhZGQgYWxsIG90aGVyIGZpbGVzXG4gIGZvciAoY29uc3QgZmlsZSBvZiBPYmplY3Qua2V5cyhjb21waWxhdGlvbi5hc3NldHMpKSB7XG4gICAgLy8gQ2h1bmsgZmlsZXMgaGF2ZSBhbHJlYWR5IGJlZW4gYWRkZWQgdG8gdGhlIGZpbGVzIGxpc3QgYWJvdmVcbiAgICBpZiAoY2h1bmtGaWxlTmFtZXMuaGFzKGZpbGUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBmaWxlcy5wdXNoKHsgZmlsZSwgZXh0ZW5zaW9uOiBwYXRoLmV4dG5hbWUoZmlsZSksIGluaXRpYWw6IGZhbHNlLCBhc3NldDogdHJ1ZSB9KTtcbiAgfVxuXG4gIHJldHVybiBmaWxlcztcbn1cbiJdfQ==