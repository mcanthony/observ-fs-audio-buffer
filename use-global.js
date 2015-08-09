var Observ = require('observ')
var watch = require('observ/watch')
var ObservAudioBuffer = require('./')
var resolve = require('path').resolve

module.exports = ObservAudioBufferCached

var cachePerRate = {}

function ObservAudioBufferCached (context) {
  var obs = Observ({})
  obs.resolved = Observ()
  obs.cuePoints = Observ()

  var cache = cachePerRate[context.audio.sampleRate] = cachePerRate[context.audio.sampleRate] || {}

  var release = null
  var lastSrc = null

  obs(function (data) {
    if (lastSrc !== data.src) {
      lastSrc = data.src
      update(data.src)
    }
  })

  obs.destroy = function () {
    update(null)
  }

  return obs

  // scoped

  function update (src) {
    release && release()
    release = null

    if (src) {
      var path = resolve(context.cwd, src)
      var instance = cache[path]

      if (!instance) {
        instance = cache[path] = ObservAudioBuffer(context)
        instance.listeners = []
        instance.set(obs())
      }

      var releaseResolved = watch(instance.resolved, obs.resolved.set)
      var releaseCuePoints = watch(instance.cuePoints, obs.cuePoints.set)
      instance.listeners.push(obs)

      release = function () {
        releaseResolved()
        releaseCuePoints()
        instance.listeners.splice(instance.listeners.indexOf(obs), 1)
        if (instance.listeners.length === 0) {
          instance.destroy()
          delete cache[path]
        }
      }
    } else {
      obs.resolved.set(null)
      obs.cuePoints.set(null)
    }
  }
}
