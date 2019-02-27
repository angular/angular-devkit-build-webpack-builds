"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const path = require("path");
/**
 * This list was taken from a list of events we want to listen to, from the list of hooks in
 * webpack's typings.
 */
const hookSafelist = [
    'seal',
    'optimizeDependenciesBasic',
    'optimizeDependencies',
    'optimizeDependenciesAdvanced',
    'afterOptimizeDependencies',
    'optimize',
    'optimizeModulesBasic',
    'optimizeModules',
    'optimizeModulesAdvanced',
    'afterOptimizeModules',
    'optimizeChunksBasic',
    'optimizeChunks',
    'optimizeChunksAdvanced',
    'afterOptimizeChunks',
    'optimizeTree',
    'afterOptimizeTree',
    'optimizeChunkModulesBasic',
    'optimizeChunkModules',
    'optimizeChunkModulesAdvanced',
    'afterOptimizeChunkModules',
    'reviveModules',
    'optimizeModuleOrder',
    'advancedOptimizeModuleOrder',
    'beforeModuleIds',
    'moduleIds',
    'optimizeModuleIds',
    'afterOptimizeModuleIds',
    'reviveChunks',
    'optimizeChunkOrder',
    'beforeChunkIds',
    'optimizeChunkIds',
    'afterOptimizeChunkIds',
    'recordModules',
    'recordChunks',
    'beforeHash',
    'afterHash',
    'recordHash',
    'record',
    'beforeModuleAssets',
    'shouldGenerateChunkAssets',
    'beforeChunkAssets',
    'additionalChunkAssets',
    'additionalAssets',
    'optimizeChunkAssets',
    'afterOptimizeChunkAssets',
    'optimizeAssets',
    'afterOptimizeAssets',
    'afterSeal',
    'optimizeExtractedChunksBasic',
    'optimizeExtractedChunks',
    'optimizeExtractedChunksAdvanced',
    'afterOptimizeExtractedChunks',
];
/**
 * A webpack plugin that reports status and progress to Architect.
 */
