// various helper functions to support the cache merge functionality

// recursivly merge two objects
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

  for (let prop in source) {
    if (source.hasOwnProperty(prop)) {
      const sourceValue = source[prop]
      if (sourceValue && sourceValue.constructor === Array) {
        target[prop] = sourceValue
        // If source[prop] is null there is a bug where the engine will think it's an object
        // this will prevent deepMerge from changing the value to null (clearing the value)
        // therefore we check if the source[prop] is null here
      } else if (sourceValue !== null && target[prop] && typeof sourceValue === 'object') {
        deepMerge(target[prop], sourceValue)
      } else {
        target[prop] = sourceValue
      }
    }
  }

  return target
}

// find all entities (objects with url) in resource
export const findAllEntitiesIn = function findAllEntitiesIn (resource, result = []) {
  if (resource && resource.url) {
    result.push(resource)
  }

  if (resource && resource.constructor === Array) {
    for (let i = 0; i < resource.length; i += 1) {
      findAllEntitiesIn(resource[i], result)
    }
  } else {
    for (var field in resource) {
      if (resource.hasOwnProperty(field)) {
        if (typeof resource[field] === 'object') {
          findAllEntitiesIn(resource[field], result)
        }
      }
    }
  }

  return result
}

// find the first entity matching the supplied url
export const findEntity = function findEntity(entities = [], url) {
  if (url) {
    for (let i = 0; i < entities.length; i += 1) {
      if (entities[i].url === url) {
        return entities[i]
      }
    }
  }
  return undefined
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
