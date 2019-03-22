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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX3dlYnBhY2svc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBV0gsU0FBZ0IsZUFBZSxDQUFDLFdBQTRDO0lBQzFFLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sS0FBSyxHQUFtQixFQUFFLENBQUM7SUFFakMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNyRCxNQUFNLEtBQUssR0FBMEI7WUFDbkMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE9BQU8sRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFO1NBQy9CLENBQUM7UUFFRixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBSyxLQUFLLElBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQWtCLENBQUMsQ0FBQztTQUMvRTtLQUNGO0lBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNsRCxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFO1lBQ3BDLDhCQUE4QjtZQUM5QixTQUFTO1NBQ1Y7UUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1QsSUFBSTtZQUNKLFNBQVMsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQzdCLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUE3QkQsMENBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuXG5leHBvcnQgaW50ZXJmYWNlIEVtaXR0ZWRGaWxlcyB7XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGZpbGU6IHN0cmluZztcbiAgaW5pdGlhbDogYm9vbGVhbjtcbiAgZXh0ZW5zaW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbWl0dGVkRmlsZXMoY29tcGlsYXRpb246IHdlYnBhY2suY29tcGlsYXRpb24uQ29tcGlsYXRpb24pOiBFbWl0dGVkRmlsZXNbXSB7XG4gIGNvbnN0IGdldEV4dGVuc2lvbiA9IChmaWxlOiBzdHJpbmcpID0+IGZpbGUuc3BsaXQoJy4nKS5yZXZlcnNlKClbMF07XG4gIGNvbnN0IGZpbGVzOiBFbWl0dGVkRmlsZXNbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgY2h1bmsgb2YgT2JqZWN0LnZhbHVlcyhjb21waWxhdGlvbi5jaHVua3MpKSB7XG4gICAgY29uc3QgZW50cnk6IFBhcnRpYWw8RW1pdHRlZEZpbGVzPiA9IHtcbiAgICAgIG5hbWU6IGNodW5rLm5hbWUsXG4gICAgICBpbml0aWFsOiBjaHVuay5pc09ubHlJbml0aWFsKCksXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBjaHVuay5maWxlcykge1xuICAgICAgZmlsZXMucHVzaCh7IC4uLmVudHJ5LCBmaWxlLCBleHRlbnNpb246IGdldEV4dGVuc2lvbihmaWxlKSB9IGFzIEVtaXR0ZWRGaWxlcyk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIE9iamVjdC5rZXlzKGNvbXBpbGF0aW9uLmFzc2V0cykpIHtcbiAgICBpZiAoZmlsZXMuc29tZShlID0+IGUuZmlsZSA9PT0gZmlsZSkpIHtcbiAgICAgIC8vIHNraXAgYXMgdGhpcyBhbHJlYWR5IGV4aXN0c1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZmlsZXMucHVzaCh7XG4gICAgICBmaWxlLFxuICAgICAgZXh0ZW5zaW9uOiBnZXRFeHRlbnNpb24oZmlsZSksXG4gICAgICBpbml0aWFsOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBmaWxlcztcbn1cbiJdfQ==