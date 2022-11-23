var cache_version = `
Last modified: 2022/11/23 11:36:39
`;
// cache versionを手作業で操作するのが面倒なので、日付をversionにして勝手に更新するようにしておく
cache_version.trim('\n'); // 改行コードを削除
// cache_version = 'v1'
// DOM側のjsファイルとのコミュニケーション用途
const broadcast = new BroadcastChannel('sw-channel');
broadcast.onmessage = (event) => {
    console.log(event);
};


const addResourcesToCache = async (resources) => {
    const cache = await caches.open(cache_version);
    await cache.addAll(resources);
};


self.addEventListener('activate', (event) => {
    event.waitUntil(enableNavigationPreload());
    event.waitUntil(deleteOldCaches());
    broadcast.postMessage({
        message: 'activated'
    })
});

self.addEventListener('install', (event) => {
    event.waitUntil(
        addResourcesToCache([
            'index.html',
            'bootstrap.min.css',
            'icon-192.png',
            'pexels-tetsuaki-baba-8111237.jpg',
            'production ID_4023899.mp4',
        ])
    );
    broadcast.postMessage({
        message: 'called install event'
    })
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((r) => {
            //console.log('[Service Worker] Fetching resource: ' + e.request.url);
            return r || fetch(e.request).then((response) => {
                return caches.open(cache_version).then((cache) => {
                    //console.log('[Service Worker] Caching new resource: ' + e.request.url);
                    //cache.put(e.request, response.clone());
                    return response;
                });
            });
        })
    );
    broadcast.postMessage({
        message: 'called fetch event'
    })
});

const deleteCache = async key => {
    await caches.delete(key)
}

const deleteOldCaches = async () => {
    const cacheKeepList = [cache_version];
    const keyList = await caches.keys()
    const cachesToDelete = keyList.filter(key => !cacheKeepList.includes(key))
    await Promise.all(cachesToDelete.map(deleteCache));
}