const fs = require('fs')
const cities = require('cities-with-1000')
const lines = fs.readFileSync(cities.file, 'utf8').split('\n')

const locations = ['London', 'Barcelona', 'Paris', 'Berlin', 'Amsterdam', 'Milan', 'Tokyo', 'Seoul', 'Beijing', 'Toronto']
const table = {}

for (const city of lines) {
  const fields = city.split('\t')
  const [name, lat, long] = [fields[1], parseFloat(fields[4]), parseFloat(fields[5])]
  // console.log(id, name, lat, long)
  if (locations.includes(name)) {
    table[name] = {lat, long}
  }
}

// Haversine distance https://rosettacode.org/wiki/Haversine_formula#ES6
// TODO: Check why Berlin - Toronto so small
const distance = (city1, city2) => {
  // Math lib function names
  const [pi, asin, sin, cos, sqrt, pow, round] = [
    'PI', 'asin', 'sin', 'cos', 'sqrt', 'pow', 'round'
  ]
    .map((k) => Math[k])

  // degrees as radians
  const [rlat1, rlat2, rlon1, rlon2] = [
    city1.lat, city2.lat, city1.long, city2.long
  ].map((x) => x / 180 * pi)

  const dLat = rlat2 - rlat1
  const dLon = rlon2 - rlon1
  const radius = 6372.8 // km

  // km
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

const getOptimalMeetingPoint = () => {
  for (const host of locations) {
    table[host].distance = 0
    for (const guest of locations) {
      if (guest !== host) {
        const d = distance(table[host], table[guest])
        console.log(d, host, guest)
        table[host].distance += distance(table[host], table[guest])
      }
    }
  }
  console.log(table)
}

console.log(lines.length, table)
getOptimalMeetingPoint()
