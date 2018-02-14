import {BenchmarkDefine, BenchmarkConfig} from "./Benchmark";
import {Stats, SerializedReport} from "./Report";

function padEnd(text: string|number, padding: number): string {
    return ("" + text).padEnd(padding, " ");
}

const VIEW_WIDTH = 82;
const ERROR_MAX = 5;

export default class ConsoleView {
    private benchmarkDefineFile: string;
    private benchmarkConfig: BenchmarkConfig;
    private firstProgress: boolean;
    constructor(benchmarkDefineFile: string, benchmarkConfig: BenchmarkConfig) {
        this.benchmarkDefineFile = benchmarkDefineFile;
        this.benchmarkConfig = benchmarkConfig;
        this.firstProgress = true;
    }
    private showBorder() {
        let border: string = "";
        for (let i = 0; i < VIEW_WIDTH; i++) {
            border += "=";
        }
        console.log(border);
    }
    private showTitle(title: string) {
        let titleLine: string = "";
        const titleLength = title.length + 4;
        const space = VIEW_WIDTH - titleLength;
        if (space % 2 === 0) {
            for (let i = 0; i < space; i++) {
                titleLine += " ";
                if (i === space / 2) {
                    titleLine += `[ ${title} ]`;
                }
            }
        } else {
            for (let i = 0; i < space; i++) {
                titleLine += " ";
                if (i === Math.floor(space / 2) + 1) {
                    titleLine += `[ ${title} ]`;
                }
            }
        }
        console.log(titleLine);
    }
    showBenchmarkInfo() {
        this.showBorder();
        console.log(`title: ${this.benchmarkConfig.title}`);
        console.log(`description: ${this.benchmarkConfig.description}`);
        console.log(`benchmark define file: ${this.benchmarkDefineFile}`);
        console.log(`duration(sec): ${this.benchmarkConfig.duration}`);
        console.log(`measurement interval(sec): ${this.benchmarkConfig.measurementInterval}`);
        this.showBorder();
    }
    showProgress(elapsed: number, stats: Stats) {
        if (this.firstProgress) {
            this.showTitle("Progress");
            console.log([padEnd("elapsed", 10),
                         padEnd("req", 10),
                         padEnd("rps", 10),
                         padEnd("avg", 10),
                         padEnd("min", 10),
                         padEnd("max", 10),
                         padEnd("median", 10),
                         "error(%)"].join(""));
            this.firstProgress = false;
        }
        const elapsedText = `${elapsed}s`;
        const result = stats.total;
        const line = [
            padEnd(elapsedText, 10),
            padEnd(result.requests, 10),
            padEnd(result.rps, 10),
            padEnd(result.avgMs + "ms", 10),
            padEnd(result.minMs + "ms", 10),
            padEnd(result.maxMs + "ms", 10),
            padEnd(result.medianMs + "ms", 10),
            `${result.errorCount}(${result.errorRate})`
        ];
        console.log(line.join(""));
    }
    showResults(report: SerializedReport) {
        this.showBorder();
        this.showTitle("Group Result");
        console.log([padEnd("group", 20),
                     padEnd("req", 10),
                     padEnd("avg", 10),
                     padEnd("min", 10),
                     padEnd("max", 10),
                     padEnd("median", 10),
                     "error(%)"].join(""));
        report.stats.groups.forEach(gr => {
            const line = [
                padEnd(gr.group, 20),
                padEnd(gr.requests, 10),
                padEnd(gr.avgMs + "ms", 10),
                padEnd(gr.minMs + "ms", 10),
                padEnd(gr.maxMs + "ms", 10),
                padEnd(gr.medianMs + "ms", 10),
                `${gr.errorCount}(${gr.errorRate})`
            ];
            console.log(line.join(""));
        });
        this.showBorder();
        this.showTitle("Errors");
        const errors = report.stats.total.errors;
        if (errors.length) {
            console.log(`${errors.length} errors are found.`);
            for (let i = 0; i < ERROR_MAX; i++) {
                if (errors[i] === undefined) {
                    break;
                }
                console.log(errors[i]);
            }
        } else {
            console.log("No errors are found.");
        }
        this.showBorder();
        this.showTitle("Global Result");
        console.log([
            [padEnd("started", 20), report.startedAt].join(""),
            [padEnd("finished", 20), report.finishedAt].join(""),
            [padEnd("worker", 20), report.assignedWorkerNum].join(""),
            [padEnd("duration", 20), report.stats.total.durationMs + "ms"].join(""),
            [padEnd("requests", 20), report.stats.total.requests].join(""),
            [padEnd("rps", 20), report.stats.total.rps].join(""),
            [padEnd("avg", 20), report.stats.total.avgMs + "ms"].join(""),
            [padEnd("min", 20), report.stats.total.minMs + "ms"].join(""),
            [padEnd("max", 20), report.stats.total.maxMs + "ms"].join(""),
            [padEnd("median", 20), report.stats.total.medianMs + "ms"].join(""),
            [padEnd("success(%)", 20), `${report.stats.total.successCount}(${report.stats.total.successRate})`].join(""),
            [padEnd("error(%)", 20), `${report.stats.total.errorCount}(${report.stats.total.errorRate})`].join("")].join("\n"));
    }
}
