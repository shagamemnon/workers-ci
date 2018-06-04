(function() {
  'use strict'

  self.addEventListener('install', function(event) {
    console.log('Service worker installing...')
    self.skipWaiting()
  })

  self.addEventListener('activate', function(event) {
    console.log('Service worker activating...')
  })

  self.addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
  })

  /**
   * Handle an incoming HTTP request, and
   * optionally return a response
   * @param {Request} request
   */
  async function handleRequest(request) {
    return await fetch(request)
  }
})()