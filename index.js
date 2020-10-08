const fs = require('fs')
const cities = require('cities-with-1000')
const lines = fs.readFileSync(cities.file, 'utf8').split('\n')

const locations = ['Chirundu', 'Chiredzi', 'Esigodini']
const table = {}

for (const city of lines) {
  const fields = city.split('\t')
  const [name, lat, long] = [fields[1], fields[4], fields[5]]
  if (locations.includes(name)) {
    table[name] = {lat, long}
  }
}

console.log(lines.length, table)
