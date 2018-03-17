/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Target } from '@angular-devkit/architect';
import { experimental } from '@angular-devkit/core';
import { BrowserBuilderOptions, DevServerBuilderOptions, ExtractI18nBuilderOptions, KarmaBuilderOptions, ProtractorBuilderOptions, TslintBuilderOptions } from '../../src';
export declare const workspaceRoot: string & {
    __PRIVATE_DEVKIT_PATH: void;
};
export declare function makeWorkspace(WorkspaceTargets: Target[]): experimental.workspace.WorkspaceJson;
export declare const browserWorkspaceTarget: Target<Partial<BrowserBuilderOptions>>;
export declare const devServerWorkspaceTarget: Target<Partial<DevServerBuilderOptions>>;
export declare const extractI18nWorkspaceTarget: Target<Partial<ExtractI18nBuilderOptions>>;
export declare const karmaWorkspaceTarget: Target<Partial<KarmaBuilderOptions>>;
export declare const protractorWorkspaceTarget: Target<Partial<ProtractorBuilderOptions>>;
export declare const tslintWorkspaceTarget: Target<Partial<TslintBuilderOptions>>;
