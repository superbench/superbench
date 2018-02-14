import * as crypto from "crypto";
import * as cluster from "cluster";
import * as fs from "fs";
import {Benchmark, BenchmarkDefine, getBenchmarkDefine} from "./Benchmark";
import MasterRunner, {SlaveServerAddess} from "./MasterRunner";
import SlaveRunner from "./SlaveRunner";
import WorkerProcess from "./WorkerProcess";
import ConsoleView from "./ConsoleView";
import ValidationInfo from "./ValidationInfo";

export default class ProcessManager {
    private processNum: number;
    private benchmarkDefineFile: string;
    private benchmarkDefine: BenchmarkDefine;
    private validationInfo: ValidationInfo;
    constructor(appVersion: string, benchmarkDefineFile: string, processNum: number) {
        this.processNum = processNum
        require(benchmarkDefineFile);
        const define = getBenchmarkDefine();
        if (!define) {
            throw new Error("Benchmark is missing");
        }
        this.benchmarkDefineFile = benchmarkDefineFile;
        this.benchmarkDefine = define;
        const benchmarkDefineText = fs.readFileSync(benchmarkDefineFile, "utf8");
        this.validationInfo = {
            appVersion,
            benchmarkDefineFileHash: crypto.createHash("sha256").update(benchmarkDefineText).digest("hex")
        };
    }

    async runAsMaster(slaves: SlaveServerAddess[]): Promise<void> {
        if (cluster.isMaster) {
            const clusterWorkers = await this.forkClusterWorkers();
            const masterRunner = new MasterRunner({
                clusterWorkers,
                benchmarkDefine: this.benchmarkDefine,
                slaves,
                consoleView: new ConsoleView(this.benchmarkDefineFile, this.benchmarkDefine.config),
                validationInfo: this.validationInfo
            });
            await masterRunner.start();
        } else {
            const workerProcess = new WorkerProcess(this.benchmarkDefine);
            await workerProcess.run();
        }
    }

    async runAsSlave(port?: number): Promise<void> {
        if (cluster.isMaster) {
            const clusterWorkers = await this.forkClusterWorkers();
            const slaveRunner = new SlaveRunner({
                clusterWorkers,
                benchmarkDefine: this.benchmarkDefine,
                port,
                validationInfo: this.validationInfo
            });
            await slaveRunner.start();
        } else {
            const workerProcess = new WorkerProcess(this.benchmarkDefine);
            await workerProcess.run();
        }
    }

    private forkClusterWorkers(): Promise<cluster.Worker[]> {
        if (!this.processNum) {
            return Promise.resolve([]);
        }
        return new Promise<cluster.Worker[]>(resolve => {
            const clusterWorkers: cluster.Worker[] = [];
            for (let i = 0; i < this.processNum; i++) {
                const worker = cluster.fork().once("online", () => {
                    clusterWorkers.push(worker);
                    if (clusterWorkers.length === this.processNum) {
                        resolve(clusterWorkers);
                    }
                });
            }
        });
    }
}
