'use strict'

const solver = require('./solver')
const path = require('path')

async function main () {
  return solver({
    url: 'http://detectportal.localhost:6346'
  }, configStore, path.join(__dirname, 'portals'))
}
