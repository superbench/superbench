const defineBenchmark = require("../lib").default;

async function wait(ms) {
    var s = Date.now();
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

defineBenchmark({
    title: "no test",
    description: "test object is not created",
    concurrentRequestNum: 1,
    measurementInterval: 10,
    duration: 60
}, async benchmark => {
    while (benchmark.running) {
        await wait(1000);
    }
});
