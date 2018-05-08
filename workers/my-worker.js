addEventListener('fetch', event => {
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
