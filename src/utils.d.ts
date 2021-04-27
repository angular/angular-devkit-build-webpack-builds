import * as webpack from 'webpack';
export interface EmittedFiles {
    id?: string;
    name?: string;
    file: string;
    initial: boolean;
    asset?: boolean;
    extension: string;
}
export declare function getEmittedFiles(compilation: webpack.Compilation): EmittedFiles[];
