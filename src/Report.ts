import {BenchmarkConfig, BenchmarkTestResult, BenchmarkTestEndState} from "./Benchmark";
import MathUtils from "./MathUtils";

export interface BenchmarkInfo {
    title: string;
    description: string;
    measurementInterval: number;
    duration: number;
    concurrentRequestNum: number;
    assignedWorkerNum: number;
    startedAt: Date;
    finishedAt: Date;
}

export interface Result {
    requests: number;
    durationMs: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    medianMs: number;
    rps: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    errorRate: number;
    errors: string[];
}

export type GroupResult = Result & {group: string};

export interface Stats {
    total: Result;
    groups: GroupResult[];
}

export interface AggregateResult {
    testCount: number;
    stats: Stats;
}

export interface SerializedReport {
    benchmarkConfig: BenchmarkConfig;
    startedAt: Date;
    finishedAt: Date;
    assignedWorkerNum: number;
    testResults: BenchmarkTestResult[];
    stats: Stats;
}

export class Aggregator {
    results: BenchmarkTestResult[];
    constructor() {
        this.results = [];
    }
    addResults(results: BenchmarkTestResult[]): void {
        this.results = this.results.concat(results);
    }

    aggregate(duration: number, offset?: number, limit?: number): AggregateResult {
        const targets = offset ? this.results.slice(offset, limit ? offset + limit : this.results.length) : this.results;
        return {
            testCount: targets.length,
            stats: {
                groups: this.createGroupResult(targets, duration),
                total: this.createResult(targets, duration)
            }
        }
    }
    private createResult(results: BenchmarkTestResult[], duration: number): Result {
        let successCount = 0;
        const d: number[] = [];
        const errors: string[] = [];
        for(let i = 0; i < results.length; i++) {
            const t = results[i];
            if (t.endState === BenchmarkTestEndState.Success) {
                successCount++;
            } else {
                errors.push(t.errorResult);
            }
            d.push(t.duration);
        }
        const rps = parseFloat((results.length / (duration / 1000)).toFixed(2));
        return {
            durationMs: duration,
            requests: results.length,
            avgMs: parseFloat(MathUtils.average(d).toFixed(2)),
            maxMs: parseFloat(MathUtils.max(d).toFixed(2)),
            minMs: parseFloat(MathUtils.min(d).toFixed(2)),
            medianMs: parseFloat(MathUtils.median(d).toFixed(2)),
            rps,
            successCount,
            errorCount: errors.length,
            successRate: parseFloat(((successCount / results.length) * 100).toFixed(2)),
            errorRate: parseFloat(((errors.length / results.length) * 100).toFixed(2)),
            errors
        };
    }
    private createGroupResult(results: BenchmarkTestResult[], duration: number): GroupResult[] {
        const groupResults: {[group: string]: BenchmarkTestResult[]} = {};
        results.forEach(r => {
            if (!groupResults[r.group]) {
                groupResults[r.group] = [];
            }
            groupResults[r.group].push(r);
        });
        return Object.keys(groupResults).map(group => {
            return Object.assign(this.createResult(groupResults[group], duration), {group});
        });
    }
}

export default class Report {
    private config: BenchmarkConfig;
    private aggregator: Aggregator;
    private startedAt: Date;
    private finishedAt: Date;
    private assignedWorkerNum: number;
    constructor(benchmarkConfig: BenchmarkConfig, aggregator: Aggregator, startedAt: Date, finishedAt: Date, assignedWorkerNum: number) {
        this.config = benchmarkConfig;
        this.aggregator = aggregator;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.assignedWorkerNum = assignedWorkerNum;
    }
    serialize(): SerializedReport {
        const aggResult = this.aggregator.aggregate(this.finishedAt.getTime() - this.startedAt.getTime());
        return {
            benchmarkConfig: this.config,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt,
            assignedWorkerNum: this.assignedWorkerNum,
            testResults: this.aggregator.results,
            stats: aggResult.stats
        };
    }
}
