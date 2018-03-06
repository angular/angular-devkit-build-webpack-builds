/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuildEvent, Builder, BuilderContext, Target } from '@angular-devkit/architect';
import { Observable } from 'rxjs/Observable';
export interface DevServerBuilderOptions {
    browserTarget: string;
    port: number;
    host: string;
    proxyConfig?: string;
    ssl: boolean;
    sslKey?: string;
    sslCert?: string;
    open: boolean;
    liveReload: boolean;
    publicHost?: string;
    servePath?: string;
    disableHostCheck: boolean;
    hmr: boolean;
    watch: boolean;
    hmrWarning: boolean;
    servePathDefaultWarning: boolean;
}
export declare class DevServerBuilder implements Builder<DevServerBuilderOptions> {
    context: BuilderContext;
    constructor(context: BuilderContext);
    run(target: Target<DevServerBuilderOptions>): Observable<BuildEvent>;
    private _buildServerConfig(root, options, browserOptions);
    private _addLiveReload(options, browserOptions, webpackConfig, clientAddress);
    private _addSslConfig(root, options, config);
    private _addProxyConfig(root, options, config);
    private _buildServePath(options, browserOptions);
    private _findDefaultServePath(baseHref?, deployUrl?);
    private _getBrowserOptions(options);
}
export default DevServerBuilder;
