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
            const id = moduleId.split(/!|\s+|\bmulti\b/).slice(-1)[0].trim();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF93ZWJwYWNrL3NyYy9wbHVnaW5zL2FyY2hpdGVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVFBLCtDQUErQztBQUMvQyw2QkFBNkI7QUFHN0I7OztHQUdHO0FBQ0gsTUFBTSxZQUFZLEdBQW1EO0lBQ25FLE1BQU07SUFDTiwyQkFBMkI7SUFDM0Isc0JBQXNCO0lBQ3RCLDhCQUE4QjtJQUM5QiwyQkFBMkI7SUFDM0IsVUFBVTtJQUNWLHNCQUFzQjtJQUN0QixpQkFBaUI7SUFDakIseUJBQXlCO0lBQ3pCLHNCQUFzQjtJQUN0QixxQkFBcUI7SUFDckIsZ0JBQWdCO0lBQ2hCLHdCQUF3QjtJQUN4QixxQkFBcUI7SUFDckIsY0FBYztJQUNkLG1CQUFtQjtJQUNuQiwyQkFBMkI7SUFDM0Isc0JBQXNCO0lBQ3RCLDhCQUE4QjtJQUM5QiwyQkFBMkI7SUFDM0IsZUFBZTtJQUNmLHFCQUFxQjtJQUNyQiw2QkFBNkI7SUFDN0IsaUJBQWlCO0lBQ2pCLFdBQVc7SUFDWCxtQkFBbUI7SUFDbkIsd0JBQXdCO0lBQ3hCLGNBQWM7SUFDZCxvQkFBb0I7SUFDcEIsZ0JBQWdCO0lBQ2hCLGtCQUFrQjtJQUNsQix1QkFBdUI7SUFDdkIsZUFBZTtJQUNmLGNBQWM7SUFDZCxZQUFZO0lBQ1osV0FBVztJQUNYLFlBQVk7SUFDWixRQUFRO0lBQ1Isb0JBQW9CO0lBQ3BCLDJCQUEyQjtJQUMzQixtQkFBbUI7SUFDbkIsdUJBQXVCO0lBQ3ZCLGtCQUFrQjtJQUNsQixxQkFBcUI7SUFDckIsMEJBQTBCO0lBQzFCLGdCQUFnQjtJQUNoQixxQkFBcUI7SUFDckIsV0FBVztJQUNYLDhCQUE4QjtJQUM5Qix5QkFBeUI7SUFDekIsaUNBQWlDO0lBQ2pDLDhCQUE4QjtDQUMvQixDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFhLGVBQWU7SUFDMUIsWUFBc0Is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WUFBWSxDQUFDLENBQUM7WUFDcEUsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRXRFLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUN4Qix5RkFBeUY7Z0JBQ3pGLDJDQUEyQztnQkFDM0MsTUFBTSxLQUFLLEdBQUcsY0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFFOUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7b0JBQ2hDLElBQUksRUFBRSxHQUFHLEVBQUU7d0JBQ1QsU0FBUyxFQUFFLENBQUM7d0JBQ1osTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNoQixDQUFDO2lCQUNGLENBQUMsQ0FBQzthQUNKO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBbEZELDBDQWtGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdC9zcmMvaW5kZXgyJztcbmltcG9ydCB7IHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcblxuLyoqXG4gKiBUaGlzIGxpc3Qgd2FzIHRha2VuIGZyb20gYSBsaXN0IG9mIGV2ZW50cyB3ZSB3YW50IHRvIGxpc3RlbiB0bywgZnJvbSB0aGUgbGlzdCBvZiBob29rcyBpblxuICogd2VicGFjaydzIHR5cGluZ3MuXG4gKi9cbmNvbnN0IGhvb2tTYWZlbGlzdDogKGtleW9mIHdlYnBhY2suY29tcGlsYXRpb24uQ29tcGlsYXRpb25Ib29rcylbXSA9IFtcbiAgJ3NlYWwnLFxuICAnb3B0aW1pemVEZXBlbmRlbmNpZXNCYXNpYycsXG4gICdvcHRpbWl6ZURlcGVuZGVuY2llcycsXG4gICdvcHRpbWl6ZURlcGVuZGVuY2llc0FkdmFuY2VkJyxcbiAgJ2FmdGVyT3B0aW1pemVEZXBlbmRlbmNpZXMnLFxuICAnb3B0aW1pemUnLFxuICAnb3B0aW1pemVNb2R1bGVzQmFzaWMnLFxuICAnb3B0aW1pemVNb2R1bGVzJyxcbiAgJ29wdGltaXplTW9kdWxlc0FkdmFuY2VkJyxcbiAgJ2FmdGVyT3B0aW1pemVNb2R1bGVzJyxcbiAgJ29wdGltaXplQ2h1bmtzQmFzaWMnLFxuICAnb3B0aW1pemVDaHVua3MnLFxuICAnb3B0aW1pemVDaHVua3NBZHZhbmNlZCcsXG4gICdhZnRlck9wdGltaXplQ2h1bmtzJyxcbiAgJ29wdGltaXplVHJlZScsXG4gICdhZnRlck9wdGltaXplVHJlZScsXG4gICdvcHRpbWl6ZUNodW5rTW9kdWxlc0Jhc2ljJyxcbiAgJ29wdGltaXplQ2h1bmtNb2R1bGVzJyxcbiAgJ29wdGltaXplQ2h1bmtNb2R1bGVzQWR2YW5jZWQnLFxuICAnYWZ0ZXJPcHRpbWl6ZUNodW5rTW9kdWxlcycsXG4gICdyZXZpdmVNb2R1bGVzJyxcbiAgJ29wdGltaXplTW9kdWxlT3JkZXInLFxuICAnYWR2YW5jZWRPcHRpbWl6ZU1vZHVsZU9yZGVyJyxcbiAgJ2JlZm9yZU1vZHVsZUlkcycsXG4gICdtb2R1bGVJZHMnLFxuICAnb3B0aW1pemVNb2R1bGVJZHMnLFxuICAnYWZ0ZXJPcHRpbWl6ZU1vZHVsZUlkcycsXG4gICdyZXZpdmVDaHVua3MnLFxuICAnb3B0aW1pemVDaHVua09yZGVyJyxcbiAgJ2JlZm9yZUNodW5rSWRzJyxcbiAgJ29wdGltaXplQ2h1bmtJZHMnLFxuICAnYWZ0ZXJPcHRpbWl6ZUNodW5rSWRzJyxcbiAgJ3JlY29yZE1vZHVsZXMnLFxuICAncmVjb3JkQ2h1bmtzJyxcbiAgJ2JlZm9yZUhhc2gnLFxuICAnYWZ0ZXJIYXNoJyxcbiAgJ3JlY29yZEhhc2gnLFxuICAncmVjb3JkJyxcbiAgJ2JlZm9yZU1vZHVsZUFzc2V0cycsXG4gICdzaG91bGRHZW5lcmF0ZUNodW5rQXNzZXRzJyxcbiAgJ2JlZm9yZUNodW5rQXNzZXRzJyxcbiAgJ2FkZGl0aW9uYWxDaHVua0Fzc2V0cycsXG4gICdhZGRpdGlvbmFsQXNzZXRzJyxcbiAgJ29wdGltaXplQ2h1bmtBc3NldHMnLFxuICAnYWZ0ZXJPcHRpbWl6ZUNodW5rQXNzZXRzJyxcbiAgJ29wdGltaXplQXNzZXRzJyxcbiAgJ2FmdGVyT3B0aW1pemVBc3NldHMnLFxuICAnYWZ0ZXJTZWFsJyxcbiAgJ29wdGltaXplRXh0cmFjdGVkQ2h1bmtzQmFzaWMnLFxuICAnb3B0aW1pemVFeHRyYWN0ZWRDaHVua3MnLFxuICAnb3B0aW1pemVFeHRyYWN0ZWRDaHVua3NBZHZhbmNlZCcsXG4gICdhZnRlck9wdGltaXplRXh0cmFjdGVkQ2h1bmtzJyxcbl07XG5cbi8qKlxuICogQSB3ZWJwYWNrIHBsdWdpbiB0aGF0IHJlcG9ydHMgc3RhdHVzIGFuZCBwcm9ncmVzcyB0byBBcmNoaXRlY3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBBcmNoaXRlY3RQbHVnaW4ge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY29udGV4dDogQnVpbGRlckNvbnRleHQpIHt9XG5cbiAgYXBwbHkoY29tcGlsZXI6IHdlYnBhY2suQ29tcGlsZXIpIHtcbiAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuICAgIGxldCBtb2R1bGVzQ291bnQgPSAwO1xuICAgIGxldCBtb2R1bGVzRG9uZSA9IDA7XG4gICAgbGV0IGhvb2tzRG9uZSA9IDA7XG4gICAgbGV0IG51bWJlck9mSG9va3MgPSAwO1xuICAgIGxldCByZXNldCA9IGZhbHNlOyAgLy8gV2lsbCBiZSB0cnVlIHdoZW4gYSBmdWxsIGNvbXBpbGF0aW9uIGlzIGRvbmUuXG5cbiAgICBmdW5jdGlvbiBkb25lKCkge1xuICAgICAgbW9kdWxlc0RvbmUgPSBtb2R1bGVzQ291bnQ7XG4gICAgICBob29rc0RvbmUgPSBNYXRoLm1heChob29rc0RvbmUsIG51bWJlck9mSG9va3MpO1xuICAgICAgdXBkYXRlKCdEb25lLicpO1xuICAgICAgcmVzZXQgPSB0cnVlO1xuICAgIH1cbiAgICBmdW5jdGlvbiB1cGRhdGUoc3RhdHVzOiBzdHJpbmcpIHtcbiAgICAgIGNvbnRleHQucmVwb3J0UHJvZ3Jlc3MoXG4gICAgICAgIG1vZHVsZXNEb25lICsgaG9va3NEb25lLFxuICAgICAgICBtb2R1bGVzQ291bnQgKyBNYXRoLm1heChob29rc0RvbmUsIG51bWJlck9mSG9va3MpLFxuICAgICAgICBzdGF0dXMsXG4gICAgICApO1xuICAgIH1cbiAgICBmdW5jdGlvbiB1cGRhdGVNb2R1bGUobW9kdWxlOiB3ZWJwYWNrLk1vZHVsZSkge1xuICAgICAgLy8gVGhpcyBpcyBzYWZlIHNpbmNlIHdlIHN0aWxsIHZlcmlmeSBpdC5cbiAgICAgIGNvbnN0IG0gPSBtb2R1bGUgYXMgdW5rbm93biBhcyB7IGlkZW50aWZpZXI/OiAoKSA9PiBzdHJpbmcgfTtcbiAgICAgIGNvbnN0IG1vZHVsZUlkID0gJycgKyAodHlwZW9mIG0uaWRlbnRpZmllciA9PSAnZnVuY3Rpb24nID8gbS5pZGVudGlmaWVyKCkgOiAnJyk7XG4gICAgICBjb25zdCBpZCA9IG1vZHVsZUlkLnNwbGl0KC8hfFxccyt8XFxibXVsdGlcXGIvKS5zbGljZSgtMSlbMF0udHJpbSgpO1xuICAgICAgY29uc3QgcCA9IHBhdGgucmVsYXRpdmUoY29udGV4dC53b3Jrc3BhY2VSb290LCBpZCk7XG5cbiAgICAgIHVwZGF0ZShgQnVpbGRpbmcgJHtwfWApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJ1aWxkTW9kdWxlKG1vZHVsZTogd2VicGFjay5Nb2R1bGUpIHtcbiAgICAgIG1vZHVsZXNDb3VudCsrO1xuICAgICAgdXBkYXRlTW9kdWxlKG1vZHVsZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZhaWxlZE1vZHVsZShtb2R1bGU6IHdlYnBhY2suTW9kdWxlKSB7XG4gICAgICBtb2R1bGVzRG9uZSsrO1xuICAgICAgdXBkYXRlTW9kdWxlKG1vZHVsZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHN1Y2NlZWRNb2R1bGUobW9kdWxlOiB3ZWJwYWNrLk1vZHVsZSkge1xuICAgICAgbW9kdWxlc0RvbmUrKztcbiAgICAgIHVwZGF0ZU1vZHVsZShtb2R1bGUpO1xuICAgIH1cblxuICAgIC8vIE9uIHRoZSBzdGFydCBvZiBhIG5ldyBjb21waWxhdGlvbiwgbWF5YmUgcmVzZXQgdGhlIGNvdW50ZXJzIChhbmQgdXBkYXRlIHRoZSB0b3RhbCksIHRoZW5cbiAgICAvLyBsaXN0ZW4gdG8gYWxsIGhvb2tzIHdlJ3JlIGludGVyZXN0ZWQgaW4uXG4gICAgY29tcGlsZXIuaG9va3MuY29tcGlsYXRpb24udGFwKCdBcmNoaXRlY3RQbHVnaW4nLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICBjb25zdCBob29rcyA9IGhvb2tTYWZlbGlzdDtcbiAgICAgIGlmIChyZXNldCkge1xuICAgICAgICByZXNldCA9IGZhbHNlO1xuICAgICAgICBtb2R1bGVzQ291bnQgPSBtb2R1bGVzRG9uZSA9IGhvb2tzRG9uZSA9IG51bWJlck9mSG9va3MgPSAwO1xuICAgICAgfVxuICAgICAgLy8gTmVlZCB0byBhZGQgaG9va3MgZm9yIGVhY2ggY29tcGlsYXRpb24uXG4gICAgICBudW1iZXJPZkhvb2tzICs9IGhvb2tzLmxlbmd0aDtcblxuICAgICAgLy8gUHJlLWVtcHRpdmVseSB0ZWxsIHRoZSB1c2VyLlxuICAgICAgY29udGV4dC5yZXBvcnRSdW5uaW5nKCk7XG4gICAgICB1cGRhdGUoJ1ByZXBhcmluZy4uLicpO1xuXG4gICAgICBjb21waWxhdGlvbi5ob29rcy5idWlsZE1vZHVsZS50YXAoJ0FyY2hpdGVjdFBsdWdpbicsIGJ1aWxkTW9kdWxlKTtcbiAgICAgIGNvbXBpbGF0aW9uLmhvb2tzLmZhaWxlZE1vZHVsZS50YXAoJ0FyY2hpdGVjdFBsdWdpbicsIGZhaWxlZE1vZHVsZSk7XG4gICAgICBjb21waWxhdGlvbi5ob29rcy5zdWNjZWVkTW9kdWxlLnRhcCgnQXJjaGl0ZWN0UGx1Z2luJywgc3VjY2VlZE1vZHVsZSk7XG5cbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBob29rcykge1xuICAgICAgICAvLyBUcmFuc2Zvcm1zIGBjYW1lbENhc2VgIGludG8gYENhbWVsIGNhc2VgLiBkZWNhbWVsaXplKCkgdHJhbnNmb3JtcyBpdCBpbnRvIGBjYW1lbF9jYXNlYFxuICAgICAgICAvLyBhbmQgdGhlbiB3ZSByZXBsYWNlIHRoZSBgX2Agd2l0aCBzcGFjZXMuXG4gICAgICAgIGNvbnN0IHRpdGxlID0gc3RyaW5ncy5jYXBpdGFsaXplKHN0cmluZ3MuZGVjYW1lbGl6ZShuYW1lKS5yZXBsYWNlKC9fL2csICcgJykpO1xuXG4gICAgICAgIGNvbXBpbGF0aW9uLmhvb2tzW25hbWVdLmludGVyY2VwdCh7XG4gICAgICAgICAgY2FsbDogKCkgPT4ge1xuICAgICAgICAgICAgaG9va3NEb25lKys7XG4gICAgICAgICAgICB1cGRhdGUodGl0bGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ0FyY2hpdGVjdFBsdWdpbicsIGRvbmUpO1xuICB9XG59XG4iXX0=