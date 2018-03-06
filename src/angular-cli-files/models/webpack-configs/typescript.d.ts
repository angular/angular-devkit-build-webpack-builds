import { AngularCompilerPlugin } from '@ngtools/webpack';
import { WebpackConfigOptions } from '../build-options';
export declare function getNonAotConfig(wco: WebpackConfigOptions): {
    module: {
        rules: {
            test: RegExp;
            loader: string;
        }[];
    };
    plugins: AngularCompilerPlugin[];
};
export declare function getAotConfig(wco: WebpackConfigOptions): {
    module: {
        rules: {
            test: RegExp;
            use: any[];
        }[];
    };
    plugins: AngularCompilerPlugin[];
};
export declare function getNonAotTestConfig(wco: WebpackConfigOptions): {
    module: {
        rules: {
            test: RegExp;
            loader: string;
        }[];
    };
    plugins: AngularCompilerPlugin[];
};
