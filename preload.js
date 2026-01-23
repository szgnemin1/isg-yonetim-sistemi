const { contextBridge } = require('electron');

// Güvenli bir şekilde Renderer sürecine API'ler sunabiliriz.
// Şu anlık localStorage kullandığımız için ekstra bir köprüye ihtiyaç duymuyoruz
// ancak güvenlik standartları gereği bu dosya mevcut olmalıdır.

contextBridge.exposeInMainWorld('electronAPI', {
  version: process.versions.electron
});