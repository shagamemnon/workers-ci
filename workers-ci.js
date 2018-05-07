const setup = require('./setup')
const fs = require('fs')
const request = require('request-promise-native')

// Create headers object to send with API calls to Cloudflare
const hdrs = (contentType = 'application/json') => {
  return {
    'X-Auth-Key': setup.apiKey,
    'X-Auth-Email': setup.email,
    'Content-Type': contentType
  }
}

// Retrieve the zoneID for your master zone
const zoneID = (function (zID) {
  const options = {
    uri: 'https://api.cloudflare.com/client/v4/zones',
    headers: hdrs(),
    json: true
  }

  return request.get(options).then(response => {
    let i = 0
    while (i < response.result.length) {
      if (response.result[i].name === setup.masterZoneName) {
        zID = response.result[i].id
        console.log(`Zone ID retrieved: ${zID}`)
        return zID
      }
      i++
    }
  }).catch(err => { return console.log(err) })
})('')

const apiResponse = (json, log) => {
  const isError = (err) => {
    let msg = []
    JSON.parse(JSON.stringify(err.error), (key, value) => {
      key === 'code' || key === 'message' ? msg.push(value) : msg
    })
    return console.log(`API Error ${msg[0]} - ${msg[1]}`)
  }

  switch (true) {
    case log === 'error':
      return isError(json)

    case json.success:
      return console.log(`${log} ${json.result.id}`)

    case Array.isArray(json.errors):
      return console.log(`API error ${json.errors[0].code} – ${json.errors[0].message}`)

    case json.error === 'not_found':
      return console.log('API error 1000 – request did not match a Cloudflare API endpoint')

    default:
      return console.log(json, log)
  }
}

// Helper for setting options on requests to Cloudflare API
const api = ({ endpoint = '', headers = hdrs(), json = true, body = undefined, options = {} }) => {
  return Promise.resolve(zoneID).then(zoneID => {
    options = {
      'headers': headers,
      'json': json,
      'uri': `https://api.cloudflare.com/client/v4/zones/${zoneID}/workers/${endpoint}`
    }
    if (body !== undefined) options['body'] = body
    return Promise.resolve(options)
  }).catch(err => { throw err })
}


// Create WorkersCI object with methods for accomplishing various CI tasks
const WorkersCI = {
  // Create a filter pattern. You can only create one filter pattern per API call
  createRoute({ hostname, pattern, enabled = false }) {
    return api({
      endpoint: 'filters',
      json: false,
      body: JSON.stringify({ 'pattern': `${hostname}${pattern}`, 'enabled': new Boolean(enabled) })
    }).then(options => {
      return request.post(options, (err, res, body) => {
        if (!err) apiResponse(JSON.parse(body), 'Success! Route created with filter ID:')
      })
    }).catch(err => { apiResponse(err, 'error') })
  },

  getRoutes({ pattern: pattern = '', match: match = 'strict', routes: routes = [] }) {
    return api({ endpoint: 'filters' }).then(options => {
      return request.get(options).then(response => {
        let i = 0
        let workers = response.result
        while (i < workers.length) {
          switch (true) {
            case pattern === '':
              return workers

            case match === 'strict':
              if (pattern.match(`${workers[i].pattern}`)) {
                console.log(`${workers[i].pattern}`)
                return `${workers[i].id}`
              }

            case match === 'loose':
              if (pattern.includes(`${workers[i].pattern}`)) {
                console.log(`${workers[i].pattern}`)
                return `${workers[i].id}`
              }

            case (i >= workers.length):
              if (routes.length < 1) throw 'No workers found'
              return routes

            default:
              routes.push({ [`${workers[i].pattern}`]: `${workers[i].id}` })

          }
          i = i + 1
        }
      }).catch(err => { apiResponse(err, 'error') })
    })
  },

  async changeRoute({ oldPattern, newPattern, enabled = false }) {
    const filter = await this.getRoutes({ pattern: oldPattern })
    return Promise.resolve(filter).then(filterID => {
      console.log(filterID)
      return api({
        endpoint: `filters/${filterID}`,
        json: false,
        body: JSON.stringify({ 'pattern': `${newPattern}`, 'enabled': new Boolean(enabled) })
      }).then(options => {
        return request.put(options, (err, res, body) => {
          if (!err) apiResponse(body, 'Route change succeeded for Worker ID:')
        })
      })
    }).catch(err => { apiResponse(err, 'error') })
  },

  async deleteRoute(pattern) {
    const filter = await this.getRoutes(pattern)
    return Promise.resolve(filter).then(filterID => {
      return api({ endpoint: `filters/${filterID}` }).then(options => {
        return request.delete(options.then(body => {
          if (!err) apiResponse(JSON.parse(body), 'Success! Worker deleted:')
        }))
      })
    }).catch(err => { apiResponse(err, 'error') })
  },

  deleteWorker(name) {
    let target = name
    name === undefined ? target = 'script' : target = `scripts/${name}`
    return api({ endpoint: `${target}` }).then(options => {
      return request.delete(options).then(json => {
        apiResponse(json, 'Success! Worker deleted:')
      })
    }).catch(err => { apiResponse(err, 'error') })
  },

  downloadWorker(name) {
    let target
    name === undefined ? target = 'script' : target = `scripts/${name}`
    return api({ endpoint: `${target}` }).then(options => {
      return request.get(options).then(response => {
        if (name === '') name = 'my-worker'
        return fs.writeFile(`workers/${name}.js`, `${response}`, (err) => {
          if (err) throw err
          console.log(`${name} saved to local directory`)
        })
      })
    }).catch(err => { apiResponse(err, 'error') })
  },

  // Upload or update a worker. The API automatically names your script like this: example-com
  uploadWorker(name) {
    let target
    name === undefined ? target = 'script' : target = `scripts/${name}`
    return api({
      endpoint: `${target}`,
      headers: hdrs('application/javascript'),
      json: false,
      body: fs.createReadStream(`./deployments/${name}`)
    }).then(options => {
      return request.put(options, (err, res, body) => {
        if (!err) apiResponse(JSON.parse(body), `Upload succeeded for Worker ID:`)
      })
    }).catch(err => { apiResponse(err, 'error') })
  }
}

module.exports = WorkersCI
