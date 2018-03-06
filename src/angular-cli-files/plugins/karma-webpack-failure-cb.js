"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
// Force Webpack to throw compilation errors. Useful with karma-webpack when in single-run mode.
// Workaround for https://github.com/webpack-contrib/karma-webpack/issues/66
class KarmaWebpackFailureCb {
    constructor(callback) {
        this.callback = callback;
    }
    apply(compiler) {
        compiler.plugin('done', (stats) => {
            if (stats.compilation.errors.length > 0) {
                this.callback();
            }
        });
    }
}
exports.KarmaWebpackFailureCb = KarmaWebpackFailureCb;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FybWEtd2VicGFjay1mYWlsdXJlLWNiLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9wbHVnaW5zL2thcm1hLXdlYnBhY2stZmFpbHVyZS1jYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBQWlCO0FBQ2pCLCtEQUErRDs7QUFFL0QsZ0dBQWdHO0FBQ2hHLDRFQUE0RTtBQUU1RTtJQUNFLFlBQW9CLFFBQW9CO1FBQXBCLGFBQVEsR0FBUixRQUFRLENBQVk7SUFBSSxDQUFDO0lBRTdDLEtBQUssQ0FBQyxRQUFhO1FBQ2pCLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBVSxFQUFFLEVBQUU7WUFDckMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFWRCxzREFVQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXG4vLyBUT0RPOiBjbGVhbnVwIHRoaXMgZmlsZSwgaXQncyBjb3BpZWQgYXMgaXMgZnJvbSBBbmd1bGFyIENMSS5cblxuLy8gRm9yY2UgV2VicGFjayB0byB0aHJvdyBjb21waWxhdGlvbiBlcnJvcnMuIFVzZWZ1bCB3aXRoIGthcm1hLXdlYnBhY2sgd2hlbiBpbiBzaW5nbGUtcnVuIG1vZGUuXG4vLyBXb3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay1jb250cmliL2thcm1hLXdlYnBhY2svaXNzdWVzLzY2XG5cbmV4cG9ydCBjbGFzcyBLYXJtYVdlYnBhY2tGYWlsdXJlQ2Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7IH1cblxuICBhcHBseShjb21waWxlcjogYW55KTogdm9pZCB7XG4gICAgY29tcGlsZXIucGx1Z2luKCdkb25lJywgKHN0YXRzOiBhbnkpID0+IHtcbiAgICAgIGlmIChzdGF0cy5jb21waWxhdGlvbi5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==