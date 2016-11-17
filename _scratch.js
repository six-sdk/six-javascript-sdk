// merges new data into the cache
const merge = function merge (resource, data, replace) {
  let cached = data
  if (data && data.url) {
    // handle paginated data
    // merge items into entityCache
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key] = data[key].map(item => {
          if (item && item.url) {
            item = deepMerge(entityCache[item.url], item, replace)
            // resolve connections with related domain objects
            item = mergeRelations(item)

            // domain specific merge (bid/ask)
            item = mergeDomain(item)
            entityCache[item.url] = item
            entityToResource[item.url] = mergeIntoArray(entityToResource[item.url], resource)
          }
          return item
        })
      } else if (data[key] && data[key].url) {
        let item = data[key]
        item = deepMerge(entityCache[item.url], item, replace)
        // resolve connections with related domain objects
        item = mergeRelations(item)

        // domain specific merge (bid/ask)
        item = mergeDomain(item)
        entityCache[item.url] = item
        entityToResource[item.url] = mergeIntoArray(entityToResource[item.url], resource)
      }
    })

    // merge into entityCache
    cached = deepMerge(entityCache[data.url], data, replace)
    entityCache[data.url] = cached
    entityToResource[data.url] = mergeIntoArray(entityToResource[data.url], resource)
  }

  // TODO: below must be done also for items in paginated responses

  // resolve connections with related domain objects
  cached = mergeRelations(cached)

  // domain specific merge (bid/ask)
  cached = mergeDomain(cached)

  // merge into resourceCache
  cached = deepMerge(resourceCache[resource], cached, replace)
  resourceCache[resource] = cached

  return cached
}

// merges a cached domain object with the rest of the domain
// i.e resolves all relations
const mergeRelations = function mergeRelations (obj) {
  if (!obj) return obj

  // dereference all subresources
  for (var field in obj) {
    if (obj.hasOwnProperty(field) && typeof obj[field] === 'object') {
      if (obj[field] && obj[field].url) {
        let cached = entityCache[obj[field].url]
        if (!cached) {
          entityCache[obj[field].url] = obj[field]
        } else {
          entityCache[obj[field].url] = deepMerge(entityCache[obj[field].url], obj[field])
        }
        obj[field] = cached || obj[field]

        // connect subresources back to parent
        if (obj.url) {
          obj[field]._parent = obj.url
        }
      } else if (typeof obj[field] === 'object') {
        mergeRelations(obj[field])
      }
    }
  }

  // example /listings/848/quotes -> /listing/848
  const parentUrl = obj && (obj._parent || obj.url)

  if (parentUrl) {
    const root = entityCache[parentUrl]
    if (root && root.url) {
      Object.keys(root).forEach((key) => {
        if (root[key].url === obj.url) {
          root[key] = obj
        }
      })
    }
  }
  return obj
}

// fixup all cached listings with orderbooks
Object.values(entityCache).forEach(e => {
  if (e.orderbook && e.orderbook.levels && e.orderbook.levels.length > 0) {
    if (e.quotes && e.quotes.bidPrice) {
      e.orderbook.levels[0].bidPrice = e.quotes.bidPrice
    }
    if (e.quotes && e.quotes.askPrice) {
      e.orderbook.levels[0].askPrice = e.quotes.askPrice
    }
  }
})

// domain-specific merge function, handles Bid/Ask syncing etc
const mergeDomain = function mergeDomain (obj) {
  if (!obj) return obj

  // Orderbooks Level 1 Bid/Ask should match Quotes Bid/Ask
  let listingWithOrderbook = obj.orderbook ? obj : null

  // special handling for "naked" orderbooks
  if (obj.url && obj.url.endsWith('/orderbook')) {
    let entityUrl = obj.url.substring(0, obj.url.length - '/orderbook'.length)
    listingWithOrderbook = entityCache[entityUrl]

    if (listingWithOrderbook && (!listingWithOrderbook.orderbook)) {
      listingWithOrderbook.orderbook = obj
    }
  }

  if (listingWithOrderbook) {
    if (listingWithOrderbook.quotes && listingWithOrderbook.quotes.bidPrice && listingWithOrderbook.orderbook.levels) {
      listingWithOrderbook.orderbook.levels[0].bidPrice = listingWithOrderbook.quotes.bidPrice
    }
    if (listingWithOrderbook.quotes && listingWithOrderbook.quotes.askPrice && listingWithOrderbook.orderbook.levels) {
      listingWithOrderbook.orderbook.levels[0].askPrice = listingWithOrderbook.quotes.askPrice
    }
  }

  return obj
}
