"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
function getEmittedFiles(compilation) {
    const getExtension = (file) => file.split('.').reverse()[0];
    const files = [];
    for (const chunk of Object.values(compilation.chunks)) {
        const entry = {
            name: chunk.name,
            initial: chunk.isOnlyInitial(),
        };
        for (const file of chunk.files) {
            files.push(Object.assign({}, entry, { file, extension: getExtension(file) }));
        }
    }
    for (const file of Object.keys(compilation.assets)) {
        if (files.some(e => e.file === file)) {
            // skip as this already exists
            continue;
        }
        files.push({
            file,
            extension: getExtension(file),
            initial: false,
        });
    }
    return files;
}
exports.getEmittedFiles = getEmittedFiles;
