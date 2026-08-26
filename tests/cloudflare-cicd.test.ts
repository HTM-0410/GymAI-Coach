import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8');

test('Cloudflare production deploy runs only for main pushes or manual dispatch', () => {
  assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /environment:\s*\n\s+name: production/);
  assert.match(workflow, /group: cloudflare-production/);
});

test('Cloudflare deploy is gated by verification and preserves runtime variables', () => {
  const typecheck = workflow.indexOf('npx tsc --noEmit --pretty false');
  const unitTests = workflow.indexOf('npm run test:unit');
  const build = workflow.indexOf('npx opennextjs-cloudflare build');
  const deploy = workflow.indexOf('npx opennextjs-cloudflare deploy -- --keep-vars');
  const smoke = workflow.indexOf('Smoke test production');

  assert.ok(typecheck > -1 && unitTests > typecheck);
  assert.ok(build > unitTests && deploy > build && smoke > deploy);
  assert.match(workflow, /Missing required GitHub Actions secret/);
});

test('Cloudflare credentials are scoped to validation and deployment steps', () => {
  const jobEnv = workflow.slice(workflow.indexOf('    env:'), workflow.indexOf('    steps:'));
  assert.doesNotMatch(jobEnv, /CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
});
