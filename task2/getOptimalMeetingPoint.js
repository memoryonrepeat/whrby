const {Worker, isMainThread, parentPort, workerData} = require('worker_threads')

// Calculate distance using Haversine formula https://en.wikipedia.org/wiki/Haversine_formula
// I'm borrowing the implementation from https://rosettacode.org/wiki/Haversine_formula#ES6
const distance = (city1, city2, coordinates) => {
  // Math lib function names
  const [pi, asin, sin, cos, sqrt, pow, round] = [
    'PI', 'asin', 'sin', 'cos', 'sqrt', 'pow', 'round'
  ]
    .map((k) => Math[k])

  // degrees as radians
  const [rlat1, rlat2, rlon1, rlon2] = [
    coordinates[city1].lat,
    coordinates[city2].lat,
    coordinates[city1].long,
    coordinates[city2].long
  ].map((x) => x / 180 * pi)

  const dLat = rlat2 - rlat1
  const dLon = rlon2 - rlon1
  const radius = 6372.8 // km

  return round(
    radius * 2 * asin(
      sqrt(
        pow(sin(dLat / 2), 2) +
        pow(sin(dLon / 2), 2) *
        cos(rlat1) * cos(rlat2)
      )
    ) * 100
  ) / 100
}

// Get total distance from a city to the rest of the input
const getTotalDistanceFrom = (host, coordinates) => Object.keys(coordinates).reduce(
  (acc, curr) => (curr !== host ? acc + distance(host, curr, coordinates) : acc), 0
)

const coordinates = {}

// This task can easily be solved using a single thread with naive brute force in O(N^2) time complexity
// With small input that's not a problem, but it might be slow for big input
// And since we already mentioned threads in the first task, I think using threads again here is a good way
// to reduce time complexity.
if (isMainThread) {
  if (process.argv.length > 12) {
    throw new Error('Max 10 cities are allowed')
  }

  if (process.argv.length < 3) {
    throw new Error('At least 1 city is needed')
  }

  // Decide the number of threads to use at the beginning
  const totalThreads = 5
  const threads = new Set()

  // Use a load balancer array to distribute the tasks evenly
  // This is an array of city arrays, each sub-array is fed to worker as input
  const loadBalancer = Array.from(Array(totalThreads), () => [])

  const locations = process.argv.slice(2).map((arg) => arg.toLowerCase())

  const fs = require('fs')
  const cities = require('cities-with-1000')
  const lines = fs.readFileSync(cities.file, 'utf8').split('\n')

  let current = 0

  for (const line of lines) {
    const fields = line.split('\t')

    // validate if valid entry
    if (fields.length === cities.fields.length) {
      const [city, lat, long] = [
        fields[1].toLowerCase(),
        parseFloat(fields[4]),
        parseFloat(fields[5])
      ]

      // there are duplicates in dataset -> only take first entry to simplify
      if (locations.includes(city) && !coordinates[city]) {
        coordinates[city] = {lat, long}
        loadBalancer[current].push(city)

        // Assign tasks to the load balancer in a round-robin manner
        current = (current + 1) % totalThreads
      }
    }
  }

  loadBalancer.map((cities) => {
    if (cities.length > 0) {
      threads.add(new Worker(__filename, {workerData: {cities, coordinates}}))
    }
  })

  let minDistance = Number.MAX_VALUE
  let globalOptima

  for (const worker of threads) {
    worker.on('message', (msg) => {
      if (msg.distance < minDistance) {
        minDistance = msg.distance
        globalOptima = msg.city
      }
    })
    worker.on('exit', (msg) => {
      threads.delete(worker)
      if (threads.size === 0) {
        console.log(`Optimal meeting point: ${globalOptima}`)
        console.log(`Total distance (in km): ${minDistance.toFixed(3)}`)
        console.log(`Total travel time (velocity 60km/h): ${(minDistance / 60).toFixed(3)}`)

        // Formula from https://ecoscore.be/en/info/ecoscore/co2
        console.log(`Total carbon emission in kg: ${(minDistance / 100 * 0.12).toFixed(3)}`)
      }
    })
  }
} else {
  // Worker takes in a list of cities and outputs the one from them that
  // has smallest total distance.
  // In other words, the worker outputs the local optima so that the main thread
  // can compare and output the global optima.
  let minDistance = Number.MAX_VALUE

  const localOptima = workerData.cities.reduce((acc, curr) => {
    const currentDistance = getTotalDistanceFrom(curr, workerData.coordinates)
    if (currentDistance < minDistance) {
      minDistance = currentDistance
      acc.distance = currentDistance
      acc.city = curr

      return acc
    }
  }, {distance: minDistance})

  parentPort.postMessage(localOptima)
}
