export const deepMerge = function deepMerge (target, source, replace) {
  // console.log('deepMerge ', target, source, replace)
  if (!target) return source
  if (!source) return target
  if (target === source) return target

  if (replace) {
    for (let prop in target) {
      if (target.hasOwnProperty(prop)) {
        delete target[prop]
      }
    }
  }

  for (var prop in source) {
    if (source.hasOwnProperty(prop)) {
      if (Array.isArray(source[prop])) {
        target[prop] = source[prop]
      } else if (target[prop] && typeof source[prop] === 'object') {
        deepMerge(target[prop], source[prop])
      } else {
        target[prop] = source[prop]
      }
    }
  }

  return target
}

// find all entities (objects with url) in resource
export const findAllEntitiesIn = function findAllEntitiesIn (resource, result = {}) {
  if (resource && resource.url) {
    result[resource.url] = resource
  }

  for (var field in resource) {
    if (resource.hasOwnProperty(field)) {
      if (typeof resource[field] === 'object') {
        findAllEntitiesIn(resource[field], result)
      }
    }
  }

  return result
}

// find all entities (objects with url) in resource
// that have a reference (object field with url field) to a target entity
// i.e {url: '/a', reference: {url: '/b'}}
export const findAllWithReferenceTo = function findAllWithReferenceTo (resource, target, result = {}) {
  for (var field in resource) {
    if (resource.hasOwnProperty(field)) {
      if (typeof resource[field] === 'object') {
        if (resource[field].url === target.url) {
          if (resource.url) {
            result[resource.url] = resource
          }
        }

        // recurse and check if any entity was added as a result
        const subResourcesFound = findAllWithReferenceTo(resource[field], target)
        if (Object.keys(subResourcesFound).length > 0) {
          Object.assign(result, subResourcesFound)
          // if we found a reference somewhere down the tree, make sure this
          // resource is also added to the result
          if (resource.url) {
            result[resource.url] = resource
          }
        }
      }
    }
  }

  return result
}

// const entities = findAllEntitiesIn(resource)

// TODO: create test
// const entities = findAllEntitiesIn({
//   url: '1',
//   name: '1',
//   sub: {
//     url: '2'
//   },
//   ignored: {
//     yada: 'yada',
//     subsub: {
//       url: '3'
//     }
//   },
//   arr: [
//     {url: '4'},
//     {ignored: true, sub: {url: '6'}},
//     {url: '5'}
//   ]
// })
//
// console.log('..................')
// console.dir(entities)
