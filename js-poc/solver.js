'use strict'

const fetch = require('node-fetch')
const yaml = require('js-yaml')
const fs = require('fs')

const dlv = require('dlv')
const dset = require('dset')

const Matchers = {
  is: (value, matchWith) => String(value) === matchWith, // (true => "true") === true
  equals: (value, matchWith) => value === matchWith, // YAML coerces "key: 2" into {key:2} automatically
  matches: (value, matchWith) => {
    let [regex, flags] = matchWith.match(/^\/(.+)\/([a-z]*)/i)
    let regexp = new RegExp(regex, flags)
    return Boolean(value.matches(regexp))
  }
}

function matcher (variables, key, matchWith) {
  key = key.split('.')
  let matchType = key.pop()
  let value = dlv(variables, key)
  return Matchers[matchType](value, matchWith)
}
