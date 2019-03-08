'use strict'

const solver = require('./solver')
const path = require('path')

async function main () {
  const configStore = () => {
    const data = {
      'fake-portal': {
        user: 'theoneandonly',
        pass: 'useraccount'
      }
    }

    return {
      get: key => data[key]
    }
  }

  return solver({
    url: 'http://detectportal.localhost:6346'
  }, configStore(), path.join(__dirname, 'portals'))
}

main().then(console.log, console.error)
