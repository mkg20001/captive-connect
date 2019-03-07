'use strict'

const fetch = require('node-fetch')
const yaml = require('js-yaml')
const fs = require('fs')
const { URLSearchParams } = require('url')

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

const templateParams = {
  header: {
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:63.0) Gecko/20100101 Firefox/63.0'
  }
}

async function turnResponseIntoData (params, res) {
  let rawHeaders = res.headers.raw()
  for (const k in rawHeaders) { // eslinr-disable-line guard-for-in
    rawHeaders[k] = rawHeaders[k][0]
  }

  return {
    url: res.url,
    // TODO: query,
    header: rawHeaders,
    redirect: res.status >= 300 && res.status < 400,
    status: res.status,
    method: params.method
  }
}

const kickoffParameters = {
  url: 'http://detectportal.firefox.com'
}

async function doRequest ({jar}, {url, method, setCookie, clearCookie, formdata, jsondata, header}) {
  let params = clone(templateParams)

  params.url = url

  params.method = method || 'GET'

  for (const cookie in setCookie) {
    // TODO: jar.set(cookie, setCookie[cookie])
  }

  if (clearCookie) {
    clearCookie.forEach(cookie => {
      // TODO: jar.delete(cookie)
    })
  }

  // TODO: params.headers.Cookie = jar.getCookieForURL(url)

  if (formdata) {
    params.body = new URLSearchParams(formdata)
  }

  if (jsondata) {
    params.body = JSON.stringify(jsondata)
    params.headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, params)

  return turnResponseIntoData(params, res)
}

function generateShared () {
  // TODO: jar
  return {}
}

function compareCondition (variables, condition) {
  for (const key in condition) {
    if (!matcher(variables, key, condition[key])) {
      return false
    }
  }

  return true
}

async function main () {
  const shared = generateShared()
  const firstRes = await doRequest(shared, kickoffParameters)

  // TODO: load config
  const selectedPortal = Portals.filter(portal => compareCondition(firstRes, portal.solution.main.match))[0]

  let ops = selectedPortal.solution
  let op = ops.main
  let res = firstRes

  while (true) {
    if (op.respond) {
      res = await doRequest(shared, op.respond)
      if (op.continueTo) {
        op = ops[op.continueTo]
      } else {
        for (const subOpId in ops) {
          const subOp = ops[subOpId]
          if (compareCondition(res, subOp.match)) {
            op = subOp
            break
          }
        }
      }
    } else if (op.action) {
      switch (op.action) {
        case 'failure': {
          throw new Error('General Failure')
        }
        case 'invalidCredentials': {
          throw new Error('Invalid credentials supplied by user')
        }
        case 'success': {
          // TODO: bail
        }
        case 'continueMatch': {
          for (const subOpId in ops) {
            const subOp = ops[subOpId]
            if (compareCondition(res, subOp.match)) {
              op = subOp
              break
            }
          }
          break
        }
        default: throw new TypeError(op.action)
      }
    }
  }
}
