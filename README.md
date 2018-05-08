# Workers CI
> Node.js client for automating and testing Cloudflare Workers deployments.

## Install as standalone app
```bash
npm install gulp@next -g --save
git clone https://github.com/shagamemnon/workers-ci.git && cd workers-ci && npm install
```

## Setup
1. Write and store all your local Worker scripts in `workers` or `worker-bundles`
2. Set environment variables:
```bash
printf "ZONE=my-cloudflare-website.com
API_KEY=MY_CLOUDFLARE_API_KEY
EMAIL=MY_CLOUDFLARE_EMAIL" >> .env
```

```bash
gulp workers
```

### Use with CLI
```bash
# Deploy your Worker to Cloudflare every time you press save
gulp workers.live

# Deploy a Worker from the deployments folder
gulp workers.deploy --script=my-worker

# Download a Worker from Cloudflare into your local Workers folder
gulp workers.download --script=my-worker

# Delete a Worker from Cloudflare
gulp workers.delete --script=my-worker

# Using Rollup to bundle the script file in /worker-bundles and deploy to Cloudflare Workers
gulp workers.rollup

# View all routes
gulp workers.routes.get

# Create a route
gulp workers.routes.create --route=example.com/path/*

# Delete a route
gulp workers.routes.delete --route=example.com/path/*

```

### Use with an existing app
```javascript
// app.js

const workersCI = require('workers-ci')

// Create a route
workersCI.createRoute({
  hostname: `www.${process.env.ZONE}`,
  pattern: '/path/to/*',
  enabled: false
})
```

## Methods
```javascript

const workersCI = require('workers-ci')

/**
  * Download a Worker from your Cloudflare account into the /workers folder in local directory
  * @arg {string} – [required] The name for your script
 */
workersCI.downloadWorker('my-worker')


/**
  * Uploads the contents of your script from the /deployments folder
  * @arg {string} – [required] The name for your script
 */
workersCI.uploadWorker('my-worker')


/**
  * Delete a Worker
  * @arg {string} – [required] The name of the Worker you'd like to delete
 */
workersCI.deleteWorker('my-worker')


/**
  * Returns the ID's for all routes in your zone unless an argument is supplied. Performs a string match
  * NOTE: Partial strings are acceptable. Use carefully
  * @arg – [optional] The route you are targeting
 */
workersCI.getRoutes('www.example.com/*')


/**
  * Create a new route
  * @arg {string} hostname – [Required] The hostname prefix you are targeting
  * @arg {string} pattern - [Required] The pattern suffix you are targeting. Must start with a '/'
  * @arg {string} enabled - [Optional] Turn the route on or off. Default value is false
 */
workersCI.createRoute({
  hostname: 'www.example.com',
  pattern: '/path/to/*/',
  enabled: true // default: false
})


/**
  * Returns the ID's for all routes in your zone unless an argument is supplied
  * @arg {string} oldPattern – [Required] The route you'd like to change. Performs a string match
  * @arg {string} newPattern - [Required] The new route pattern you'd like to apply
  * @arg {string} enabled - [Optional] Turn the route on or off. Default value is false
 */
workersCI.changeRoute({
  oldPattern: 'www.example.com/path/to/*',
  newPattern: 'www.example.com/to/a-different-pattern/*',
  enabled: true // default: false
})


/**
  * Delete a Route. Performs a string match.
  * NOTE: Partial strings are acceptable. Use carefully
  * @arg  {string} – [Required] The name of the Worker you'd like to delete
 */
workersCI.deleteRoute('workers.example.com/path/to/some-route-to-remove/*')

```
