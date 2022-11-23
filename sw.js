var cache_version = `
Last modified: 2022/11/23 11:17:26
`;
// cache versionを手作業で操作するのが面倒なので、日付をversionにして勝手に更新するようにしておく
cache_version.trim('\n'); // 改行コードを削除
cache_version = 'v1'
// DOM側のjsファイルとのコミュニケーション用途
const broadcast = new BroadcastChannel('sw-channel');
broadcast.onmessage = (event) => {
    console.log(event);
};


const addResourcesToCache = async (resources) => {
    const cache = await caches.open(cache_version);
    await cache.addAll(resources);
};

const putInCache = async (request, response) => {
    const cache = await caches.open(cache_version);
    await cache.put(request, response);
};

const cacheFirst = async ({ request, preloadResponsePromise, fallbackUrl }) => {
    // First try to get the resource from the cache
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
        return responseFromCache;
    }

    // Next try to use (and cache) the preloaded response, if it's there
    const preloadResponse = await preloadResponsePromise;
    if (preloadResponse) {
        console.info('using preload response', preloadResponse);
        //putInCache(request, preloadResponse.clone());
        return preloadResponse;
    }

    // Next try to get the resource from the network
    try {
        const responseFromNetwork = await fetch(request);
        // response may be used only once
        // we need to save clone to put one copy in cache
        // and serve second one
        //putInCache(request, responseFromNetwork.clone());
        return responseFromNetwork;
    } catch (error) {
        const fallbackResponse = await caches.match(fallbackUrl);
        if (fallbackResponse) {
            return fallbackResponse;
        }
        // when even the fallback response is not available,
        // there is nothing we can do, but we must always
        // return a Response object
        return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
};

// Enable navigation preload
const enableNavigationPreload = async () => {
    if (self.registration.navigationPreload) {
        // Enable navigation preloads!
        await self.registration.navigationPreload.enable();
    }
    broadcast.postMessage({
        message: 'called enableNavigationPreload'
    })
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

self.addEventListener('fetch', (event) => {
    event.respondWith(
        cacheFirst({
            request: event.request,
            preloadResponsePromise: event.preloadResponse,
            fallbackUrl: 'fallback.png',
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