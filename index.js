const {Worker, isMainThread, parentPort, workerData} = require('worker_threads')

// Haversine distance https://rosettacode.org/wiki/Haversine_formula#ES6
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

  // km
  console.log(city1, city2, round(
    radius * 2 * asin(
      sqrt(
        pow(sin(dLat / 2), 2) +
        pow(sin(dLon / 2), 2) *
        cos(rlat1) * cos(rlat2)
      )
    ) * 100
  ) / 100)

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

const getTotalDistanceFrom = (host, coordinates) => Object.keys(coordinates).reduce(
  (acc, curr) => (curr !== host ? acc + distance(host, curr, coordinates) : acc), 0
)

const coordinates = {}

if (isMainThread) {
  if (process.argv.length > 12) {
    throw new Error('Max 10 cities are allowed')
  }

  if (process.argv.length < 3) {
    throw new Error('At least 1 city is needed')
  }

  const totalThreads = 5
  const threads = new Set()
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
        console.log(`Total distance (in km): ${minDistance}`)
        console.log(`Total travel time (velocity 60km/h): ${minDistance / 60}`)
        // https://ecoscore.be/en/info/ecoscore/co2
        console.log(`Total carbon emission in kg: ${minDistance / 100 * 0.12}`)
      }
    })
  }
} else {
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
