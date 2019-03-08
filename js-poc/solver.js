'use strict'

/* eslint-disable guard-for-in */
/* eslint-disable max-depth */

const fetch = require('node-fetch')
const yaml = require('js-yaml')

const fs = require('fs')
const path = require('path')

const { URLSearchParams } = require('url')
const tough = require('tough-cookie')

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

  params.headers.Cookie = jar.getCookiesSync(url).join('; ')

  if (formdata) {
    params.body = new URLSearchParams(formdata)
  }

  if (jsondata) {
    params.body = JSON.stringify(jsondata)
    params.headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, params)

  const newCookies = res.headers.raw()['set-cookie'] || []
  newCookies.forEach(cookieStr => {
    jar.setCookieSync(cookieStr, url)
  })

  return turnResponseIntoData(params, res)
}

function generateShared () {
  return {
    jar: new tough.CookieJar()
  }
}

function compareCondition (variables, condition) {
  for (const key in condition) {
    if (!matcher(variables, key, condition[key])) {
      return false
    }
  }

  return true
}

function replaceVar (vars, str) {
  str.replace(/\${([a-z][a-z0-9.]+)}/gmi, (_, varName) => {
    varName = varName.toLowerCase()
    return String(dlv(vars, varName))
  })
}

function replaceVars (vars, obj) {
  const out = {}

  for (const key in obj) { // eslint-disable-line guard-for-in
    if (obj[key] instanceof Object && !Array.isArray(obj[key]) && typeof obj[key] === 'object') { // recursion
      out[key] = replaceVars(vars, obj[key])
    } else if (typeof out[key] === 'string') {
      out[key] = replaceVar(vars, obj[key])
    } else {
      out[key] = obj[key]
    }
  }

  return out
}

async function loadPortals (portalDirectory) {
  return fs.readdirSync(portalDirectory).map(file => {
    let fullPath = path.join(portalDirectory, file)
    let out = yaml.safeLoad(String(fs.readFileSync(fullPath)))
    out.id = file.split('.')[0]

    return out
  })
}

async function main (kickoffParameters, configStore, portalDirectory) {
  const shared = generateShared()
  const Portals = await loadPortals(portalDirectory)

  const firstRes = await doRequest(shared, kickoffParameters)

  const selectedPortal = Portals.filter(portal => compareCondition(firstRes, portal.solution.main.match))[0]
  shared.config = configStore.get(selectedPortal.id)

  let ops = selectedPortal.solution
  let op = ops.main
  let vars = firstRes
  vars.config = shared.config

  while (true) {
    if (op.respond) {
      vars = await doRequest(shared, replaceVars(vars, op.respond))
      vars.config = shared.config
      if (op.continueTo) {
        op = ops[op.continueTo]
      } else {
        for (const subOpId in ops) {
          const subOp = ops[subOpId]
          if (compareCondition(vars, subOp.match)) {
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
          throw new Error('Success')
        }
        case 'continueMatch': {
          for (const subOpId in ops) {
            const subOp = ops[subOpId]
            if (compareCondition(vars, subOp.match)) {
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

module.exports = main
