const {Worker, isMainThread, parentPort, workerData} = require('worker_threads')

function partSum (min, max) {
  return new Worker(__filename, {workerData: {min: min + 1, max: Math.min(max, min + 100)}})
}

function computeAverage (sum, items) {
  return sum / items
}

function realSum (min, max) {
  return (max - min + 1) * (max + min) / 2
}

if (isMainThread) {
  if (process.argv.length < 3) {
    throw new Error('Usage: brokencode.js <min> <max>')
  }

  let min = parseInt(process.argv[2])
  const max = parseInt(process.argv[3])

  if (min >= max) {
    throw new Error('Min must be less than max')
  }

  const threads = new Set()

  const originalMin = min

  while (min < max) {
    threads.add(partSum(min, max))
    min += 100
  }

  let totalSum = originalMin

  for (const worker of threads) {
    worker.on('message', (msg) => {
      totalSum += msg
    })
    worker.on('exit', (msg) => {
      threads.delete(worker)
      if (threads.size === 0) {
        console.log(`The sum of the numbers from ${originalMin} to ${max} is ${totalSum}`)
        console.log('The average value is: ' + computeAverage(totalSum, max - originalMin))
        console.log(`Calculated sum using formula is: ${realSum(originalMin, max)}`)
      }
    })
  }
} else {
  let sum = 0
  for (let i = workerData.min; i <= workerData.max; i += 1) {
    sum += i
  }

  parentPort.postMessage(sum)
}
