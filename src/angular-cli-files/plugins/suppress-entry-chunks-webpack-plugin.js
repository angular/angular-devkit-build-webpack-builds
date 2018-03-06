"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
// Remove .js files from entry points consisting entirely of .css|scss|sass|less|styl.
// To be used together with ExtractTextPlugin.
class SuppressExtractedTextChunksWebpackPlugin {
    constructor() { }
    apply(compiler) {
        compiler.plugin('compilation', function (compilation) {
            // find which chunks have css only entry points
            const cssOnlyChunks = [];
            const entryPoints = compilation.options.entry;
            // determine which entry points are composed entirely of css files
            for (let entryPoint of Object.keys(entryPoints)) {
                let entryFiles = entryPoints[entryPoint];
                // when type of entryFiles is not array, make it as an array
                entryFiles = entryFiles instanceof Array ? entryFiles : [entryFiles];
                if (entryFiles.every((el) => el.match(/\.(css|scss|sass|less|styl)$/) !== null)) {
                    cssOnlyChunks.push(entryPoint);
                }
            }
            // Remove the js file for supressed chunks
            compilation.plugin('after-seal', (callback) => {
                compilation.chunks
                    .filter((chunk) => cssOnlyChunks.indexOf(chunk.name) !== -1)
                    .forEach((chunk) => {
                    let newFiles = [];
                    chunk.files.forEach((file) => {
                        if (file.match(/\.js(\.map)?$/)) {
                            // remove js files
                            delete compilation.assets[file];
                        }
                        else {
                            newFiles.push(file);
                        }
                    });
                    chunk.files = newFiles;
                });
                callback();
            });
            // Remove scripts tags with a css file as source, because HtmlWebpackPlugin will use
            // a css file as a script for chunks without js files.
            // TODO: Enable this once HtmlWebpackPlugin supports Webpack 4
            // compilation.plugin('html-webpack-plugin-alter-asset-tags',
            //   (htmlPluginData: any, callback: any) => {
            //     const filterFn = (tag: any) =>
            //       !(tag.tagName === 'script' && tag.attributes.src.match(/\.css$/));
            //     htmlPluginData.head = htmlPluginData.head.filter(filterFn);
            //     htmlPluginData.body = htmlPluginData.body.filter(filterFn);
            //     callback(null, htmlPluginData);
            //   });
        });
    }
}
exports.SuppressExtractedTextChunksWebpackPlugin = SuppressExtractedTextChunksWebpackPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwcHJlc3MtZW50cnktY2h1bmtzLXdlYnBhY2stcGx1Z2luLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9wbHVnaW5zL3N1cHByZXNzLWVudHJ5LWNodW5rcy13ZWJwYWNrLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUJBQWlCO0FBQ2pCLCtEQUErRDs7QUFFL0Qsc0ZBQXNGO0FBQ3RGLDhDQUE4QztBQUU5QztJQUNFLGdCQUFnQixDQUFDO0lBRWpCLEtBQUssQ0FBQyxRQUFhO1FBQ2pCLFFBQVEsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFVBQVUsV0FBZ0I7WUFDdkQsK0NBQStDO1lBQy9DLE1BQU0sYUFBYSxHQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUM5QyxrRUFBa0U7WUFDbEUsR0FBRyxDQUFDLENBQUMsSUFBSSxVQUFVLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELElBQUksVUFBVSxHQUFzQixXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzVELDREQUE0RDtnQkFDNUQsVUFBVSxHQUFHLFVBQVUsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDckUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQVUsRUFBRSxFQUFFLENBQ2xDLEVBQUUsQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3JELGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7WUFDSCxDQUFDO1lBQ0QsMENBQTBDO1lBQzFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsUUFBYSxFQUFFLEVBQUU7Z0JBQ2pELFdBQVcsQ0FBQyxNQUFNO3FCQUNmLE1BQU0sQ0FBQyxDQUFDLEtBQVUsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7cUJBQ2hFLE9BQU8sQ0FBQyxDQUFDLEtBQVUsRUFBRSxFQUFFO29CQUN0QixJQUFJLFFBQVEsR0FBYSxFQUFFLENBQUM7b0JBQzVCLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBWSxFQUFFLEVBQUU7d0JBQ25DLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNoQyxrQkFBa0I7NEJBQ2xCLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEMsQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDTixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUN0QixDQUFDO29CQUNILENBQUMsQ0FBQyxDQUFDO29CQUNILEtBQUssQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO2dCQUN6QixDQUFDLENBQUMsQ0FBQztnQkFDTCxRQUFRLEVBQUUsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1lBQ0gsb0ZBQW9GO1lBQ3BGLHNEQUFzRDtZQUN0RCw4REFBOEQ7WUFDOUQsNkRBQTZEO1lBQzdELDhDQUE4QztZQUM5QyxxQ0FBcUM7WUFDckMsMkVBQTJFO1lBQzNFLGtFQUFrRTtZQUNsRSxrRUFBa0U7WUFDbEUsc0NBQXNDO1lBQ3RDLFFBQVE7UUFDVixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWpERCw0RkFpREMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZVxuLy8gVE9ETzogY2xlYW51cCB0aGlzIGZpbGUsIGl0J3MgY29waWVkIGFzIGlzIGZyb20gQW5ndWxhciBDTEkuXG5cbi8vIFJlbW92ZSAuanMgZmlsZXMgZnJvbSBlbnRyeSBwb2ludHMgY29uc2lzdGluZyBlbnRpcmVseSBvZiAuY3NzfHNjc3N8c2Fzc3xsZXNzfHN0eWwuXG4vLyBUbyBiZSB1c2VkIHRvZ2V0aGVyIHdpdGggRXh0cmFjdFRleHRQbHVnaW4uXG5cbmV4cG9ydCBjbGFzcyBTdXBwcmVzc0V4dHJhY3RlZFRleHRDaHVua3NXZWJwYWNrUGx1Z2luIHtcbiAgY29uc3RydWN0b3IoKSB7IH1cblxuICBhcHBseShjb21waWxlcjogYW55KTogdm9pZCB7XG4gICAgY29tcGlsZXIucGx1Z2luKCdjb21waWxhdGlvbicsIGZ1bmN0aW9uIChjb21waWxhdGlvbjogYW55KSB7XG4gICAgICAvLyBmaW5kIHdoaWNoIGNodW5rcyBoYXZlIGNzcyBvbmx5IGVudHJ5IHBvaW50c1xuICAgICAgY29uc3QgY3NzT25seUNodW5rczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gY29tcGlsYXRpb24ub3B0aW9ucy5lbnRyeTtcbiAgICAgIC8vIGRldGVybWluZSB3aGljaCBlbnRyeSBwb2ludHMgYXJlIGNvbXBvc2VkIGVudGlyZWx5IG9mIGNzcyBmaWxlc1xuICAgICAgZm9yIChsZXQgZW50cnlQb2ludCBvZiBPYmplY3Qua2V5cyhlbnRyeVBvaW50cykpIHtcbiAgICAgICAgbGV0IGVudHJ5RmlsZXM6IHN0cmluZ1tdIHwgc3RyaW5nID0gZW50cnlQb2ludHNbZW50cnlQb2ludF07XG4gICAgICAgIC8vIHdoZW4gdHlwZSBvZiBlbnRyeUZpbGVzIGlzIG5vdCBhcnJheSwgbWFrZSBpdCBhcyBhbiBhcnJheVxuICAgICAgICBlbnRyeUZpbGVzID0gZW50cnlGaWxlcyBpbnN0YW5jZW9mIEFycmF5ID8gZW50cnlGaWxlcyA6IFtlbnRyeUZpbGVzXTtcbiAgICAgICAgaWYgKGVudHJ5RmlsZXMuZXZlcnkoKGVsOiBzdHJpbmcpID0+XG4gICAgICAgICAgZWwubWF0Y2goL1xcLihjc3N8c2Nzc3xzYXNzfGxlc3N8c3R5bCkkLykgIT09IG51bGwpKSB7XG4gICAgICAgICAgY3NzT25seUNodW5rcy5wdXNoKGVudHJ5UG9pbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBSZW1vdmUgdGhlIGpzIGZpbGUgZm9yIHN1cHJlc3NlZCBjaHVua3NcbiAgICAgIGNvbXBpbGF0aW9uLnBsdWdpbignYWZ0ZXItc2VhbCcsIChjYWxsYmFjazogYW55KSA9PiB7XG4gICAgICAgIGNvbXBpbGF0aW9uLmNodW5rc1xuICAgICAgICAgIC5maWx0ZXIoKGNodW5rOiBhbnkpID0+IGNzc09ubHlDaHVua3MuaW5kZXhPZihjaHVuay5uYW1lKSAhPT0gLTEpXG4gICAgICAgICAgLmZvckVhY2goKGNodW5rOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGxldCBuZXdGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgIGNodW5rLmZpbGVzLmZvckVhY2goKGZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICBpZiAoZmlsZS5tYXRjaCgvXFwuanMoXFwubWFwKT8kLykpIHtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUganMgZmlsZXNcbiAgICAgICAgICAgICAgICBkZWxldGUgY29tcGlsYXRpb24uYXNzZXRzW2ZpbGVdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld0ZpbGVzLnB1c2goZmlsZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2h1bmsuZmlsZXMgPSBuZXdGaWxlcztcbiAgICAgICAgICB9KTtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH0pO1xuICAgICAgLy8gUmVtb3ZlIHNjcmlwdHMgdGFncyB3aXRoIGEgY3NzIGZpbGUgYXMgc291cmNlLCBiZWNhdXNlIEh0bWxXZWJwYWNrUGx1Z2luIHdpbGwgdXNlXG4gICAgICAvLyBhIGNzcyBmaWxlIGFzIGEgc2NyaXB0IGZvciBjaHVua3Mgd2l0aG91dCBqcyBmaWxlcy5cbiAgICAgIC8vIFRPRE86IEVuYWJsZSB0aGlzIG9uY2UgSHRtbFdlYnBhY2tQbHVnaW4gc3VwcG9ydHMgV2VicGFjayA0XG4gICAgICAvLyBjb21waWxhdGlvbi5wbHVnaW4oJ2h0bWwtd2VicGFjay1wbHVnaW4tYWx0ZXItYXNzZXQtdGFncycsXG4gICAgICAvLyAgIChodG1sUGx1Z2luRGF0YTogYW55LCBjYWxsYmFjazogYW55KSA9PiB7XG4gICAgICAvLyAgICAgY29uc3QgZmlsdGVyRm4gPSAodGFnOiBhbnkpID0+XG4gICAgICAvLyAgICAgICAhKHRhZy50YWdOYW1lID09PSAnc2NyaXB0JyAmJiB0YWcuYXR0cmlidXRlcy5zcmMubWF0Y2goL1xcLmNzcyQvKSk7XG4gICAgICAvLyAgICAgaHRtbFBsdWdpbkRhdGEuaGVhZCA9IGh0bWxQbHVnaW5EYXRhLmhlYWQuZmlsdGVyKGZpbHRlckZuKTtcbiAgICAgIC8vICAgICBodG1sUGx1Z2luRGF0YS5ib2R5ID0gaHRtbFBsdWdpbkRhdGEuYm9keS5maWx0ZXIoZmlsdGVyRm4pO1xuICAgICAgLy8gICAgIGNhbGxiYWNrKG51bGwsIGh0bWxQbHVnaW5EYXRhKTtcbiAgICAgIC8vICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==