export const measureTime = async (name: string, fn: () => Promise<void>) => {
    const start = new Date().getTime()
    await fn()
    const end = new Date().getTime()
    const seconds = (end - start) / 1000
    console.log(`${name} took ${seconds}s`)
}