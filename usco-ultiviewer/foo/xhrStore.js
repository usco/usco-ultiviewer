require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * Just export the module.
 */
module.exports = require('./lib/log.js');


},{"./lib/log.js":2}],2:[function(require,module,exports){
/*
 *
 * Server site log module.
 *
 */

/*
 * Dependencies.
 */
function create(color, type, msg) {
    console.log('\x1B[' + color + '[' + type + '] ' + msg + '\x1B[0m');
}

/*
 * Log module.
 */
var log = {
    /*
     *
     */
    error: function(msg) {
        create('31m', 'ERROR', msg);
    },

    /*
     *
     */
    success: function(msg) {
        create('32m', 'SUCCESS', msg);
    },

    /*
     *
     */
    info: function(msg) {
        create('33m', 'INFO', msg);
    },

    /*
     *
     */
    debug: function(msg) {
        create('36m', 'DEBUG', msg);
    }
};

module.exports = log;


},{}],3:[function(require,module,exports){
var __filename="/logger.coffee";var formatMessage, getExecutingModuleName, log, logger, path,
  __slice = [].slice;

path = require('path');

log = require('logerize') || console.log;

logger = {};

logger.level = 'info';

logger.levels = ['error', 'warn', 'info', 'debug'];

formatMessage = function() {
  var item, message, result, _i, _len, _ref;
  message = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  result = [];
  _ref = message[0];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    item = _ref[_i];
    if (typeof item !== 'string') {
      item = JSON.stringify(item);
      result.push(item);
    } else {
      result.push(item);
    }
  }
  return result;
};

getExecutingModuleName = function() {
  var modName;
  modName = __filename;
  modName = modName.split('.').shift();
  return "";
  return path.basename(modName);
};

logger.log = function(level, message) {
  var levels;
  levels = ['error', 'warn', 'info', 'debug'];
  if (levels.indexOf(level) <= levels.indexOf(logger.level)) {
    if (typeof message === !'string') {
      message = JSON.stringify(message);
    }
    return log(level + ': ' + message);
  }
};

logger.debug = function() {
  var level, message;
  message = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  message = formatMessage(message);
  message = message.join(" ");
  level = 'debug';
  if (logger.levels.indexOf(level) <= logger.levels.indexOf(logger.level)) {
    return log.debug(getExecutingModuleName() + " " + message);
  }
};

logger.info = function() {
  var level, message;
  message = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  message = formatMessage(message);
  message = message.join(" ");
  level = "info";
  if (logger.levels.indexOf(level) <= logger.levels.indexOf(logger.level)) {
    return log.info(getExecutingModuleName() + " " + message);
  }
};

logger.warn = function() {
  var level, message;
  message = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  message = message.join(" ");
  level = "warn";
  if (logger.levels.indexOf(level) <= logger.levels.indexOf(logger.level)) {
    if (typeof message === !'string') {
      message = JSON.stringify(message);
    }
    return log.info(message);
  }
};

logger.error = function() {
  var level, message;
  message = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  message = message.join(" ");
  level = 'error';
  if (logger.levels.indexOf(level) <= logger.levels.indexOf(logger.level)) {
    if (typeof message === !'string') {
      message = JSON.stringify(message);
    }
    return log.error(message);
  }
};

module.exports = logger;


},{"logerize":1,"path":"iND2HM"}],"VTt/jb":[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};'use strict';
var Q, XHRStore, XMLHttpRequest, isNode, logger, path,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Q = require("q");

path = require("path");

isNode = typeof global !== "undefined" && {}.toString.call(global) === '[object global]';


XMLHttpRequest = window.XMLHttpRequest;

logger = require("./logger.coffee");

logger.level = "critical";

XHRStore = (function() {
  function XHRStore(options) {
    this._request = __bind(this._request, this);
    this.stats = __bind(this.stats, this);
    this.read = __bind(this.read, this);
    this.list = __bind(this.list, this);
    this.logout = __bind(this.logout, this);
    this.login = __bind(this.login, this);
    var defaults;
    options = options || {};
    defaults = {
      enabled: (typeof process !== "undefined" && process !== null ? true : false),
      name: "XHR",
      type: "",
      description: "",
      rootUri: typeof process !== "undefined" && process !== null ? process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE : null,
      isDataDumpAllowed: false,
      showPaths: true
    };
    /*
    #FIXME@vent.on("project:saved",@pushSavedProject)
    */

  }

  XHRStore.prototype.login = function() {};

  XHRStore.prototype.logout = function() {};

  /*-------------------file/folder manipulation methods----------------*/


  /**
  * list all elements inside the given uri (non recursive)
  * @param {String} uri the folder whose content we want to list
  * @return {Object} a promise, that gets resolved with the content of the uri
  */


  XHRStore.prototype.list = function(uri) {
    var deferred;
    deferred = Q.defer();
    return deferred.promise;
  };

  /**
  * read the file at the given uri, return its content
  * @param {String} uri absolute uri of the file whose content we want
  * @param {String} encoding the encoding used to read the file
  * @return {Object} a promise, that gets resolved with the content of file at the given uri
  */


  XHRStore.prototype.read = function(uri, encoding) {
    encoding = encoding || 'utf8';
    return this._request(uri);
  };

  XHRStore.prototype.stats = function(uri) {
    var deferred, request;
    deferred = Q.defer();
    request = new XMLHttpRequest();
    request.open("HEAD", uri, true);
    request.onreadystatechange = function() {
      if (this.readyState === this.DONE) {
        return deferred.resolve(parseInt(request.getResponseHeader("Content-Length")));
      }
    };
    request.send();
    return deferred.promise;
  };

  XHRStore.prototype._request = function(uri, type, mimeType) {
    var deferred, encoding, onError, onLoad, onProgress, request,
      _this = this;
    type = type || "GET";
    mimeType = mimeType || 'text/plain; charset=x-user-defined';
    encoding = encoding || 'utf8';
    deferred = Q.defer();
    request = new XMLHttpRequest();
    request.open("GET", uri, true);
    if (mimeType != null) {
      request.overrideMimeType(mimeType);
    }
    onLoad = function(event) {
      var result;
      result = event.target.response || event.target.responseText;
      return deferred.resolve(result);
    };
    onProgress = function(event) {
      var percentComplete;
      if (event.lengthComputable) {
        percentComplete = (event.loaded / event.total) * 100;
        logger.debug("percent", percentComplete);
        return deferred.notify({
          "download": percentComplete,
          "total": event.total
        });
      }
    };
    onError = function(event) {
      return deferred.reject(event);
    };
    request.addEventListener('load', onLoad, false);
    request.addEventListener('loadend', onLoad, false);
    request.addEventListener('progress', onProgress, false);
    request.addEventListener('error', onError, false);
    request.send();
    return deferred.promise;
  };

  return XHRStore;

})();

module.exports = XHRStore;


},{"./logger.coffee":3,"__browserify_process":7,"path":"iND2HM","q":"Ed4Js3","xmlhttprequest":6}],"usco-xhrStore":[function(require,module,exports){
module.exports=require('VTt/jb');
},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[])
;