class ArchitectPlugin {
    constructor(context) {
        this.context = context;
    }
    apply(compiler) {
        const context = this.context;
        let modulesCount = 0;
        let modulesDone = 0;
        let hooksDone = 0;
        let numberOfHooks = 0;
        let reset = false; // Will be true when a full compilation is done.
        function done() {
            modulesDone = modulesCount;
            hooksDone = Math.max(hooksDone, numberOfHooks);
            update('Done.');
            reset = true;
        }
        function update(status) {
            context.reportProgress(modulesDone + hooksDone, modulesCount + Math.max(hooksDone, numberOfHooks), status);
        }
        function updateModule(module) {
            // This is safe since we still verify it.
            const m = module;
            const moduleId = '' + (typeof m.identifier == 'function' ? m.identifier() : '');
            const id = moduleId.split('!').slice(-1)[0].trim();
            const p = path.relative(context.workspaceRoot, id);
            update(`Building ${p}`);
        }
        function buildModule(module) {
            modulesCount++;
            updateModule(module);
        }
        function failedModule(module) {
            modulesDone++;
            updateModule(module);
        }
        function succeedModule(module) {
            modulesDone++;
            updateModule(module);
        }
        // On the start of a new compilation, maybe reset the counters (and update the total), then
        // listen to all hooks we're interested in.
        compiler.hooks.compilation.tap('ArchitectPlugin', compilation => {
            const hooks = hookSafelist;
            if (reset) {
                reset = false;
                modulesCount = modulesDone = hooksDone = numberOfHooks = 0;
            }
            // Need to add hooks for each compilation.
            numberOfHooks += hooks.length;
            // Pre-emptively tell the user.
            context.reportRunning();
            update('Preparing...');
            compilation.hooks.buildModule.tap('ArchitectPlugin', buildModule);
            compilation.hooks.failedModule.tap('ArchitectPlugin', failedModule);
            compilation.hooks.succeedModule.tap('ArchitectPlugin', succeedModule);
            for (const name of hooks) {
                // Transforms `camelCase` into `Camel case`. decamelize() transforms it into `camel_case`
                // and then we replace the `_` with spaces.
                const title = core_1.strings.capitalize(core_1.strings.decamelize(name).replace(/_/g, ' '));
                compilation.hooks[name].intercept({
                    call: () => {
                        hooksDone++;
                        update(title);
                    },
                });
            }
        });
        compiler.hooks.done.tap('ArchitectPlugin', done);
    }
}
exports.ArchitectPlugin = ArchitectPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9wbHVnaW5zL2FyY2hpdGVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVFBLCtDQUErQztBQUMvQyw2QkFBNkI7QUFHN0I7OztHQUdHO0FBQ0gsTUFBTSxZQUFZLEdBQW1EO0lBQ25FLE1BQU07SUFDTiwyQkFBMkI7SUFDM0Isc0JBQXNCO0lBQ3RCLDhCQUE4QjtJQUM5QiwyQkFBMkI7SUFDM0IsVUFBVTtJQUNWLHNCQUFzQjtJQUN0QixpQkFBaUI7SUFDakIseUJBQXlCO0lBQ3pCLHNCQUFzQjtJQUN0QixxQkFBcUI7SUFDckIsZ0JBQWdCO0lBQ2hCLHdCQUF3QjtJQUN4QixxQkFBcUI7SUFDckIsY0FBYztJQUNkLG1CQUFtQjtJQUNuQiwyQkFBMkI7SUFDM0Isc0JBQXNCO0lBQ3RCLDhCQUE4QjtJQUM5QiwyQkFBMkI7SUFDM0IsZUFBZTtJQUNmLHFCQUFxQjtJQUNyQiw2QkFBNkI7SUFDN0IsaUJBQWlCO0lBQ2pCLFdBQVc7SUFDWCxtQkFBbUI7SUFDbkIsd0JBQXdCO0lBQ3hCLGNBQWM7SUFDZCxvQkFBb0I7SUFDcEIsZ0JBQWdCO0lBQ2hCLGtCQUFrQjtJQUNsQix1QkFBdUI7SUFDdkIsZUFBZTtJQUNmLGNBQWM7SUFDZCxZQUFZO0lBQ1osV0FBVztJQUNYLFlBQVk7SUFDWixRQUFRO0lBQ1Isb0JBQW9CO0lBQ3BCLDJCQUEyQjtJQUMzQixtQkFBbUI7SUFDbkIsdUJBQXVCO0lBQ3ZCLGtCQUFrQjtJQUNsQixxQkFBcUI7SUFDckIsMEJBQTBCO0lBQzFCLGdCQUFnQjtJQUNoQixxQkFBcUI7SUFDckIsV0FBVztJQUNYLDhCQUE4QjtJQUM5Qix5QkFBeUI7SUFDekIsaUNBQWlDO0lBQ2pDLDhCQUE4QjtDQUMvQixDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFhLGVBQWU7SUFDMUIsWUFBc0Is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QVksQ0FBQyxDQUFDO1lBQ3BFLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUV0RSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDeEIseUZBQXlGO2dCQUN6RiwyQ0FBMkM7Z0JBQzNDLE1BQU0sS0FBSyxHQUFHLGNBQU8sQ0FBQyxVQUFVLENBQUMsY0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBRTlFLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDO29CQUNoQyxJQUFJLEVBQUUsR0FBRyxFQUFFO3dCQUNULFNBQVMsRUFBRSxDQUFDO3dCQUNaLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDaEIsQ0FBQztpQkFDRixDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDRjtBQWxGRCwwQ0FrRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvc3JjL2luZGV4Mic7XG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5cbi8qKlxuICogVGhpcyBsaXN0IHdhcyB0YWtlbiBmcm9tIGEgbGlzdCBvZiBldmVudHMgd2Ugd2FudCB0byBsaXN0ZW4gdG8sIGZyb20gdGhlIGxpc3Qgb2YgaG9va3MgaW5cbiAqIHdlYnBhY2sncyB0eXBpbmdzLlxuICovXG5jb25zdCBob29rU2FmZWxpc3Q6IChrZXlvZiB3ZWJwYWNrLmNvbXBpbGF0aW9uLkNvbXBpbGF0aW9uSG9va3MpW10gPSBbXG4gICdzZWFsJyxcbiAgJ29wdGltaXplRGVwZW5kZW5jaWVzQmFzaWMnLFxuICAnb3B0aW1pemVEZXBlbmRlbmNpZXMnLFxuICAnb3B0aW1pemVEZXBlbmRlbmNpZXNBZHZhbmNlZCcsXG4gICdhZnRlck9wdGltaXplRGVwZW5kZW5jaWVzJyxcbiAgJ29wdGltaXplJyxcbiAgJ29wdGltaXplTW9kdWxlc0Jhc2ljJyxcbiAgJ29wdGltaXplTW9kdWxlcycsXG4gICdvcHRpbWl6ZU1vZHVsZXNBZHZhbmNlZCcsXG4gICdhZnRlck9wdGltaXplTW9kdWxlcycsXG4gICdvcHRpbWl6ZUNodW5rc0Jhc2ljJyxcbiAgJ29wdGltaXplQ2h1bmtzJyxcbiAgJ29wdGltaXplQ2h1bmtzQWR2YW5jZWQnLFxuICAnYWZ0ZXJPcHRpbWl6ZUNodW5rcycsXG4gICdvcHRpbWl6ZVRyZWUnLFxuICAnYWZ0ZXJPcHRpbWl6ZVRyZWUnLFxuICAnb3B0aW1pemVDaHVua01vZHVsZXNCYXNpYycsXG4gICdvcHRpbWl6ZUNodW5rTW9kdWxlcycsXG4gICdvcHRpbWl6ZUNodW5rTW9kdWxlc0FkdmFuY2VkJyxcbiAgJ2FmdGVyT3B0aW1pemVDaHVua01vZHVsZXMnLFxuICAncmV2aXZlTW9kdWxlcycsXG4gICdvcHRpbWl6ZU1vZHVsZU9yZGVyJyxcbiAgJ2FkdmFuY2VkT3B0aW1pemVNb2R1bGVPcmRlcicsXG4gICdiZWZvcmVNb2R1bGVJZHMnLFxuICAnbW9kdWxlSWRzJyxcbiAgJ29wdGltaXplTW9kdWxlSWRzJyxcbiAgJ2FmdGVyT3B0aW1pemVNb2R1bGVJZHMnLFxuICAncmV2aXZlQ2h1bmtzJyxcbiAgJ29wdGltaXplQ2h1bmtPcmRlcicsXG4gICdiZWZvcmVDaHVua0lkcycsXG4gICdvcHRpbWl6ZUNodW5rSWRzJyxcbiAgJ2FmdGVyT3B0aW1pemVDaHVua0lkcycsXG4gICdyZWNvcmRNb2R1bGVzJyxcbiAgJ3JlY29yZENodW5rcycsXG4gICdiZWZvcmVIYXNoJyxcbiAgJ2FmdGVySGFzaCcsXG4gICdyZWNvcmRIYXNoJyxcbiAgJ3JlY29yZCcsXG4gICdiZWZvcmVNb2R1bGVBc3NldHMnLFxuICAnc2hvdWxkR2VuZXJhdGVDaHVua0Fzc2V0cycsXG4gICdiZWZvcmVDaHVua0Fzc2V0cycsXG4gICdhZGRpdGlvbmFsQ2h1bmtBc3NldHMnLFxuICAnYWRkaXRpb25hbEFzc2V0cycsXG4gICdvcHRpbWl6ZUNodW5rQXNzZXRzJyxcbiAgJ2FmdGVyT3B0aW1pemVDaHVua0Fzc2V0cycsXG4gICdvcHRpbWl6ZUFzc2V0cycsXG4gICdhZnRlck9wdGltaXplQXNzZXRzJyxcbiAgJ2FmdGVyU2VhbCcsXG4gICdvcHRpbWl6ZUV4dHJhY3RlZENodW5rc0Jhc2ljJyxcbiAgJ29wdGltaXplRXh0cmFjdGVkQ2h1bmtzJyxcbiAgJ29wdGltaXplRXh0cmFjdGVkQ2h1bmtzQWR2YW5jZWQnLFxuICAnYWZ0ZXJPcHRpbWl6ZUV4dHJhY3RlZENodW5rcycsXG5dO1xuXG4vKipcbiAqIEEgd2VicGFjayBwbHVnaW4gdGhhdCByZXBvcnRzIHN0YXR1cyBhbmQgcHJvZ3Jlc3MgdG8gQXJjaGl0ZWN0LlxuICovXG5leHBvcnQgY2xhc3MgQXJjaGl0ZWN0UGx1Z2luIHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KSB7fVxuXG4gIGFwcGx5KGNvbXBpbGVyOiB3ZWJwYWNrLkNvbXBpbGVyKSB7XG4gICAgY29uc3QgY29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgICBsZXQgbW9kdWxlc0NvdW50ID0gMDtcbiAgICBsZXQgbW9kdWxlc0RvbmUgPSAwO1xuICAgIGxldCBob29rc0RvbmUgPSAwO1xuICAgIGxldCBudW1iZXJPZkhvb2tzID0gMDtcbiAgICBsZXQgcmVzZXQgPSBmYWxzZTsgIC8vIFdpbGwgYmUgdHJ1ZSB3aGVuIGEgZnVsbCBjb21waWxhdGlvbiBpcyBkb25lLlxuXG4gICAgZnVuY3Rpb24gZG9uZSgpIHtcbiAgICAgIG1vZHVsZXNEb25lID0gbW9kdWxlc0NvdW50O1xuICAgICAgaG9va3NEb25lID0gTWF0aC5tYXgoaG9va3NEb25lLCBudW1iZXJPZkhvb2tzKTtcbiAgICAgIHVwZGF0ZSgnRG9uZS4nKTtcbiAgICAgIHJlc2V0ID0gdHJ1ZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdXBkYXRlKHN0YXR1czogc3RyaW5nKSB7XG4gICAgICBjb250ZXh0LnJlcG9ydFByb2dyZXNzKFxuICAgICAgICBtb2R1bGVzRG9uZSArIGhvb2tzRG9uZSxcbiAgICAgICAgbW9kdWxlc0NvdW50ICsgTWF0aC5tYXgoaG9va3NEb25lLCBudW1iZXJPZkhvb2tzKSxcbiAgICAgICAgc3RhdHVzLFxuICAgICAgKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdXBkYXRlTW9kdWxlKG1vZHVsZTogd2VicGFjay5Nb2R1bGUpIHtcbiAgICAgIC8vIFRoaXMgaXMgc2FmZSBzaW5jZSB3ZSBzdGlsbCB2ZXJpZnkgaXQuXG4gICAgICBjb25zdCBtID0gbW9kdWxlIGFzIHVua25vd24gYXMgeyBpZGVudGlmaWVyPzogKCkgPT4gc3RyaW5nIH07XG4gICAgICBjb25zdCBtb2R1bGVJZCA9ICcnICsgKHR5cGVvZiBtLmlkZW50aWZpZXIgPT0gJ2Z1bmN0aW9uJyA/IG0uaWRlbnRpZmllcigpIDogJycpO1xuICAgICAgY29uc3QgaWQgPSBtb2R1bGVJZC5zcGxpdCgnIScpLnNsaWNlKC0xKVswXS50cmltKCk7XG4gICAgICBjb25zdCBwID0gcGF0aC5yZWxhdGl2ZShjb250ZXh0LndvcmtzcGFjZVJvb3QsIGlkKTtcblxuICAgICAgdXBkYXRlKGBCdWlsZGluZyAke3B9YCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnVpbGRNb2R1bGUobW9kdWxlOiB3ZWJwYWNrLk1vZHVsZSkge1xuICAgICAgbW9kdWxlc0NvdW50Kys7XG4gICAgICB1cGRhdGVNb2R1bGUobW9kdWxlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZmFpbGVkTW9kdWxlKG1vZHVsZTogd2VicGFjay5Nb2R1bGUpIHtcbiAgICAgIG1vZHVsZXNEb25lKys7XG4gICAgICB1cGRhdGVNb2R1bGUobW9kdWxlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc3VjY2VlZE1vZHVsZShtb2R1bGU6IHdlYnBhY2suTW9kdWxlKSB7XG4gICAgICBtb2R1bGVzRG9uZSsrO1xuICAgICAgdXBkYXRlTW9kdWxlKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgLy8gT24gdGhlIHN0YXJ0IG9mIGEgbmV3IGNvbXBpbGF0aW9uLCBtYXliZSByZXNldCB0aGUgY291bnRlcnMgKGFuZCB1cGRhdGUgdGhlIHRvdGFsKSwgdGhlblxuICAgIC8vIGxpc3RlbiB0byBhbGwgaG9va3Mgd2UncmUgaW50ZXJlc3RlZCBpbi5cbiAgICBjb21waWxlci5ob29rcy5jb21waWxhdGlvbi50YXAoJ0FyY2hpdGVjdFBsdWdpbicsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgIGNvbnN0IGhvb2tzID0gaG9va1NhZmVsaXN0O1xuICAgICAgaWYgKHJlc2V0KSB7XG4gICAgICAgIHJlc2V0ID0gZmFsc2U7XG4gICAgICAgIG1vZHVsZXNDb3VudCA9IG1vZHVsZXNEb25lID0gaG9va3NEb25lID0gbnVtYmVyT2ZIb29rcyA9IDA7XG4gICAgICB9XG4gICAgICAvLyBOZWVkIHRvIGFkZCBob29rcyBmb3IgZWFjaCBjb21waWxhdGlvbi5cbiAgICAgIG51bWJlck9mSG9va3MgKz0gaG9va3MubGVuZ3RoO1xuXG4gICAgICAvLyBQcmUtZW1wdGl2ZWx5IHRlbGwgdGhlIHVzZXIuXG4gICAgICBjb250ZXh0LnJlcG9ydFJ1bm5pbmcoKTtcbiAgICAgIHVwZGF0ZSgnUHJlcGFyaW5nLi4uJyk7XG5cbiAgICAgIGNvbXBpbGF0aW9uLmhvb2tzLmJ1aWxkTW9kdWxlLnRhcCgnQXJjaGl0ZWN0UGx1Z2luJywgYnVpbGRNb2R1bGUpO1xuICAgICAgY29tcGlsYXRpb24uaG9va3MuZmFpbGVkTW9kdWxlLnRhcCgnQXJjaGl0ZWN0UGx1Z2luJywgZmFpbGVkTW9kdWxlKTtcbiAgICAgIGNvbXBpbGF0aW9uLmhvb2tzLnN1Y2NlZWRNb2R1bGUudGFwKCdBcmNoaXRlY3RQbHVnaW4nLCBzdWNjZWVkTW9kdWxlKTtcblxuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGhvb2tzKSB7XG4gICAgICAgIC8vIFRyYW5zZm9ybXMgYGNhbWVsQ2FzZWAgaW50byBgQ2FtZWwgY2FzZWAuIGRlY2FtZWxpemUoKSB0cmFuc2Zvcm1zIGl0IGludG8gYGNhbWVsX2Nhc2VgXG4gICAgICAgIC8vIGFuZCB0aGVuIHdlIHJlcGxhY2UgdGhlIGBfYCB3aXRoIHNwYWNlcy5cbiAgICAgICAgY29uc3QgdGl0bGUgPSBzdHJpbmdzLmNhcGl0YWxpemUoc3RyaW5ncy5kZWNhbWVsaXplKG5hbWUpLnJlcGxhY2UoL18vZywgJyAnKSk7XG5cbiAgICAgICAgY29tcGlsYXRpb24uaG9va3NbbmFtZV0uaW50ZXJjZXB0KHtcbiAgICAgICAgICBjYWxsOiAoKSA9PiB7XG4gICAgICAgICAgICBob29rc0RvbmUrKztcbiAgICAgICAgICAgIHVwZGF0ZSh0aXRsZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnQXJjaGl0ZWN0UGx1Z2luJywgZG9uZSk7XG4gIH1cbn1cbiJdfQ==