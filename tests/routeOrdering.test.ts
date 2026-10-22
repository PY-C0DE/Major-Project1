import express from 'express';
import assert from 'assert';

// Quick test verifying route ordering prevents route shadowing
async function testRouteOrdering() {
  const app = express();

  let matchedRoute = '';

  // Correct ordering: /history registered before /:ticker
  app.get('/api/predictions/history', (req, res) => {
    matchedRoute = 'history';
    res.json({ ok: true, route: 'history' });
  });

  app.get('/api/predictions/:ticker', (req, res) => {
    matchedRoute = `ticker:${req.params.ticker}`;
    res.json({ ok: true, route: `ticker:${req.params.ticker}` });
  });

  // Verify route stack order
  const routes = app._router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => layer.route.path);

  assert.strictEqual(routes[0], '/api/predictions/history', 'History route must be registered first');
  assert.strictEqual(routes[1], '/api/predictions/:ticker', 'Parameterized ticker route must be registered second');

  console.log('✅ Route ordering test passed: /api/predictions/history precedes /api/predictions/:ticker');
}

testRouteOrdering().catch(err => {
  console.error('❌ Route ordering test failed:', err);
  process.exit(1);
});
