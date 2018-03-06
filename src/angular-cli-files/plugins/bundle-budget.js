"use strict";
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const bundle_calculator_1 = require("../utilities/bundle-calculator");
const stats_1 = require("../utilities/stats");
class BundleBudgetPlugin {
    constructor(options) {
        this.options = options;
    }
    apply(compiler) {
        const { budgets } = this.options;
        compiler.plugin('after-emit', (compilation, cb) => {
            if (!budgets || budgets.length === 0) {
                cb();
                return;
            }
            budgets.map(budget => {
                const thresholds = this.calculate(budget);
                return {
                    budget,
                    thresholds,
                    sizes: bundle_calculator_1.calculateSizes(budget, compilation)
                };
            })
                .forEach(budgetCheck => {
                budgetCheck.sizes.forEach(size => {
                    this.checkMaximum(budgetCheck.thresholds.maximumWarning, size, compilation.warnings);
                    this.checkMaximum(budgetCheck.thresholds.maximumError, size, compilation.errors);
                    this.checkMinimum(budgetCheck.thresholds.minimumWarning, size, compilation.warnings);
                    this.checkMinimum(budgetCheck.thresholds.minimumError, size, compilation.errors);
                    this.checkMinimum(budgetCheck.thresholds.warningLow, size, compilation.warnings);
                    this.checkMaximum(budgetCheck.thresholds.warningHigh, size, compilation.warnings);
                    this.checkMinimum(budgetCheck.thresholds.errorLow, size, compilation.errors);
                    this.checkMaximum(budgetCheck.thresholds.errorHigh, size, compilation.errors);
                });
            });
            cb();
        });
    }
    checkMinimum(threshold, size, messages) {
        if (threshold) {
            if (threshold > size.size) {
                const sizeDifference = stats_1.formatSize(threshold - size.size);
                messages.push(`budgets, minimum exceeded for ${size.label}. `
                    + `Budget ${stats_1.formatSize(threshold)} was not reached by ${sizeDifference}.`);
            }
        }
    }
    checkMaximum(threshold, size, messages) {
        if (threshold) {
            if (threshold < size.size) {
                const sizeDifference = stats_1.formatSize(size.size - threshold);
                messages.push(`budgets, maximum exceeded for ${size.label}. `
                    + `Budget ${stats_1.formatSize(threshold)} was exceeded by ${sizeDifference}.`);
            }
        }
    }
    calculate(budget) {
        let thresholds = {};
        if (budget.maximumWarning) {
            thresholds.maximumWarning = bundle_calculator_1.calculateBytes(budget.maximumWarning, budget.baseline, 'pos');
        }
        if (budget.maximumError) {
            thresholds.maximumError = bundle_calculator_1.calculateBytes(budget.maximumError, budget.baseline, 'pos');
        }
        if (budget.minimumWarning) {
            thresholds.minimumWarning = bundle_calculator_1.calculateBytes(budget.minimumWarning, budget.baseline, 'neg');
        }
        if (budget.minimumError) {
            thresholds.minimumError = bundle_calculator_1.calculateBytes(budget.minimumError, budget.baseline, 'neg');
        }
        if (budget.warning) {
            thresholds.warningLow = bundle_calculator_1.calculateBytes(budget.warning, budget.baseline, 'neg');
        }
        if (budget.warning) {
            thresholds.warningHigh = bundle_calculator_1.calculateBytes(budget.warning, budget.baseline, 'pos');
        }
        if (budget.error) {
            thresholds.errorLow = bundle_calculator_1.calculateBytes(budget.error, budget.baseline, 'neg');
        }
        if (budget.error) {
            thresholds.errorHigh = bundle_calculator_1.calculateBytes(budget.error, budget.baseline, 'pos');
        }
        return thresholds;
    }
}
exports.BundleBudgetPlugin = BundleBudgetPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWJ1ZGdldC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfd2VicGFjay9zcmMvYW5ndWxhci1jbGktZmlsZXMvcGx1Z2lucy9idW5kbGUtYnVkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQkFBaUI7QUFDakIsK0RBQStEOztBQUUvRDs7Ozs7O0dBTUc7QUFFSCxzRUFBOEY7QUFDOUYsOENBQWdEO0FBaUJoRDtJQUNFLFlBQW9CLE9BQWtDO1FBQWxDLFlBQU8sR0FBUCxPQUFPLENBQTJCO0lBQUksQ0FBQztJQUUzRCxLQUFLLENBQUMsUUFBYTtRQUNqQixNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUNqQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLFdBQWdCLEVBQUUsRUFBWSxFQUFFLEVBQUU7WUFDL0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxFQUFFLEVBQUUsQ0FBQztnQkFDTCxNQUFNLENBQUM7WUFDVCxDQUFDO1lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbkIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxDQUFDO29CQUNMLE1BQU07b0JBQ04sVUFBVTtvQkFDVixLQUFLLEVBQUUsa0NBQWMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDO2lCQUMzQyxDQUFDO1lBQ0osQ0FBQyxDQUFDO2lCQUNDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDckIsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQy9CLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFD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LGtDQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlFLENBQUM7UUFFRCxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTVGRCxnREE0RkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZVxuLy8gVE9ETzogY2xlYW51cCB0aGlzIGZpbGUsIGl0J3MgY29waWVkIGFzIGlzIGZyb20gQW5ndWxhciBDTEkuXG5cbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQnVkZ2V0LCBTaXplLCBjYWxjdWxhdGVCeXRlcywgY2FsY3VsYXRlU2l6ZXMgfSBmcm9tICcuLi91dGlsaXRpZXMvYnVuZGxlLWNhbGN1bGF0b3InO1xuaW1wb3J0IHsgZm9ybWF0U2l6ZSB9IGZyb20gJy4uL3V0aWxpdGllcy9zdGF0cyc7XG5cbmludGVyZmFjZSBUaHJlc2hvbGRzIHtcbiAgbWF4aW11bVdhcm5pbmc/OiBudW1iZXI7XG4gIG1heGltdW1FcnJvcj86IG51bWJlcjtcbiAgbWluaW11bVdhcm5pbmc/OiBudW1iZXI7XG4gIG1pbmltdW1FcnJvcj86IG51bWJlcjtcbiAgd2FybmluZ0xvdz86IG51bWJlcjtcbiAgd2FybmluZ0hpZ2g/OiBudW1iZXI7XG4gIGVycm9yTG93PzogbnVtYmVyO1xuICBlcnJvckhpZ2g/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlQnVkZ2V0UGx1Z2luT3B0aW9ucyB7XG4gIGJ1ZGdldHM6IEJ1ZGdldFtdO1xufVxuXG5leHBvcnQgY2xhc3MgQnVuZGxlQnVkZ2V0UGx1Z2luIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBvcHRpb25zOiBCdW5kbGVCdWRnZXRQbHVnaW5PcHRpb25zKSB7IH1cblxuICBhcHBseShjb21waWxlcjogYW55KTogdm9pZCB7XG4gICAgY29uc3QgeyBidWRnZXRzIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1lbWl0JywgKGNvbXBpbGF0aW9uOiBhbnksIGNiOiBGdW5jdGlvbikgPT4ge1xuICAgICAgaWYgKCFidWRnZXRzIHx8IGJ1ZGdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNiKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYnVkZ2V0cy5tYXAoYnVkZ2V0ID0+IHtcbiAgICAgICAgY29uc3QgdGhyZXNob2xkcyA9IHRoaXMuY2FsY3VsYXRlKGJ1ZGdldCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgYnVkZ2V0LFxuICAgICAgICAgIHRocmVzaG9sZHMsXG4gICAgICAgICAgc2l6ZXM6IGNhbGN1bGF0ZVNpemVzKGJ1ZGdldCwgY29tcGlsYXRpb24pXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgICAgICAuZm9yRWFjaChidWRnZXRDaGVjayA9PiB7XG4gICAgICAgICAgYnVkZ2V0Q2hlY2suc2l6ZXMuZm9yRWFjaChzaXplID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tNYXhpbXVtKGJ1ZGdldENoZWNrLnRocmVzaG9sZHMubWF4aW11bVdhcm5pbmcsIHNpemUsIGNvbXBpbGF0aW9uLndhcm5pbmdzKTtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tNYXhpbXVtKGJ1ZGdldENoZWNrLnRocmVzaG9sZHMubWF4aW11bUVycm9yLCBzaXplLCBjb21waWxhdGlvbi5lcnJvcnMpO1xuICAgICAgICAgICAgdGhpcy5jaGVja01pbmltdW0oYnVkZ2V0Q2hlY2sudGhyZXNob2xkcy5taW5pbXVtV2FybmluZywgc2l6ZSwgY29tcGlsYXRpb24ud2FybmluZ3MpO1xuICAgICAgICAgICAgdGhpcy5jaGVja01pbmltdW0oYnVkZ2V0Q2hlY2sudGhyZXNob2xkcy5taW5pbXVtRXJyb3IsIHNpemUsIGNvbXBpbGF0aW9uLmVycm9ycyk7XG4gICAgICAgICAgICB0aGlzLmNoZWNrTWluaW11bShidWRnZXRDaGVjay50aHJlc2hvbGRzLndhcm5pbmdMb3csIHNpemUsIGNvbXBpbGF0aW9uLndhcm5pbmdzKTtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tNYXhpbXVtKGJ1ZGdldENoZWNrLnRocmVzaG9sZHMud2FybmluZ0hpZ2gsIHNpemUsIGNvbXBpbGF0aW9uLndhcm5pbmdzKTtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tNaW5pbXVtKGJ1ZGdldENoZWNrLnRocmVzaG9sZHMuZXJyb3JMb3csIHNpemUsIGNvbXBpbGF0aW9uLmVycm9ycyk7XG4gICAgICAgICAgICB0aGlzLmNoZWNrTWF4aW11bShidWRnZXRDaGVjay50aHJlc2hvbGRzLmVycm9ySGlnaCwgc2l6ZSwgY29tcGlsYXRpb24uZXJyb3JzKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICB9KTtcbiAgICAgIGNiKCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrTWluaW11bSh0aHJlc2hvbGQ6IG51bWJlciB8IHVuZGVmaW5lZCwgc2l6ZTogU2l6ZSwgbWVzc2FnZXM6IGFueSkge1xuICAgIGlmICh0aHJlc2hvbGQpIHtcbiAgICAgIGlmICh0aHJlc2hvbGQgPiBzaXplLnNpemUpIHtcbiAgICAgICAgY29uc3Qgc2l6ZURpZmZlcmVuY2UgPSBmb3JtYXRTaXplKHRocmVzaG9sZCAtIHNpemUuc2l6ZSk7XG4gICAgICAgIG1lc3NhZ2VzLnB1c2goYGJ1ZGdldHMsIG1pbmltdW0gZXhjZWVkZWQgZm9yICR7c2l6ZS5sYWJlbH0uIGBcbiAgICAgICAgICArIGBCdWRnZXQgJHtmb3JtYXRTaXplKHRocmVzaG9sZCl9IHdhcyBub3QgcmVhY2hlZCBieSAke3NpemVEaWZmZXJlbmNlfS5gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNoZWNrTWF4aW11bSh0aHJlc2hvbGQ6IG51bWJlciB8IHVuZGVmaW5lZCwgc2l6ZTogU2l6ZSwgbWVzc2FnZXM6IGFueSkge1xuICAgIGlmICh0aHJlc2hvbGQpIHtcbiAgICAgIGlmICh0aHJlc2hvbGQgPCBzaXplLnNpemUpIHtcbiAgICAgICAgY29uc3Qgc2l6ZURpZmZlcmVuY2UgPSBmb3JtYXRTaXplKHNpemUuc2l6ZSAtIHRocmVzaG9sZCk7XG4gICAgICAgIG1lc3NhZ2VzLnB1c2goYGJ1ZGdldHMsIG1heGltdW0gZXhjZWVkZWQgZm9yICR7c2l6ZS5sYWJlbH0uIGBcbiAgICAgICAgICArIGBCdWRnZXQgJHtmb3JtYXRTaXplKHRocmVzaG9sZCl9IHdhcyBleGNlZWRlZCBieSAke3NpemVEaWZmZXJlbmNlfS5gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNhbGN1bGF0ZShidWRnZXQ6IEJ1ZGdldCk6IFRocmVzaG9sZHMge1xuICAgIGxldCB0aHJlc2hvbGRzOiBUaHJlc2hvbGRzID0ge307XG4gICAgaWYgKGJ1ZGdldC5tYXhpbXVtV2FybmluZykge1xuICAgICAgdGhyZXNob2xkcy5tYXhpbXVtV2FybmluZyA9IGNhbGN1bGF0ZUJ5dGVzKGJ1ZGdldC5tYXhpbXVtV2FybmluZywgYnVkZ2V0LmJhc2VsaW5lLCAncG9zJyk7XG4gICAgfVxuXG4gICAgaWYgKGJ1ZGdldC5tYXhpbXVtRXJyb3IpIHtcbiAgICAgIHRocmVzaG9sZHMubWF4aW11bUVycm9yID0gY2FsY3VsYXRlQnl0ZXMoYnVkZ2V0Lm1heGltdW1FcnJvciwgYnVkZ2V0LmJhc2VsaW5lLCAncG9zJyk7XG4gICAgfVxuXG4gICAgaWYgKGJ1ZGdldC5taW5pbXVtV2FybmluZykge1xuICAgICAgdGhyZXNob2xkcy5taW5pbXVtV2FybmluZyA9IGNhbGN1bGF0ZUJ5dGVzKGJ1ZGdldC5taW5pbXVtV2FybmluZywgYnVkZ2V0LmJhc2VsaW5lLCAnbmVnJyk7XG4gICAgfVxuXG4gICAgaWYgKGJ1ZGdldC5taW5pbXVtRXJyb3IpIHtcbiAgICAgIHRocmVzaG9sZHMubWluaW11bUVycm9yID0gY2FsY3VsYXRlQnl0ZXMoYnVkZ2V0Lm1pbmltdW1FcnJvciwgYnVkZ2V0LmJhc2VsaW5lLCAnbmVnJyk7XG4gICAgfVxuXG4gICAgaWYgKGJ1ZGdldC53YXJuaW5nKSB7XG4gICAgICB0aHJlc2hvbGRzLndhcm5pbmdMb3cgPSBjYWxjdWxhdGVCeXRlcyhidWRnZXQud2FybmluZywgYnVkZ2V0LmJhc2VsaW5lLCAnbmVnJyk7XG4gICAgfVxuXG4gICAgaWYgKGJ1ZGdldC53YXJuaW5nKSB7XG4gICAgICB0aHJlc2hvbGRzLndhcm5pbmdIaWdoID0gY2FsY3VsYXRlQnl0ZXMoYnVkZ2V0Lndhcm5pbmcsIGJ1ZGdldC5iYXNlbGluZSwgJ3BvcycpO1xuICAgIH1cblxuICAgIGlmIChidWRnZXQuZXJyb3IpIHtcbiAgICAgIHRocmVzaG9sZHMuZXJyb3JMb3cgPSBjYWxjdWxhdGVCeXRlcyhidWRnZXQuZXJyb3IsIGJ1ZGdldC5iYXNlbGluZSwgJ25lZycpO1xuICAgIH1cblxuICAgIGlmIChidWRnZXQuZXJyb3IpIHtcbiAgICAgIHRocmVzaG9sZHMuZXJyb3JIaWdoID0gY2FsY3VsYXRlQnl0ZXMoYnVkZ2V0LmVycm9yLCBidWRnZXQuYmFzZWxpbmUsICdwb3MnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhyZXNob2xkcztcbiAgfVxufVxuIl19