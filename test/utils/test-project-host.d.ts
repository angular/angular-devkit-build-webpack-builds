/// <reference types="node" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, PathFragment, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { Stats } from 'fs';
import { Observable } from 'rxjs/Observable';
export declare class TestProjectHost extends NodeJsSyncHost {
    protected _root: Path;
    private _syncHost;
    constructor(_root: Path);
    write(path: Path, content: virtualFs.FileBuffer): Observable<void>;
    read(path: Path): Observable<virtualFs.FileBuffer>;
    delete(path: Path): Observable<void>;
    rename(from: Path, to: Path): Observable<void>;
    list(path: Path): Observable<PathFragment[]>;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    stats(path: Path): Observable<virtualFs.Stats<Stats>> | null;
    watch(path: Path, options?: virtualFs.HostWatchOptions): Observable<virtualFs.HostWatchEvent> | null;
    asSync(): virtualFs.SyncDelegateHost<Stats>;
    initialize(): Observable<void>;
    restore(): Observable<void>;
    private _gitClean();
    private _gitInit();
    private _exec(cmd, args);
    writeMultipleFiles(files: {
        [path: string]: string;
    }): void;
    replaceInFile(path: string, match: RegExp | string, replacement: string): void;
    appendToFile(path: string, str: string): void;
    fileMatchExists(dir: string, regex: RegExp): PathFragment | undefined;
    copyFile(from: string, to: string): void;
}
