var shallowEqual = require('juliangruber-shallow-equal/objects')
var Nanocomponent = require('nanocomponent')
var nanotiming = require('nanotiming')
var nanologger = require('nanologger')
var nanomorph = require('nanomorph')
var assert = require('assert')

var rootLabelRegex = /^data-onloadid/

module.exports = Microcomponent

function Microcomponent (opts) {
  if (!(this instanceof Microcomponent)) return new Microcomponent(opts)
  Nanocomponent.call(this)

  opts = opts || {}
  this.name = opts.name || 'component'
  this.props = opts.props || {}
  this.state = opts.state || {}

  this._log = nanologger(this.name)
  this._log.debug('initialized')

  if (opts.pure) {
    this._update = function (props) {
      return !shallowEqual(props, this.props)
    }
  }
}
Microcomponent.prototype = Object.create(Nanocomponent.prototype)

Microcomponent.prototype.on = function (eventname, handler) {
  assert.equal(typeof eventname, 'string', 'microcomponent.on eventname should be type string')
  assert.equal(typeof handler, 'function', 'microcomponent.on handler should be type function')

  if (eventname === 'render') {
    this._render = function () {
      return handler.call(this)
    }
    var render = this.render
    this.render = function (props) {
      var renderTiming = nanotiming(this.name + '.render')
      var oldElement = this._element
      render.call(this, props)
      var newElement = this._element

      if (oldElement) {
        var oldAttrs = oldElement.attributes
        var attr, name
        for (var i = 0, len = oldAttrs.length; i < len; i++) {
          attr = oldAttrs[i]
          name = attr.name
          if (rootLabelRegex.test(name)) {
            newElement.setAttribute(name, attr.value)
            break
          }
        }
        nanomorph(oldElement, newElement)
        this._element = oldElement
      }
      renderTiming(this._trace.bind(this, 'render', props))

      return this._element
    }
  } else {
    this['_' + eventname] = handler.bind(this)
  }

  return this
}

Microcomponent.prototype.emit = function (eventname) {
  if (eventname !== 'render') {
    var timing = nanotiming(this.name + '.emit(' + eventname + ')')
  }
  assert.equal(typeof eventname, 'string', 'microcomponent.emit eventname should be type string')
  var len = arguments.length - 1
  var args = new Array(len)
  for (var i = 0; i < len; i++) args[i] = arguments[i + 1]
  var res = this['_' + eventname].apply(this, args)

  if (eventname !== 'render') timing(this._trace.bind(this, 'emit'))
  return res
}

Microcomponent.prototype._trace = function (name, props, timing) {
  if (!timing) {
    timing = props
    props = null
  }
  if (timing) {
    var duration = timing.duration.toFixed() + 'ms'
    if (props) this._log.debug(name, duration, props)
    else this._log.debug(name, duration)
    window.performance.clearMeasures(timing.name)
  } else {
    if (props) this._log.debug(name, props)
    else this._log.debug(name)
  }
}
