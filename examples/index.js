const server = require('http').Server()
const port = process.env.PORT || 3000
const workersCI = require('../workers-ci')

// Deploy a Worker:
// Upload the target file in the deployments folder
workersCI.uploadWorker('my-worker')


// Example for SSL for SaaS:
// Create the same wildcard route pattern for three custom hostnames
const customerHostnames = ['www.bob.com', 'www.alice.com', 'www.trudy.com']

customerHostnames.forEach(host => {
  workersCI.createRoute({
    hostname: host,
    pattern: '/*/',
    enabled: true
  })
})

server.listen(port)
console.log('\nϟϟϟ Serving on port ' + port + ' ϟϟϟ\n')
