import { broadcast } from '.';
import { getValueStoresByIds, dumpValueStores, dumpValueStore } from './db';

let cache;
let timer;
let updating;

export function updateValueStore(id, update) {
  updateLater();
  const { key, value } = update;
  if (!cache) cache = {};
  let updates = cache[id];
  if (!updates) {
    updates = {};
    cache[id] = updates;
  }
  updates[key] = value || null;
}

export function setValueStore(where, value) {
  return dumpValueStore(where, value)
  .then(broadcastUpdates);
}

function updateLater() {
  if (!updating && !timer) {
    timer = Promise.resolve().then(doUpdate);
    // timer = setTimeout(doUpdate);
  }
}

function doUpdate() {
  const currentCache = cache;
  cache = null;
  timer = null;
  const ids = Object.keys(currentCache);
  updating = true;
  getValueStoresByIds(ids)
  .then(valueStores => {
    ids.forEach(id => {
      const valueStore = valueStores[id] || {};
      valueStores[id] = valueStore;
      const updates = currentCache[id] || {};
      Object.keys(updates).forEach(key => {
        const value = updates[key];
        if (!value) delete valueStore[key];
        else valueStore[key] = value;
      });
    });
    return dumpValueStores(valueStores);
  })
  .then(broadcastUpdates)
  .then(() => {
    updating = false;
    if (cache) updateLater();
  });
}

function broadcastUpdates(updates) {
  if (updates) {
    broadcast({
      cmd: 'UpdatedValues',
      data: updates,
    });
  }
}
