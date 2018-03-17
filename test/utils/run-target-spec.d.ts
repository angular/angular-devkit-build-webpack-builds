/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuildEvent, Target } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { TestProjectHost } from '../utils';
export declare function runTargetSpec(host: TestProjectHost, targets: Target<{}> | Target<{}>[], overrides?: {}, logger?: logging.Logger): Observable<BuildEvent>;
