export const measureTime = async (name: string, fn: () => Promise<void>, times: number = 1) => {
    let fastestTime = Infinity;

    for (let i = 0; i < times; i++) {
        const start = new Date().getTime();
        await fn();
        const end = new Date().getTime();
        const seconds = (end - start) / 1000;

        if (seconds < fastestTime) {
            fastestTime = seconds;
        }
    }

    console.log(`${name} fastest execution took ${fastestTime}s`);
};