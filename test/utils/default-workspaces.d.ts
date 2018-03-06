/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Workspace, WorkspaceTarget } from '@angular-devkit/architect';
import { BrowserBuilderOptions, DevServerBuilderOptions, ExtractI18nBuilderOptions, KarmaBuilderOptions, ProtractorBuilderOptions, TslintBuilderOptions } from '../../src';
export declare const workspaceRoot: string & {
    __PRIVATE_DEVKIT_PATH: void;
};
export declare function makeWorkspace(WorkspaceTargets: WorkspaceTarget<{}> | WorkspaceTarget<{}>[]): Workspace;
export declare const browserWorkspaceTarget: WorkspaceTarget<Partial<BrowserBuilderOptions>>;
export declare const devServerWorkspaceTarget: WorkspaceTarget<Partial<DevServerBuilderOptions>>;
export declare const extractI18nWorkspaceTarget: WorkspaceTarget<Partial<ExtractI18nBuilderOptions>>;
export declare const karmaWorkspaceTarget: WorkspaceTarget<Partial<KarmaBuilderOptions>>;
export declare const protractorWorkspaceTarget: WorkspaceTarget<Partial<ProtractorBuilderOptions>>;
export declare const tslintWorkspaceTarget: WorkspaceTarget<Partial<TslintBuilderOptions>>;
