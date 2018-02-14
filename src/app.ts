import * as fs from "fs";
import * as program from "commander";
import * as path from "path";
import * as os from "os";
import ProcessManager from "./ProcessManager";

const pkg = require("../package.json");

program.version(pkg.version);

program
    .command("start <benchmarkDefineFile>")
    .option("-w, --worker <worker>", "worker num")
    .option("-r, --reportPlugin <reportPlugin>", "report plugin")
    .option("-o, --output <outputReportPath>", "output report path")
    .option("-s, --slaves <slaves>", "slave address, host[:port][,host[:port]]...")
    .action(async (benchmarkDefineFile, options) => {
        const workerNum = options.worker == null ? os.cpus().length : Number(options.worker);
        const outputReportPath = options.outputReportPath;
        const slaves = options.slaves ? options.slaves.split(",") : [];
        const resolvedBenchmarkDefineFile = path.resolve(process.cwd(), benchmarkDefineFile);
        const processManager = new ProcessManager(pkg.version, resolvedBenchmarkDefineFile, workerNum);
        try {
            await processManager.runAsMaster(slaves);
            process.exit(0);
        } catch(e) {
            console.error(e);
            process.exit(1);
        }
    })

program
    .command("slave <benchmarkDefineFile>")
    .option("-w, --worker <worker>", "worker num")
    .option("-p, --port <port>", "listening port, defaults to 8080")
    .action(async (benchmarkDefineFile, options) => {
        const workerNum = options.worker == null ? os.cpus().length : Number(options.worker);
        const resolvedBenchmarkDefineFile = path.resolve(process.cwd(), benchmarkDefineFile);
        const processManager = new ProcessManager(pkg.version, resolvedBenchmarkDefineFile, workerNum);
        try {
            await processManager.runAsSlave(options.port ? Number(options.port) : undefined);
            process.exit(0);
        } catch(e) {
            console.error(e);
            process.exit(1);
        }
    })

program.parse(process.argv);
