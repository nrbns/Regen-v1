/**
 * Express to Fastify Adapter
 * Converts Express routers to Fastify plugins
 */

function expressToFastify(expressRouter) {
  return function (fastify, options, done) {
    // Convert Express routes to Fastify routes
    if (!expressRouter || !expressRouter.stack) {
      fastify.log?.warn('Express router has no stack, skipping registration');
      done();
      return;
    }

    let registeredCount = 0;
    expressRouter.stack.forEach((layer) => {
      if (layer.route) {
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods);

        methods.forEach((method) => {
          const handlers = layer.route.stack.map((h) => h.handle);
          
          try {
            fastify[method.toLowerCase()](path, async (request, reply) => {
            // Convert Fastify request/reply to Express-like objects
            const req = {
              body: request.body,
              params: request.params,
              query: request.query,
              headers: request.headers,
              url: request.url,
              method: request.method,
            };

            let headersSent = false;
            const res = {
              status: (code) => {
                reply.code(code);
                return res;
              },
              json: (data) => {
                if (!headersSent) {
                  headersSent = true;
                  return reply.send(data);
                }
              },
              send: (data) => {
                if (!headersSent) {
                  headersSent = true;
                  return reply.send(data);
                }
              },
              get headersSent() {
                return headersSent;
              },
            };

            // Execute handlers sequentially
            let index = 0;
            const next = async (err) => {
              if (err) {
                if (!headersSent) {
                  headersSent = true;
                  return reply.code(500).send({ error: err.message || String(err) });
                }
                return;
              }
              if (index < handlers.length) {
                const handler = handlers[index++];
                try {
                  const result = await handler(req, res, next);
                  if (result !== undefined && !headersSent) {
                    headersSent = true;
                    return reply.send(result);
                  }
                } catch (error) {
                  if (!headersSent) {
                    headersSent = true;
                    return reply.code(500).send({ error: error.message || String(error) });
                  }
                }
              }
            };

            await next();
          });
            registeredCount++;
          } catch (err) {
            fastify.log?.error({ err, path, method }, 'Failed to register route');
          }
        });
      }
    });

    fastify.log?.info({ count: registeredCount }, 'Registered Express routes as Fastify routes');
    done();
  };
}

module.exports = { expressToFastify };

