// Puts back SMS configuration values saved before an aborted test run changed them.
const { ApiClient } = require('../src/api/ApiClient');
const { restorePending } = require('../src/api/configBackup');

(async () => {
  const api = await ApiClient.create('admin');
  const restored = await restorePending(api);
  console.log(restored ? `Restored: ${JSON.stringify(restored, null, 2)}` : 'Nothing to restore.');
  await api.dispose();
})();
