// import Web3 from 'web3'

function connectWeb3(cb) {
    var ethereum = window.ethereum;

    console.log("ethereum", ethereum)
    if (ethereum) {
        var web3 = new Web3(ethereum);
        try {
            ethereum.request({
                method: "eth_requestAccounts",
            }).then(accounts => {
                console.log(accounts)

                cb(0, {
                    coinbase: accounts[0],
                    web3() {
                        return web3;
                    },
                })
            })
            console.log("accounts", accounts)
        } catch (err) {
            cb(1)
        }
    } else {
        cb(1)
    }
}(function () {
  var eventHandlers = {};

  // Parse init params from location hash: for Android < 5.0, TDesktop
  var locationHash = '';
  try {
    locationHash = location.hash.toString();
  } catch (e) {}

  var initParams = urlParseHashParams(locationHash);

  var isIframe = false;
  try {
    isIframe = (window.parent != null && window != window.parent);
  } catch (e) {}


  function urlSafeDecode(urlencoded) {
    try {
      return decodeURIComponent(urlencoded);
    } catch (e) {
      return urlencoded;
    }
  }

  function urlParseHashParams(locationHash) {
    locationHash = locationHash.replace(/^#/, '');
    var params = {};
    if (!locationHash.length) {
      return params;
    }
    if (locationHash.indexOf('=') < 0 && locationHash.indexOf('?') < 0) {
      params._path = urlSafeDecode(locationHash);
      return params;
    }
    var qIndex = locationHash.indexOf('?');
    if (qIndex >= 0) {
      var pathParam = locationHash.substr(0, qIndex);
      params._path = urlSafeDecode(pathParam);
      locationHash = locationHash.substr(qIndex + 1);
    }
    var locationHashParams = locationHash.split('&');
    var i, param, paramName, paramValue;
    for (i = 0; i < locationHashParams.length; i++) {
      param = locationHashParams[i].split('=');
      paramName = urlSafeDecode(param[0]);
      paramValue = param[1] == null ? null : urlSafeDecode(param[1]);
      params[paramName] = paramValue;
    }
    return params;
  }

  // Telegram apps will implement this logic to add service params (e.g. tgShareScoreUrl) to game URL
  function urlAppendHashParams(url, addHash) {
    // url looks like 'https://game.com/path?query=1#hash'
    // addHash looks like 'tgShareScoreUrl=' + encodeURIComponent('tgb://share_game_score?hash=very_long_hash123')

    var ind = url.indexOf('#');
    if (ind < 0) {
      // https://game.com/path -> https://game.com/path#tgShareScoreUrl=etc
      return url + '#' + addHash;
    }
    var curHash = url.substr(ind + 1);
    if (curHash.indexOf('=') >= 0 || curHash.indexOf('?') >= 0) {
      // https://game.com/#hash=1 -> https://game.com/#hash=1&tgShareScoreUrl=etc
      // https://game.com/#path?query -> https://game.com/#path?query&tgShareScoreUrl=etc
      return url + '&' + addHash;
    }
    // https://game.com/#hash -> https://game.com/#hash?tgShareScoreUrl=etc
    if (curHash.length > 0) {
      return url + '?' + addHash;
    }
    // https://game.com/# -> https://game.com/#tgShareScoreUrl=etc
    return url + addHash;
  }


  function postEvent (eventType, callback, eventData) {
    if (!callback) {
      callback = function () {};
    }
    if (eventData === undefined) {
      eventData = '';
    }

    if (window.TelegramWebviewProxy !== undefined) {
      TelegramWebviewProxy.postEvent(eventType, JSON.stringify(eventData));
      callback();
    }
    else if (window.external && 'notify' in window.external) {
      window.external.notify(JSON.stringify({eventType: eventType, eventData: eventData}));
      callback();
    }
    else if (isIframe) {
      try {
        var trustedTarget = 'https://web.telegram.org';
        // For now we don't restrict target, for testing purposes
        trustedTarget = '*';
        window.parent.postMessage(JSON.stringify({eventType: eventType, eventData: eventData}), trustedTarget);
      } catch (e) {
        callback(e);
      }
    }
    else {
      callback({notAvailable: true});
    }
  };

  function receiveEvent(eventType, eventData) {
    var curEventHandlers = eventHandlers[eventType];
    if (curEventHandlers === undefined ||
        !curEventHandlers.length) {
      return;
    }
    for (var i = 0; i < curEventHandlers.length; i++) {
      try {
        curEventHandlers[i](eventType, eventData);
      } catch (e) {}
    }
  }

  function onEvent (eventType, callback) {
    if (eventHandlers[eventType] === undefined) {
      eventHandlers[eventType] = [];
    }
    var index = eventHandlers[eventType].indexOf(callback);
    if (index === -1) {
      eventHandlers[eventType].push(callback);
    }
  };

  function offEvent (eventType, callback) {
    if (eventHandlers[eventType] === undefined) {
      return;
    }
    var index = eventHandlers[eventType].indexOf(callback);
    if (index === -1) {
      return;
    }
    eventHandlers[eventType].splice(index, 1);
  };

  function openProtoUrl(url) {
    if (!url.match(/^(web\+)?tgb?:\/\/./)) {
      return false;
    }
    var useIframe = navigator.userAgent.match(/iOS|iPhone OS|iPhone|iPod|iPad/i) ? true : false;
    if (useIframe) {
      var iframeContEl = document.getElementById('tgme_frame_cont') || document.body;
      var iframeEl = document.createElement('iframe');
      iframeContEl.appendChild(iframeEl);
      var pageHidden = false;
      var enableHidden = function () {
        pageHidden = true;
      };
      window.addEventListener('pagehide', enableHidden, false);
      window.addEventListener('blur', enableHidden, false);
      if (iframeEl !== null) {
        iframeEl.src = url;
      }
      setTimeout(function() {
        if (!pageHidden) {
          window.location = url;
        }
        window.removeEventListener('pagehide', enableHidden, false);
        window.removeEventListener('blur', enableHidden, false);
      }, 2000);
    }
    else {
      window.location = url;
    }
    return true;
  }

  // For Windows Phone app
  window.TelegramGameProxy_receiveEvent = receiveEvent;

  window.TelegramGameProxy = {
    initParams: initParams,
    receiveEvent: receiveEvent,
    onEvent: onEvent,
    shareScore: function () {
      postEvent('share_score', function (error) {
        if (error) {
          var shareScoreUrl = initParams.tgShareScoreUrl;
          if (shareScoreUrl) {
            openProtoUrl(shareScoreUrl);
          }
        }
      });
    },
    paymentFormSubmit: function (formData) {
      if (!formData ||
          !formData.credentials ||
          formData.credentials.type !== 'card' ||
          !formData.credentials.token ||
          !formData.credentials.token.match(/^[A-Za-z0-9\/=_\-]{4,512}$/) ||
          !formData.title) {
        console.error('[TgProxy] Invalid form data submitted', formData);
        throw Error('PaymentFormDataInvalid');
      }
      postEvent('payment_form_submit', false, formData);
    }
  };

})();
/*!
 * pixi.js - v4.0.2
 * Compiled Wed Sep 21 2016 13:19:41 GMT+0100 (BST)
 *
 * pixi.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
!function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,e.PIXI=t()}}(function(){var t;return function t(e,r,i){function n(o,a){if(!r[o]){if(!e[o]){var h="function"==typeof require&&require;if(!a&&h)return h(o,!0);if(s)return s(o,!0);var u=new Error("Cannot find module '"+o+"'");throw u.code="MODULE_NOT_FOUND",u}var l=r[o]={exports:{}};e[o][0].call(l.exports,function(t){var r=e[o][1][t];return n(r?r:t)},l,l.exports,t,e,r,i)}return r[o].exports}for(var s="function"==typeof require&&require,o=0;o<i.length;o++)n(i[o]);return n}({1:[function(t,e,r){var i=new ArrayBuffer(0),n=function(t,e,r,n){this.gl=t,this.buffer=t.createBuffer(),this.type=e||t.ARRAY_BUFFER,this.drawType=n||t.STATIC_DRAW,this.data=i,r&&this.upload(r),this._updateID=0};n.prototype.upload=function(t,e,r){r||this.bind();var i=this.gl;t=t||this.data,e=e||0,this.data.byteLength>=t.byteLength?i.bufferSubData(this.type,e,t):i.bufferData(this.type,t,this.drawType),this.data=t},n.prototype.bind=function(){var t=this.gl;t.bindBuffer(this.type,this.buffer)},n.createVertexBuffer=function(t,e,r){return new n(t,t.ARRAY_BUFFER,e,r)},n.createIndexBuffer=function(t,e,r){return new n(t,t.ELEMENT_ARRAY_BUFFER,e,r)},n.create=function(t,e,r,i){return new n(t,e,r,i)},n.prototype.destroy=function(){this.gl.deleteBuffer(this.buffer)},e.exports=n},{}],2:[function(t,e,r){var i=t("./GLTexture"),n=function(t,e,r){this.gl=t,this.framebuffer=t.createFramebuffer(),this.stencil=null,this.texture=null,this.width=e||100,this.height=r||100};n.prototype.enableTexture=function(t){var e=this.gl;this.texture=t||new i(e),this.texture.bind(),this.bind(),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texture.texture,0)},n.prototype.enableStencil=function(){if(!this.stencil){var t=this.gl;this.stencil=t.createRenderbuffer(),t.bindRenderbuffer(t.RENDERBUFFER,this.stencil),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.RENDERBUFFER,this.stencil),t.renderbufferStorage(t.RENDERBUFFER,t.DEPTH_STENCIL,this.width,this.height)}},n.prototype.clear=function(t,e,r,i){this.bind();var n=this.gl;n.clearColor(t,e,r,i),n.clear(n.COLOR_BUFFER_BIT)},n.prototype.bind=function(){var t=this.gl;this.texture&&this.texture.unbind(),t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer)},n.prototype.unbind=function(){var t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,null)},n.prototype.resize=function(t,e){var r=this.gl;this.width=t,this.height=e,this.texture&&this.texture.uploadData(null,t,e),this.stencil&&(r.bindRenderbuffer(r.RENDERBUFFER,this.stencil),r.renderbufferStorage(r.RENDERBUFFER,r.DEPTH_STENCIL,t,e))},n.prototype.destroy=function(){var t=this.gl;this.texture&&this.texture.destroy(),t.deleteFramebuffer(this.framebuffer),this.gl=null,this.stencil=null,this.texture=null},n.createRGBA=function(t,e,r,s){var o=i.fromData(t,null,e,r);o.enableNearestScaling(),o.enableWrapClamp();var a=new n(t,e,r);return a.enableTexture(o),a.unbind(),a},n.createFloat32=function(t,e,r,s){var o=new i.fromData(t,s,e,r);o.enableNearestScaling(),o.enableWrapClamp();var a=new n(t,e,r);return a.enableTexture(o),a.unbind(),a},e.exports=n},{"./GLTexture":4}],3:[function(t,e,r){var i=t("./shader/compileProgram"),n=t("./shader/extractAttributes"),s=t("./shader/extractUniforms"),o=t("./shader/generateUniformAccessObject"),a=function(t,e,r,a){this.gl=t,this.program=i(t,e,r,a),this.attributes=n(t,this.program);for(var h in this.attributes)console.log(h+" : "+this.attributes[h].location);console.log(">>>>>>>");var u=s(t,this.program);this.uniforms=o(t,u)};a.prototype.bind=function(){this.gl.useProgram(this.program)},a.prototype.destroy=function(){},e.exports=a},{"./shader/compileProgram":9,"./shader/extractAttributes":11,"./shader/extractUniforms":12,"./shader/generateUniformAccessObject":13}],4:[function(t,e,r){var i=function(t,e,r,i,n){this.gl=t,this.texture=t.createTexture(),this.mipmap=!1,this.premultiplyAlpha=!1,this.width=e||-1,this.height=r||-1,this.format=i||t.RGBA,this.type=n||t.UNSIGNED_BYTE};i.prototype.upload=function(t){this.bind();var e=this.gl;e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.premultiplyAlpha);var r=t.videoWidth||t.width,i=t.videoHeight||t.height;i!==this.height||r!==this.width?e.texImage2D(e.TEXTURE_2D,0,this.format,this.format,this.type,t):e.texSubImage2D(e.TEXTURE_2D,0,0,0,this.format,this.type,t),this.width=r,this.height=i};var n=!1;i.prototype.uploadData=function(t,e,r){this.bind();var i=this.gl;if(t instanceof Float32Array){if(!n){var s=i.getExtension("OES_texture_float");if(!s)throw new Error("floating point textures not available");n=!0}this.type=i.FLOAT}else this.type=i.UNSIGNED_BYTE;i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.premultiplyAlpha),e!==this.width||r!==this.height?i.texImage2D(i.TEXTURE_2D,0,this.format,e,r,0,this.format,this.type,t||null):i.texSubImage2D(i.TEXTURE_2D,0,0,0,e,r,this.format,this.type,t||null),this.width=e,this.height=r},i.prototype.bind=function(t){var e=this.gl;void 0!==t&&e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,this.texture)},i.prototype.unbind=function(){var t=this.gl;t.bindTexture(t.TEXTURE_2D,null)},i.prototype.minFilter=function(t){var e=this.gl;this.bind(),this.mipmap?e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,t?e.LINEAR_MIPMAP_LINEAR:e.NEAREST_MIPMAP_NEAREST):e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,t?e.LINEAR:e.NEAREST)},i.prototype.magFilter=function(t){var e=this.gl;this.bind(),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,t?e.LINEAR:e.NEAREST)},i.prototype.enableMipmap=function(){var t=this.gl;this.bind(),this.mipmap=!0,t.generateMipmap(t.TEXTURE_2D)},i.prototype.enableLinearScaling=function(){this.minFilter(!0),this.magFilter(!0)},i.prototype.enableNearestScaling=function(){this.minFilter(!1),this.magFilter(!1)},i.prototype.enableWrapClamp=function(){var t=this.gl;this.bind(),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE)},i.prototype.enableWrapRepeat=function(){var t=this.gl;this.bind(),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT)},i.prototype.enableWrapMirrorRepeat=function(){var t=this.gl;this.bind(),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.MIRRORED_REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.MIRRORED_REPEAT)},i.prototype.destroy=function(){var t=this.gl;t.deleteTexture(this.texture)},i.fromSource=function(t,e,r){var n=new i(t);return n.premultiplyAlpha=r||!1,n.upload(e),n},i.fromData=function(t,e,r,n){var s=new i(t);return s.uploadData(e,r,n),s},e.exports=i},{}],5:[function(t,e,r){function i(t,e){if(this.nativeVaoExtension=null,i.FORCE_NATIVE||(this.nativeVaoExtension=t.getExtension("OES_vertex_array_object")||t.getExtension("MOZ_OES_vertex_array_object")||t.getExtension("WEBKIT_OES_vertex_array_object")),this.nativeState=e,this.nativeVaoExtension){this.nativeVao=this.nativeVaoExtension.createVertexArrayOES();var r=t.getParameter(t.MAX_VERTEX_ATTRIBS);this.nativeState={tempAttribState:new Array(r),attribState:new Array(r)}}this.gl=t,this.attributes=[],this.indexBuffer=null,this.dirty=!1}var n=t("./setVertexAttribArrays");i.prototype.constructor=i,e.exports=i,i.FORCE_NATIVE=!0,i.prototype.bind=function(){return this.nativeVao?(this.nativeVaoExtension.bindVertexArrayOES(this.nativeVao),this.dirty&&(this.dirty=!1,this.activate())):this.activate(),this},i.prototype.unbind=function(){return this.nativeVao&&this.nativeVaoExtension.bindVertexArrayOES(null),this},i.prototype.activate=function(){for(var t=this.gl,e=null,r=0;r<this.attributes.length;r++){var i=this.attributes[r];e!==i.buffer&&(i.buffer.bind(),e=i.buffer),t.vertexAttribPointer(i.attribute.location,i.attribute.size,i.type||t.FLOAT,i.normalized||!1,i.stride||0,i.start||0)}return n(t,this.attributes,this.nativeState),this.indexBuffer.bind(),this},i.prototype.addAttribute=function(t,e,r,i,n,s){return this.attributes.push({buffer:t,attribute:e,location:e.location,type:r||this.gl.FLOAT,normalized:i||!1,stride:n||0,start:s||0}),this.dirty=!0,this},i.prototype.addIndex=function(t){return this.indexBuffer=t,this.dirty=!0,this},i.prototype.clear=function(){return this.nativeVao&&this.nativeVaoExtension.bindVertexArrayOES(this.nativeVao),this.attributes.length=0,this.indexBuffer=null,this},i.prototype.draw=function(t,e,r){var i=this.gl;return i.drawElements(t,e||this.indexBuffer.data.length,i.UNSIGNED_SHORT,r||0),this},i.prototype.destroy=function(){this.gl=null,this.indexBuffer=null,this.attributes=null,this.nativeState=null,this.nativeVao&&this.nativeVaoExtension.deleteVertexArrayOES(this.nativeVao),this.nativeVaoExtension=null,this.nativeVao=null}},{"./setVertexAttribArrays":8}],6:[function(t,e,r){var i=function(t,e){var r=t.getContext("webgl",e)||t.getContext("experimental-webgl",e);if(!r)throw new Error("This browser does not support webGL. Try using the canvas renderer");return r};e.exports=i},{}],7:[function(t,e,r){var i={createContext:t("./createContext"),setVertexAttribArrays:t("./setVertexAttribArrays"),GLBuffer:t("./GLBuffer"),GLFramebuffer:t("./GLFramebuffer"),GLShader:t("./GLShader"),GLTexture:t("./GLTexture"),VertexArrayObject:t("./VertexArrayObject"),shader:t("./shader")};"undefined"!=typeof e&&e.exports&&(e.exports=i),"undefined"!=typeof window&&(window.PIXI=window.PIXI||{},window.PIXI.glCore=i)},{"./GLBuffer":1,"./GLFramebuffer":2,"./GLShader":3,"./GLTexture":4,"./VertexArrayObject":5,"./createContext":6,"./setVertexAttribArrays":8,"./shader":14}],8:[function(t,e,r){var i=function(t,e,r){var i;if(r){var n=r.tempAttribState,s=r.attribState;for(i=0;i<n.length;i++)n[i]=!1;for(i=0;i<e.length;i++)n[e[i].attribute.location]=!0;for(i=0;i<s.length;i++)s[i]!==n[i]&&(s[i]=n[i],r.attribState[i]?t.enableVertexAttribArray(i):t.disableVertexAttribArray(i))}else for(i=0;i<e.length;i++){var o=e[i];t.enableVertexAttribArray(o.attribute.location)}};e.exports=i},{}],9:[function(t,e,r){var i=function(t,e,r,i){var s=n(t,t.VERTEX_SHADER,e),o=n(t,t.FRAGMENT_SHADER,r),a=t.createProgram();if(t.attachShader(a,s),t.attachShader(a,o),i)for(var h in i)t.bindAttribLocation(a,i[h],h);return t.linkProgram(a),t.getProgramParameter(a,t.LINK_STATUS)||(console.error("Pixi.js Error: Could not initialize shader."),console.error("gl.VALIDATE_STATUS",t.getProgramParameter(a,t.VALIDATE_STATUS)),console.error("gl.getError()",t.getError()),""!==t.getProgramInfoLog(a)&&console.warn("Pixi.js Warning: gl.getProgramInfoLog()",t.getProgramInfoLog(a)),t.deleteProgram(a),a=null),t.deleteShader(s),t.deleteShader(o),a},n=function(t,e,r){var i=t.createShader(e);return t.shaderSource(i,r),t.compileShader(i),t.getShaderParameter(i,t.COMPILE_STATUS)?i:(console.log(t.getShaderInfoLog(i)),null)};e.exports=i},{}],10:[function(t,e,r){var i=function(t,e){switch(t){case"float":return 0;case"vec2":return new Float32Array(2*e);case"vec3":return new Float32Array(3*e);case"vec4":return new Float32Array(4*e);case"int":case"sampler2D":return 0;case"ivec2":return new Int32Array(2*e);case"ivec3":return new Int32Array(3*e);case"ivec4":return new Int32Array(4*e);case"bool":return!1;case"bvec2":return n(2*e);case"bvec3":return n(3*e);case"bvec4":return n(4*e);case"mat2":return new Float32Array([1,0,0,1]);case"mat3":return new Float32Array([1,0,0,0,1,0,0,0,1]);case"mat4":return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}},n=function(t){for(var e=new Array(t),r=0;r<e.length;r++)e[r]=!1;return e};e.exports=i},{}],11:[function(t,e,r){var i=t("./mapType"),n=t("./mapSize"),s=function(t,e){for(var r={},s=t.getProgramParameter(e,t.ACTIVE_ATTRIBUTES),a=0;a<s;a++){var h=t.getActiveAttrib(e,a),u=i(t,h.type);r[h.name]={type:u,size:n(u),location:t.getAttribLocation(e,h.name),pointer:o}}return r},o=function(t,e,r,i){gl.vertexAttribPointer(this.location,this.size,t||gl.FLOAT,e||!1,r||0,i||0)};e.exports=s},{"./mapSize":15,"./mapType":16}],12:[function(t,e,r){var i=t("./mapType"),n=t("./defaultValue"),s=function(t,e){for(var r={},s=t.getProgramParameter(e,t.ACTIVE_UNIFORMS),o=0;o<s;o++){var a=t.getActiveUniform(e,o),h=a.name.replace(/\[.*?\]/,""),u=i(t,a.type);r[h]={type:u,size:a.size,location:t.getUniformLocation(e,h),value:n(u,a.size)}}return r};e.exports=s},{"./defaultValue":10,"./mapType":16}],13:[function(t,e,r){var i=function(t,e){var r={data:{}};r.gl=t;for(var i=Object.keys(e),a=0;a<i.length;a++){var h=i[a],u=h.split("."),l=u[u.length-1],c=o(u,r),d=e[h];c.data[l]=d,c.gl=t,Object.defineProperty(c,l,{get:n(l),set:s(l,d)})}return r},n=function(t){var e=a.replace("%%",t);return new Function(e)},s=function(t,e){var r,i=h.replace(/%%/g,t);return r=1===e.size?u[e.type]:l[e.type],r&&(i+="\nthis.gl."+r+";"),new Function("value",i)},o=function(t,e){for(var r=e,i=0;i<t.length-1;i++){var n=r[t[i]]||{data:{}};r[t[i]]=n,r=n}return r},a=["return this.data.%%.value;"].join("\n"),h=["this.data.%%.value = value;","var location = this.data.%%.location;"].join("\n"),u={float:"uniform1f(location, value)",vec2:"uniform2f(location, value[0], value[1])",vec3:"uniform3f(location, value[0], value[1], value[2])",vec4:"uniform4f(location, value[0], value[1], value[2], value[3])",int:"uniform1i(location, value)",ivec2:"uniform2i(location, value[0], value[1])",ivec3:"uniform3i(location, value[0], value[1], value[2])",ivec4:"uniform4i(location, value[0], value[1], value[2], value[3])",bool:"uniform1i(location, value)",bvec2:"uniform2i(location, value[0], value[1])",bvec3:"uniform3i(location, value[0], value[1], value[2])",bvec4:"uniform4i(location, value[0], value[1], value[2], value[3])",mat2:"uniformMatrix2fv(location, false, value)",mat3:"uniformMatrix3fv(location, false, value)",mat4:"uniformMatrix4fv(location, false, value)",sampler2D:"uniform1i(location, value)"},l={float:"uniform1fv(location, value)",vec2:"uniform2fv(location, value)",vec3:"uniform3fv(location, value)",vec4:"uniform4fv(location, value)",int:"uniform1iv(location, value)",ivec2:"uniform2iv(location, value)",ivec3:"uniform3iv(location, value)",ivec4:"uniform4iv(location, value)",bool:"uniform1iv(location, value)",bvec2:"uniform2iv(location, value)",bvec3:"uniform3iv(location, value)",bvec4:"uniform4iv(location, value)",sampler2D:"uniform1iv(location, value)"};e.exports=i},{}],14:[function(t,e,r){e.exports={compileProgram:t("./compileProgram"),defaultValue:t("./defaultValue"),extractAttributes:t("./extractAttributes"),extractUniforms:t("./extractUniforms"),generateUniformAccessObject:t("./generateUniformAccessObject"),mapSize:t("./mapSize"),mapType:t("./mapType")}},{"./compileProgram":9,"./defaultValue":10,"./extractAttributes":11,"./extractUniforms":12,"./generateUniformAccessObject":13,"./mapSize":15,"./mapType":16}],15:[function(t,e,r){var i=function(t){return n[t]},n={float:1,vec2:2,vec3:3,vec4:4,int:1,ivec2:2,ivec3:3,ivec4:4,bool:1,bvec2:2,bvec3:3,bvec4:4,mat2:4,mat3:9,mat4:16,sampler2D:1};e.exports=i},{}],16:[function(t,e,r){var i=function(t,e){if(!n){var r=Object.keys(s);n={};for(var i=0;i<r.length;++i){var o=r[i];n[t[o]]=s[o]}}return n[e]},n=null,s={FLOAT:"float",FLOAT_VEC2:"vec2",FLOAT_VEC3:"vec3",FLOAT_VEC4:"vec4",INT:"int",INT_VEC2:"ivec2",INT_VEC3:"ivec3",INT_VEC4:"ivec4",BOOL:"bool",BOOL_VEC2:"bvec2",BOOL_VEC3:"bvec3",BOOL_VEC4:"bvec4",FLOAT_MAT2:"mat2",FLOAT_MAT3:"mat3",FLOAT_MAT4:"mat4",SAMPLER_2D:"sampler2D"};e.exports=i},{}],17:[function(t,e,r){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}function n(t,e,r,i){(0,o.default)(e)(t,(0,h.default)(r),i)}Object.defineProperty(r,"__esModule",{value:!0}),r.default=n;var s=t("./internal/eachOfLimit"),o=i(s),a=t("./internal/withoutIndex"),h=i(a);e.exports=r.default},{"./internal/eachOfLimit":21,"./internal/withoutIndex":28}],18:[function(t,e,r){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}Object.defineProperty(r,"__esModule",{value:!0});var n=t("./eachLimit"),s=i(n),o=t("./internal/doLimit"),a=i(o);r.default=(0,a.default)(s.default,1),e.exports=r.default},{"./eachLimit":17,"./internal/doLimit":20}],19:[function(t,e,r){"use strict";function i(){this.head=this.tail=null,this.length=0}function n(t,e){t.length=1,t.head=t.tail=e}Object.defineProperty(r,"__esModule",{value:!0}),r.default=i,i.prototype.removeLink=function(t){return t.prev?t.prev.next=t.next:this.head=t.next,t.next?t.next.prev=t.prev:this.tail=t.prev,t.prev=t.next=null,this.length-=1,t},i.prototype.empty=i,i.prototype.insertAfter=function(t,e){e.prev=t,e.next=t.next,t.next?t.next.prev=e:this.tail=e,t.next=e,this.length+=1},i.prototype.insertBefore=function(t,e){e.prev=t.prev,e.next=t,t.prev?t.prev.next=e:this.head=e,t.prev=e,this.length+=1},i.prototype.unshift=function(t){this.head?this.insertBefore(this.head,t):n(this,t)},i.prototype.push=function(t){this.tail?this.insertAfter(this.tail,t):n(this,t)},i.prototype.shift=function(){return this.head&&this.removeLink(this.head)},i.prototype.pop=function(){return this.tail&&this.removeLink(this.tail)},e.exports=r.default},{}],20:[function(t,e,r){"use strict";function i(t,e){return function(r,i,n){return t(r,e,i,n)}}Object.defineProperty(r,"__esModule",{value:!0}),r.default=i,e.exports=r.default},{}],21:[function(t,e,r){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}function n(t){return function(e,r,i){function n(t){if(c-=1,t)u=!0,i(t);else{if(u&&c<=0)return i(null);s()}}function s(){for(;c<t&&!u;){var e=a();if(null===e)return u=!0,void(c<=0&&i(null));c+=1,r(e.value,e.key,(0,d.default)(n))}}if(i=(0,h.default)(i||o.default),t<=0||!e)return i(null);var a=(0,l.default)(e),u=!1,c=0;s()}}Object.defineProperty(r,"__esModule",{value:!0}),r.default=n;var s=t("lodash/noop"),o=i(s),a=t("./once"),h=i(a),u=t("./iterator"),l=i(u),c=t("./onlyOnce"),d=i(c);e.exports=r.default},{"./iterator":23,"./once":24,"./onlyOnce":25,"lodash/noop":54}],22:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=function(t){return i&&t[i]&&t[i]()};var i="function"==typeof Symbol&&Symbol.iterator;e.exports=r.default},{}],23:[function(t,e,r){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}function n(t){var e=-1,r=t.length;return function(){return++e<r?{value:t[e],key:e}:null}}function s(t){var e=-1;return function(){var r=t.next();return r.done?null:(e++,{value:r.value,key:e})}}function o(t){var e=(0,p.default)(t),r=-1,i=e.length;return function(){var n=e[++r];return r<i?{value:t[n],key:n}:null}}function a(t){if((0,u.default)(t))return n(t);var e=(0,c.default)(t);return e?s(e):o(t)}Object.defineProperty(r,"__esModule",{value:!0}),r.default=a;var h=t("lodash/isArrayLike"),u=i(h),l=t("./getIterator"),c=i(l),d=t("lodash/keys"),p=i(d);e.exports=r.default},{"./getIterator":22,"lodash/isArrayLike":46,"lodash/keys":53}],24:[function(t,e,r){"use strict";function i(t){return function(){if(null!==t){var e=t;t=null,e.apply(this,arguments)}}}Object.defineProperty(r,"__esModule",{value:!0}),r.default=i,e.exports=r.default},{}],25:[function(t,e,r){"use strict";function i(t){return function(){if(null===t)throw new Error("Callback was already called.");var e=t;t=null,e.apply(this,arguments)}}Object.defineProperty(r,"__esModule",{value:!0}),r.default=i,e.exports=r.default},{}],26:[function(t,e,r){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}function n(t,e,r){function i(t,e,r){if(null!=r&&"function"!=typeof r)throw new Error("task callback must be a function");return u.started=!0,(0,h.default)(t)||(t=[t]),0===t.length&&u.idle()?(0,g.default)(function(){u.drain()}):((0,o.default)(t,function(t){var i={data:t,callback:r||l.default};e?u._tasks.unshift(i):u._tasks.push(i)}),void(0,g.default)(u.process))}function n(t){return(0,d.default)(function(e){s-=1,(0,o.default)(t,function(t){(0,o.default)(a,function(e,r){if(e===t)return a.splice(r,1),!1}),t.callback.apply(t,e),null!=e[0]&&u.error(e[0],t.data)}),s<=u.concurrency-u.buffer&&u.unsaturated(),u.idle()&&u.drain(),u.process()})}if(null==e)e=1;else if(0===e)throw new Error("Concurrency must not be zero");var s=0,a=[],u={_tasks:new x.default,concurrency:e,payload:r,saturated:l.default,unsaturated:l.default,buffer:e/4,empty:l.default,drain:l.default,error:l.default,started:!1,paused:!1,push:function(t,e){i(t,!1,e)},kill:function(){u.drain=l.default,u._tasks.empty()},unshift:function(t,e){i(t,!0,e)},process:function(){for(;!u.paused&&s<u.concurrency&&u._tasks.length;){var e=[],r=[],i=u._tasks.length;u.payload&&(i=Math.min(i,u.payload));for(var o=0;o<i;o++){var h=u._tasks.shift();e.push(h),r.push(h.data)}0===u._tasks.length&&u.empty(),s+=1,a.push(e[0]),s===u.concurrency&&u.saturated();var l=(0,f.default)(n(e));t(r,l)}},length:function(){return u._tasks.length},running:function(){return s},workersList:function(){return a},idle:function(){return u._tasks.length+s===0},pause:function(){u.paused=!0},resume:function(){if(u.paused!==!1){u.paused=!1;for(var t=Math.min(u.concurrency,u._tasks.length),e=1;e<=t;e++)(0,g.default)(u.process)}}};return u}Object.defineProperty(r,"__esModule",{value:!0}),r.default=n;var s=t("lodash/_arrayEach"),o=i(s),a=t("lodash/isArray"),h=i(a),u=t("lodash/noop"),l=i(u),c=t("lodash/rest"),d=i(c),p=t("./onlyOnce"),f=i(p),v=t("./setImmediate"),g=i(v),y=t("./DoublyLinkedList"),x=i(y);e.exports=r.default},{"./DoublyLinkedList":19,"./onlyOnce":25,"./setImmediate":27,"lodash/_arrayEach":35,"lodash/isArray":45,"lodash/noop":54,"lodash/rest":55}],27:[function(t,e,r){(function(e){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}function n(t){setTimeout(t,0)}function s(t){return(0,h.default)(function(e,r){t(function(){e.apply(null,r)})})}Object.defineProperty(r,"__esModule",{value:!0}),r.hasNextTick=r.hasSetImmediate=void 0,r.fallback=n,r.wrap=s;var o,a=t("lodash/rest"),h=i(a),u=r.hasSetImmediate="function"==typeof setImmediate&&setImmediate,l=r.hasNextTick="object"==typeof e&&"function"==typeof e.nextTick;o=u?setImmediate:l?e.nextTick:n,r.default=s(o)}).call(this,t("_process"))},{_process:61,"lodash/rest":55}],28:[function(t,e,r){"use strict";function i(t){return function(e,r,i){return t(e,i)}}Object.defineProperty(r,"__esModule",{value:!0}),r.default=i,e.exports=r.default},{}],29:[function(t,e,r){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}Object.defineProperty(r,"__esModule",{value:!0}),r.default=function(t,e){return(0,s.default)(function(e,r){t(e[0],r)},e,1)};var n=t("./internal/queue"),s=i(n);e.exports=r.default},{"./internal/queue":26}],30:[function(t,e,r){"use strict";"use restrict";function i(t){var e=32;return t&=-t,t&&e--,65535&t&&(e-=16),16711935&t&&(e-=8),252645135&t&&(e-=4),858993459&t&&(e-=2),1431655765&t&&(e-=1),e}var n=32;r.INT_BITS=n,r.INT_MAX=2147483647,r.INT_MIN=-1<<n-1,r.sign=function(t){return(t>0)-(t<0)},r.abs=function(t){var e=t>>n-1;return(t^e)-e},r.min=function(t,e){return e^(t^e)&-(t<e)},r.max=function(t,e){return t^(t^e)&-(t<e)},r.isPow2=function(t){return!(t&t-1||!t)},r.log2=function(t){var e,r;return e=(t>65535)<<4,t>>>=e,r=(t>255)<<3,t>>>=r,e|=r,r=(t>15)<<2,t>>>=r,e|=r,r=(t>3)<<1,t>>>=r,e|=r,e|t>>1},r.log10=function(t){return t>=1e9?9:t>=1e8?8:t>=1e7?7:t>=1e6?6:t>=1e5?5:t>=1e4?4:t>=1e3?3:t>=100?2:t>=10?1:0},r.popCount=function(t){return t-=t>>>1&1431655765,t=(858993459&t)+(t>>>2&858993459),16843009*(t+(t>>>4)&252645135)>>>24},r.countTrailingZeros=i,r.nextPow2=function(t){return t+=0===t,--t,t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t+1},r.prevPow2=function(t){return t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t-(t>>>1)},r.parity=function(t){return t^=t>>>16,t^=t>>>8,t^=t>>>4,t&=15,27030>>>t&1};var s=new Array(256);!function(t){for(var e=0;e<256;++e){var r=e,i=e,n=7;for(r>>>=1;r;r>>>=1)i<<=1,i|=1&r,--n;t[e]=i<<n&255}}(s),r.reverse=function(t){return s[255&t]<<24|s[t>>>8&255]<<16|s[t>>>16&255]<<8|s[t>>>24&255]},r.interleave2=function(t,e){return t&=65535,t=16711935&(t|t<<8),t=252645135&(t|t<<4),t=858993459&(t|t<<2),t=1431655765&(t|t<<1),e&=65535,e=16711935&(e|e<<8),e=252645135&(e|e<<4),e=858993459&(e|e<<2),e=1431655765&(e|e<<1),t|e<<1},r.deinterleave2=function(t,e){return t=t>>>e&1431655765,t=858993459&(t|t>>>1),t=252645135&(t|t>>>2),t=16711935&(t|t>>>4),t=65535&(t|t>>>16),t<<16>>16},r.interleave3=function(t,e,r){return t&=1023,t=4278190335&(t|t<<16),t=251719695&(t|t<<8),t=3272356035&(t|t<<4),t=1227133513&(t|t<<2),e&=1023,e=4278190335&(e|e<<16),e=251719695&(e|e<<8),e=3272356035&(e|e<<4),e=1227133513&(e|e<<2),t|=e<<1,r&=1023,r=4278190335&(r|r<<16),r=251719695&(r|r<<8),r=3272356035&(r|r<<4),r=1227133513&(r|r<<2),t|r<<2},r.deinterleave3=function(t,e){return t=t>>>e&1227133513,t=3272356035&(t|t>>>2),t=251719695&(t|t>>>4),t=4278190335&(t|t>>>8),t=1023&(t|t>>>16),t<<22>>22},r.nextCombination=function(t){var e=t|t-1;return e+1|(~e&-~e)-1>>>i(t)+1}},{}],31:[function(t,e,r){"use strict";function i(t,e,r){r=r||2;var i=e&&e.length,s=i?e[0]*r:t.length,a=n(t,0,s,r,!0),h=[];if(!a)return h;var u,l,d,p,f,v,g;if(i&&(a=c(t,e,a,r)),t.length>80*r){u=d=t[0],l=p=t[1];for(var y=r;y<s;y+=r)f=t[y],v=t[y+1],f<u&&(u=f),v<l&&(l=v),f>d&&(d=f),v>p&&(p=v);g=Math.max(d-u,p-l)}return o(a,h,r,u,l,g),h}function n(t,e,r,i,n){var s,o;if(n===D(t,e,r,i)>0)for(s=e;s<r;s+=i)o=R(s,t[s],t[s+1],o);else for(s=r-i;s>=e;s-=i)o=R(s,t[s],t[s+1],o);return o&&T(o,o.next)&&(A(o),o=o.next),o}function s(t,e){if(!t)return t;e||(e=t);var r,i=t;do if(r=!1,i.steiner||!T(i,i.next)&&0!==b(i.prev,i,i.next))i=i.next;else{if(A(i),i=e=i.prev,i===i.next)return null;r=!0}while(r||i!==e);return e}function o(t,e,r,i,n,c,d){if(t){!d&&c&&v(t,i,n,c);for(var p,f,g=t;t.prev!==t.next;)if(p=t.prev,f=t.next,c?h(t,i,n,c):a(t))e.push(p.i/r),e.push(t.i/r),e.push(f.i/r),A(t),t=f.next,g=f.next;else if(t=f,t===g){d?1===d?(t=u(t,e,r),o(t,e,r,i,n,c,2)):2===d&&l(t,e,r,i,n,c):o(s(t),e,r,i,n,c,1);break}}}function a(t){var e=t.prev,r=t,i=t.next;if(b(e,r,i)>=0)return!1;for(var n=t.next.next;n!==t.prev;){if(m(e.x,e.y,r.x,r.y,i.x,i.y,n.x,n.y)&&b(n.prev,n,n.next)>=0)return!1;n=n.next}return!0}function h(t,e,r,i){var n=t.prev,s=t,o=t.next;if(b(n,s,o)>=0)return!1;for(var a=n.x<s.x?n.x<o.x?n.x:o.x:s.x<o.x?s.x:o.x,h=n.y<s.y?n.y<o.y?n.y:o.y:s.y<o.y?s.y:o.y,u=n.x>s.x?n.x>o.x?n.x:o.x:s.x>o.x?s.x:o.x,l=n.y>s.y?n.y>o.y?n.y:o.y:s.y>o.y?s.y:o.y,c=y(a,h,e,r,i),d=y(u,l,e,r,i),p=t.nextZ;p&&p.z<=d;){if(p!==t.prev&&p!==t.next&&m(n.x,n.y,s.x,s.y,o.x,o.y,p.x,p.y)&&b(p.prev,p,p.next)>=0)return!1;p=p.nextZ}for(p=t.prevZ;p&&p.z>=c;){if(p!==t.prev&&p!==t.next&&m(n.x,n.y,s.x,s.y,o.x,o.y,p.x,p.y)&&b(p.prev,p,p.next)>=0)return!1;p=p.prevZ}return!0}function u(t,e,r){var i=t;do{var n=i.prev,s=i.next.next;!T(n,s)&&E(n,i,i.next,s)&&S(n,s)&&S(s,n)&&(e.push(n.i/r),e.push(i.i/r),e.push(s.i/r),A(i),A(i.next),i=t=s),i=i.next}while(i!==t);return i}function l(t,e,r,i,n,a){var h=t;do{for(var u=h.next.next;u!==h.prev;){if(h.i!==u.i&&_(h,u)){var l=M(h,u);return h=s(h,h.next),l=s(l,l.next),o(h,e,r,i,n,a),void o(l,e,r,i,n,a)}u=u.next}h=h.next}while(h!==t)}function c(t,e,r,i){var o,a,h,u,l,c=[];for(o=0,a=e.length;o<a;o++)h=e[o]*i,u=o<a-1?e[o+1]*i:t.length,l=n(t,h,u,i,!1),l===l.next&&(l.steiner=!0),c.push(x(l));for(c.sort(d),o=0;o<c.length;o++)p(c[o],r),r=s(r,r.next);return r}function d(t,e){return t.x-e.x}function p(t,e){if(e=f(t,e)){var r=M(e,t);s(r,r.next)}}function f(t,e){var r,i=e,n=t.x,s=t.y,o=-(1/0);do{if(s<=i.y&&s>=i.next.y){var a=i.x+(s-i.y)*(i.next.x-i.x)/(i.next.y-i.y);if(a<=n&&a>o){if(o=a,a===n){if(s===i.y)return i;if(s===i.next.y)return i.next}r=i.x<i.next.x?i:i.next}}i=i.next}while(i!==e);if(!r)return null;if(n===o)return r.prev;var h,u=r,l=r.x,c=r.y,d=1/0;for(i=r.next;i!==u;)n>=i.x&&i.x>=l&&m(s<c?n:o,s,l,c,s<c?o:n,s,i.x,i.y)&&(h=Math.abs(s-i.y)/(n-i.x),(h<d||h===d&&i.x>r.x)&&S(i,t)&&(r=i,d=h)),i=i.next;return r}function v(t,e,r,i){var n=t;do null===n.z&&(n.z=y(n.x,n.y,e,r,i)),n.prevZ=n.prev,n.nextZ=n.next,n=n.next;while(n!==t);n.prevZ.nextZ=null,n.prevZ=null,g(n)}function g(t){var e,r,i,n,s,o,a,h,u=1;do{for(r=t,t=null,s=null,o=0;r;){for(o++,i=r,a=0,e=0;e<u&&(a++,i=i.nextZ,i);e++);for(h=u;a>0||h>0&&i;)0===a?(n=i,i=i.nextZ,h--):0!==h&&i?r.z<=i.z?(n=r,r=r.nextZ,a--):(n=i,i=i.nextZ,h--):(n=r,r=r.nextZ,a--),s?s.nextZ=n:t=n,n.prevZ=s,s=n;r=i}s.nextZ=null,u*=2}while(o>1);return t}function y(t,e,r,i,n){return t=32767*(t-r)/n,e=32767*(e-i)/n,t=16711935&(t|t<<8),t=252645135&(t|t<<4),t=858993459&(t|t<<2),t=1431655765&(t|t<<1),e=16711935&(e|e<<8),e=252645135&(e|e<<4),e=858993459&(e|e<<2),e=1431655765&(e|e<<1),t|e<<1}function x(t){var e=t,r=t;do e.x<r.x&&(r=e),e=e.next;while(e!==t);return r}function m(t,e,r,i,n,s,o,a){return(n-o)*(e-a)-(t-o)*(s-a)>=0&&(t-o)*(i-a)-(r-o)*(e-a)>=0&&(r-o)*(s-a)-(n-o)*(i-a)>=0}function _(t,e){return t.next.i!==e.i&&t.prev.i!==e.i&&!w(t,e)&&S(t,e)&&S(e,t)&&C(t,e)}function b(t,e,r){return(e.y-t.y)*(r.x-e.x)-(e.x-t.x)*(r.y-e.y)}function T(t,e){return t.x===e.x&&t.y===e.y}function E(t,e,r,i){return!!(T(t,e)&&T(r,i)||T(t,i)&&T(r,e))||b(t,e,r)>0!=b(t,e,i)>0&&b(r,i,t)>0!=b(r,i,e)>0}function w(t,e){var r=t;do{if(r.i!==t.i&&r.next.i!==t.i&&r.i!==e.i&&r.next.i!==e.i&&E(r,r.next,t,e))return!0;r=r.next}while(r!==t);return!1}function S(t,e){return b(t.prev,t,t.next)<0?b(t,e,t.next)>=0&&b(t,t.prev,e)>=0:b(t,e,t.prev)<0||b(t,t.next,e)<0}function C(t,e){var r=t,i=!1,n=(t.x+e.x)/2,s=(t.y+e.y)/2;do r.y>s!=r.next.y>s&&n<(r.next.x-r.x)*(s-r.y)/(r.next.y-r.y)+r.x&&(i=!i),r=r.next;while(r!==t);return i}function M(t,e){var r=new O(t.i,t.x,t.y),i=new O(e.i,e.x,e.y),n=t.next,s=e.prev;return t.next=e,e.prev=t,r.next=n,n.prev=r,i.next=r,r.prev=i,s.next=i,i.prev=s,i}function R(t,e,r,i){var n=new O(t,e,r);return i?(n.next=i.next,n.prev=i,i.next.prev=n,i.next=n):(n.prev=n,n.next=n),n}function A(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ)}function O(t,e,r){this.i=t,this.x=e,this.y=r,this.prev=null,this.next=null,this.z=null,this.prevZ=null,this.nextZ=null,this.steiner=!1}function D(t,e,r,i){for(var n=0,s=e,o=r-i;s<r;s+=i)n+=(t[o]-t[s])*(t[s+1]+t[o+1]),o=s;return n}e.exports=i,i.deviation=function(t,e,r,i){var n=e&&e.length,s=n?e[0]*r:t.length,o=Math.abs(D(t,0,s,r));if(n)for(var a=0,h=e.length;a<h;a++){var u=e[a]*r,l=a<h-1?e[a+1]*r:t.length;o-=Math.abs(D(t,u,l,r))}var c=0;for(a=0;a<i.length;a+=3){var d=i[a]*r,p=i[a+1]*r,f=i[a+2]*r;c+=Math.abs((t[d]-t[f])*(t[p+1]-t[d+1])-(t[d]-t[p])*(t[f+1]-t[d+1]))}return 0===o&&0===c?0:Math.abs((c-o)/o)},i.flatten=function(t){for(var e=t[0][0].length,r={vertices:[],holes:[],dimensions:e},i=0,n=0;n<t.length;n++){for(var s=0;s<t[n].length;s++)for(var o=0;o<e;o++)r.vertices.push(t[n][s][o]);n>0&&(i+=t[n-1].length,r.holes.push(i))}return r}},{}],32:[function(t,e,r){"use strict";function i(t,e,r){this.fn=t,this.context=e,this.once=r||!1}function n(){}var s=Object.prototype.hasOwnProperty,o="function"!=typeof Object.create&&"~";n.prototype._events=void 0,n.prototype.eventNames=function(){var t,e=this._events,r=[];if(!e)return r;for(t in e)s.call(e,t)&&r.push(o?t.slice(1):t);return Object.getOwnPropertySymbols?r.concat(Object.getOwnPropertySymbols(e)):r},n.prototype.listeners=function(t,e){var r=o?o+t:t,i=this._events&&this._events[r];if(e)return!!i;if(!i)return[];if(i.fn)return[i.fn];for(var n=0,s=i.length,a=new Array(s);n<s;n++)a[n]=i[n].fn;return a},n.prototype.emit=function(t,e,r,i,n,s){var a=o?o+t:t;if(!this._events||!this._events[a])return!1;var h,u,l=this._events[a],c=arguments.length;if("function"==typeof l.fn){switch(l.once&&this.removeListener(t,l.fn,void 0,!0),c){case 1:return l.fn.call(l.context),!0;case 2:return l.fn.call(l.context,e),!0;case 3:return l.fn.call(l.context,e,r),!0;case 4:return l.fn.call(l.context,e,r,i),!0;case 5:return l.fn.call(l.context,e,r,i,n),!0;case 6:return l.fn.call(l.context,e,r,i,n,s),!0}for(u=1,h=new Array(c-1);u<c;u++)h[u-1]=arguments[u];l.fn.apply(l.context,h)}else{var d,p=l.length;for(u=0;u<p;u++)switch(l[u].once&&this.removeListener(t,l[u].fn,void 0,!0),c){case 1:l[u].fn.call(l[u].context);break;case 2:l[u].fn.call(l[u].context,e);break;case 3:l[u].fn.call(l[u].context,e,r);break;default:if(!h)for(d=1,
h=new Array(c-1);d<c;d++)h[d-1]=arguments[d];l[u].fn.apply(l[u].context,h)}}return!0},n.prototype.on=function(t,e,r){var n=new i(e,r||this),s=o?o+t:t;return this._events||(this._events=o?{}:Object.create(null)),this._events[s]?this._events[s].fn?this._events[s]=[this._events[s],n]:this._events[s].push(n):this._events[s]=n,this},n.prototype.once=function(t,e,r){var n=new i(e,r||this,(!0)),s=o?o+t:t;return this._events||(this._events=o?{}:Object.create(null)),this._events[s]?this._events[s].fn?this._events[s]=[this._events[s],n]:this._events[s].push(n):this._events[s]=n,this},n.prototype.removeListener=function(t,e,r,i){var n=o?o+t:t;if(!this._events||!this._events[n])return this;var s=this._events[n],a=[];if(e)if(s.fn)(s.fn!==e||i&&!s.once||r&&s.context!==r)&&a.push(s);else for(var h=0,u=s.length;h<u;h++)(s[h].fn!==e||i&&!s[h].once||r&&s[h].context!==r)&&a.push(s[h]);return a.length?this._events[n]=1===a.length?a[0]:a:delete this._events[n],this},n.prototype.removeAllListeners=function(t){return this._events?(t?delete this._events[o?o+t:t]:this._events=o?{}:Object.create(null),this):this},n.prototype.off=n.prototype.removeListener,n.prototype.addListener=n.prototype.on,n.prototype.setMaxListeners=function(){return this},n.prefixed=o,"undefined"!=typeof e&&(e.exports=n)},{}],33:[function(e,r,i){!function(e){var i=/iPhone/i,n=/iPod/i,s=/iPad/i,o=/(?=.*\bAndroid\b)(?=.*\bMobile\b)/i,a=/Android/i,h=/(?=.*\bAndroid\b)(?=.*\bSD4930UR\b)/i,u=/(?=.*\bAndroid\b)(?=.*\b(?:KFOT|KFTT|KFJWI|KFJWA|KFSOWI|KFTHWI|KFTHWA|KFAPWI|KFAPWA|KFARWI|KFASWI|KFSAWI|KFSAWA)\b)/i,l=/IEMobile/i,c=/(?=.*\bWindows\b)(?=.*\bARM\b)/i,d=/BlackBerry/i,p=/BB10/i,f=/Opera Mini/i,v=/(CriOS|Chrome)(?=.*\bMobile\b)/i,g=/(?=.*\bFirefox\b)(?=.*\bMobile\b)/i,y=new RegExp("(?:Nexus 7|BNTV250|Kindle Fire|Silk|GT-P1000)","i"),x=function(t,e){return t.test(e)},m=function(t){var e=t||navigator.userAgent,r=e.split("[FBAN");if("undefined"!=typeof r[1]&&(e=r[0]),r=e.split("Twitter"),"undefined"!=typeof r[1]&&(e=r[0]),this.apple={phone:x(i,e),ipod:x(n,e),tablet:!x(i,e)&&x(s,e),device:x(i,e)||x(n,e)||x(s,e)},this.amazon={phone:x(h,e),tablet:!x(h,e)&&x(u,e),device:x(h,e)||x(u,e)},this.android={phone:x(h,e)||x(o,e),tablet:!x(h,e)&&!x(o,e)&&(x(u,e)||x(a,e)),device:x(h,e)||x(u,e)||x(o,e)||x(a,e)},this.windows={phone:x(l,e),tablet:x(c,e),device:x(l,e)||x(c,e)},this.other={blackberry:x(d,e),blackberry10:x(p,e),opera:x(f,e),firefox:x(g,e),chrome:x(v,e),device:x(d,e)||x(p,e)||x(f,e)||x(g,e)||x(v,e)},this.seven_inch=x(y,e),this.any=this.apple.device||this.android.device||this.windows.device||this.other.device||this.seven_inch,this.phone=this.apple.phone||this.android.phone||this.windows.phone,this.tablet=this.apple.tablet||this.android.tablet||this.windows.tablet,"undefined"==typeof window)return this},_=function(){var t=new m;return t.Class=m,t};"undefined"!=typeof r&&r.exports&&"undefined"==typeof window?r.exports=m:"undefined"!=typeof r&&r.exports&&"undefined"!=typeof window?r.exports=_():"function"==typeof t&&t.amd?t("isMobile",[],e.isMobile=_()):e.isMobile=_()}(this)},{}],34:[function(t,e,r){function i(t,e,r){switch(r.length){case 0:return t.call(e);case 1:return t.call(e,r[0]);case 2:return t.call(e,r[0],r[1]);case 3:return t.call(e,r[0],r[1],r[2])}return t.apply(e,r)}e.exports=i},{}],35:[function(t,e,r){function i(t,e){for(var r=-1,i=t?t.length:0;++r<i&&e(t[r],r,t)!==!1;);return t}e.exports=i},{}],36:[function(t,e,r){function i(t,e){var r=o(t)||s(t)?n(t.length,String):[],i=r.length,h=!!i;for(var l in t)!e&&!u.call(t,l)||h&&("length"==l||a(l,i))||r.push(l);return r}var n=t("./_baseTimes"),s=t("./isArguments"),o=t("./isArray"),a=t("./_isIndex"),h=Object.prototype,u=h.hasOwnProperty;e.exports=i},{"./_baseTimes":39,"./_isIndex":40,"./isArguments":44,"./isArray":45}],37:[function(t,e,r){function i(t){if(!n(t))return s(t);var e=[];for(var r in Object(t))a.call(t,r)&&"constructor"!=r&&e.push(r);return e}var n=t("./_isPrototype"),s=t("./_nativeKeys"),o=Object.prototype,a=o.hasOwnProperty;e.exports=i},{"./_isPrototype":41,"./_nativeKeys":42}],38:[function(t,e,r){function i(t,e){return e=s(void 0===e?t.length-1:e,0),function(){for(var r=arguments,i=-1,o=s(r.length-e,0),a=Array(o);++i<o;)a[i]=r[e+i];i=-1;for(var h=Array(e+1);++i<e;)h[i]=r[i];return h[e]=a,n(t,this,h)}}var n=t("./_apply"),s=Math.max;e.exports=i},{"./_apply":34}],39:[function(t,e,r){function i(t,e){for(var r=-1,i=Array(t);++r<t;)i[r]=e(r);return i}e.exports=i},{}],40:[function(t,e,r){function i(t,e){return e=null==e?n:e,!!e&&("number"==typeof t||s.test(t))&&t>-1&&t%1==0&&t<e}var n=9007199254740991,s=/^(?:0|[1-9]\d*)$/;e.exports=i},{}],41:[function(t,e,r){function i(t){var e=t&&t.constructor,r="function"==typeof e&&e.prototype||n;return t===r}var n=Object.prototype;e.exports=i},{}],42:[function(t,e,r){var i=t("./_overArg"),n=i(Object.keys,Object);e.exports=n},{"./_overArg":43}],43:[function(t,e,r){function i(t,e){return function(r){return t(e(r))}}e.exports=i},{}],44:[function(t,e,r){function i(t){return n(t)&&a.call(t,"callee")&&(!u.call(t,"callee")||h.call(t)==s)}var n=t("./isArrayLikeObject"),s="[object Arguments]",o=Object.prototype,a=o.hasOwnProperty,h=o.toString,u=o.propertyIsEnumerable;e.exports=i},{"./isArrayLikeObject":47}],45:[function(t,e,r){var i=Array.isArray;e.exports=i},{}],46:[function(t,e,r){function i(t){return null!=t&&s(t.length)&&!n(t)}var n=t("./isFunction"),s=t("./isLength");e.exports=i},{"./isFunction":48,"./isLength":49}],47:[function(t,e,r){function i(t){return s(t)&&n(t)}var n=t("./isArrayLike"),s=t("./isObjectLike");e.exports=i},{"./isArrayLike":46,"./isObjectLike":51}],48:[function(t,e,r){function i(t){var e=n(t)?h.call(t):"";return e==s||e==o}var n=t("./isObject"),s="[object Function]",o="[object GeneratorFunction]",a=Object.prototype,h=a.toString;e.exports=i},{"./isObject":50}],49:[function(t,e,r){function i(t){return"number"==typeof t&&t>-1&&t%1==0&&t<=n}var n=9007199254740991;e.exports=i},{}],50:[function(t,e,r){function i(t){var e=typeof t;return!!t&&("object"==e||"function"==e)}e.exports=i},{}],51:[function(t,e,r){function i(t){return!!t&&"object"==typeof t}e.exports=i},{}],52:[function(t,e,r){function i(t){return"symbol"==typeof t||n(t)&&a.call(t)==s}var n=t("./isObjectLike"),s="[object Symbol]",o=Object.prototype,a=o.toString;e.exports=i},{"./isObjectLike":51}],53:[function(t,e,r){function i(t){return o(t)?n(t):s(t)}var n=t("./_arrayLikeKeys"),s=t("./_baseKeys"),o=t("./isArrayLike");e.exports=i},{"./_arrayLikeKeys":36,"./_baseKeys":37,"./isArrayLike":46}],54:[function(t,e,r){function i(){}e.exports=i},{}],55:[function(t,e,r){function i(t,e){if("function"!=typeof t)throw new TypeError(o);return e=void 0===e?e:s(e),n(t,e)}var n=t("./_baseRest"),s=t("./toInteger"),o="Expected a function";e.exports=i},{"./_baseRest":38,"./toInteger":57}],56:[function(t,e,r){function i(t){if(!t)return 0===t?t:0;if(t=n(t),t===s||t===-s){var e=t<0?-1:1;return e*o}return t===t?t:0}var n=t("./toNumber"),s=1/0,o=1.7976931348623157e308;e.exports=i},{"./toNumber":58}],57:[function(t,e,r){function i(t){var e=n(t),r=e%1;return e===e?r?e-r:e:0}var n=t("./toFinite");e.exports=i},{"./toFinite":56}],58:[function(t,e,r){function i(t){if("number"==typeof t)return t;if(s(t))return o;if(n(t)){var e="function"==typeof t.valueOf?t.valueOf():t;t=n(e)?e+"":e}if("string"!=typeof t)return 0===t?t:+t;t=t.replace(a,"");var r=u.test(t);return r||l.test(t)?c(t.slice(2),r?2:8):h.test(t)?o:+t}var n=t("./isObject"),s=t("./isSymbol"),o=NaN,a=/^\s+|\s+$/g,h=/^[-+]0x[0-9a-f]+$/i,u=/^0b[01]+$/i,l=/^0o[0-7]+$/i,c=parseInt;e.exports=i},{"./isObject":50,"./isSymbol":52}],59:[function(t,e,r){"use strict";function i(t){if(null===t||void 0===t)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(t)}function n(){try{if(!Object.assign)return!1;var t=new String("abc");if(t[5]="de","5"===Object.getOwnPropertyNames(t)[0])return!1;for(var e={},r=0;r<10;r++)e["_"+String.fromCharCode(r)]=r;var i=Object.getOwnPropertyNames(e).map(function(t){return e[t]});if("0123456789"!==i.join(""))return!1;var n={};return"abcdefghijklmnopqrst".split("").forEach(function(t){n[t]=t}),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},n)).join("")}catch(t){return!1}}var s=Object.prototype.hasOwnProperty,o=Object.prototype.propertyIsEnumerable;e.exports=n()?Object.assign:function(t,e){for(var r,n,a=i(t),h=1;h<arguments.length;h++){r=Object(arguments[h]);for(var u in r)s.call(r,u)&&(a[u]=r[u]);if(Object.getOwnPropertySymbols){n=Object.getOwnPropertySymbols(r);for(var l=0;l<n.length;l++)o.call(r,n[l])&&(a[n[l]]=r[n[l]])}}return a}},{}],60:[function(t,e,r){(function(t){function e(t,e){for(var r=0,i=t.length-1;i>=0;i--){var n=t[i];"."===n?t.splice(i,1):".."===n?(t.splice(i,1),r++):r&&(t.splice(i,1),r--)}if(e)for(;r--;r)t.unshift("..");return t}function i(t,e){if(t.filter)return t.filter(e);for(var r=[],i=0;i<t.length;i++)e(t[i],i,t)&&r.push(t[i]);return r}var n=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/,s=function(t){return n.exec(t).slice(1)};r.resolve=function(){for(var r="",n=!1,s=arguments.length-1;s>=-1&&!n;s--){var o=s>=0?arguments[s]:t.cwd();if("string"!=typeof o)throw new TypeError("Arguments to path.resolve must be strings");o&&(r=o+"/"+r,n="/"===o.charAt(0))}return r=e(i(r.split("/"),function(t){return!!t}),!n).join("/"),(n?"/":"")+r||"."},r.normalize=function(t){var n=r.isAbsolute(t),s="/"===o(t,-1);return t=e(i(t.split("/"),function(t){return!!t}),!n).join("/"),t||n||(t="."),t&&s&&(t+="/"),(n?"/":"")+t},r.isAbsolute=function(t){return"/"===t.charAt(0)},r.join=function(){var t=Array.prototype.slice.call(arguments,0);return r.normalize(i(t,function(t,e){if("string"!=typeof t)throw new TypeError("Arguments to path.join must be strings");return t}).join("/"))},r.relative=function(t,e){function i(t){for(var e=0;e<t.length&&""===t[e];e++);for(var r=t.length-1;r>=0&&""===t[r];r--);return e>r?[]:t.slice(e,r-e+1)}t=r.resolve(t).substr(1),e=r.resolve(e).substr(1);for(var n=i(t.split("/")),s=i(e.split("/")),o=Math.min(n.length,s.length),a=o,h=0;h<o;h++)if(n[h]!==s[h]){a=h;break}for(var u=[],h=a;h<n.length;h++)u.push("..");return u=u.concat(s.slice(a)),u.join("/")},r.sep="/",r.delimiter=":",r.dirname=function(t){var e=s(t),r=e[0],i=e[1];return r||i?(i&&(i=i.substr(0,i.length-1)),r+i):"."},r.basename=function(t,e){var r=s(t)[2];return e&&r.substr(-1*e.length)===e&&(r=r.substr(0,r.length-e.length)),r},r.extname=function(t){return s(t)[3]};var o="b"==="ab".substr(-1)?function(t,e,r){return t.substr(e,r)}:function(t,e,r){return e<0&&(e=t.length+e),t.substr(e,r)}}).call(this,t("_process"))},{_process:61}],61:[function(t,e,r){function i(){throw new Error("setTimeout has not been defined")}function n(){throw new Error("clearTimeout has not been defined")}function s(t){if(c===setTimeout)return setTimeout(t,0);if((c===i||!c)&&setTimeout)return c=setTimeout,setTimeout(t,0);try{return c(t,0)}catch(e){try{return c.call(null,t,0)}catch(e){return c.call(this,t,0)}}}function o(t){if(d===clearTimeout)return clearTimeout(t);if((d===n||!d)&&clearTimeout)return d=clearTimeout,clearTimeout(t);try{return d(t)}catch(e){try{return d.call(null,t)}catch(e){return d.call(this,t)}}}function a(){g&&f&&(g=!1,f.length?v=f.concat(v):y=-1,v.length&&h())}function h(){if(!g){var t=s(a);g=!0;for(var e=v.length;e;){for(f=v,v=[];++y<e;)f&&f[y].run();y=-1,e=v.length}f=null,g=!1,o(t)}}function u(t,e){this.fun=t,this.array=e}function l(){}var c,d,p=e.exports={};!function(){try{c="function"==typeof setTimeout?setTimeout:i}catch(t){c=i}try{d="function"==typeof clearTimeout?clearTimeout:n}catch(t){d=n}}();var f,v=[],g=!1,y=-1;p.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)e[r-1]=arguments[r];v.push(new u(t,e)),1!==v.length||g||s(h)},u.prototype.run=function(){this.fun.apply(null,this.array)},p.title="browser",p.browser=!0,p.env={},p.argv=[],p.version="",p.versions={},p.on=l,p.addListener=l,p.once=l,p.off=l,p.removeListener=l,p.removeAllListeners=l,p.emit=l,p.binding=function(t){throw new Error("process.binding is not supported")},p.cwd=function(){return"/"},p.chdir=function(t){throw new Error("process.chdir is not supported")},p.umask=function(){return 0}},{}],62:[function(e,r,i){(function(e){!function(n){function s(t){throw new RangeError(L[t])}function o(t,e){for(var r=t.length,i=[];r--;)i[r]=e(t[r]);return i}function a(t,e){var r=t.split("@"),i="";r.length>1&&(i=r[0]+"@",t=r[1]),t=t.replace(I,".");var n=t.split("."),s=o(n,e).join(".");return i+s}function h(t){for(var e,r,i=[],n=0,s=t.length;n<s;)e=t.charCodeAt(n++),e>=55296&&e<=56319&&n<s?(r=t.charCodeAt(n++),56320==(64512&r)?i.push(((1023&e)<<10)+(1023&r)+65536):(i.push(e),n--)):i.push(e);return i}function u(t){return o(t,function(t){var e="";return t>65535&&(t-=65536,e+=N(t>>>10&1023|55296),t=56320|1023&t),e+=N(t)}).join("")}function l(t){return t-48<10?t-22:t-65<26?t-65:t-97<26?t-97:E}function c(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function d(t,e,r){var i=0;for(t=r?B(t/M):t>>1,t+=B(t/e);t>F*S>>1;i+=E)t=B(t/F);return B(i+(F+1)*t/(t+C))}function p(t){var e,r,i,n,o,a,h,c,p,f,v=[],g=t.length,y=0,x=A,m=R;for(r=t.lastIndexOf(O),r<0&&(r=0),i=0;i<r;++i)t.charCodeAt(i)>=128&&s("not-basic"),v.push(t.charCodeAt(i));for(n=r>0?r+1:0;n<g;){for(o=y,a=1,h=E;n>=g&&s("invalid-input"),c=l(t.charCodeAt(n++)),(c>=E||c>B((T-y)/a))&&s("overflow"),y+=c*a,p=h<=m?w:h>=m+S?S:h-m,!(c<p);h+=E)f=E-p,a>B(T/f)&&s("overflow"),a*=f;e=v.length+1,m=d(y-o,e,0==o),B(y/e)>T-x&&s("overflow"),x+=B(y/e),y%=e,v.splice(y++,0,x)}return u(v)}function f(t){var e,r,i,n,o,a,u,l,p,f,v,g,y,x,m,_=[];for(t=h(t),g=t.length,e=A,r=0,o=R,a=0;a<g;++a)v=t[a],v<128&&_.push(N(v));for(i=n=_.length,n&&_.push(O);i<g;){for(u=T,a=0;a<g;++a)v=t[a],v>=e&&v<u&&(u=v);for(y=i+1,u-e>B((T-r)/y)&&s("overflow"),r+=(u-e)*y,e=u,a=0;a<g;++a)if(v=t[a],v<e&&++r>T&&s("overflow"),v==e){for(l=r,p=E;f=p<=o?w:p>=o+S?S:p-o,!(l<f);p+=E)m=l-f,x=E-f,_.push(N(c(f+m%x,0))),l=B(m/x);_.push(N(c(l,0))),o=d(r,y,i==n),r=0,++i}++r,++e}return _.join("")}function v(t){return a(t,function(t){return D.test(t)?p(t.slice(4).toLowerCase()):t})}function g(t){return a(t,function(t){return P.test(t)?"xn--"+f(t):t})}var y="object"==typeof i&&i&&!i.nodeType&&i,x="object"==typeof r&&r&&!r.nodeType&&r,m="object"==typeof e&&e;m.global!==m&&m.window!==m&&m.self!==m||(n=m);var _,b,T=2147483647,E=36,w=1,S=26,C=38,M=700,R=72,A=128,O="-",D=/^xn--/,P=/[^\x20-\x7E]/,I=/[\x2E\u3002\uFF0E\uFF61]/g,L={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},F=E-w,B=Math.floor,N=String.fromCharCode;if(_={version:"1.4.1",ucs2:{decode:h,encode:u},decode:p,encode:f,toASCII:g,toUnicode:v},"function"==typeof t&&"object"==typeof t.amd&&t.amd)t("punycode",function(){return _});else if(y&&x)if(r.exports==y)x.exports=_;else for(b in _)_.hasOwnProperty(b)&&(y[b]=_[b]);else n.punycode=_}(this)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],63:[function(t,e,r){"use strict";function i(t,e){return Object.prototype.hasOwnProperty.call(t,e)}e.exports=function(t,e,r,s){e=e||"&",r=r||"=";var o={};if("string"!=typeof t||0===t.length)return o;var a=/\+/g;t=t.split(e);var h=1e3;s&&"number"==typeof s.maxKeys&&(h=s.maxKeys);var u=t.length;h>0&&u>h&&(u=h);for(var l=0;l<u;++l){var c,d,p,f,v=t[l].replace(a,"%20"),g=v.indexOf(r);g>=0?(c=v.substr(0,g),d=v.substr(g+1)):(c=v,d=""),p=decodeURIComponent(c),f=decodeURIComponent(d),i(o,p)?n(o[p])?o[p].push(f):o[p]=[o[p],f]:o[p]=f}return o};var n=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)}},{}],64:[function(t,e,r){"use strict";function i(t,e){if(t.map)return t.map(e);for(var r=[],i=0;i<t.length;i++)r.push(e(t[i],i));return r}var n=function(t){switch(typeof t){case"string":return t;case"boolean":return t?"true":"false";case"number":return isFinite(t)?t:"";default:return""}};e.exports=function(t,e,r,a){return e=e||"&",r=r||"=",null===t&&(t=void 0),"object"==typeof t?i(o(t),function(o){var a=encodeURIComponent(n(o))+r;return s(t[o])?i(t[o],function(t){return a+encodeURIComponent(n(t))}).join(e):a+encodeURIComponent(n(t[o]))}).join(e):a?encodeURIComponent(n(a))+r+encodeURIComponent(n(t)):""};var s=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)},o=Object.keys||function(t){var e=[];for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&e.push(r);return e}},{}],65:[function(t,e,r){"use strict";r.decode=r.parse=t("./decode"),r.encode=r.stringify=t("./encode")},{"./decode":63,"./encode":64}],66:[function(t,e,r){"use strict";function i(t,e){h.call(this),e=e||u,this.baseUrl=t||"",this.progress=0,this.loading=!1,this._progressChunk=0,this._beforeMiddleware=[],this._afterMiddleware=[],this._boundLoadResource=this._loadResource.bind(this),this._buffer=[],this._numToLoad=0,this._queue=n(this._boundLoadResource,e),this.resources={}}var n=t("async/queue"),s=t("async/eachSeries"),o=t("url"),a=t("./Resource"),h=t("eventemitter3"),u=10,l=100;i.prototype=Object.create(h.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.add=i.prototype.enqueue=function(t,e,r,i){if(Array.isArray(t)){for(var n=0;n<t.length;++n)this.add(t[n]);return this}if("object"==typeof t&&(i=e||t.callback||t.onComplete,r=t,e=t.url,t=t.name||t.key||t.url),"string"!=typeof e&&(i=r,r=e,e=t),"string"!=typeof e)throw new Error("No url passed to add resource to loader.");if("function"==typeof r&&(i=r,r=null),this.resources[t])throw new Error('Resource with name "'+t+'" already exists.');return e=this._prepareUrl(e),this.resources[t]=new a(t,e,r),"function"==typeof i&&this.resources[t].once("afterMiddleware",i),this._numToLoad++,this._queue.started?(this._queue.push(this.resources[t]),this._progressChunk=(l-this.progress)/(this._queue.length()+this._queue.running())):(this._buffer.push(this.resources[t]),this._progressChunk=l/this._buffer.length),this},i.prototype.before=i.prototype.pre=function(t){return this._beforeMiddleware.push(t),this},i.prototype.after=i.prototype.use=function(t){return this._afterMiddleware.push(t),this},i.prototype.reset=function(){this.progress=0,this.loading=!1,this._progressChunk=0,this._buffer.length=0,this._numToLoad=0,this._queue.kill(),this._queue.started=!1;for(var t in this.resources){var e=this.resources[t];e.off("complete",this._onLoad,this),e.isLoading&&e.abort()}return this.resources={},this},i.prototype.load=function(t){if("function"==typeof t&&this.once("complete",t),this._queue.started)return this;this.emit("start",this),this.loading=!0;for(var e=0;e<this._buffer.length;++e)this._queue.push(this._buffer[e]);return this._buffer.length=0,this},i.prototype._prepareUrl=function(t){var e=o.parse(t);return e.protocol||!e.pathname||0===e.pathname.indexOf("//")?t:this.baseUrl.length&&this.baseUrl.lastIndexOf("/")!==this.baseUrl.length-1&&"/"!==t.charAt(0)?this.baseUrl+"/"+t:this.baseUrl+t},i.prototype._loadResource=function(t,e){var r=this;t._dequeue=e,s(this._beforeMiddleware,function(e,i){e.call(r,t,function(){i(t.isComplete?{}:null)})},function(){t.isComplete?r._onLoad(t):(t.once("complete",r._onLoad,r),t.load())})},i.prototype._onComplete=function(){this.loading=!1,this.emit("complete",this,this.resources)},i.prototype._onLoad=function(t){var e=this;s(this._afterMiddleware,function(r,i){r.call(e,t,i)},function(){t.emit("afterMiddleware",t),e._numToLoad--,e.progress+=e._progressChunk,e.emit("progress",e,t),t.error?e.emit("error",t.error,e,t):e.emit("load",e,t),0===e._numToLoad&&(e.progress=100,e._onComplete())}),t._dequeue()},i.LOAD_TYPE=a.LOAD_TYPE,i.XHR_RESPONSE_TYPE=a.XHR_RESPONSE_TYPE},{"./Resource":67,"async/eachSeries":18,"async/queue":29,eventemitter3:32,url:72}],67:[function(t,e,r){"use strict";function i(t,e,r){if(o.call(this),r=r||{},"string"!=typeof t||"string"!=typeof e)throw new Error("Both name and url are required for constructing a resource.");this.name=t,this.url=e,this.isDataUrl=0===this.url.indexOf("data:"),this.data=null,this.crossOrigin=r.crossOrigin===!0?"anonymous":r.crossOrigin,this.loadType=r.loadType||this._determineLoadType(),this.xhrType=r.xhrType,this.metadata=r.metadata||{},this.error=null,this.xhr=null,this.isJson=!1,this.isXml=!1,this.isImage=!1,this.isAudio=!1,this.isVideo=!1,this.isComplete=!1,this.isLoading=!1,this._dequeue=null,this._boundComplete=this.complete.bind(this),this._boundOnError=this._onError.bind(this),this._boundOnProgress=this._onProgress.bind(this),this._boundXhrOnError=this._xhrOnError.bind(this),this._boundXhrOnAbort=this._xhrOnAbort.bind(this),this._boundXhrOnLoad=this._xhrOnLoad.bind(this),this._boundXdrOnTimeout=this._xdrOnTimeout.bind(this)}function n(t){return t.toString().replace("object ","")}function s(t,e,r){e&&0===e.indexOf(".")&&(e=e.substring(1)),e&&(t[e]=r)}var o=t("eventemitter3"),a=t("url"),h=!(!window.XDomainRequest||"withCredentials"in new XMLHttpRequest),u=null,l=0,c=200,d=204;i.prototype=Object.create(o.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.complete=function(){if(this.data&&this.data.removeEventListener&&(this.data.removeEventListener("error",this._boundOnError,!1),this.data.removeEventListener("load",this._boundComplete,!1),this.data.removeEventListener("progress",this._boundOnProgress,!1),this.data.removeEventListener("canplaythrough",this._boundComplete,!1)),this.xhr&&(this.xhr.removeEventListener?(this.xhr.removeEventListener("error",this._boundXhrOnError,!1),this.xhr.removeEventListener("abort",this._boundXhrOnAbort,!1),this.xhr.removeEventListener("progress",this._boundOnProgress,!1),this.xhr.removeEventListener("load",this._boundXhrOnLoad,!1)):(this.xhr.onerror=null,this.xhr.ontimeout=null,this.xhr.onprogress=null,this.xhr.onload=null)),this.isComplete)throw new Error("Complete called again for an already completed resource.");this.isComplete=!0,this.isLoading=!1,this.emit("complete",this)},i.prototype.abort=function(t){if(!this.error){if(this.error=new Error(t),this.xhr)this.xhr.abort();else if(this.xdr)this.xdr.abort();else if(this.data)if("undefined"!=typeof this.data.src)this.data.src="";else for(;this.data.firstChild;)this.data.removeChild(this.data.firstChild);this.complete()}},i.prototype.load=function(t){if(!this.isLoading)if(this.isComplete){if(t){var e=this;setTimeout(function(){t(e)},1)}}else switch(t&&this.once("complete",t),this.isLoading=!0,this.emit("start",this),this.crossOrigin!==!1&&"string"==typeof this.crossOrigin||(this.crossOrigin=this._determineCrossOrigin(this.url)),this.loadType){case i.LOAD_TYPE.IMAGE:this._loadElement("image");break;case i.LOAD_TYPE.AUDIO:this._loadSourceElement("audio");break;case i.LOAD_TYPE.VIDEO:this._loadSourceElement("video");break;case i.LOAD_TYPE.XHR:default:h&&this.crossOrigin?this._loadXdr():this._loadXhr()}},i.prototype._loadElement=function(t){this.metadata.loadElement?this.data=this.metadata.loadElement:"image"===t&&"undefined"!=typeof window.Image?this.data=new Image:this.data=document.createElement(t),this.crossOrigin&&(this.data.crossOrigin=this.crossOrigin),this.metadata.skipSource||(this.data.src=this.url);var e="is"+t[0].toUpperCase()+t.substring(1);this[e]===!1&&(this[e]=!0),this.data.addEventListener("error",this._boundOnError,!1),this.data.addEventListener("load",this._boundComplete,!1),this.data.addEventListener("progress",this._boundOnProgress,!1)},i.prototype._loadSourceElement=function(t){if(this.metadata.loadElement?this.data=this.metadata.loadElement:"audio"===t&&"undefined"!=typeof window.Audio?this.data=new Audio:this.data=document.createElement(t),null===this.data)return void this.abort("Unsupported element "+t);if(!this.metadata.skipSource)if(navigator.isCocoonJS)this.data.src=Array.isArray(this.url)?this.url[0]:this.url;else if(Array.isArray(this.url))for(var e=0;e<this.url.length;++e)this.data.appendChild(this._createSource(t,this.url[e]));else this.data.appendChild(this._createSource(t,this.url));this["is"+t[0].toUpperCase()+t.substring(1)]=!0,this.data.addEventListener("error",this._boundOnError,!1),this.data.addEventListener("load",this._boundComplete,!1),this.data.addEventListener("progress",this._boundOnProgress,!1),this.data.addEventListener("canplaythrough",this._boundComplete,!1),this.data.load()},i.prototype._loadXhr=function(){"string"!=typeof this.xhrType&&(this.xhrType=this._determineXhrType());var t=this.xhr=new XMLHttpRequest;t.open("GET",this.url,!0),this.xhrType===i.XHR_RESPONSE_TYPE.JSON||this.xhrType===i.XHR_RESPONSE_TYPE.DOCUMENT?t.responseType=i.XHR_RESPONSE_TYPE.TEXT:t.responseType=this.xhrType,t.addEventListener("error",this._boundXhrOnError,!1),t.addEventListener("abort",this._boundXhrOnAbort,!1),t.addEventListener("progress",this._boundOnProgress,!1),t.addEventListener("load",this._boundXhrOnLoad,!1),t.send()},i.prototype._loadXdr=function(){"string"!=typeof this.xhrType&&(this.xhrType=this._determineXhrType());var t=this.xhr=new XDomainRequest;t.timeout=5e3,t.onerror=this._boundXhrOnError,t.ontimeout=this._boundXdrOnTimeout,t.onprogress=this._boundOnProgress,t.onload=this._boundXhrOnLoad,t.open("GET",this.url,!0),setTimeout(function(){t.send()},0)},i.prototype._createSource=function(t,e,r){r||(r=t+"/"+e.substr(e.lastIndexOf(".")+1));var i=document.createElement("source");return i.src=e,i.type=r,i},i.prototype._onError=function(t){this.abort("Failed to load element using "+t.target.nodeName)},i.prototype._onProgress=function(t){t&&t.lengthComputable&&this.emit("progress",this,t.loaded/t.total)},i.prototype._xhrOnError=function(){var t=this.xhr;this.abort(n(t)+" Request failed. Status: "+t.status+', text: "'+t.statusText+'"')},i.prototype._xhrOnAbort=function(){this.abort(n(this.xhr)+" Request was aborted by the user.")},i.prototype._xdrOnTimeout=function(){this.abort(n(this.xhr)+" Request timed out.")},i.prototype._xhrOnLoad=function(){var t=this.xhr,e="undefined"==typeof t.status?t.status:c;if(!(e===c||e===d||e===l&&t.responseText.length>0))return void this.abort("["+t.status+"]"+t.statusText+":"+t.responseURL);if(this.xhrType===i.XHR_RESPONSE_TYPE.TEXT)this.data=t.responseText;else if(this.xhrType===i.XHR_RESPONSE_TYPE.JSON)try{this.data=JSON.parse(t.responseText),this.isJson=!0}catch(t){return void this.abort("Error trying to parse loaded json:",t)}else if(this.xhrType===i.XHR_RESPONSE_TYPE.DOCUMENT)try{if(window.DOMParser){var r=new DOMParser;this.data=r.parseFromString(t.responseText,"text/xml")}else{var n=document.createElement("div");n.innerHTML=t.responseText,this.data=n}this.isXml=!0}catch(t){return void this.abort("Error trying to parse loaded xml:",t)}else this.data=t.response||t.responseText;this.complete()},i.prototype._determineCrossOrigin=function(t,e){if(0===t.indexOf("data:"))return"";e=e||window.location,u||(u=document.createElement("a")),u.href=t,t=a.parse(u.href);var r=!t.port&&""===e.port||t.port===e.port;return t.hostname===e.hostname&&r&&t.protocol===e.protocol?"":"anonymous"},i.prototype._determineXhrType=function(){return i._xhrTypeMap[this._getExtension()]||i.XHR_RESPONSE_TYPE.TEXT},i.prototype._determineLoadType=function(){return i._loadTypeMap[this._getExtension()]||i.LOAD_TYPE.XHR},i.prototype._getExtension=function(){var t=this.url,e="";if(this.isDataUrl){var r=t.indexOf("/");e=t.substring(r+1,t.indexOf(";",r))}else{var i=t.indexOf("?");i!==-1&&(t=t.substring(0,i)),e=t.substring(t.lastIndexOf(".")+1)}return e.toLowerCase()},i.prototype._getMimeFromXhrType=function(t){switch(t){case i.XHR_RESPONSE_TYPE.BUFFER:return"application/octet-binary";case i.XHR_RESPONSE_TYPE.BLOB:return"application/blob";case i.XHR_RESPONSE_TYPE.DOCUMENT:return"application/xml";case i.XHR_RESPONSE_TYPE.JSON:return"application/json";case i.XHR_RESPONSE_TYPE.DEFAULT:case i.XHR_RESPONSE_TYPE.TEXT:default:return"text/plain"}},i.LOAD_TYPE={XHR:1,IMAGE:2,AUDIO:3,VIDEO:4},i.XHR_RESPONSE_TYPE={DEFAULT:"text",BUFFER:"arraybuffer",BLOB:"blob",DOCUMENT:"document",JSON:"json",TEXT:"text"},i._loadTypeMap={gif:i.LOAD_TYPE.IMAGE,png:i.LOAD_TYPE.IMAGE,bmp:i.LOAD_TYPE.IMAGE,jpg:i.LOAD_TYPE.IMAGE,jpeg:i.LOAD_TYPE.IMAGE,tif:i.LOAD_TYPE.IMAGE,tiff:i.LOAD_TYPE.IMAGE,webp:i.LOAD_TYPE.IMAGE,tga:i.LOAD_TYPE.IMAGE,"svg+xml":i.LOAD_TYPE.IMAGE},i._xhrTypeMap={xhtml:i.XHR_RESPONSE_TYPE.DOCUMENT,html:i.XHR_RESPONSE_TYPE.DOCUMENT,htm:i.XHR_RESPONSE_TYPE.DOCUMENT,xml:i.XHR_RESPONSE_TYPE.DOCUMENT,tmx:i.XHR_RESPONSE_TYPE.DOCUMENT,tsx:i.XHR_RESPONSE_TYPE.DOCUMENT,svg:i.XHR_RESPONSE_TYPE.DOCUMENT,gif:i.XHR_RESPONSE_TYPE.BLOB,png:i.XHR_RESPONSE_TYPE.BLOB,bmp:i.XHR_RESPONSE_TYPE.BLOB,jpg:i.XHR_RESPONSE_TYPE.BLOB,jpeg:i.XHR_RESPONSE_TYPE.BLOB,tif:i.XHR_RESPONSE_TYPE.BLOB,tiff:i.XHR_RESPONSE_TYPE.BLOB,webp:i.XHR_RESPONSE_TYPE.BLOB,tga:i.XHR_RESPONSE_TYPE.BLOB,json:i.XHR_RESPONSE_TYPE.JSON,text:i.XHR_RESPONSE_TYPE.TEXT,txt:i.XHR_RESPONSE_TYPE.TEXT},i.setExtensionLoadType=function(t,e){s(i._loadTypeMap,t,e)},i.setExtensionXhrType=function(t,e){s(i._xhrTypeMap,t,e)}},{eventemitter3:32,url:72}],68:[function(t,e,r){"use strict";e.exports={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encodeBinary:function(t){for(var e,r="",i=new Array(4),n=0,s=0,o=0;n<t.length;){for(e=new Array(3),s=0;s<e.length;s++)n<t.length?e[s]=255&t.charCodeAt(n++):e[s]=0;switch(i[0]=e[0]>>2,i[1]=(3&e[0])<<4|e[1]>>4,i[2]=(15&e[1])<<2|e[2]>>6,i[3]=63&e[2],o=n-(t.length-1)){case 2:i[3]=64,i[2]=64;break;case 1:i[3]=64}for(s=0;s<i.length;s++)r+=this._keyStr.charAt(i[s])}return r}}},{}],69:[function(t,e,r){"use strict";e.exports=t("./Loader"),e.exports.Resource=t("./Resource"),e.exports.middleware={caching:{memory:t("./middlewares/caching/memory")},parsing:{blob:t("./middlewares/parsing/blob")}}},{"./Loader":66,"./Resource":67,"./middlewares/caching/memory":70,"./middlewares/parsing/blob":71}],70:[function(t,e,r){"use strict";var i={};e.exports=function(){return function(t,e){i[t.url]?(t.data=i[t.url],t.complete()):t.once("complete",function(){i[this.url]=this.data}),e()}}},{}],71:[function(t,e,r){"use strict";var i=t("../../Resource"),n=t("../../b64"),s=window.URL||window.webkitURL;e.exports=function(){return function(t,e){if(!t.data)return void e();if(t.xhr&&t.xhrType===i.XHR_RESPONSE_TYPE.BLOB)if(window.Blob&&"string"!=typeof t.data){if(0===t.data.type.indexOf("image")){var r=s.createObjectURL(t.data);return t.blob=t.data,t.data=new Image,t.data.src=r,t.isImage=!0,void(t.data.onload=function(){s.revokeObjectURL(r),t.data.onload=null,e()})}}else{var o=t.xhr.getResponseHeader("content-type");if(o&&0===o.indexOf("image"))return t.data=new Image,t.data.src="data:"+o+";base64,"+n.encodeBinary(t.xhr.responseText),t.isImage=!0,void(t.data.onload=function(){t.data.onload=null,e()})}e()}}},{"../../Resource":67,"../../b64":68}],72:[function(t,e,r){"use strict";function i(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}function n(t,e,r){if(t&&u.isObject(t)&&t instanceof i)return t;var n=new i;return n.parse(t,e,r),n}function s(t){return u.isString(t)&&(t=n(t)),t instanceof i?t.format():i.prototype.format.call(t)}function o(t,e){return n(t,!1,!0).resolve(e)}function a(t,e){return t?n(t,!1,!0).resolveObject(e):e}var h=t("punycode"),u=t("./util");r.parse=n,r.resolve=o,r.resolveObject=a,r.format=s,r.Url=i;var l=/^([a-z0-9.+-]+:)/i,c=/:[0-9]*$/,d=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,p=["<",">",'"',"`"," ","\r","\n","\t"],f=["{","}","|","\\","^","`"].concat(p),v=["'"].concat(f),g=["%","/","?",";","#"].concat(v),y=["/","?","#"],x=255,m=/^[+a-z0-9A-Z_-]{0,63}$/,_=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,b={javascript:!0,"javascript:":!0},T={javascript:!0,"javascript:":!0},E={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0},w=t("querystring");i.prototype.parse=function(t,e,r){if(!u.isString(t))throw new TypeError("Parameter 'url' must be a string, not "+typeof t);var i=t.indexOf("?"),n=i!==-1&&i<t.indexOf("#")?"?":"#",s=t.split(n),o=/\\/g;
s[0]=s[0].replace(o,"/"),t=s.join(n);var a=t;if(a=a.trim(),!r&&1===t.split("#").length){var c=d.exec(a);if(c)return this.path=a,this.href=a,this.pathname=c[1],c[2]?(this.search=c[2],e?this.query=w.parse(this.search.substr(1)):this.query=this.search.substr(1)):e&&(this.search="",this.query={}),this}var p=l.exec(a);if(p){p=p[0];var f=p.toLowerCase();this.protocol=f,a=a.substr(p.length)}if(r||p||a.match(/^\/\/[^@\/]+@[^@\/]+/)){var S="//"===a.substr(0,2);!S||p&&T[p]||(a=a.substr(2),this.slashes=!0)}if(!T[p]&&(S||p&&!E[p])){for(var C=-1,M=0;M<y.length;M++){var R=a.indexOf(y[M]);R!==-1&&(C===-1||R<C)&&(C=R)}var A,O;O=C===-1?a.lastIndexOf("@"):a.lastIndexOf("@",C),O!==-1&&(A=a.slice(0,O),a=a.slice(O+1),this.auth=decodeURIComponent(A)),C=-1;for(var M=0;M<g.length;M++){var R=a.indexOf(g[M]);R!==-1&&(C===-1||R<C)&&(C=R)}C===-1&&(C=a.length),this.host=a.slice(0,C),a=a.slice(C),this.parseHost(),this.hostname=this.hostname||"";var D="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!D)for(var P=this.hostname.split(/\./),M=0,I=P.length;M<I;M++){var L=P[M];if(L&&!L.match(m)){for(var F="",B=0,N=L.length;B<N;B++)F+=L.charCodeAt(B)>127?"x":L[B];if(!F.match(m)){var k=P.slice(0,M),U=P.slice(M+1),j=L.match(_);j&&(k.push(j[1]),U.unshift(j[2])),U.length&&(a="/"+U.join(".")+a),this.hostname=k.join(".");break}}}this.hostname.length>x?this.hostname="":this.hostname=this.hostname.toLowerCase(),D||(this.hostname=h.toASCII(this.hostname));var W=this.port?":"+this.port:"",G=this.hostname||"";this.host=G+W,this.href+=this.host,D&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==a[0]&&(a="/"+a))}if(!b[f])for(var M=0,I=v.length;M<I;M++){var X=v[M];if(a.indexOf(X)!==-1){var H=encodeURIComponent(X);H===X&&(H=escape(X)),a=a.split(X).join(H)}}var z=a.indexOf("#");z!==-1&&(this.hash=a.substr(z),a=a.slice(0,z));var V=a.indexOf("?");if(V!==-1?(this.search=a.substr(V),this.query=a.substr(V+1),e&&(this.query=w.parse(this.query)),a=a.slice(0,V)):e&&(this.search="",this.query={}),a&&(this.pathname=a),E[f]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){var W=this.pathname||"",Y=this.search||"";this.path=W+Y}return this.href=this.format(),this},i.prototype.format=function(){var t=this.auth||"";t&&(t=encodeURIComponent(t),t=t.replace(/%3A/i,":"),t+="@");var e=this.protocol||"",r=this.pathname||"",i=this.hash||"",n=!1,s="";this.host?n=t+this.host:this.hostname&&(n=t+(this.hostname.indexOf(":")===-1?this.hostname:"["+this.hostname+"]"),this.port&&(n+=":"+this.port)),this.query&&u.isObject(this.query)&&Object.keys(this.query).length&&(s=w.stringify(this.query));var o=this.search||s&&"?"+s||"";return e&&":"!==e.substr(-1)&&(e+=":"),this.slashes||(!e||E[e])&&n!==!1?(n="//"+(n||""),r&&"/"!==r.charAt(0)&&(r="/"+r)):n||(n=""),i&&"#"!==i.charAt(0)&&(i="#"+i),o&&"?"!==o.charAt(0)&&(o="?"+o),r=r.replace(/[?#]/g,function(t){return encodeURIComponent(t)}),o=o.replace("#","%23"),e+n+r+o+i},i.prototype.resolve=function(t){return this.resolveObject(n(t,!1,!0)).format()},i.prototype.resolveObject=function(t){if(u.isString(t)){var e=new i;e.parse(t,!1,!0),t=e}for(var r=new i,n=Object.keys(this),s=0;s<n.length;s++){var o=n[s];r[o]=this[o]}if(r.hash=t.hash,""===t.href)return r.href=r.format(),r;if(t.slashes&&!t.protocol){for(var a=Object.keys(t),h=0;h<a.length;h++){var l=a[h];"protocol"!==l&&(r[l]=t[l])}return E[r.protocol]&&r.hostname&&!r.pathname&&(r.path=r.pathname="/"),r.href=r.format(),r}if(t.protocol&&t.protocol!==r.protocol){if(!E[t.protocol]){for(var c=Object.keys(t),d=0;d<c.length;d++){var p=c[d];r[p]=t[p]}return r.href=r.format(),r}if(r.protocol=t.protocol,t.host||T[t.protocol])r.pathname=t.pathname;else{for(var f=(t.pathname||"").split("/");f.length&&!(t.host=f.shift()););t.host||(t.host=""),t.hostname||(t.hostname=""),""!==f[0]&&f.unshift(""),f.length<2&&f.unshift(""),r.pathname=f.join("/")}if(r.search=t.search,r.query=t.query,r.host=t.host||"",r.auth=t.auth,r.hostname=t.hostname||t.host,r.port=t.port,r.pathname||r.search){var v=r.pathname||"",g=r.search||"";r.path=v+g}return r.slashes=r.slashes||t.slashes,r.href=r.format(),r}var y=r.pathname&&"/"===r.pathname.charAt(0),x=t.host||t.pathname&&"/"===t.pathname.charAt(0),m=x||y||r.host&&t.pathname,_=m,b=r.pathname&&r.pathname.split("/")||[],f=t.pathname&&t.pathname.split("/")||[],w=r.protocol&&!E[r.protocol];if(w&&(r.hostname="",r.port=null,r.host&&(""===b[0]?b[0]=r.host:b.unshift(r.host)),r.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===f[0]?f[0]=t.host:f.unshift(t.host)),t.host=null),m=m&&(""===f[0]||""===b[0])),x)r.host=t.host||""===t.host?t.host:r.host,r.hostname=t.hostname||""===t.hostname?t.hostname:r.hostname,r.search=t.search,r.query=t.query,b=f;else if(f.length)b||(b=[]),b.pop(),b=b.concat(f),r.search=t.search,r.query=t.query;else if(!u.isNullOrUndefined(t.search)){if(w){r.hostname=r.host=b.shift();var S=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@");S&&(r.auth=S.shift(),r.host=r.hostname=S.shift())}return r.search=t.search,r.query=t.query,u.isNull(r.pathname)&&u.isNull(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.href=r.format(),r}if(!b.length)return r.pathname=null,r.search?r.path="/"+r.search:r.path=null,r.href=r.format(),r;for(var C=b.slice(-1)[0],M=(r.host||t.host||b.length>1)&&("."===C||".."===C)||""===C,R=0,A=b.length;A>=0;A--)C=b[A],"."===C?b.splice(A,1):".."===C?(b.splice(A,1),R++):R&&(b.splice(A,1),R--);if(!m&&!_)for(;R--;R)b.unshift("..");!m||""===b[0]||b[0]&&"/"===b[0].charAt(0)||b.unshift(""),M&&"/"!==b.join("/").substr(-1)&&b.push("");var O=""===b[0]||b[0]&&"/"===b[0].charAt(0);if(w){r.hostname=r.host=O?"":b.length?b.shift():"";var S=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@");S&&(r.auth=S.shift(),r.host=r.hostname=S.shift())}return m=m||r.host&&b.length,m&&!O&&b.unshift(""),b.length?r.pathname=b.join("/"):(r.pathname=null,r.path=null),u.isNull(r.pathname)&&u.isNull(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.auth=t.auth||r.auth,r.slashes=r.slashes||t.slashes,r.href=r.format(),r},i.prototype.parseHost=function(){var t=this.host,e=c.exec(t);e&&(e=e[0],":"!==e&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)}},{"./util":73,punycode:62,querystring:65}],73:[function(t,e,r){"use strict";e.exports={isString:function(t){return"string"==typeof t},isObject:function(t){return"object"==typeof t&&null!==t},isNull:function(t){return null===t},isNullOrUndefined:function(t){return null==t}}},{}],74:[function(t,e,r){function i(t){!s.tablet&&!s.phone||navigator.isCocoonJS||this.createTouchHook();var e=document.createElement("div");e.style.width="100px",e.style.height="100px",e.style.position="absolute",e.style.top=0,e.style.left=0,e.style.zIndex=2,this.div=e,this.pool=[],this.renderId=0,this.debug=!1,this.renderer=t,this.children=[],this._onKeyDown=this._onKeyDown.bind(this),this._onMouseMove=this._onMouseMove.bind(this),this.isActive=!1,this.isMobileAccessabillity=!1,window.addEventListener("keydown",this._onKeyDown,!1)}var n=t("../core"),s=t("ismobilejs");Object.assign(n.DisplayObject.prototype,t("./accessibleTarget")),i.prototype.constructor=i,e.exports=i,i.prototype.createTouchHook=function(){var t=document.createElement("button");t.style.width="1px",t.style.height="1px",t.style.position="absolute",t.style.top="-1000px",t.style.left="-1000px",t.style.zIndex=2,t.style.backgroundColor="#FF0000",t.title="HOOK DIV",t.addEventListener("focus",function(){this.isMobileAccessabillity=!0,this.activate(),document.body.removeChild(t)}.bind(this)),document.body.appendChild(t)},i.prototype.activate=function(){this.isActive||(this.isActive=!0,window.document.addEventListener("mousemove",this._onMouseMove,!0),window.removeEventListener("keydown",this._onKeyDown,!1),this.renderer.on("postrender",this.update,this),this.renderer.view.parentNode&&this.renderer.view.parentNode.appendChild(this.div))},i.prototype.deactivate=function(){this.isActive&&!this.isMobileAccessabillity&&(this.isActive=!1,window.document.removeEventListener("mousemove",this._onMouseMove),window.addEventListener("keydown",this._onKeyDown,!1),this.renderer.off("postrender",this.update),this.div.parentNode&&this.div.parentNode.removeChild(this.div))},i.prototype.updateAccessibleObjects=function(t){if(t.visible){t.accessible&&t.interactive&&(t._accessibleActive||this.addChild(t),t.renderId=this.renderId);for(var e=t.children,r=e.length-1;r>=0;r--)this.updateAccessibleObjects(e[r])}},i.prototype.update=function(){if(this.renderer.renderingToScreen){this.updateAccessibleObjects(this.renderer._lastObjectRendered);var t=this.renderer.view.getBoundingClientRect(),e=t.width/this.renderer.width,r=t.height/this.renderer.height,i=this.div;i.style.left=t.left+"px",i.style.top=t.top+"px",i.style.width=this.renderer.width+"px",i.style.height=this.renderer.height+"px";for(var s=0;s<this.children.length;s++){var o=this.children[s];if(o.renderId!==this.renderId)o._accessibleActive=!1,n.utils.removeItems(this.children,s,1),this.div.removeChild(o._accessibleDiv),this.pool.push(o._accessibleDiv),o._accessibleDiv=null,s--,0===this.children.length&&this.deactivate();else{i=o._accessibleDiv;var a=o.hitArea,h=o.worldTransform;o.hitArea?(i.style.left=(h.tx+a.x*h.a)*e+"px",i.style.top=(h.ty+a.y*h.d)*r+"px",i.style.width=a.width*h.a*e+"px",i.style.height=a.height*h.d*r+"px"):(a=o.getBounds(),this.capHitArea(a),i.style.left=a.x*e+"px",i.style.top=a.y*r+"px",i.style.width=a.width*e+"px",i.style.height=a.height*r+"px")}}this.renderId++}},i.prototype.capHitArea=function(t){t.x<0&&(t.width+=t.x,t.x=0),t.y<0&&(t.height+=t.y,t.y=0),t.x+t.width>this.renderer.width&&(t.width=this.renderer.width-t.x),t.y+t.height>this.renderer.height&&(t.height=this.renderer.height-t.y)},i.prototype.addChild=function(t){var e=this.pool.pop();e||(e=document.createElement("button"),e.style.width="100px",e.style.height="100px",e.style.backgroundColor=this.debug?"rgba(255,0,0,0.5)":"transparent",e.style.position="absolute",e.style.zIndex=2,e.style.borderStyle="none",e.addEventListener("click",this._onClick.bind(this)),e.addEventListener("focus",this._onFocus.bind(this)),e.addEventListener("focusout",this._onFocusOut.bind(this))),t.accessibleTitle?e.title=t.accessibleTitle:t.accessibleTitle||t.accessibleHint||(e.title="displayObject "+this.tabIndex),t.accessibleHint&&e.setAttribute("aria-label",t.accessibleHint),t._accessibleActive=!0,t._accessibleDiv=e,e.displayObject=t,this.children.push(t),this.div.appendChild(t._accessibleDiv),t._accessibleDiv.tabIndex=t.tabIndex},i.prototype._onClick=function(t){var e=this.renderer.plugins.interaction;e.dispatchEvent(t.target.displayObject,"click",e.eventData)},i.prototype._onFocus=function(t){var e=this.renderer.plugins.interaction;e.dispatchEvent(t.target.displayObject,"mouseover",e.eventData)},i.prototype._onFocusOut=function(t){var e=this.renderer.plugins.interaction;e.dispatchEvent(t.target.displayObject,"mouseout",e.eventData)},i.prototype._onKeyDown=function(t){9===t.keyCode&&this.activate()},i.prototype._onMouseMove=function(){this.deactivate()},i.prototype.destroy=function(){this.div=null;for(var t=0;t<this.children.length;t++)this.children[t].div=null;window.document.removeEventListener("mousemove",this._onMouseMove),window.removeEventListener("keydown",this._onKeyDown),this.pool=null,this.children=null,this.renderer=null},n.WebGLRenderer.registerPlugin("accessibility",i),n.CanvasRenderer.registerPlugin("accessibility",i)},{"../core":97,"./accessibleTarget":75,ismobilejs:33}],75:[function(t,e,r){var i={accessible:!1,accessibleTitle:null,accessibleHint:null,tabIndex:0,_accessibleActive:!1,_accessibleDiv:!1};e.exports=i},{}],76:[function(t,e,r){e.exports={accessibleTarget:t("./accessibleTarget"),AccessibilityManager:t("./AccessibilityManager")}},{"./AccessibilityManager":74,"./accessibleTarget":75}],77:[function(t,e,r){function i(t){if(t instanceof Array){if("precision"!==t[0].substring(0,9)){var e=t.slice(0);return e.unshift("precision "+s.PRECISION.DEFAULT+" float;"),e}}else if("precision"!==t.substring(0,9))return"precision "+s.PRECISION.DEFAULT+" float;\n"+t;return t}var n=t("pixi-gl-core").GLShader,s=t("./const"),o=function(t,e,r,s){n.call(this,t,i(e),i(r),s)};o.prototype=Object.create(n.prototype),o.prototype.constructor=o,e.exports=o},{"./const":78,"pixi-gl-core":7}],78:[function(t,e,r){var i={VERSION:"4.0.2",PI_2:2*Math.PI,RAD_TO_DEG:180/Math.PI,DEG_TO_RAD:Math.PI/180,TARGET_FPMS:.06,RENDERER_TYPE:{UNKNOWN:0,WEBGL:1,CANVAS:2},BLEND_MODES:{NORMAL:0,ADD:1,MULTIPLY:2,SCREEN:3,OVERLAY:4,DARKEN:5,LIGHTEN:6,COLOR_DODGE:7,COLOR_BURN:8,HARD_LIGHT:9,SOFT_LIGHT:10,DIFFERENCE:11,EXCLUSION:12,HUE:13,SATURATION:14,COLOR:15,LUMINOSITY:16},DRAW_MODES:{POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},SCALE_MODES:{DEFAULT:0,LINEAR:0,NEAREST:1},WRAP_MODES:{DEFAULT:0,CLAMP:0,REPEAT:1,MIRRORED_REPEAT:2},GC_MODES:{DEFAULT:0,AUTO:0,MANUAL:1},MIPMAP_TEXTURES:!0,RETINA_PREFIX:/@(.+)x/,RESOLUTION:1,FILTER_RESOLUTION:1,DEFAULT_RENDER_OPTIONS:{view:null,resolution:1,antialias:!1,forceFXAA:!1,autoResize:!1,transparent:!1,backgroundColor:0,clearBeforeRender:!0,preserveDrawingBuffer:!1,roundPixels:!1},SHAPES:{POLY:0,RECT:1,CIRC:2,ELIP:3,RREC:4},PRECISION:{DEFAULT:"mediump",LOW:"lowp",MEDIUM:"mediump",HIGH:"highp"},TRANSFORM_MODE:{DEFAULT:0,STATIC:0,DYNAMIC:1},TEXT_GRADIENT:{LINEAR_VERTICAL:0,LINEAR_HORIZONTAL:1},SPRITE_BATCH_SIZE:4096,SPRITE_MAX_TEXTURES:t("./utils/maxRecommendedTextures")(32)};e.exports=i},{"./utils/maxRecommendedTextures":152}],79:[function(t,e,r){function i(){this.minX=1/0,this.minY=1/0,this.maxX=-(1/0),this.maxY=-(1/0),this.rect=null}var n=t("../math"),s=n.Rectangle;i.prototype.constructor=i,e.exports=i,i.prototype.isEmpty=function(){return this.minX>this.maxX||this.minY>this.maxY},i.prototype.clear=function(){this.updateID++,this.minX=1/0,this.minY=1/0,this.maxX=-(1/0),this.maxY=-(1/0)},i.prototype.getRectangle=function(t){return this.minX>this.maxX||this.minY>this.maxY?s.EMPTY:(t=t||new s(0,0,1,1),t.x=this.minX,t.y=this.minY,t.width=this.maxX-this.minX,t.height=this.maxY-this.minY,t)},i.prototype.addPoint=function(t){this.minX=Math.min(this.minX,t.x),this.maxX=Math.max(this.maxX,t.x),this.minY=Math.min(this.minY,t.y),this.maxY=Math.max(this.maxY,t.y)},i.prototype.addQuad=function(t){var e=this.minX,r=this.minY,i=this.maxX,n=this.maxY,s=t[0],o=t[1];e=s<e?s:e,r=o<r?o:r,i=s>i?s:i,n=o>n?o:n,s=t[2],o=t[3],e=s<e?s:e,r=o<r?o:r,i=s>i?s:i,n=o>n?o:n,s=t[4],o=t[5],e=s<e?s:e,r=o<r?o:r,i=s>i?s:i,n=o>n?o:n,s=t[6],o=t[7],e=s<e?s:e,r=o<r?o:r,i=s>i?s:i,n=o>n?o:n,this.minX=e,this.minY=r,this.maxX=i,this.maxY=n},i.prototype.addFrame=function(t,e,r,i,n){var s=t.worldTransform,o=s.a,a=s.b,h=s.c,u=s.d,l=s.tx,c=s.ty,d=this.minX,p=this.minY,f=this.maxX,v=this.maxY,g=o*e+h*r+l,y=a*e+u*r+c;d=g<d?g:d,p=y<p?y:p,f=g>f?g:f,v=y>v?y:v,g=o*i+h*r+l,y=a*i+u*r+c,d=g<d?g:d,p=y<p?y:p,f=g>f?g:f,v=y>v?y:v,g=o*e+h*n+l,y=a*e+u*n+c,d=g<d?g:d,p=y<p?y:p,f=g>f?g:f,v=y>v?y:v,g=o*i+h*n+l,y=a*i+u*n+c,d=g<d?g:d,p=y<p?y:p,f=g>f?g:f,v=y>v?y:v,this.minX=d,this.minY=p,this.maxX=f,this.maxY=v},i.prototype.addVertices=function(t,e,r,i){for(var n=t.worldTransform,s=n.a,o=n.b,a=n.c,h=n.d,u=n.tx,l=n.ty,c=this.minX,d=this.minY,p=this.maxX,f=this.maxY,v=r;v<i;v+=2){var g=e[v],y=e[v+1],x=s*g+a*y+u,m=h*y+o*g+l;c=x<c?x:c,d=m<d?m:d,p=x>p?x:p,f=m>f?m:f}this.minX=c,this.minY=d,this.maxX=p,this.maxY=f},i.prototype.addBounds=function(t){var e=this.minX,r=this.minY,i=this.maxX,n=this.maxY;this.minX=t.minX<e?t.minX:e,this.minY=t.minY<r?t.minY:r,this.maxX=t.maxX>i?t.maxX:i,this.maxY=t.maxY>n?t.maxY:n}},{"../math":102}],80:[function(t,e,r){function i(){s.call(this),this.children=[]}var n=t("../utils"),s=t("./DisplayObject");i.prototype=Object.create(s.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{width:{get:function(){return this.scale.x*this.getLocalBounds().width},set:function(t){var e=this.getLocalBounds().width;0!==e?this.scale.x=t/e:this.scale.x=1,this._width=t}},height:{get:function(){return this.scale.y*this.getLocalBounds().height},set:function(t){var e=this.getLocalBounds().height;0!==e?this.scale.y=t/e:this.scale.y=1,this._height=t}}}),i.prototype.onChildrenChange=function(){},i.prototype.addChild=function(t){var e=arguments.length;if(e>1)for(var r=0;r<e;r++)this.addChild(arguments[r]);else t.parent&&t.parent.removeChild(t),t.parent=this,this.transform._parentID=-1,this.children.push(t),this.onChildrenChange(this.children.length-1),t.emit("added",this);return t},i.prototype.addChildAt=function(t,e){if(e>=0&&e<=this.children.length)return t.parent&&t.parent.removeChild(t),t.parent=this,this.children.splice(e,0,t),this.onChildrenChange(e),t.emit("added",this),t;throw new Error(t+"addChildAt: The index "+e+" supplied is out of bounds "+this.children.length)},i.prototype.swapChildren=function(t,e){if(t!==e){var r=this.getChildIndex(t),i=this.getChildIndex(e);if(r<0||i<0)throw new Error("swapChildren: Both the supplied DisplayObjects must be children of the caller.");this.children[r]=e,this.children[i]=t,this.onChildrenChange(r<i?r:i)}},i.prototype.getChildIndex=function(t){var e=this.children.indexOf(t);if(e===-1)throw new Error("The supplied DisplayObject must be a child of the caller");return e},i.prototype.setChildIndex=function(t,e){if(e<0||e>=this.children.length)throw new Error("The supplied index is out of bounds");var r=this.getChildIndex(t);n.removeItems(this.children,r,1),this.children.splice(e,0,t),this.onChildrenChange(e)},i.prototype.getChildAt=function(t){if(t<0||t>=this.children.length)throw new Error("getChildAt: Supplied index "+t+" does not exist in the child list, or the supplied DisplayObject is not a child of the caller");return this.children[t]},i.prototype.removeChild=function(t){var e=arguments.length;if(e>1)for(var r=0;r<e;r++)this.removeChild(arguments[r]);else{var i=this.children.indexOf(t);if(i===-1)return;t.parent=null,n.removeItems(this.children,i,1),this.onChildrenChange(i),t.emit("removed",this)}return t},i.prototype.removeChildAt=function(t){var e=this.getChildAt(t);return e.parent=null,n.removeItems(this.children,t,1),this.onChildrenChange(t),e.emit("removed",this),e},i.prototype.removeChildren=function(t,e){var r,i,n=t||0,s="number"==typeof e?e:this.children.length,o=s-n;if(o>0&&o<=s){for(r=this.children.splice(n,o),i=0;i<r.length;++i)r[i].parent=null;for(this.onChildrenChange(t),i=0;i<r.length;++i)r[i].emit("removed",this);return r}if(0===o&&0===this.children.length)return[];throw new RangeError("removeChildren: numeric values are outside the acceptable range.")},i.prototype.updateTransform=function(){if(this._boundsID++,this.visible){this.transform.updateTransform(this.parent.transform),this.worldAlpha=this.alpha*this.parent.worldAlpha;for(var t=0,e=this.children.length;t<e;++t)this.children[t].updateTransform()}},i.prototype.containerUpdateTransform=i.prototype.updateTransform,i.prototype.calculateBounds=function(){if(this._bounds.clear(),this.visible){this._calculateBounds();for(var t=0;t<this.children.length;t++){var e=this.children[t];e.calculateBounds(),this._bounds.addBounds(e._bounds)}this._boundsID=this._lastBoundsID}},i.prototype._calculateBounds=function(){},i.prototype.renderWebGL=function(t){if(this.visible&&!(this.worldAlpha<=0)&&this.renderable)if(this._mask||this._filters)this.renderAdvancedWebGL(t);else{this._renderWebGL(t);for(var e=0,r=this.children.length;e<r;++e)this.children[e].renderWebGL(t)}},i.prototype.renderAdvancedWebGL=function(t){t.currentRenderer.flush();var e,r,i=this._filters,n=this._mask;if(i){for(this._enabledFilters||(this._enabledFilters=[]),this._enabledFilters.length=0,e=0;e<i.length;e++)i[e].enabled&&this._enabledFilters.push(i[e]);this._enabledFilters.length&&t.filterManager.pushFilter(this,this._enabledFilters)}for(n&&t.maskManager.pushMask(this,this._mask),t.currentRenderer.start(),this._renderWebGL(t),e=0,r=this.children.length;e<r;e++)this.children[e].renderWebGL(t);t.currentRenderer.flush(),n&&t.maskManager.popMask(this,this._mask),i&&this._enabledFilters&&this._enabledFilters.length&&t.filterManager.popFilter(),t.currentRenderer.start()},i.prototype._renderWebGL=function(t){},i.prototype._renderCanvas=function(t){},i.prototype.renderCanvas=function(t){if(this.visible&&!(this.alpha<=0)&&this.renderable){this._mask&&t.maskManager.pushMask(this._mask),this._renderCanvas(t);for(var e=0,r=this.children.length;e<r;++e)this.children[e].renderCanvas(t);this._mask&&t.maskManager.popMask(t)}},i.prototype.destroy=function(t){s.prototype.destroy.call(this);var e="boolean"==typeof t?t:t&&t.children,r=this.children;if(this.children=null,e)for(var i=r.length-1;i>=0;i--){var n=r[i];n.parent=null,n.destroy(t)}}},{"../utils":151,"./DisplayObject":81}],81:[function(t,e,r){function i(){n.call(this);var t=s.TRANSFORM_MODE.DEFAULT===s.TRANSFORM_MODE.STATIC?o:a;this.transform=new t,this.alpha=1,this.visible=!0,this.renderable=!0,this.parent=null,this.worldAlpha=1,this.filterArea=null,this._filters=null,this._enabledFilters=null,this._bounds=new h,this._boundsID=0,this._lastBoundsID=-1,this._boundsRect=null,this._localBoundsRect=null,this._mask=null}var n=t("eventemitter3"),s=t("../const"),o=t("./TransformStatic"),a=t("./Transform"),h=t("./Bounds"),u=t("../math"),l=new i;i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{x:{get:function(){return this.position.x},set:function(t){this.transform.position.x=t}},y:{get:function(){return this.position.y},set:function(t){this.transform.position.y=t}},worldTransform:{get:function(){return this.transform.worldTransform}},localTransform:{get:function(){return this.transform.localTransform}},position:{get:function(){return this.transform.position},set:function(t){this.transform.position.copy(t)}},scale:{get:function(){return this.transform.scale},set:function(t){this.transform.scale.copy(t)}},pivot:{get:function(){return this.transform.pivot},set:function(t){this.transform.pivot.copy(t)}},skew:{get:function(){return this.transform.skew},set:function(t){this.transform.skew.copy(t)}},rotation:{get:function(){return this.transform.rotation},set:function(t){this.transform.rotation=t}},worldVisible:{get:function(){var t=this;do{if(!t.visible)return!1;t=t.parent}while(t);return!0}},mask:{get:function(){return this._mask},set:function(t){this._mask&&(this._mask.renderable=!0),this._mask=t,this._mask&&(this._mask.renderable=!1)}},filters:{get:function(){return this._filters&&this._filters.slice()},set:function(t){this._filters=t&&t.slice()}}}),i.prototype.updateTransform=function(){this.transform.updateTransform(this.parent.transform),this.worldAlpha=this.alpha*this.parent.worldAlpha,this._bounds.updateID++},i.prototype.displayObjectUpdateTransform=i.prototype.updateTransform,i.prototype._recursivePostUpdateTransform=function(){this.parent?(this.parent._recursivePostUpdateTransform(),this.transform.updateTransform(this.parent.transform)):this.transform.updateTransform(l.transform)},i.prototype.getBounds=function(t,e){return t||(this.parent?(this._recursivePostUpdateTransform(),this.updateTransform()):(this.parent=l,this.parent.transform._worldID++,this.updateTransform(),this.parent=null)),this._boundsID!==this._lastBoundsID&&this.calculateBounds(),e||(this._boundsRect||(this._boundsRect=new u.Rectangle),e=this._boundsRect),this._bounds.getRectangle(e)},i.prototype.getLocalBounds=function(t){var e=this.transform,r=this.parent;this.parent=null,this.transform=l.transform,t||(this._localBoundsRect||(this._localBoundsRect=new u.Rectangle),t=this._localBoundsRect);var i=this.getBounds(!1,t);return this.parent=r,this.transform=e,i},i.prototype.toGlobal=function(t,e,r){return r||(this._recursivePostUpdateTransform(),this.parent?this.displayObjectUpdateTransform():(this.parent=l,this.displayObjectUpdateTransform(),this.parent=null)),this.worldTransform.apply(t,e)},i.prototype.toLocal=function(t,e,r,i){return e&&(t=e.toGlobal(t,r,i)),i||(this._recursivePostUpdateTransform(),this.parent?this.displayObjectUpdateTransform():(this.parent=l,this.displayObjectUpdateTransform(),this.parent=null)),this.worldTransform.applyInverse(t,r)},i.prototype.renderWebGL=function(t){},i.prototype.renderCanvas=function(t){},i.prototype.setParent=function(t){if(!t||!t.addChild)throw new Error("setParent: Argument must be a Container");return t.addChild(this),t},i.prototype.setTransform=function(t,e,r,i,n,s,o,a,h){return this.position.x=t||0,this.position.y=e||0,this.scale.x=r?r:1,this.scale.y=i?i:1,this.rotation=n||0,this.skew.x=s||0,this.skew.y=o||0,this.pivot.x=a||0,this.pivot.y=h||0,this},i.prototype.destroy=function(){this.removeAllListeners(),this.parent&&this.parent.removeChild(this),this.transform=null,this.parent=null,this._bounds=null,this._currentBounds=null,this._mask=null,this.filterArea=null,this.interactive=!1,this.interactiveChildren=!1}},{"../const":78,"../math":102,"./Bounds":79,"./Transform":82,"./TransformStatic":84,eventemitter3:32}],82:[function(t,e,r){function i(){s.call(this),this.position=new n.Point(0,0),this.scale=new n.Point(1,1),this.skew=new n.ObservablePoint(this.updateSkew,this,0,0),this.pivot=new n.Point(0,0),this._rotation=0,this._sr=Math.sin(0),this._cr=Math.cos(0),this._cy=Math.cos(0),this._sy=Math.sin(0),this._nsx=Math.sin(0),this._cx=Math.cos(0)}var n=t("../math"),s=t("./TransformBase");i.prototype=Object.create(s.prototype),i.prototype.constructor=i,i.prototype.updateSkew=function(){this._cy=Math.cos(this.skew.y),this._sy=Math.sin(this.skew.y),this._nsx=Math.sin(this.skew.x),this._cx=Math.cos(this.skew.x)},i.prototype.updateLocalTransform=function(){var t,e,r,i,n=this.localTransform;t=this._cr*this.scale.x,e=this._sr*this.scale.x,r=-this._sr*this.scale.y,i=this._cr*this.scale.y,n.a=this._cy*t+this._sy*r,n.b=this._cy*e+this._sy*i,n.c=this._nsx*t+this._cx*r,n.d=this._nsx*e+this._cx*i},i.prototype.updateTransform=function(t){var e,r,i,n,s=t.worldTransform,o=this.worldTransform,a=this.localTransform;e=this._cr*this.scale.x,r=this._sr*this.scale.x,i=-this._sr*this.scale.y,n=this._cr*this.scale.y,a.a=this._cy*e+this._sy*i,a.b=this._cy*r+this._sy*n,a.c=this._nsx*e+this._cx*i,a.d=this._nsx*r+this._cx*n,a.tx=this.position.x-(this.pivot.x*a.a+this.pivot.y*a.c),a.ty=this.position.y-(this.pivot.x*a.b+this.pivot.y*a.d),o.a=a.a*s.a+a.b*s.c,o.b=a.a*s.b+a.b*s.d,o.c=a.c*s.a+a.d*s.c,o.d=a.c*s.b+a.d*s.d,o.tx=a.tx*s.a+a.ty*s.c+s.tx,o.ty=a.tx*s.b+a.ty*s.d+s.ty,this._worldID++},i.prototype.setFromMatrix=function(t){t.decompose(this)},Object.defineProperties(i.prototype,{rotation:{get:function(){return this._rotation},set:function(t){this._rotation=t,this._sr=Math.sin(t),this._cr=Math.cos(t)}}}),e.exports=i},{"../math":102,"./TransformBase":83}],83:[function(t,e,r){function i(){this.worldTransform=new n.Matrix,this.localTransform=new n.Matrix,this._worldID=0}var n=t("../math");i.prototype.constructor=i,i.prototype.updateLocalTransform=function(){},i.prototype.updateTransform=function(t){var e=t.worldTransform,r=this.worldTransform,i=this.localTransform;r.a=i.a*e.a+i.b*e.c,r.b=i.a*e.b+i.b*e.d,r.c=i.c*e.a+i.d*e.c,r.d=i.c*e.b+i.d*e.d,r.tx=i.tx*e.a+i.ty*e.c+e.tx,r.ty=i.tx*e.b+i.ty*e.d+e.ty,this._worldID++},i.prototype.updateWorldTransform=i.prototype.updateTransform,i.IDENTITY=new i,e.exports=i},{"../math":102}],84:[function(t,e,r){function i(){s.call(this),this.position=new n.ObservablePoint(this.onChange,this,0,0),this.scale=new n.ObservablePoint(this.onChange,this,1,1),this.pivot=new n.ObservablePoint(this.onChange,this,0,0),this.skew=new n.ObservablePoint(this.updateSkew,this,0,0),this._rotation=0,this._sr=Math.sin(0),this._cr=Math.cos(0),this._cy=Math.cos(0),this._sy=Math.sin(0),this._nsx=Math.sin(0),this._cx=Math.cos(0),this._localID=0,this._currentLocalID=0}var n=t("../math"),s=t("./TransformBase");i.prototype=Object.create(s.prototype),i.prototype.constructor=i,i.prototype.onChange=function(){this._localID++},i.prototype.updateSkew=function(){this._cy=Math.cos(this.skew._y),this._sy=Math.sin(this.skew._y),this._nsx=Math.sin(this.skew._x),this._cx=Math.cos(this.skew._x),this._localID++},i.prototype.updateLocalTransform=function(){var t=this.localTransform;if(this._localID!==this._currentLocalID){var e,r,i,n;e=this._cr*this.scale._x,r=this._sr*this.scale._x,i=-this._sr*this.scale._y,n=this._cr*this.scale._y,t.a=this._cy*e+this._sy*i,t.b=this._cy*r+this._sy*n,t.c=this._nsx*e+this._cx*i,t.d=this._nsx*r+this._cx*n,t.tx=this.position._x-(this.pivot._x*t.a+this.pivot._y*t.c),t.ty=this.position._y-(this.pivot._x*t.b+this.pivot._y*t.d),this._currentLocalID=this._localID,this._parentID=-1}},i.prototype.updateTransform=function(t){var e=t.worldTransform,r=this.worldTransform,i=this.localTransform;if(this._localID!==this._currentLocalID){var n,s,o,a;n=this._cr*this.scale._x,s=this._sr*this.scale._x,o=-this._sr*this.scale._y,a=this._cr*this.scale._y,i.a=this._cy*n+this._sy*o,i.b=this._cy*s+this._sy*a,i.c=this._nsx*n+this._cx*o,i.d=this._nsx*s+this._cx*a,i.tx=this.position._x-(this.pivot._x*i.a+this.pivot._y*i.c),i.ty=this.position._y-(this.pivot._x*i.b+this.pivot._y*i.d),this._currentLocalID=this._localID,this._parentID=-1}this._parentID!==t._worldID&&(r.a=i.a*e.a+i.b*e.c,r.b=i.a*e.b+i.b*e.d,r.c=i.c*e.a+i.d*e.c,r.d=i.c*e.b+i.d*e.d,r.tx=i.tx*e.a+i.ty*e.c+e.tx,r.ty=i.tx*e.b+i.ty*e.d+e.ty,this._parentID=t._worldID,this._worldID++)},i.prototype.setFromMatrix=function(t){t.decompose(this),this._localID++},Object.defineProperties(i.prototype,{rotation:{get:function(){return this._rotation},set:function(t){this._rotation=t,this._sr=Math.sin(t),this._cr=Math.cos(t),this._localID++}}}),e.exports=i},{"../math":102,"./TransformBase":83}],85:[function(t,e,r){function i(){s.call(this),this.fillAlpha=1,this.lineWidth=0,this.lineColor=0,this.graphicsData=[],this.tint=16777215,this._prevTint=16777215,this.blendMode=c.BLEND_MODES.NORMAL,this.currentPath=null,this._webGL={},this.isMask=!1,this.boundsPadding=0,this._localBounds=new p,this.dirty=0,this.fastRectDirty=-1,this.clearDirty=0,this.boundsDirty=-1,this.cachedSpriteDirty=!1,this._spriteRect=null,this._fastRect=!1}var n,s=t("../display/Container"),o=t("../textures/RenderTexture"),a=t("../textures/Texture"),h=t("./GraphicsData"),u=t("../sprites/Sprite"),l=t("../math"),c=t("../const"),d=t("../utils"),p=t("../display/Bounds"),f=t("./utils/bezierCurveTo"),v=t("../renderers/canvas/CanvasRenderer"),g=new l.Matrix,y=new l.Point,x=new Float32Array(4),m=new Float32Array(4);i._SPRITE_TEXTURE=null,i.prototype=Object.create(s.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.clone=function(){var t=new i;t.renderable=this.renderable,t.fillAlpha=this.fillAlpha,t.lineWidth=this.lineWidth,t.lineColor=this.lineColor,t.tint=this.tint,t.blendMode=this.blendMode,t.isMask=this.isMask,t.boundsPadding=this.boundsPadding,t.dirty=0,t.cachedSpriteDirty=this.cachedSpriteDirty;for(var e=0;e<this.graphicsData.length;++e)t.graphicsData.push(this.graphicsData[e].clone());return t.currentPath=t.graphicsData[t.graphicsData.length-1],t.updateLocalBounds(),t},i.prototype.lineStyle=function(t,e,r){if(this.lineWidth=t||0,this.lineColor=e||0,this.lineAlpha=void 0===r?1:r,this.currentPath)if(this.currentPath.shape.points.length){var i=new l.Polygon(this.currentPath.shape.points.slice(-2));i.closed=!1,this.drawShape(i)}else this.currentPath.lineWidth=this.lineWidth,this.currentPath.lineColor=this.lineColor,this.currentPath.lineAlpha=this.lineAlpha;return this},i.prototype.moveTo=function(t,e){var r=new l.Polygon([t,e]);return r.closed=!1,this.drawShape(r),this},i.prototype.lineTo=function(t,e){return this.currentPath.shape.points.push(t,e),this.dirty++,this},i.prototype.quadraticCurveTo=function(t,e,r,i){this.currentPath?0===this.currentPath.shape.points.length&&(this.currentPath.shape.points=[0,0]):this.moveTo(0,0);var n,s,o=20,a=this.currentPath.shape.points;0===a.length&&this.moveTo(0,0);for(var h=a[a.length-2],u=a[a.length-1],l=0,c=1;c<=o;++c)l=c/o,n=h+(t-h)*l,s=u+(e-u)*l,a.push(n+(t+(r-t)*l-n)*l,s+(e+(i-e)*l-s)*l);
return this.dirty++,this},i.prototype.bezierCurveTo=function(t,e,r,i,n,s){this.currentPath?0===this.currentPath.shape.points.length&&(this.currentPath.shape.points=[0,0]):this.moveTo(0,0);var o=this.currentPath.shape.points,a=o[o.length-2],h=o[o.length-1];return o.length-=2,f(a,h,t,e,r,i,n,s,o),this.dirty++,this},i.prototype.arcTo=function(t,e,r,i,n){this.currentPath?0===this.currentPath.shape.points.length&&this.currentPath.shape.points.push(t,e):this.moveTo(t,e);var s=this.currentPath.shape.points,o=s[s.length-2],a=s[s.length-1],h=a-e,u=o-t,l=i-e,c=r-t,d=Math.abs(h*c-u*l);if(d<1e-8||0===n)s[s.length-2]===t&&s[s.length-1]===e||s.push(t,e);else{var p=h*h+u*u,f=l*l+c*c,v=h*l+u*c,g=n*Math.sqrt(p)/d,y=n*Math.sqrt(f)/d,x=g*v/p,m=y*v/f,_=g*c+y*u,b=g*l+y*h,T=u*(y+x),E=h*(y+x),w=c*(g+m),S=l*(g+m),C=Math.atan2(E-b,T-_),M=Math.atan2(S-b,w-_);this.arc(_+t,b+e,n,C,M,u*l>c*h)}return this.dirty++,this},i.prototype.arc=function(t,e,r,i,n,s){if(s=s||!1,i===n)return this;!s&&n<=i?n+=2*Math.PI:s&&i<=n&&(i+=2*Math.PI);var o=s?(i-n)*-1:n-i,a=40*Math.ceil(Math.abs(o)/(2*Math.PI));if(0===o)return this;var h=t+Math.cos(i)*r,u=e+Math.sin(i)*r;this.currentPath?this.currentPath.shape.points.push(h,u):this.moveTo(h,u);for(var l=this.currentPath.shape.points,c=o/(2*a),d=2*c,p=Math.cos(c),f=Math.sin(c),v=a-1,g=v%1/v,y=0;y<=v;y++){var x=y+g*y,m=c+i+d*x,_=Math.cos(m),b=-Math.sin(m);l.push((p*_+f*b)*r+t,(p*-b+f*_)*r+e)}return this.dirty++,this},i.prototype.beginFill=function(t,e){return this.filling=!0,this.fillColor=t||0,this.fillAlpha=void 0===e?1:e,this.currentPath&&this.currentPath.shape.points.length<=2&&(this.currentPath.fill=this.filling,this.currentPath.fillColor=this.fillColor,this.currentPath.fillAlpha=this.fillAlpha),this},i.prototype.endFill=function(){return this.filling=!1,this.fillColor=null,this.fillAlpha=1,this},i.prototype.drawRect=function(t,e,r,i){return this.drawShape(new l.Rectangle(t,e,r,i)),this},i.prototype.drawRoundedRect=function(t,e,r,i,n){return this.drawShape(new l.RoundedRectangle(t,e,r,i,n)),this},i.prototype.drawCircle=function(t,e,r){return this.drawShape(new l.Circle(t,e,r)),this},i.prototype.drawEllipse=function(t,e,r,i){return this.drawShape(new l.Ellipse(t,e,r,i)),this},i.prototype.drawPolygon=function(t){var e=t,r=!0;if(e instanceof l.Polygon&&(r=e.closed,e=e.points),!Array.isArray(e)){e=new Array(arguments.length);for(var i=0;i<e.length;++i)e[i]=arguments[i]}var n=new l.Polygon(e);return n.closed=r,this.drawShape(n),this},i.prototype.clear=function(){return this.lineWidth=0,this.filling=!1,this.dirty++,this.clearDirty++,this.graphicsData=[],this},i.prototype.isFastRect=function(){return 1===this.graphicsData.length&&this.graphicsData[0].shape.type===c.SHAPES.RECT&&!this.graphicsData[0].lineWidth},i.prototype._renderWebGL=function(t){this.dirty!==this.fastRectDirty&&(this.fastRectDirty=this.dirty,this._fastRect=this.isFastRect()),this._fastRect?this._renderSpriteRect(t):(t.setObjectRenderer(t.plugins.graphics),t.plugins.graphics.render(this))},i.prototype._renderSpriteRect=function(t){var e=this.graphicsData[0].shape;if(!this._spriteRect){if(!i._SPRITE_TEXTURE){var r=document.createElement("canvas");r.width=10,r.height=10;var n=r.getContext("2d");n.fillStyle="white",n.fillRect(0,0,10,10),i._SPRITE_TEXTURE=a.fromCanvas(r)}this._spriteRect=new u(i._SPRITE_TEXTURE)}if(16777215===this.tint)this._spriteRect.tint=this.graphicsData[0].fillColor;else{var s=x,o=m;d.hex2rgb(this.graphicsData[0].fillColor,s),d.hex2rgb(this.tint,o),s[0]*=o[0],s[1]*=o[1],s[2]*=o[2],this._spriteRect.tint=d.rgb2hex(s)}this._spriteRect.alpha=this.graphicsData[0].fillAlpha,this._spriteRect.worldAlpha=this.worldAlpha*this._spriteRect.alpha,i._SPRITE_TEXTURE._frame.width=e.width,i._SPRITE_TEXTURE._frame.height=e.height,this._spriteRect.transform.worldTransform=this.transform.worldTransform,this._spriteRect.anchor.set(-e.x/e.width,-e.y/e.height),this._spriteRect.onAnchorUpdate(),this._spriteRect._renderWebGL(t)},i.prototype._renderCanvas=function(t){this.isMask!==!0&&t.plugins.graphics.render(this)},i.prototype._calculateBounds=function(){if(this.renderable){this.boundsDirty!==this.dirty&&(this.boundsDirty=this.dirty,this.updateLocalBounds(),this.dirty++,this.cachedSpriteDirty=!0);var t=this._localBounds;this._bounds.addFrame(this.transform,t.minX,t.minY,t.maxX,t.maxY)}},i.prototype.containsPoint=function(t){this.worldTransform.applyInverse(t,y);for(var e=this.graphicsData,r=0;r<e.length;r++){var i=e[r];if(i.fill&&i.shape&&i.shape.contains(y.x,y.y))return!0}return!1},i.prototype.updateLocalBounds=function(){var t=1/0,e=-(1/0),r=1/0,i=-(1/0);if(this.graphicsData.length)for(var n,s,o,a,h,u,l=0;l<this.graphicsData.length;l++){var d=this.graphicsData[l],p=d.type,f=d.lineWidth;if(n=d.shape,p===c.SHAPES.RECT||p===c.SHAPES.RREC)o=n.x-f/2,a=n.y-f/2,h=n.width+f,u=n.height+f,t=o<t?o:t,e=o+h>e?o+h:e,r=a<r?a:r,i=a+u>i?a+u:i;else if(p===c.SHAPES.CIRC)o=n.x,a=n.y,h=n.radius+f/2,u=n.radius+f/2,t=o-h<t?o-h:t,e=o+h>e?o+h:e,r=a-u<r?a-u:r,i=a+u>i?a+u:i;else if(p===c.SHAPES.ELIP)o=n.x,a=n.y,h=n.width+f/2,u=n.height+f/2,t=o-h<t?o-h:t,e=o+h>e?o+h:e,r=a-u<r?a-u:r,i=a+u>i?a+u:i;else{s=n.points;for(var v=0;v<s.length;v+=2)o=s[v],a=s[v+1],t=o-f<t?o-f:t,e=o+f>e?o+f:e,r=a-f<r?a-f:r,i=a+f>i?a+f:i}}else t=0,e=0,r=0,i=0;var g=this.boundsPadding;this._localBounds.minX=t-g,this._localBounds.maxX=e+2*g,this._localBounds.minY=r-g,this._localBounds.maxY=i+2*g},i.prototype.drawShape=function(t){this.currentPath&&this.currentPath.shape.points.length<=2&&this.graphicsData.pop(),this.currentPath=null;var e=new h(this.lineWidth,this.lineColor,this.lineAlpha,this.fillColor,this.fillAlpha,this.filling,t);return this.graphicsData.push(e),e.type===c.SHAPES.POLY&&(e.shape.closed=e.shape.closed||this.filling,this.currentPath=e),this.dirty++,e},i.prototype.generateCanvasTexture=function(t,e){e=e||1;var r=this.getLocalBounds(),i=new o.create(r.width*e,r.height*e);n||(n=new v),g.tx=-r.x,g.ty=-r.y,n.render(this,i,!1,g);var s=a.fromCanvas(i.baseTexture._canvasRenderTarget.canvas,t);return s.baseTexture.resolution=e,s},i.prototype.closePath=function(){var t=this.currentPath;return t&&t.shape&&t.shape.close(),this},i.prototype.addHole=function(){var t=this.graphicsData.pop();return this.currentPath=this.graphicsData[this.graphicsData.length-1],this.currentPath.addHole(t.shape),this.currentPath=null,this},i.prototype.destroy=function(){s.prototype.destroy.apply(this,arguments);for(var t=0;t<this.graphicsData.length;++t)this.graphicsData[t].destroy();for(var e in this._webgl)for(var r=0;r<this._webgl[e].data.length;++r)this._webgl[e].data[r].destroy();this._spriteRect&&this._spriteRect.destroy(),this.graphicsData=null,this.currentPath=null,this._webgl=null,this._localBounds=null}},{"../const":78,"../display/Bounds":79,"../display/Container":80,"../math":102,"../renderers/canvas/CanvasRenderer":109,"../sprites/Sprite":133,"../textures/RenderTexture":143,"../textures/Texture":144,"../utils":151,"./GraphicsData":86,"./utils/bezierCurveTo":88}],86:[function(t,e,r){function i(t,e,r,i,n,s,o){this.lineWidth=t,this.lineColor=e,this.lineAlpha=r,this._lineTint=e,this.fillColor=i,this.fillAlpha=n,this._fillTint=i,this.fill=s,this.holes=[],this.shape=o,this.type=o.type}i.prototype.constructor=i,e.exports=i,i.prototype.clone=function(){return new i(this.lineWidth,this.lineColor,this.lineAlpha,this.fillColor,this.fillAlpha,this.fill,this.shape)},i.prototype.addHole=function(t){this.holes.push(t)},i.prototype.destroy=function(){this.shape=null,this.holes=null}},{}],87:[function(t,e,r){function i(t){this.renderer=t}var n=t("../../renderers/canvas/CanvasRenderer"),s=t("../../const");i.prototype.constructor=i,e.exports=i,n.registerPlugin("graphics",i),i.prototype.render=function(t){var e=this.renderer,r=e.context,i=t.worldAlpha,n=t.transform.worldTransform,o=e.resolution;this._prevTint!==this.tint&&(this.dirty=!0),r.setTransform(n.a*o,n.b*o,n.c*o,n.d*o,n.tx*o,n.ty*o),t.dirty&&(this.updateGraphicsTint(t),t.dirty=!1),e.setBlendMode(t.blendMode);for(var a=0;a<t.graphicsData.length;a++){var h=t.graphicsData[a],u=h.shape,l=h._fillTint,c=h._lineTint;if(r.lineWidth=h.lineWidth,h.type===s.SHAPES.POLY){r.beginPath(),this.renderPolygon(u.points,u.closed,r);for(var d=0;d<h.holes.length;d++){var p=h.holes[d];this.renderPolygon(p.points,!0,r)}h.fill&&(r.globalAlpha=h.fillAlpha*i,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),h.lineWidth&&(r.globalAlpha=h.lineAlpha*i,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke())}else if(h.type===s.SHAPES.RECT)(h.fillColor||0===h.fillColor)&&(r.globalAlpha=h.fillAlpha*i,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fillRect(u.x,u.y,u.width,u.height)),h.lineWidth&&(r.globalAlpha=h.lineAlpha*i,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.strokeRect(u.x,u.y,u.width,u.height));else if(h.type===s.SHAPES.CIRC)r.beginPath(),r.arc(u.x,u.y,u.radius,0,2*Math.PI),r.closePath(),h.fill&&(r.globalAlpha=h.fillAlpha*i,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),h.lineWidth&&(r.globalAlpha=h.lineAlpha*i,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke());else if(h.type===s.SHAPES.ELIP){var f=2*u.width,v=2*u.height,g=u.x-f/2,y=u.y-v/2;r.beginPath();var x=.5522848,m=f/2*x,_=v/2*x,b=g+f,T=y+v,E=g+f/2,w=y+v/2;r.moveTo(g,w),r.bezierCurveTo(g,w-_,E-m,y,E,y),r.bezierCurveTo(E+m,y,b,w-_,b,w),r.bezierCurveTo(b,w+_,E+m,T,E,T),r.bezierCurveTo(E-m,T,g,w+_,g,w),r.closePath(),h.fill&&(r.globalAlpha=h.fillAlpha*i,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),h.lineWidth&&(r.globalAlpha=h.lineAlpha*i,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke())}else if(h.type===s.SHAPES.RREC){var S=u.x,C=u.y,M=u.width,R=u.height,A=u.radius,O=Math.min(M,R)/2|0;A=A>O?O:A,r.beginPath(),r.moveTo(S,C+A),r.lineTo(S,C+R-A),r.quadraticCurveTo(S,C+R,S+A,C+R),r.lineTo(S+M-A,C+R),r.quadraticCurveTo(S+M,C+R,S+M,C+R-A),r.lineTo(S+M,C+A),r.quadraticCurveTo(S+M,C,S+M-A,C),r.lineTo(S+A,C),r.quadraticCurveTo(S,C,S,C+A),r.closePath(),(h.fillColor||0===h.fillColor)&&(r.globalAlpha=h.fillAlpha*i,r.fillStyle="#"+("00000"+(0|l).toString(16)).substr(-6),r.fill()),h.lineWidth&&(r.globalAlpha=h.lineAlpha*i,r.strokeStyle="#"+("00000"+(0|c).toString(16)).substr(-6),r.stroke())}}},i.prototype.updateGraphicsTint=function(t){t._prevTint=t.tint;for(var e=(t.tint>>16&255)/255,r=(t.tint>>8&255)/255,i=(255&t.tint)/255,n=0;n<t.graphicsData.length;n++){var s=t.graphicsData[n],o=0|s.fillColor,a=0|s.lineColor;s._fillTint=((o>>16&255)/255*e*255<<16)+((o>>8&255)/255*r*255<<8)+(255&o)/255*i*255,s._lineTint=((a>>16&255)/255*e*255<<16)+((a>>8&255)/255*r*255<<8)+(255&a)/255*i*255}},i.prototype.renderPolygon=function(t,e,r){r.moveTo(t[0],t[1]);for(var i=1;i<t.length/2;i++)r.lineTo(t[2*i],t[2*i+1]);e&&r.closePath()},i.prototype.destroy=function(){this.renderer=null}},{"../../const":78,"../../renderers/canvas/CanvasRenderer":109}],88:[function(t,e,r){var i=function(t,e,r,i,n,s,o,a,h){h=h||[];var u,l,c,d,p,f=20;h.push(t,e);for(var v=0,g=1;g<=f;++g)v=g/f,u=1-v,l=u*u,c=l*u,d=v*v,p=d*v,h.push(c*t+3*l*v*r+3*u*d*n+p*o,c*e+3*l*v*i+3*u*d*s+p*a);return h};e.exports=i},{}],89:[function(t,e,r){function i(t){o.call(this,t),this.graphicsDataPool=[],this.primitiveShader=null,this.gl=t.gl,this.CONTEXT_UID=0}var n=t("../../utils"),s=t("../../const"),o=t("../../renderers/webgl/utils/ObjectRenderer"),a=t("../../renderers/webgl/WebGLRenderer"),h=t("./WebGLGraphicsData"),u=t("./shaders/PrimitiveShader"),l=t("./utils/buildPoly"),c=t("./utils/buildRectangle"),d=t("./utils/buildRoundedRectangle"),p=t("./utils/buildCircle");i.prototype=Object.create(o.prototype),i.prototype.constructor=i,e.exports=i,a.registerPlugin("graphics",i),i.prototype.onContextChange=function(){this.gl=this.renderer.gl,this.CONTEXT_UID=this.renderer.CONTEXT_UID,this.primitiveShader=new u(this.gl)},i.prototype.destroy=function(){o.prototype.destroy.call(this);for(var t=0;t<this.graphicsDataPool.length;++t)this.graphicsDataPool[t].destroy();this.graphicsDataPool=null},i.prototype.render=function(t){var e,r=this.renderer,i=r.gl,s=t._webGL[this.CONTEXT_UID];s&&t.dirty===s.dirty||(this.updateGraphics(t),s=t._webGL[this.CONTEXT_UID]);var o=this.primitiveShader;r.bindShader(o),r.state.setBlendMode(t.blendMode);for(var a=0,h=s.data.length;a<h;a++){e=s.data[a];var u=e.shader;r.bindShader(u),u.uniforms.translationMatrix=t.transform.worldTransform.toArray(!0),u.uniforms.tint=n.hex2rgb(t.tint),u.uniforms.alpha=t.worldAlpha,e.vao.bind().draw(i.TRIANGLE_STRIP,e.indices.length).unbind()}},i.prototype.updateGraphics=function(t){var e=this.renderer.gl,r=t._webGL[this.CONTEXT_UID];r||(r=t._webGL[this.CONTEXT_UID]={lastIndex:0,data:[],gl:e,clearDirty:-1,dirty:-1}),r.dirty=t.dirty;var i;if(t.clearDirty!==r.clearDirty){for(r.clearDirty=t.clearDirty,i=0;i<r.data.length;i++){var n=r.data[i];this.graphicsDataPool.push(n)}r.data=[],r.lastIndex=0}var o;for(i=r.lastIndex;i<t.graphicsData.length;i++){var a=t.graphicsData[i];o=this.getWebGLData(r,0),a.type===s.SHAPES.POLY&&l(a,o),a.type===s.SHAPES.RECT?c(a,o):a.type===s.SHAPES.CIRC||a.type===s.SHAPES.ELIP?p(a,o):a.type===s.SHAPES.RREC&&d(a,o),r.lastIndex++}for(i=0;i<r.data.length;i++)o=r.data[i],o.dirty&&o.upload()},i.prototype.getWebGLData=function(t,e){var r=t.data[t.data.length-1];return(!r||r.points.length>32e4)&&(r=this.graphicsDataPool.pop()||new h(this.renderer.gl,this.primitiveShader,this.renderer.state.attribsState),r.reset(e),t.data.push(r)),r.dirty=!0,r}},{"../../const":78,"../../renderers/webgl/WebGLRenderer":116,"../../renderers/webgl/utils/ObjectRenderer":126,"../../utils":151,"./WebGLGraphicsData":90,"./shaders/PrimitiveShader":91,"./utils/buildCircle":92,"./utils/buildPoly":94,"./utils/buildRectangle":95,"./utils/buildRoundedRectangle":96}],90:[function(t,e,r){function i(t,e,r){this.gl=t,this.color=[0,0,0],this.points=[],this.indices=[],this.buffer=n.GLBuffer.createVertexBuffer(t),this.indexBuffer=n.GLBuffer.createIndexBuffer(t),this.dirty=!0,this.glPoints=null,this.glIndices=null,this.shader=e,this.vao=new n.VertexArrayObject(t,r).addIndex(this.indexBuffer).addAttribute(this.buffer,e.attributes.aVertexPosition,t.FLOAT,!1,24,0).addAttribute(this.buffer,e.attributes.aColor,t.FLOAT,!1,24,8)}var n=t("pixi-gl-core");i.prototype.constructor=i,e.exports=i,i.prototype.reset=function(){this.points.length=0,this.indices.length=0},i.prototype.upload=function(){this.glPoints=new Float32Array(this.points),this.buffer.upload(this.glPoints),this.glIndices=new Uint16Array(this.indices),this.indexBuffer.upload(this.glIndices),this.dirty=!1},i.prototype.destroy=function(){this.color=null,this.points=null,this.indices=null,this.vao.destroy(),this.buffer.destroy(),this.indexBuffer.destroy(),this.gl=null,this.buffer=null,this.indexBuffer=null,this.glPoints=null,this.glIndices=null}},{"pixi-gl-core":7}],91:[function(t,e,r){function i(t){n.call(this,t,["attribute vec2 aVertexPosition;","attribute vec4 aColor;","uniform mat3 translationMatrix;","uniform mat3 projectionMatrix;","uniform float alpha;","uniform vec3 tint;","varying vec4 vColor;","void main(void){","   gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);","   vColor = aColor * vec4(tint * alpha, alpha);","}"].join("\n"),["varying vec4 vColor;","void main(void){","   gl_FragColor = vColor;","}"].join("\n"))}var n=t("../../../Shader");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i},{"../../../Shader":77}],92:[function(t,e,r){var i=t("./buildLine"),n=t("../../../const"),s=t("../../../utils"),o=function(t,e){var r,o,a=t.shape,h=a.x,u=a.y;t.type===n.SHAPES.CIRC?(r=a.radius,o=a.radius):(r=a.width,o=a.height);var l=Math.floor(30*Math.sqrt(a.radius))||Math.floor(15*Math.sqrt(a.width+a.height)),c=2*Math.PI/l,d=0;if(t.fill){var p=s.hex2rgb(t.fillColor),f=t.fillAlpha,v=p[0]*f,g=p[1]*f,y=p[2]*f,x=e.points,m=e.indices,_=x.length/6;for(m.push(_),d=0;d<l+1;d++)x.push(h,u,v,g,y,f),x.push(h+Math.sin(c*d)*r,u+Math.cos(c*d)*o,v,g,y,f),m.push(_++,_++);m.push(_-1)}if(t.lineWidth){var b=t.points;for(t.points=[],d=0;d<l+1;d++)t.points.push(h+Math.sin(c*d)*r,u+Math.cos(c*d)*o);i(t,e),t.points=b}};e.exports=o},{"../../../const":78,"../../../utils":151,"./buildLine":93}],93:[function(t,e,r){var i=t("../../../math"),n=t("../../../utils"),s=function(t,e){var r=0,s=t.points;if(0!==s.length){var o=new i.Point(s[0],s[1]),a=new i.Point(s[s.length-2],s[s.length-1]);if(o.x===a.x&&o.y===a.y){s=s.slice(),s.pop(),s.pop(),a=new i.Point(s[s.length-2],s[s.length-1]);var h=a.x+.5*(o.x-a.x),u=a.y+.5*(o.y-a.y);s.unshift(h,u),s.push(h,u)}var l,c,d,p,f,v,g,y,x,m,_,b,T,E,w,S,C,M,R,A,O,D,P,I=e.points,L=e.indices,F=s.length/2,B=s.length,N=I.length/6,k=t.lineWidth/2,U=n.hex2rgb(t.lineColor),j=t.lineAlpha,W=U[0]*j,G=U[1]*j,X=U[2]*j;for(d=s[0],p=s[1],f=s[2],v=s[3],x=-(p-v),m=d-f,P=Math.sqrt(x*x+m*m),x/=P,m/=P,x*=k,m*=k,I.push(d-x,p-m,W,G,X,j),I.push(d+x,p+m,W,G,X,j),r=1;r<F-1;r++)d=s[2*(r-1)],p=s[2*(r-1)+1],f=s[2*r],v=s[2*r+1],g=s[2*(r+1)],y=s[2*(r+1)+1],x=-(p-v),m=d-f,P=Math.sqrt(x*x+m*m),x/=P,m/=P,x*=k,m*=k,_=-(v-y),b=f-g,P=Math.sqrt(_*_+b*b),_/=P,b/=P,_*=k,b*=k,w=-m+p-(-m+v),S=-x+f-(-x+d),C=(-x+d)*(-m+v)-(-x+f)*(-m+p),M=-b+y-(-b+v),R=-_+f-(-_+g),A=(-_+g)*(-b+v)-(-_+f)*(-b+y),O=w*R-M*S,Math.abs(O)<.1?(O+=10.1,I.push(f-x,v-m,W,G,X,j),I.push(f+x,v+m,W,G,X,j)):(l=(S*A-R*C)/O,c=(M*C-w*A)/O,D=(l-f)*(l-f)+(c-v)*(c-v),D>19600?(T=x-_,E=m-b,P=Math.sqrt(T*T+E*E),T/=P,E/=P,T*=k,E*=k,I.push(f-T,v-E),I.push(W,G,X,j),I.push(f+T,v+E),I.push(W,G,X,j),I.push(f-T,v-E),I.push(W,G,X,j),B++):(I.push(l,c),I.push(W,G,X,j),I.push(f-(l-f),v-(c-v)),I.push(W,G,X,j)));for(d=s[2*(F-2)],p=s[2*(F-2)+1],f=s[2*(F-1)],v=s[2*(F-1)+1],x=-(p-v),m=d-f,P=Math.sqrt(x*x+m*m),x/=P,m/=P,x*=k,m*=k,I.push(f-x,v-m),I.push(W,G,X,j),I.push(f+x,v+m),I.push(W,G,X,j),L.push(N),r=0;r<B;r++)L.push(N++);L.push(N-1)}};e.exports=s},{"../../../math":102,"../../../utils":151}],94:[function(t,e,r){var i=t("./buildLine"),n=t("../../../utils"),s=t("earcut"),o=function(t,e){t.points=t.shape.points.slice();var r=t.points;if(t.fill&&r.length>=6){for(var o=[],a=t.holes,h=0;h<a.length;h++){var u=a[h];o.push(r.length/2),r=r.concat(u.points)}var l=e.points,c=e.indices,d=r.length/2,p=n.hex2rgb(t.fillColor),f=t.fillAlpha,v=p[0]*f,g=p[1]*f,y=p[2]*f,x=s(r,o,2);if(!x)return;var m=l.length/6;for(h=0;h<x.length;h+=3)c.push(x[h]+m),c.push(x[h]+m),c.push(x[h+1]+m),c.push(x[h+2]+m),c.push(x[h+2]+m);for(h=0;h<d;h++)l.push(r[2*h],r[2*h+1],v,g,y,f)}t.lineWidth>0&&i(t,e)};e.exports=o},{"../../../utils":151,"./buildLine":93,earcut:31}],95:[function(t,e,r){var i=t("./buildLine"),n=t("../../../utils"),s=function(t,e){var r=t.shape,s=r.x,o=r.y,a=r.width,h=r.height;if(t.fill){var u=n.hex2rgb(t.fillColor),l=t.fillAlpha,c=u[0]*l,d=u[1]*l,p=u[2]*l,f=e.points,v=e.indices,g=f.length/6;f.push(s,o),f.push(c,d,p,l),f.push(s+a,o),f.push(c,d,p,l),f.push(s,o+h),f.push(c,d,p,l),f.push(s+a,o+h),f.push(c,d,p,l),v.push(g,g,g+1,g+2,g+3,g+3)}if(t.lineWidth){var y=t.points;t.points=[s,o,s+a,o,s+a,o+h,s,o+h,s,o],i(t,e),t.points=y}};e.exports=s},{"../../../utils":151,"./buildLine":93}],96:[function(t,e,r){var i=t("earcut"),n=t("./buildLine"),s=t("../../../utils"),o=function(t,e){var r=t.shape,o=r.x,h=r.y,u=r.width,l=r.height,c=r.radius,d=[];if(d.push(o,h+c),a(o,h+l-c,o,h+l,o+c,h+l,d),a(o+u-c,h+l,o+u,h+l,o+u,h+l-c,d),a(o+u,h+c,o+u,h,o+u-c,h,d),a(o+c,h,o,h,o,h+c+1e-10,d),t.fill){var p=s.hex2rgb(t.fillColor),f=t.fillAlpha,v=p[0]*f,g=p[1]*f,y=p[2]*f,x=e.points,m=e.indices,_=x.length/6,b=i(d,null,2),T=0;for(T=0;T<b.length;T+=3)m.push(b[T]+_),m.push(b[T]+_),m.push(b[T+1]+_),m.push(b[T+2]+_),m.push(b[T+2]+_);for(T=0;T<d.length;T++)x.push(d[T],d[++T],v,g,y,f)}if(t.lineWidth){var E=t.points;t.points=d,n(t,e),t.points=E}},a=function(t,e,r,i,n,s,o){function a(t,e,r){var i=e-t;return t+i*r}for(var h,u,l,c,d,p,f=20,v=o||[],g=0,y=0;y<=f;y++)g=y/f,h=a(t,r,g),u=a(e,i,g),l=a(r,n,g),c=a(i,s,g),d=a(h,l,g),p=a(u,c,g),v.push(d,p);return v};e.exports=o},{"../../../utils":151,"./buildLine":93,earcut:31}],97:[function(t,e,r){var i=e.exports=Object.assign(t("./const"),t("./math"),{utils:t("./utils"),ticker:t("./ticker"),DisplayObject:t("./display/DisplayObject"),Container:t("./display/Container"),Transform:t("./display/Transform"),TransformStatic:t("./display/TransformStatic"),TransformBase:t("./display/TransformBase"),Sprite:t("./sprites/Sprite"),CanvasSpriteRenderer:t("./sprites/canvas/CanvasSpriteRenderer"),CanvasTinter:t("./sprites/canvas/CanvasTinter"),SpriteRenderer:t("./sprites/webgl/SpriteRenderer"),Text:t("./text/Text"),TextStyle:t("./text/TextStyle"),Graphics:t("./graphics/Graphics"),GraphicsData:t("./graphics/GraphicsData"),GraphicsRenderer:t("./graphics/webgl/GraphicsRenderer"),CanvasGraphicsRenderer:t("./graphics/canvas/CanvasGraphicsRenderer"),Texture:t("./textures/Texture"),BaseTexture:t("./textures/BaseTexture"),RenderTexture:t("./textures/RenderTexture"),BaseRenderTexture:t("./textures/BaseRenderTexture"),VideoBaseTexture:t("./textures/VideoBaseTexture"),TextureUvs:t("./textures/TextureUvs"),CanvasRenderer:t("./renderers/canvas/CanvasRenderer"),CanvasRenderTarget:t("./renderers/canvas/utils/CanvasRenderTarget"),Shader:t("./Shader"),WebGLRenderer:t("./renderers/webgl/WebGLRenderer"),WebGLManager:t("./renderers/webgl/managers/WebGLManager"),ObjectRenderer:t("./renderers/webgl/utils/ObjectRenderer"),RenderTarget:t("./renderers/webgl/utils/RenderTarget"),Quad:t("./renderers/webgl/utils/Quad"),SpriteMaskFilter:t("./renderers/webgl/filters/spriteMask/SpriteMaskFilter"),Filter:t("./renderers/webgl/filters/Filter"),glCore:t("pixi-gl-core"),autoDetectRenderer:function(t,e,r,n){return t=t||800,e=e||600,!n&&i.utils.isWebGLSupported()?new i.WebGLRenderer(t,e,r):new i.CanvasRenderer(t,e,r)}})},{"./Shader":77,"./const":78,"./display/Container":80,"./display/DisplayObject":81,"./display/Transform":82,"./display/TransformBase":83,"./display/TransformStatic":84,"./graphics/Graphics":85,"./graphics/GraphicsData":86,"./graphics/canvas/CanvasGraphicsRenderer":87,"./graphics/webgl/GraphicsRenderer":89,"./math":102,"./renderers/canvas/CanvasRenderer":109,"./renderers/canvas/utils/CanvasRenderTarget":111,"./renderers/webgl/WebGLRenderer":116,"./renderers/webgl/filters/Filter":118,"./renderers/webgl/filters/spriteMask/SpriteMaskFilter":121,"./renderers/webgl/managers/WebGLManager":125,"./renderers/webgl/utils/ObjectRenderer":126,"./renderers/webgl/utils/Quad":127,"./renderers/webgl/utils/RenderTarget":128,"./sprites/Sprite":133,"./sprites/canvas/CanvasSpriteRenderer":134,"./sprites/canvas/CanvasTinter":135,"./sprites/webgl/SpriteRenderer":137,"./text/Text":139,"./text/TextStyle":140,"./textures/BaseRenderTexture":141,"./textures/BaseTexture":142,"./textures/RenderTexture":143,"./textures/Texture":144,"./textures/TextureUvs":145,"./textures/VideoBaseTexture":146,"./ticker":148,"./utils":151,"pixi-gl-core":7}],98:[function(t,e,r){function i(t){return t<0?-1:t>0?1:0}function n(){for(var t=0;t<16;t++){var e=[];c.push(e);for(var r=0;r<16;r++)for(var n=i(s[t]*s[r]+a[t]*o[r]),d=i(o[t]*s[r]+h[t]*o[r]),p=i(s[t]*a[r]+a[t]*h[r]),f=i(o[t]*a[r]+h[t]*h[r]),v=0;v<16;v++)if(s[v]===n&&o[v]===d&&a[v]===p&&h[v]===f){e.push(v);break}}for(t=0;t<16;t++){var g=new l;g.set(s[t],o[t],a[t],h[t],0,0),u.push(g)}}var s=[1,1,0,-1,-1,-1,0,1,1,1,0,-1,-1,-1,0,1],o=[0,1,1,1,0,-1,-1,-1,0,1,1,1,0,-1,-1,-1],a=[0,-1,-1,-1,0,1,1,1,0,1,1,1,0,-1,-1,-1],h=[1,1,0,-1,-1,-1,0,1,-1,-1,0,1,1,1,0,-1],u=[],l=t("./Matrix"),c=[];n();var d={E:0,SE:1,S:2,SW:3,W:4,NW:5,N:6,NE:7,MIRROR_VERTICAL:8,MIRROR_HORIZONTAL:12,uX:function(t){return s[t]},uY:function(t){return o[t]},vX:function(t){return a[t]},vY:function(t){return h[t]},inv:function(t){return 8&t?15&t:7&-t},add:function(t,e){return c[t][e]},sub:function(t,e){return c[t][d.inv(e)]},rotate180:function(t){return 4^t},isSwapWidthHeight:function(t){return 2===(3&t)},byDirection:function(t,e){return 2*Math.abs(t)<=Math.abs(e)?e>=0?d.S:d.N:2*Math.abs(e)<=Math.abs(t)?t>0?d.E:d.W:e>0?t>0?d.SE:d.SW:t>0?d.NE:d.NW},matrixAppendRotationInv:function(t,e,r,i){var n=u[d.inv(e)];r=r||0,i=i||0,n.tx=r,n.ty=i,t.append(n)}};e.exports=d},{"./Matrix":99}],99:[function(t,e,r){function i(){this.a=1,this.b=0,this.c=0,this.d=1,this.tx=0,this.ty=0,this.array=null}var n=t("./Point");i.prototype.constructor=i,e.exports=i,i.prototype.fromArray=function(t){this.a=t[0],this.b=t[1],this.c=t[3],this.d=t[4],this.tx=t[2],this.ty=t[5]},i.prototype.set=function(t,e,r,i,n,s){return this.a=t,this.b=e,this.c=r,this.d=i,this.tx=n,this.ty=s,this},i.prototype.toArray=function(t,e){this.array||(this.array=new Float32Array(9));var r=e||this.array;return t?(r[0]=this.a,r[1]=this.b,r[2]=0,r[3]=this.c,r[4]=this.d,r[5]=0,r[6]=this.tx,r[7]=this.ty,r[8]=1):(r[0]=this.a,r[1]=this.c,r[2]=this.tx,r[3]=this.b,r[4]=this.d,r[5]=this.ty,r[6]=0,r[7]=0,r[8]=1),r},i.prototype.apply=function(t,e){e=e||new n;var r=t.x,i=t.y;return e.x=this.a*r+this.c*i+this.tx,e.y=this.b*r+this.d*i+this.ty,e},i.prototype.applyInverse=function(t,e){e=e||new n;var r=1/(this.a*this.d+this.c*-this.b),i=t.x,s=t.y;return e.x=this.d*r*i+-this.c*r*s+(this.ty*this.c-this.tx*this.d)*r,e.y=this.a*r*s+-this.b*r*i+(-this.ty*this.a+this.tx*this.b)*r,e},i.prototype.translate=function(t,e){return this.tx+=t,this.ty+=e,this},i.prototype.scale=function(t,e){return this.a*=t,this.d*=e,this.c*=t,this.b*=e,this.tx*=t,this.ty*=e,this},i.prototype.rotate=function(t){var e=Math.cos(t),r=Math.sin(t),i=this.a,n=this.c,s=this.tx;return this.a=i*e-this.b*r,this.b=i*r+this.b*e,this.c=n*e-this.d*r,this.d=n*r+this.d*e,this.tx=s*e-this.ty*r,this.ty=s*r+this.ty*e,this},i.prototype.append=function(t){var e=this.a,r=this.b,i=this.c,n=this.d;return this.a=t.a*e+t.b*i,this.b=t.a*r+t.b*n,this.c=t.c*e+t.d*i,this.d=t.c*r+t.d*n,this.tx=t.tx*e+t.ty*i+this.tx,this.ty=t.tx*r+t.ty*n+this.ty,this},i.prototype.setTransform=function(t,e,r,i,n,s,o,a,h){var u,l,c,d,p,f,v,g,y,x;return p=Math.sin(o),f=Math.cos(o),v=Math.cos(h),g=Math.sin(h),y=-Math.sin(a),x=Math.cos(a),u=f*n,l=p*n,c=-p*s,d=f*s,this.a=v*u+g*c,this.b=v*l+g*d,this.c=y*u+x*c,this.d=y*l+x*d,this.tx=t+(r*u+i*c),this.ty=e+(r*l+i*d),this},i.prototype.prepend=function(t){var e=this.tx;if(1!==t.a||0!==t.b||0!==t.c||1!==t.d){var r=this.a,i=this.c;this.a=r*t.a+this.b*t.c,this.b=r*t.b+this.b*t.d,this.c=i*t.a+this.d*t.c,this.d=i*t.b+this.d*t.d}return this.tx=e*t.a+this.ty*t.c+t.tx,this.ty=e*t.b+this.ty*t.d+t.ty,this},i.prototype.decompose=function(t){var e=this.a,r=this.b,i=this.c,n=this.d,s=Math.atan2(-i,n),o=Math.atan2(r,e),a=Math.abs(1-s/o);return a<1e-5?(t.rotation=o,e<0&&n>=0&&(t.rotation+=t.rotation<=0?Math.PI:-Math.PI),t.skew.x=t.skew.y=0):(t.skew.x=s,t.skew.y=o),t.scale.x=Math.sqrt(e*e+r*r),t.scale.y=Math.sqrt(i*i+n*n),t.position.x=this.tx,t.position.y=this.ty,t},i.prototype.invert=function(){var t=this.a,e=this.b,r=this.c,i=this.d,n=this.tx,s=t*i-e*r;return this.a=i/s,this.b=-e/s,this.c=-r/s,this.d=t/s,this.tx=(r*this.ty-i*n)/s,this.ty=-(t*this.ty-e*n)/s,this},i.prototype.identity=function(){return this.a=1,this.b=0,this.c=0,this.d=1,this.tx=0,this.ty=0,this},i.prototype.clone=function(){var t=new i;return t.a=this.a,t.b=this.b,t.c=this.c,t.d=this.d,t.tx=this.tx,t.ty=this.ty,t},i.prototype.copy=function(t){return t.a=this.a,t.b=this.b,t.c=this.c,t.d=this.d,t.tx=this.tx,t.ty=this.ty,t},i.IDENTITY=new i,i.TEMP_MATRIX=new i},{"./Point":101}],100:[function(t,e,r){function i(t,e,r,i){this._x=r||0,this._y=i||0,this.cb=t,this.scope=e}i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{x:{get:function(){return this._x},set:function(t){this._x!==t&&(this._x=t,this.cb.call(this.scope))}},y:{get:function(){return this._y},set:function(t){this._y!==t&&(this._y=t,this.cb.call(this.scope))}}}),i.prototype.set=function(t,e){var r=t||0,i=e||(0!==e?r:0);this._x===r&&this._y===i||(this._x=r,this._y=i,this.cb.call(this.scope))},i.prototype.copy=function(t){this._x===t.x&&this._y===t.y||(this._x=t.x,this._y=t.y,this.cb.call(this.scope))}},{}],101:[function(t,e,r){function i(t,e){this.x=t||0,this.y=e||0}i.prototype.constructor=i,e.exports=i,i.prototype.clone=function(){return new i(this.x,this.y)},i.prototype.copy=function(t){this.set(t.x,t.y)},i.prototype.equals=function(t){return t.x===this.x&&t.y===this.y},i.prototype.set=function(t,e){this.x=t||0,this.y=e||(0!==e?this.x:0)}},{}],102:[function(t,e,r){e.exports={Point:t("./Point"),ObservablePoint:t("./ObservablePoint"),Matrix:t("./Matrix"),GroupD8:t("./GroupD8"),Circle:t("./shapes/Circle"),Ellipse:t("./shapes/Ellipse"),Polygon:t("./shapes/Polygon"),Rectangle:t("./shapes/Rectangle"),RoundedRectangle:t("./shapes/RoundedRectangle")}},{"./GroupD8":98,"./Matrix":99,"./ObservablePoint":100,"./Point":101,"./shapes/Circle":103,"./shapes/Ellipse":104,"./shapes/Polygon":105,"./shapes/Rectangle":106,"./shapes/RoundedRectangle":107}],103:[function(t,e,r){function i(t,e,r){this.x=t||0,this.y=e||0,this.radius=r||0,this.type=s.SHAPES.CIRC}var n=t("./Rectangle"),s=t("../../const");i.prototype.constructor=i,e.exports=i,i.prototype.clone=function(){return new i(this.x,this.y,this.radius)},i.prototype.contains=function(t,e){if(this.radius<=0)return!1;var r=this.x-t,i=this.y-e,n=this.radius*this.radius;return r*=r,i*=i,r+i<=n},i.prototype.getBounds=function(){return new n(this.x-this.radius,this.y-this.radius,2*this.radius,2*this.radius)}},{"../../const":78,"./Rectangle":106}],104:[function(t,e,r){function i(t,e,r,i){this.x=t||0,this.y=e||0,this.width=r||0,this.height=i||0,this.type=s.SHAPES.ELIP}var n=t("./Rectangle"),s=t("../../const");i.prototype.constructor=i,e.exports=i,i.prototype.clone=function(){return new i(this.x,this.y,this.width,this.height)},i.prototype.contains=function(t,e){if(this.width<=0||this.height<=0)return!1;var r=(t-this.x)/this.width,i=(e-this.y)/this.height;return r*=r,i*=i,r+i<=1},i.prototype.getBounds=function(){return new n(this.x-this.width,this.y-this.height,this.width,this.height)}},{"../../const":78,"./Rectangle":106}],105:[function(t,e,r){function i(t){var e=t;if(!Array.isArray(e)){e=new Array(arguments.length);for(var r=0;r<e.length;++r)e[r]=arguments[r]}if(e[0]instanceof n){for(var i=[],o=0,a=e.length;o<a;o++)i.push(e[o].x,e[o].y);e=i}this.closed=!0,this.points=e,this.type=s.SHAPES.POLY}var n=t("../Point"),s=t("../../const");i.prototype.constructor=i,e.exports=i,i.prototype.clone=function(){return new i(this.points.slice())},i.prototype.close=function(){var t=this.points;t[0]===t[t.length-2]&&t[1]===t[t.length-1]||t.push(t[0],t[1])},i.prototype.contains=function(t,e){for(var r=!1,i=this.points.length/2,n=0,s=i-1;n<i;s=n++){var o=this.points[2*n],a=this.points[2*n+1],h=this.points[2*s],u=this.points[2*s+1],l=a>e!=u>e&&t<(h-o)*(e-a)/(u-a)+o;l&&(r=!r)}return r}},{"../../const":78,"../Point":101}],106:[function(t,e,r){function i(t,e,r,i){this.x=t||0,this.y=e||0,this.width=r||0,this.height=i||0,this.type=n.SHAPES.RECT}var n=t("../../const");i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{left:{get:function(){return this.x}},right:{get:function(){return this.x+this.width}},top:{get:function(){return this.y}},bottom:{get:function(){return this.y+this.height}}}),i.EMPTY=new i(0,0,0,0),i.prototype.clone=function(){return new i(this.x,this.y,this.width,this.height)},i.prototype.copy=function(t){return this.x=t.x,this.y=t.y,this.width=t.width,this.height=t.height,this},i.prototype.contains=function(t,e){return!(this.width<=0||this.height<=0)&&(t>=this.x&&t<this.x+this.width&&e>=this.y&&e<this.y+this.height)},i.prototype.pad=function(t,e){t=t||0,e=e||(0!==e?t:0),this.x-=t,this.y-=e,this.width+=2*t,this.height+=2*e},i.prototype.fit=function(t){this.x<t.x&&(this.width+=this.x,this.width<0&&(this.width=0),this.x=t.x),this.y<t.y&&(this.height+=this.y,this.height<0&&(this.height=0),this.y=t.y),this.x+this.width>t.x+t.width&&(this.width=t.width-this.x,this.width<0&&(this.width=0)),this.y+this.height>t.y+t.height&&(this.height=t.height-this.y,this.height<0&&(this.height=0))},i.prototype.enlarge=function(t){if(t!==i.EMPTY){var e=Math.min(this.x,t.x),r=Math.max(this.x+this.width,t.x+t.width),n=Math.min(this.y,t.y),s=Math.max(this.y+this.height,t.y+t.height);
this.x=e,this.width=r-e,this.y=n,this.height=s-n}}},{"../../const":78}],107:[function(t,e,r){function i(t,e,r,i,s){this.x=t||0,this.y=e||0,this.width=r||0,this.height=i||0,this.radius=s||20,this.type=n.SHAPES.RREC}var n=t("../../const");i.prototype.constructor=i,e.exports=i,i.prototype.clone=function(){return new i(this.x,this.y,this.width,this.height,this.radius)},i.prototype.contains=function(t,e){return!(this.width<=0||this.height<=0)&&(t>=this.x&&t<=this.x+this.width&&e>=this.y&&e<=this.y+this.height)}},{"../../const":78}],108:[function(t,e,r){function i(t,e,r,i){if(u.call(this),n.sayHello(t),i)for(var s in o.DEFAULT_RENDER_OPTIONS)"undefined"==typeof i[s]&&(i[s]=o.DEFAULT_RENDER_OPTIONS[s]);else i=o.DEFAULT_RENDER_OPTIONS;this.type=o.RENDERER_TYPE.UNKNOWN,this.width=e||800,this.height=r||600,this.view=i.view||document.createElement("canvas"),this.resolution=i.resolution,this.transparent=i.transparent,this.autoResize=i.autoResize||!1,this.blendModes=null,this.preserveDrawingBuffer=i.preserveDrawingBuffer,this.clearBeforeRender=i.clearBeforeRender,this.roundPixels=i.roundPixels,this._backgroundColor=0,this._backgroundColorRgba=[0,0,0,0],this._backgroundColorString="#000000",this.backgroundColor=i.backgroundColor||this._backgroundColor,this._tempDisplayObjectParent=new a,this._lastObjectRendered=this._tempDisplayObjectParent}var n=t("../utils"),s=t("../math"),o=t("../const"),a=t("../display/Container"),h=t("../textures/RenderTexture"),u=t("eventemitter3"),l=new s.Matrix;i.prototype=Object.create(u.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{backgroundColor:{get:function(){return this._backgroundColor},set:function(t){this._backgroundColor=t,this._backgroundColorString=n.hex2string(t),n.hex2rgb(t,this._backgroundColorRgba)}}}),i.prototype.resize=function(t,e){this.width=t*this.resolution,this.height=e*this.resolution,this.view.width=this.width,this.view.height=this.height,this.autoResize&&(this.view.style.width=this.width/this.resolution+"px",this.view.style.height=this.height/this.resolution+"px")},i.prototype.generateTexture=function(t,e,r){var i=t.getLocalBounds(),n=h.create(0|i.width,0|i.height,e,r);return l.tx=-i.x,l.ty=-i.y,this.render(t,n,!1,l,!0),n},i.prototype.destroy=function(t){t&&this.view.parentNode&&this.view.parentNode.removeChild(this.view),this.type=o.RENDERER_TYPE.UNKNOWN,this.width=0,this.height=0,this.view=null,this.resolution=0,this.transparent=!1,this.autoResize=!1,this.blendModes=null,this.preserveDrawingBuffer=!1,this.clearBeforeRender=!1,this.roundPixels=!1,this._backgroundColor=0,this._backgroundColorRgba=null,this._backgroundColorString=null,this.backgroundColor=0,this._tempDisplayObjectParent=null,this._lastObjectRendered=null}},{"../const":78,"../display/Container":80,"../math":102,"../textures/RenderTexture":143,"../utils":151,eventemitter3:32}],109:[function(t,e,r){function i(t,e,r){r=r||{},n.call(this,"Canvas",t,e,r),this.type=u.RENDERER_TYPE.CANVAS,this.rootContext=this.view.getContext("2d",{alpha:this.transparent}),this.rootResolution=this.resolution,this.refresh=!0,this.maskManager=new s(this),this.smoothProperty="imageSmoothingEnabled",this.rootContext.imageSmoothingEnabled||(this.rootContext.webkitImageSmoothingEnabled?this.smoothProperty="webkitImageSmoothingEnabled":this.rootContext.mozImageSmoothingEnabled?this.smoothProperty="mozImageSmoothingEnabled":this.rootContext.oImageSmoothingEnabled?this.smoothProperty="oImageSmoothingEnabled":this.rootContext.msImageSmoothingEnabled&&(this.smoothProperty="msImageSmoothingEnabled")),this.initPlugins(),this.blendModes=a(),this._activeBlendMode=null,this.context=null,this.renderingToScreen=!1,this.resize(t,e)}var n=t("../SystemRenderer"),s=t("./utils/CanvasMaskManager"),o=t("./utils/CanvasRenderTarget"),a=t("./utils/mapCanvasBlendModesToPixi"),h=t("../../utils"),u=t("../../const");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,h.pluginTarget.mixin(i),i.prototype.render=function(t,e,r,i,n){if(this.view){this.renderingToScreen=!e,this.emit("prerender"),e?(e=e.baseTexture||e,e._canvasRenderTarget||(e._canvasRenderTarget=new o(e.width,e.height,e.resolution),e.source=e._canvasRenderTarget.canvas,e.valid=!0),this.context=e._canvasRenderTarget.context,this.resolution=e._canvasRenderTarget.resolution):(this.context=this.rootContext,this.resolution=this.rootResolution);var s=this.context;if(e||(this._lastObjectRendered=t),!n){var a=t.parent,h=this._tempDisplayObjectParent.transform.worldTransform;i?i.copy(h):h.identity(),t.parent=this._tempDisplayObjectParent,t.updateTransform(),t.parent=a}s.setTransform(1,0,0,1,0,0),s.globalAlpha=1,s.globalCompositeOperation=this.blendModes[u.BLEND_MODES.NORMAL],navigator.isCocoonJS&&this.view.screencanvas&&(s.fillStyle="black",s.clear()),(void 0!==r?r:this.clearBeforeRender)&&this.renderingToScreen&&(this.transparent?s.clearRect(0,0,this.width,this.height):(s.fillStyle=this._backgroundColorString,s.fillRect(0,0,this.width,this.height)));var l=this.context;this.context=s,t.renderCanvas(this),this.context=l,this.emit("postrender")}},i.prototype.setBlendMode=function(t){this._activeBlendMode!==t&&(this.context.globalCompositeOperation=this.blendModes[t])},i.prototype.destroy=function(t){this.destroyPlugins(),n.prototype.destroy.call(this,t),this.context=null,this.refresh=!0,this.maskManager.destroy(),this.maskManager=null,this.smoothProperty=null},i.prototype.resize=function(t,e){n.prototype.resize.call(this,t,e),this.smoothProperty&&(this.rootContext[this.smoothProperty]=u.SCALE_MODES.DEFAULT===u.SCALE_MODES.LINEAR)}},{"../../const":78,"../../utils":151,"../SystemRenderer":108,"./utils/CanvasMaskManager":110,"./utils/CanvasRenderTarget":111,"./utils/mapCanvasBlendModesToPixi":113}],110:[function(t,e,r){function i(t){this.renderer=t}var n=t("../../../const");i.prototype.constructor=i,e.exports=i,i.prototype.pushMask=function(t){var e=this.renderer;e.context.save();var r=t.alpha,i=t.transform.worldTransform,n=e.resolution;e.context.setTransform(i.a*n,i.b*n,i.c*n,i.d*n,i.tx*n,i.ty*n),t._texture||(this.renderGraphicsShape(t),e.context.clip()),t.worldAlpha=r},i.prototype.renderGraphicsShape=function(t){var e=this.renderer.context,r=t.graphicsData.length;if(0!==r){e.beginPath();for(var i=0;i<r;i++){var s=t.graphicsData[i],o=s.shape;if(s.type===n.SHAPES.POLY){var a=o.points;e.moveTo(a[0],a[1]);for(var h=1;h<a.length/2;h++)e.lineTo(a[2*h],a[2*h+1]);a[0]===a[a.length-2]&&a[1]===a[a.length-1]&&e.closePath()}else if(s.type===n.SHAPES.RECT)e.rect(o.x,o.y,o.width,o.height),e.closePath();else if(s.type===n.SHAPES.CIRC)e.arc(o.x,o.y,o.radius,0,2*Math.PI),e.closePath();else if(s.type===n.SHAPES.ELIP){var u=2*o.width,l=2*o.height,c=o.x-u/2,d=o.y-l/2,p=.5522848,f=u/2*p,v=l/2*p,g=c+u,y=d+l,x=c+u/2,m=d+l/2;e.moveTo(c,m),e.bezierCurveTo(c,m-v,x-f,d,x,d),e.bezierCurveTo(x+f,d,g,m-v,g,m),e.bezierCurveTo(g,m+v,x+f,y,x,y),e.bezierCurveTo(x-f,y,c,m+v,c,m),e.closePath()}else if(s.type===n.SHAPES.RREC){var _=o.x,b=o.y,T=o.width,E=o.height,w=o.radius,S=Math.min(T,E)/2|0;w=w>S?S:w,e.moveTo(_,b+w),e.lineTo(_,b+E-w),e.quadraticCurveTo(_,b+E,_+w,b+E),e.lineTo(_+T-w,b+E),e.quadraticCurveTo(_+T,b+E,_+T,b+E-w),e.lineTo(_+T,b+w),e.quadraticCurveTo(_+T,b,_+T-w,b),e.lineTo(_+w,b),e.quadraticCurveTo(_,b,_,b+w),e.closePath()}}}},i.prototype.popMask=function(t){t.context.restore()},i.prototype.destroy=function(){}},{"../../../const":78}],111:[function(t,e,r){function i(t,e,r){this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d"),this.resolution=r||n.RESOLUTION,this.resize(t,e)}var n=t("../../../const");i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{width:{get:function(){return this.canvas.width},set:function(t){this.canvas.width=t}},height:{get:function(){return this.canvas.height},set:function(t){this.canvas.height=t}}}),i.prototype.clear=function(){this.context.setTransform(1,0,0,1,0,0),this.context.clearRect(0,0,this.canvas.width,this.canvas.height)},i.prototype.resize=function(t,e){this.canvas.width=t*this.resolution,this.canvas.height=e*this.resolution},i.prototype.destroy=function(){this.context=null,this.canvas=null}},{"../../../const":78}],112:[function(t,e,r){var i=function(t){var e=document.createElement("canvas");e.width=6,e.height=1;var r=e.getContext("2d");return r.fillStyle=t,r.fillRect(0,0,6,1),e},n=function(){if("undefined"==typeof document)return!1;var t=i("#ff00ff"),e=i("#ffff00"),r=document.createElement("canvas");r.width=6,r.height=1;var n=r.getContext("2d");n.globalCompositeOperation="multiply",n.drawImage(t,0,0),n.drawImage(e,2,0);var s=n.getImageData(2,0,1,1);if(!s)return!1;var o=s.data;return 255===o[0]&&0===o[1]&&0===o[2]};e.exports=n},{}],113:[function(t,e,r){function i(t){return t=t||[],s()?(t[n.BLEND_MODES.NORMAL]="source-over",t[n.BLEND_MODES.ADD]="lighter",t[n.BLEND_MODES.MULTIPLY]="multiply",t[n.BLEND_MODES.SCREEN]="screen",t[n.BLEND_MODES.OVERLAY]="overlay",t[n.BLEND_MODES.DARKEN]="darken",t[n.BLEND_MODES.LIGHTEN]="lighten",t[n.BLEND_MODES.COLOR_DODGE]="color-dodge",t[n.BLEND_MODES.COLOR_BURN]="color-burn",t[n.BLEND_MODES.HARD_LIGHT]="hard-light",t[n.BLEND_MODES.SOFT_LIGHT]="soft-light",t[n.BLEND_MODES.DIFFERENCE]="difference",t[n.BLEND_MODES.EXCLUSION]="exclusion",t[n.BLEND_MODES.HUE]="hue",t[n.BLEND_MODES.SATURATION]="saturate",t[n.BLEND_MODES.COLOR]="color",t[n.BLEND_MODES.LUMINOSITY]="luminosity"):(t[n.BLEND_MODES.NORMAL]="source-over",t[n.BLEND_MODES.ADD]="lighter",t[n.BLEND_MODES.MULTIPLY]="source-over",t[n.BLEND_MODES.SCREEN]="source-over",t[n.BLEND_MODES.OVERLAY]="source-over",t[n.BLEND_MODES.DARKEN]="source-over",t[n.BLEND_MODES.LIGHTEN]="source-over",t[n.BLEND_MODES.COLOR_DODGE]="source-over",t[n.BLEND_MODES.COLOR_BURN]="source-over",t[n.BLEND_MODES.HARD_LIGHT]="source-over",t[n.BLEND_MODES.SOFT_LIGHT]="source-over",t[n.BLEND_MODES.DIFFERENCE]="source-over",t[n.BLEND_MODES.EXCLUSION]="source-over",t[n.BLEND_MODES.HUE]="source-over",t[n.BLEND_MODES.SATURATION]="source-over",t[n.BLEND_MODES.COLOR]="source-over",t[n.BLEND_MODES.LUMINOSITY]="source-over"),t}var n=t("../../../const"),s=t("./canUseNewCanvasBlendModes");e.exports=i},{"../../../const":78,"./canUseNewCanvasBlendModes":112}],114:[function(t,e,r){function i(t){this.renderer=t,this.count=0,this.checkCount=0,this.maxIdle=3600,this.checkCountMax=600,this.mode=n.GC_MODES.DEFAULT}var n=t("../../const");i.prototype.constructor=i,e.exports=i,i.prototype.update=function(){this.count++,this.mode!==n.GC_MODES.MANUAL&&(this.checkCount++,this.checkCount>this.checkCountMax&&(this.checkCount=0,this.run()))},i.prototype.run=function(){var t,e,r=this.renderer.textureManager,i=r._managedTextures,n=!1;for(t=0;t<i.length;t++){var s=i[t];!s._glRenderTargets&&this.count-s.touched>this.maxIdle&&(r.destroyTexture(s,!0),i[t]=null,n=!0)}if(n){for(e=0,t=0;t<i.length;t++)null!==i[t]&&(i[e++]=i[t]);i.length=e}},i.prototype.unload=function(t){var e=this.renderer.textureManager;t._texture&&e.destroyTexture(t._texture,!0);for(var r=t.children.length-1;r>=0;r--)this.unload(t.children[r])}},{"../../const":78}],115:[function(t,e,r){var i=t("pixi-gl-core").GLTexture,n=t("../../const"),s=t("./utils/RenderTarget"),o=t("../../utils"),a=function(t){this.renderer=t,this.gl=t.gl,this._managedTextures=[]};a.prototype.bindTexture=function(){},a.prototype.getTexture=function(){},a.prototype.updateTexture=function(t){t=t.baseTexture||t;var e=!!t._glRenderTargets;if(t.hasLoaded){var r=t._glTextures[this.renderer.CONTEXT_UID];if(r)e?t._glRenderTargets[this.renderer.CONTEXT_UID].resize(t.width,t.height):r.upload(t.source);else{if(e){var o=new s(this.gl,t.width,t.height,t.scaleMode,t.resolution);o.resize(t.width,t.height),t._glRenderTargets[this.renderer.CONTEXT_UID]=o,r=o.texture}else r=new i(this.gl),r.premultiplyAlpha=!0,r.upload(t.source);t._glTextures[this.renderer.CONTEXT_UID]=r,t.on("update",this.updateTexture,this),t.on("dispose",this.destroyTexture,this),this._managedTextures.push(t),t.isPowerOfTwo?(t.mipmap&&r.enableMipmap(),t.wrapMode===n.WRAP_MODES.CLAMP?r.enableWrapClamp():t.wrapMode===n.WRAP_MODES.REPEAT?r.enableWrapRepeat():r.enableWrapMirrorRepeat()):r.enableWrapClamp(),t.scaleMode===n.SCALE_MODES.NEAREST?r.enableNearestScaling():r.enableLinearScaling()}return r}},a.prototype.destroyTexture=function(t,e){if(t=t.baseTexture||t,t.hasLoaded&&t._glTextures[this.renderer.CONTEXT_UID]&&(t._glTextures[this.renderer.CONTEXT_UID].destroy(),t.off("update",this.updateTexture,this),t.off("dispose",this.destroyTexture,this),delete t._glTextures[this.renderer.CONTEXT_UID],!e)){var r=this._managedTextures.indexOf(t);r!==-1&&o.removeItems(this._managedTextures,r,1)}},a.prototype.removeAll=function(){for(var t=0;t<this._managedTextures.length;++t){var e=this._managedTextures[t];e._glTextures[this.renderer.CONTEXT_UID]&&delete e._glTextures[this.renderer.CONTEXT_UID]}},a.prototype.destroy=function(){for(var t=0;t<this._managedTextures.length;++t){var e=this._managedTextures[t];this.destroyTexture(e,!0),e.off("update",this.updateTexture,this),e.off("dispose",this.destroyTexture,this)}this._managedTextures=null},e.exports=a},{"../../const":78,"../../utils":151,"./utils/RenderTarget":128,"pixi-gl-core":7}],116:[function(t,e,r){function i(t,e,r){r=r||{},n.call(this,"WebGL",t,e,r),this.type=x.RENDERER_TYPE.WEBGL,this.handleContextLost=this.handleContextLost.bind(this),this.handleContextRestored=this.handleContextRestored.bind(this),this.view.addEventListener("webglcontextlost",this.handleContextLost,!1),this.view.addEventListener("webglcontextrestored",this.handleContextRestored,!1),this._contextOptions={alpha:this.transparent,antialias:r.antialias,premultipliedAlpha:this.transparent&&"notMultiplied"!==this.transparent,stencil:!0,preserveDrawingBuffer:r.preserveDrawingBuffer},this._backgroundColorRgba[3]=this.transparent?0:1,this.maskManager=new s(this),this.stencilManager=new o(this),this.emptyRenderer=new u(this),this.currentRenderer=this.emptyRenderer,this.initPlugins(),r.context&&v(r.context),this.gl=r.context||p(this.view,this._contextOptions),this.CONTEXT_UID=m++,this.state=new d(this.gl),this.renderingToScreen=!0,this._initContext(),this.filterManager=new a(this),this.drawModes=f(this.gl),this._activeShader=null,this._activeRenderTarget=null,this._activeTextureLocation=999,this._activeTexture=null,this.setBlendMode(0)}var n=t("../SystemRenderer"),s=t("./managers/MaskManager"),o=t("./managers/StencilManager"),a=t("./managers/FilterManager"),h=t("./utils/RenderTarget"),u=t("./utils/ObjectRenderer"),l=t("./TextureManager"),c=t("./TextureGarbageCollector"),d=t("./WebGLState"),p=t("pixi-gl-core").createContext,f=t("./utils/mapWebGLDrawModesToPixi"),v=t("./utils/validateContext"),g=t("../../utils"),y=t("pixi-gl-core"),x=t("../../const"),m=0;i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,g.pluginTarget.mixin(i),i.prototype._initContext=function(){var t=this.gl;this.textureManager=new l(this),this.textureGC=new c(this),this.state.resetToDefault(),this.rootRenderTarget=new h(t,this.width,this.height,null,this.resolution,(!0)),this.rootRenderTarget.clearColor=this._backgroundColorRgba,this.bindRenderTarget(this.rootRenderTarget),this.emit("context",t),this.resize(this.width,this.height)},i.prototype.render=function(t,e,r,i,n){if(this.renderingToScreen=!e,this.emit("prerender"),this.gl&&!this.gl.isContextLost()){if(e||(this._lastObjectRendered=t),!n){var s=t.parent;t.parent=this._tempDisplayObjectParent,t.updateTransform(),t.parent=s}this.bindRenderTexture(e,i),this.currentRenderer.start(),(void 0!==r?r:this.clearBeforeRender)&&this._activeRenderTarget.clear(),t.renderWebGL(this),this.currentRenderer.flush(),this.textureGC.update(),this.emit("postrender")}},i.prototype.setObjectRenderer=function(t){this.currentRenderer!==t&&(this.currentRenderer.stop(),this.currentRenderer=t,this.currentRenderer.start())},i.prototype.flush=function(){this.setObjectRenderer(this.emptyRenderer)},i.prototype.resize=function(t,e){n.prototype.resize.call(this,t,e),this.rootRenderTarget.resize(t,e),this._activeRenderTarget===this.rootRenderTarget&&(this.rootRenderTarget.activate(),this._activeShader&&(this._activeShader.uniforms.projectionMatrix=this.rootRenderTarget.projectionMatrix.toArray(!0)))},i.prototype.setBlendMode=function(t){this.state.setBlendMode(t)},i.prototype.clear=function(t){this._activeRenderTarget.clear(t)},i.prototype.setTransform=function(t){this._activeRenderTarget.transform=t},i.prototype.bindRenderTexture=function(t,e){var r;if(t){var i=t.baseTexture,n=this.gl;i._glRenderTargets[this.CONTEXT_UID]?(this._activeTextureLocation=i._id,n.activeTexture(n.TEXTURE0+i._id),n.bindTexture(n.TEXTURE_2D,null)):(this.textureManager.updateTexture(i),n.bindTexture(n.TEXTURE_2D,null)),r=i._glRenderTargets[this.CONTEXT_UID],r.setFrame(t.frame)}else r=this.rootRenderTarget;return r.transform=e,this.bindRenderTarget(r),this},i.prototype.bindRenderTarget=function(t){return t!==this._activeRenderTarget&&(this._activeRenderTarget=t,t.activate(),this._activeShader&&(this._activeShader.uniforms.projectionMatrix=t.projectionMatrix.toArray(!0)),this.stencilManager.setMaskStack(t.stencilMaskStack)),this},i.prototype.bindShader=function(t){return this._activeShader!==t&&(this._activeShader=t,t.bind(),t.uniforms.projectionMatrix=this._activeRenderTarget.projectionMatrix.toArray(!0)),this},i.prototype.bindTexture=function(t,e){t=t.baseTexture||t;var r=this.gl;return e=e||0,this._activeTextureLocation!==e&&(this._activeTextureLocation=e,r.activeTexture(r.TEXTURE0+e)),this._activeTexture=t,t._glTextures[this.CONTEXT_UID]?(t.touched=this.textureGC.count,t._glTextures[this.CONTEXT_UID].bind()):this.textureManager.updateTexture(t),this},i.prototype.createVao=function(){return new y.VertexArrayObject(this.gl,this.state.attribState)},i.prototype.reset=function(){return this.setObjectRenderer(this.emptyRenderer),this._activeShader=null,this._activeRenderTarget=this.rootRenderTarget,this._activeTextureLocation=999,this._activeTexture=null,this.rootRenderTarget.activate(),this.state.resetToDefault(),this},i.prototype.handleContextLost=function(t){t.preventDefault()},i.prototype.handleContextRestored=function(){this._initContext(),this.textureManager.removeAll()},i.prototype.destroy=function(t){this.destroyPlugins(),this.view.removeEventListener("webglcontextlost",this.handleContextLost),this.view.removeEventListener("webglcontextrestored",this.handleContextRestored),this.textureManager.destroy(),n.prototype.destroy.call(this,t),this.uid=0,this.maskManager.destroy(),this.stencilManager.destroy(),this.filterManager.destroy(),this.maskManager=null,this.filterManager=null,this.textureManager=null,this.currentRenderer=null,this.handleContextLost=null,this.handleContextRestored=null,this._contextOptions=null,this.gl.useProgram(null),this.gl.getExtension("WEBGL_lose_context")&&this.gl.getExtension("WEBGL_lose_context").loseContext(),this.gl=null}},{"../../const":78,"../../utils":151,"../SystemRenderer":108,"./TextureGarbageCollector":114,"./TextureManager":115,"./WebGLState":117,"./managers/FilterManager":122,"./managers/MaskManager":123,"./managers/StencilManager":124,"./utils/ObjectRenderer":126,"./utils/RenderTarget":128,"./utils/mapWebGLDrawModesToPixi":131,"./utils/validateContext":132,"pixi-gl-core":7}],117:[function(t,e,r){function i(t){this.activeState=new Uint8Array(16),this.defaultState=new Uint8Array(16),this.defaultState[0]=1,this.stackIndex=0,this.stack=[],this.gl=t,this.maxAttribs=t.getParameter(t.MAX_VERTEX_ATTRIBS),this.attribState={tempAttribState:new Array(this.maxAttribs),attribState:new Array(this.maxAttribs)},this.blendModes=n(t),this.nativeVaoExtension=t.getExtension("OES_vertex_array_object")||t.getExtension("MOZ_OES_vertex_array_object")||t.getExtension("WEBKIT_OES_vertex_array_object")}var n=t("./utils/mapWebGLBlendModesToPixi");i.prototype.push=function(){var t=this.stack[++this.stackIndex];t||(t=this.stack[this.stackIndex]=new Uint8Array(16));for(var e=0;e<this.activeState.length;e++)this.activeState[e]=t[e]};var s=0,o=1,a=2,h=3,u=4;i.prototype.pop=function(){var t=this.stack[--this.stackIndex];this.setState(t)},i.prototype.setState=function(t){this.setBlend(t[s]),this.setDepthTest(t[o]),this.setFrontFace(t[a]),this.setCullFace(t[h]),this.setBlendMode(t[u])},i.prototype.setBlend=function(t){if(!(this.activeState[s]===t|0)){this.activeState[s]=0|t;var e=this.gl;t?e.enable(e.BLEND):e.disable(e.BLEND)}},i.prototype.setBlendMode=function(t){t!==this.activeState[u]&&(this.activeState[u]=t,this.gl.blendFunc(this.blendModes[t][0],this.blendModes[t][1]))},i.prototype.setDepthTest=function(t){if(!(this.activeState[o]===t|0)){this.activeState[o]=0|t;var e=this.gl;t?e.enable(e.DEPTH_TEST):e.disable(e.DEPTH_TEST)}},i.prototype.setCullFace=function(t){if(!(this.activeState[h]===t|0)){this.activeState[h]=0|t;var e=this.gl;t?e.enable(e.CULL_FACE):e.disable(e.CULL_FACE)}},i.prototype.setFrontFace=function(t){if(!(this.activeState[a]===t|0)){this.activeState[a]=0|t;var e=this.gl;t?e.frontFace(e.CW):e.frontFace(e.CCW)}},i.prototype.resetAttributes=function(){var t;for(t=0;t<this.attribState.tempAttribState.length;t++)this.attribState.tempAttribState[t]=0;for(t=0;t<this.attribState.attribState.length;t++)this.attribState.attribState[t]=0;var e=this.gl;for(t=1;t<this.maxAttribs;t++)e.disableVertexAttribArray(t)},i.prototype.resetToDefault=function(){this.nativeVaoExtension&&this.nativeVaoExtension.bindVertexArrayOES(null),this.resetAttributes();for(var t=0;t<this.activeState.length;t++)this.activeState[t]=32;var e=this.gl;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),this.setState(this.defaultState)},e.exports=i},{"./utils/mapWebGLBlendModesToPixi":130}],118:[function(t,e,r){function i(t,e,r){this.vertexSrc=t||i.defaultVertexSrc,this.fragmentSrc=e||i.defaultFragmentSrc,this.blendMode=o.BLEND_MODES.NORMAL,this.uniformData=r||n(this.vertexSrc,this.fragmentSrc,"projectionMatrix|uSampler"),this.uniforms={};for(var h in this.uniformData)this.uniforms[h]=this.uniformData[h].value;this.glShaders=[],a[this.vertexSrc+this.fragmentSrc]||(a[this.vertexSrc+this.fragmentSrc]=s.uid()),this.glShaderKey=a[this.vertexSrc+this.fragmentSrc],this.padding=4,this.resolution=1,this.enabled=!0}var n=t("./extractUniformsFromSrc"),s=t("../../../utils"),o=t("../../../const"),a={};e.exports=i,i.prototype.apply=function(t,e,r,i){t.applyFilter(this,e,r,i)},i.defaultVertexSrc=["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform mat3 projectionMatrix;","uniform mat3 filterMatrix;","varying vec2 vTextureCoord;","varying vec2 vFilterCoord;","void main(void){","   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);","   vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;","   vTextureCoord = aTextureCoord ;","}"].join("\n"),i.defaultFragmentSrc=["varying vec2 vTextureCoord;","varying vec2 vFilterCoord;","uniform sampler2D uSampler;","uniform sampler2D filterSampler;","void main(void){","   vec4 masky = texture2D(filterSampler, vFilterCoord);","   vec4 sample = texture2D(uSampler, vTextureCoord);","   vec4 color;","   if(mod(vFilterCoord.x, 1.0) > 0.5)","   {","     color = vec4(1.0, 0.0, 0.0, 1.0);","   }","   else","   {","     color = vec4(0.0, 1.0, 0.0, 1.0);","   }","   gl_FragColor = mix(sample, masky, 0.5);","   gl_FragColor *= sample.a;","}"].join("\n")},{"../../../const":78,"../../../utils":151,"./extractUniformsFromSrc":119}],119:[function(t,e,r){function i(t,e,r){var i=n(t,r),s=n(e,r);return Object.assign(i,s)}function n(t){for(var e,r=new RegExp("^(projectionMatrix|uSampler|filterArea)$"),i={},n=t.replace(/\s+/g," ").split(/\s*;\s*/),o=0;o<n.length;o++){var a=n[o].trim();if(a.indexOf("uniform")>-1){var h=a.split(" "),u=h[1],l=h[2],c=1;l.indexOf("[")>-1&&(e=l.split(/\[|\]/),l=e[0],c*=Number(e[1])),l.match(r)||(i[l]={value:s(u,c),name:l,type:u})}}return i}var s=t("pixi-gl-core").shader.defaultValue;e.exports=i},{"pixi-gl-core":7}],120:[function(t,e,r){var i=t("../../../math"),n=function(t,e,r){var i=t.identity();return i.translate(e.x/r.width,e.y/r.height),i.scale(r.width,r.height),i},s=function(t,e,r){var i=t.identity();i.translate(e.x/r.width,e.y/r.height);var n=r.width/e.width,s=r.height/e.height;return i.scale(n,s),i},o=function(t,e,r,n){var s=n.worldTransform.copy(i.Matrix.TEMP_MATRIX),o=n._texture.baseTexture,a=t.identity(),h=r.height/r.width;a.translate(e.x/r.width,e.y/r.height),a.scale(1,h);var u=r.width/o.width,l=r.height/o.height;return s.tx/=o.width*u,s.ty/=o.width*u,s.invert(),a.prepend(s),a.scale(1,1/h),a.scale(u,l),a.translate(n.anchor.x,n.anchor.y),a};e.exports={calculateScreenSpaceMatrix:n,calculateNormalizedScreenSpaceMatrix:s,calculateSpriteMatrix:o}},{"../../../math":102}],121:[function(t,e,r){function i(t){var e=new s.Matrix;n.call(this,"#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 otherMatrix;\n\nvarying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n}\n","#define GLSLIFY 1\nvarying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\nuniform float alpha;\nuniform sampler2D mask;\n\nvoid main(void)\n{\n    // check clip! this will stop the mask bleeding out from the edges\n    vec2 text = abs( vMaskCoord - 0.5 );\n    text = step(0.5, text);\n    float clip = 1.0 - max(text.y, text.x);\n    vec4 original = texture2D(uSampler, vTextureCoord);\n    vec4 masky = texture2D(mask, vMaskCoord);\n    original *= (masky.r * masky.a * alpha * clip);\n    gl_FragColor = original;\n}\n"),t.renderable=!1,this.maskSprite=t,this.maskMatrix=e}var n=t("../Filter"),s=t("../../../../math");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.apply=function(t,e,r){var i=this.maskSprite;this.uniforms.mask=i._texture,this.uniforms.otherMatrix=t.calculateSpriteMatrix(this.maskMatrix,i),this.uniforms.alpha=i.worldAlpha,t.applyFilter(this,e,r)}},{"../../../../math":102,"../Filter":118}],122:[function(t,e,r){function i(t){n.call(this,t),this.gl=this.renderer.gl,this.quad=new o(this.gl,t.state.attribState),this.shaderCache={},this.pool={},this.filterData=null}var n=t("./WebGLManager"),s=t("../utils/RenderTarget"),o=t("../utils/Quad"),a=t("../../../math"),h=t("../../../Shader"),u=t("../filters/filterTransforms"),l=t("bit-twiddle"),c=function(){this.renderTarget=null,this.sourceFrame=new a.Rectangle,this.destinationFrame=new a.Rectangle,this.filters=[],this.target=null,this.resolution=1};i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.pushFilter=function(t,e){var r=this.renderer,i=this.filterData;if(!i){i=this.renderer._activeRenderTarget.filterStack;var n=new c;n.sourceFrame=n.destinationFrame=this.renderer._activeRenderTarget.size,n.renderTarget=r._activeRenderTarget,this.renderer._activeRenderTarget.filterData=i={index:0,stack:[n]},this.filterData=i}var s=i.stack[++i.index];s||(s=i.stack[i.index]=new c);var o=e[0].resolution,a=e[0].padding,h=t.filterArea||t.getBounds(!0),u=s.sourceFrame,l=s.destinationFrame;u.x=(h.x*o|0)/o,u.y=(h.y*o|0)/o,u.width=(h.width*o|0)/o,u.height=(h.height*o|0)/o,i.stack[0].renderTarget.transform||u.fit(i.stack[0].destinationFrame),u.pad(a),l.width=u.width,l.height=u.height;var d=this.getPotRenderTarget(r.gl,u.width,u.height,o);s.target=t,s.filters=e,s.resolution=o,s.renderTarget=d,d.setFrame(l,u),r.bindRenderTarget(d),r.clear()},i.prototype.popFilter=function(){var t=this.filterData,e=t.stack[t.index-1],r=t.stack[t.index];this.quad.map(r.renderTarget.size,r.sourceFrame).upload();var i=r.filters;if(1===i.length)i[0].apply(this,r.renderTarget,e.renderTarget,!1),this.freePotRenderTarget(r.renderTarget);else{var n=r.renderTarget,s=this.getPotRenderTarget(this.renderer.gl,r.sourceFrame.width,r.sourceFrame.height,1);s.setFrame(r.destinationFrame,r.sourceFrame);for(var o=0;o<i.length-1;o++){i[o].apply(this,n,s,!0);var a=n;n=s,s=a}i[o].apply(this,n,e.renderTarget,!1),this.freePotRenderTarget(n),this.freePotRenderTarget(s)}t.index--,0===t.index&&(this.filterData=null)},i.prototype.applyFilter=function(t,e,r,i){var n=this.renderer,s=t.glShaders[n.CONTEXT_UID];if(s||(t.glShaderKey?(s=this.shaderCache[t.glShaderKey],s||(s=t.glShaders[n.CONTEXT_UID]=this.shaderCache[t.glShaderKey]=new h(this.gl,t.vertexSrc,t.fragmentSrc))):s=t.glShaders[n.CONTEXT_UID]=new h(this.gl,t.vertexSrc,t.fragmentSrc),this.quad.initVao(s)),n.bindRenderTarget(r),i){var o=n.gl;o.disable(o.SCISSOR_TEST),n.clear(),o.enable(o.SCISSOR_TEST)}r===n.maskManager.scissorRenderTarget&&n.maskManager.pushScissorMask(null,n.maskManager.scissorData),n.bindShader(s),this.syncUniforms(s,t),e.texture.bind(0),n._activeTextureLocation=0,n.state.setBlendMode(t.blendMode),this.quad.draw()},i.prototype.syncUniforms=function(t,e){var r,i=e.uniformData,n=e.uniforms,s=1;if(t.uniforms.data.filterArea){r=this.filterData.stack[this.filterData.index];var o=t.uniforms.filterArea;o[0]=r.renderTarget.size.width,o[1]=r.renderTarget.size.height,o[2]=r.sourceFrame.x,o[3]=r.sourceFrame.y,t.uniforms.filterArea=o}if(t.uniforms.data.filterClamp){r=this.filterData.stack[this.filterData.index];var a=t.uniforms.filterClamp;a[0]=.5/r.renderTarget.size.width,a[1]=.5/r.renderTarget.size.height,a[2]=(r.sourceFrame.width-.5)/r.renderTarget.size.width,a[3]=(r.sourceFrame.height-.5)/r.renderTarget.size.height,t.uniforms.filterClamp=a}var h;for(var u in i)if("sampler2D"===i[u].type){if(t.uniforms[u]=s,n[u].baseTexture)this.renderer.bindTexture(n[u].baseTexture,s);else{var l=this.renderer.gl;this.renderer._activeTextureLocation=l.TEXTURE0+s,l.activeTexture(l.TEXTURE0+s),n[u].texture.bind()}s++}else"mat3"===i[u].type?void 0!==n[u].a?t.uniforms[u]=n[u].toArray(!0):t.uniforms[u]=n[u]:"vec2"===i[u].type?void 0!==n[u].x?(h=t.uniforms[u]||new Float32Array(2),h[0]=n[u].x,h[1]=n[u].y,t.uniforms[u]=h):t.uniforms[u]=n[u]:"float"===i[u].type?t.uniforms.data[u].value!==i[u]&&(t.uniforms[u]=n[u]):t.uniforms[u]=n[u]},i.prototype.getRenderTarget=function(t,e){var r=this.filterData.stack[this.filterData.index],i=this.getPotRenderTarget(this.renderer.gl,r.sourceFrame.width,r.sourceFrame.height,e||r.resolution);return i.setFrame(r.destinationFrame,r.sourceFrame),i},i.prototype.returnRenderTarget=function(t){return this.freePotRenderTarget(t)},i.prototype.calculateScreenSpaceMatrix=function(t){var e=this.filterData.stack[this.filterData.index];return u.calculateScreenSpaceMatrix(t,e.sourceFrame,e.renderTarget.size)},i.prototype.calculateNormalizedScreenSpaceMatrix=function(t){var e=this.filterData.stack[this.filterData.index];return u.calculateNormalizedScreenSpaceMatrix(t,e.sourceFrame,e.renderTarget.size,e.destinationFrame)},i.prototype.calculateSpriteMatrix=function(t,e){var r=this.filterData.stack[this.filterData.index];return u.calculateSpriteMatrix(t,r.sourceFrame,r.renderTarget.size,e)},i.prototype.destroy=function(){this.shaderCache=[],this.emptyPool()},i.prototype.getPotRenderTarget=function(t,e,r,i){e=l.nextPow2(e*i),r=l.nextPow2(r*i);var n=(65535&e)<<16|65535&r;this.pool[n]||(this.pool[n]=[]);var o=this.pool[n].pop()||new s(t,e,r,null,1);return o.resolution=i,o.defaultFrame.width=o.size.width=e/i,o.defaultFrame.height=o.size.height=r/i,o},i.prototype.emptyPool=function(){for(var t in this.pool){var e=this.pool[t];if(e)for(var r=0;r<e.length;r++)e[r].destroy(!0)}this.pool={}},i.prototype.freePotRenderTarget=function(t){var e=t.size.width*t.resolution,r=t.size.height*t.resolution,i=(65535&e)<<16|65535&r;this.pool[i].push(t)}},{"../../../Shader":77,"../../../math":102,"../filters/filterTransforms":120,"../utils/Quad":127,"../utils/RenderTarget":128,"./WebGLManager":125,"bit-twiddle":30}],123:[function(t,e,r){function i(t){n.call(this,t),this.scissor=!1,this.scissorData=null,this.scissorRenderTarget=null,this.enableScissor=!0,
this.alphaMaskPool=[],this.alphaMaskIndex=0}var n=t("./WebGLManager"),s=t("../filters/spriteMask/SpriteMaskFilter");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.pushMask=function(t,e){if(e.texture)this.pushSpriteMask(t,e);else if(this.enableScissor&&!this.scissor&&!this.renderer.stencilManager.stencilMaskStack.length&&e.isFastRect()){var r=e.worldTransform,i=Math.atan2(r.b,r.a);i=Math.round(i*(180/Math.PI)),i%90?this.pushStencilMask(e):this.pushScissorMask(t,e)}else this.pushStencilMask(e)},i.prototype.popMask=function(t,e){e.texture?this.popSpriteMask(t,e):this.enableScissor&&!this.renderer.stencilManager.stencilMaskStack.length?this.popScissorMask(t,e):this.popStencilMask(t,e)},i.prototype.pushSpriteMask=function(t,e){var r=this.alphaMaskPool[this.alphaMaskIndex];r||(r=this.alphaMaskPool[this.alphaMaskIndex]=[new s(e)]),r[0].resolution=this.renderer.resolution,r[0].maskSprite=e,t.filterArea=e.getBounds(!0),this.renderer.filterManager.pushFilter(t,r),this.alphaMaskIndex++},i.prototype.popSpriteMask=function(){this.renderer.filterManager.popFilter(),this.alphaMaskIndex--},i.prototype.pushStencilMask=function(t){this.renderer.currentRenderer.stop(),this.renderer.stencilManager.pushStencil(t)},i.prototype.popStencilMask=function(){this.renderer.currentRenderer.stop(),this.renderer.stencilManager.popStencil()},i.prototype.pushScissorMask=function(t,e){e.renderable=!0;var r=this.renderer._activeRenderTarget,i=e.getBounds();i.fit(r.size),e.renderable=!1,this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);var n=this.renderer.resolution;this.renderer.gl.scissor(i.x*n,(r.root?r.size.height-i.y-i.height:i.y)*n,i.width*n,i.height*n),this.scissorRenderTarget=r,this.scissorData=e,this.scissor=!0},i.prototype.popScissorMask=function(){this.scissorRenderTarget=null,this.scissorData=null,this.scissor=!1;var t=this.renderer.gl;t.disable(t.SCISSOR_TEST)}},{"../filters/spriteMask/SpriteMaskFilter":121,"./WebGLManager":125}],124:[function(t,e,r){function i(t){n.call(this,t),this.stencilMaskStack=null}var n=t("./WebGLManager");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.setMaskStack=function(t){this.stencilMaskStack=t;var e=this.renderer.gl;0===t.length?e.disable(e.STENCIL_TEST):e.enable(e.STENCIL_TEST)},i.prototype.pushStencil=function(t){this.renderer.setObjectRenderer(this.renderer.plugins.graphics),this.renderer._activeRenderTarget.attachStencilBuffer();var e=this.renderer.gl,r=this.stencilMaskStack;0===r.length&&(e.enable(e.STENCIL_TEST),e.clear(e.STENCIL_BUFFER_BIT),e.stencilFunc(e.ALWAYS,1,1)),r.push(t),e.colorMask(!1,!1,!1,!1),e.stencilOp(e.KEEP,e.KEEP,e.INCR),this.renderer.plugins.graphics.render(t),e.colorMask(!0,!0,!0,!0),e.stencilFunc(e.NOTEQUAL,0,r.length),e.stencilOp(e.KEEP,e.KEEP,e.KEEP)},i.prototype.popStencil=function(){this.renderer.setObjectRenderer(this.renderer.plugins.graphics);var t=this.renderer.gl,e=this.stencilMaskStack,r=e.pop();0===e.length?t.disable(t.STENCIL_TEST):(t.colorMask(!1,!1,!1,!1),t.stencilOp(t.KEEP,t.KEEP,t.DECR),this.renderer.plugins.graphics.render(r),t.colorMask(!0,!0,!0,!0),t.stencilFunc(t.NOTEQUAL,0,e.length),t.stencilOp(t.KEEP,t.KEEP,t.KEEP))},i.prototype.destroy=function(){n.prototype.destroy.call(this),this.stencilMaskStack.stencilStack=null}},{"./WebGLManager":125}],125:[function(t,e,r){function i(t){this.renderer=t,this.renderer.on("context",this.onContextChange,this)}i.prototype.constructor=i,e.exports=i,i.prototype.onContextChange=function(){},i.prototype.destroy=function(){this.renderer.off("context",this.onContextChange,this),this.renderer=null}},{}],126:[function(t,e,r){function i(t){n.call(this,t)}var n=t("../managers/WebGLManager");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.start=function(){},i.prototype.stop=function(){this.flush()},i.prototype.flush=function(){},i.prototype.render=function(t){}},{"../managers/WebGLManager":125}],127:[function(t,e,r){function i(t,e){this.gl=t,this.vertices=new Float32Array([-1,-1,1,-1,1,1,-1,1]),this.uvs=new Float32Array([0,0,1,0,1,1,0,1]),this.interleaved=new Float32Array(16);for(var r=0;r<4;r++)this.interleaved[4*r]=this.vertices[2*r],this.interleaved[4*r+1]=this.vertices[2*r+1],this.interleaved[4*r+2]=this.uvs[2*r],this.interleaved[4*r+3]=this.uvs[2*r+1];this.indices=s(1),this.vertexBuffer=n.GLBuffer.createVertexBuffer(t,this.interleaved,t.STATIC_DRAW),this.indexBuffer=n.GLBuffer.createIndexBuffer(t,this.indices,t.STATIC_DRAW),this.vao=new n.VertexArrayObject(t,e)}var n=t("pixi-gl-core"),s=t("../../../utils/createIndicesForQuads");i.prototype.constructor=i,i.prototype.initVao=function(t){this.vao.clear().addIndex(this.indexBuffer).addAttribute(this.vertexBuffer,t.attributes.aVertexPosition,this.gl.FLOAT,!1,16,0).addAttribute(this.vertexBuffer,t.attributes.aTextureCoord,this.gl.FLOAT,!1,16,8)},i.prototype.map=function(t,e){var r=0,i=0;return this.uvs[0]=r,this.uvs[1]=i,this.uvs[2]=r+e.width/t.width,this.uvs[3]=i,this.uvs[4]=r+e.width/t.width,this.uvs[5]=i+e.height/t.height,this.uvs[6]=r,this.uvs[7]=i+e.height/t.height,r=e.x,i=e.y,this.vertices[0]=r,this.vertices[1]=i,this.vertices[2]=r+e.width,this.vertices[3]=i,this.vertices[4]=r+e.width,this.vertices[5]=i+e.height,this.vertices[6]=r,this.vertices[7]=i+e.height,this},i.prototype.draw=function(){return this.vao.bind().draw(this.gl.TRIANGLES,6,0).unbind(),this},i.prototype.upload=function(){for(var t=0;t<4;t++)this.interleaved[4*t]=this.vertices[2*t],this.interleaved[4*t+1]=this.vertices[2*t+1],this.interleaved[4*t+2]=this.uvs[2*t],this.interleaved[4*t+3]=this.uvs[2*t+1];return this.vertexBuffer.upload(this.interleaved),this},i.prototype.destroy=function(){var t=this.gl;t.deleteBuffer(this.vertexBuffer),t.deleteBuffer(this.indexBuffer)},e.exports=i},{"../../../utils/createIndicesForQuads":149,"pixi-gl-core":7}],128:[function(t,e,r){var i=t("../../../math"),n=t("../../../const"),s=t("pixi-gl-core").GLFramebuffer,o=function(t,e,r,o,a,h){this.gl=t,this.frameBuffer=null,this.texture=null,this.clearColor=[0,0,0,0],this.size=new i.Rectangle(0,0,1,1),this.resolution=a||n.RESOLUTION,this.projectionMatrix=new i.Matrix,this.transform=null,this.frame=null,this.defaultFrame=new i.Rectangle,this.destinationFrame=null,this.sourceFrame=null,this.stencilBuffer=null,this.stencilMaskStack=[],this.filterData=null,this.scaleMode=o||n.SCALE_MODES.DEFAULT,this.root=h,this.root?(this.frameBuffer=new s(t,100,100),this.frameBuffer.framebuffer=null):(this.frameBuffer=s.createRGBA(t,100,100),this.scaleMode===n.SCALE_MODES.NEAREST?this.frameBuffer.texture.enableNearestScaling():this.frameBuffer.texture.enableLinearScaling(),this.texture=this.frameBuffer.texture),this.setFrame(),this.resize(e,r)};o.prototype.constructor=o,e.exports=o,o.prototype.clear=function(t){var e=t||this.clearColor;this.frameBuffer.clear(e[0],e[1],e[2],e[3])},o.prototype.attachStencilBuffer=function(){this.root||this.frameBuffer.enableStencil()},o.prototype.setFrame=function(t,e){this.destinationFrame=t||this.destinationFrame||this.defaultFrame,this.sourceFrame=e||this.sourceFrame||t},o.prototype.activate=function(){var t=this.gl;this.frameBuffer.bind(),this.calculateProjection(this.destinationFrame,this.sourceFrame),this.transform&&this.projectionMatrix.append(this.transform),this.destinationFrame!==this.sourceFrame?(t.enable(t.SCISSOR_TEST),t.scissor(0|this.destinationFrame.x,0|this.destinationFrame.y,this.destinationFrame.width*this.resolution|0,this.destinationFrame.height*this.resolution|0)):t.disable(t.SCISSOR_TEST),t.viewport(0|this.destinationFrame.x,0|this.destinationFrame.y,this.destinationFrame.width*this.resolution|0,this.destinationFrame.height*this.resolution|0)},o.prototype.calculateProjection=function(t,e){var r=this.projectionMatrix;e=e||t,r.identity(),this.root?(r.a=1/t.width*2,r.d=-1/t.height*2,r.tx=-1-e.x*r.a,r.ty=1-e.y*r.d):(r.a=1/t.width*2,r.d=1/t.height*2,r.tx=-1-e.x*r.a,r.ty=-1-e.y*r.d)},o.prototype.resize=function(t,e){if(t=0|t,e=0|e,this.size.width!==t||this.size.height!==e){this.size.width=t,this.size.height=e,this.defaultFrame.width=t,this.defaultFrame.height=e,this.frameBuffer.resize(t*this.resolution,e*this.resolution);var r=this.frame||this.size;this.calculateProjection(r)}},o.prototype.destroy=function(){this.frameBuffer.destroy(),this.frameBuffer=null,this.texture=null}},{"../../../const":78,"../../../math":102,"pixi-gl-core":7}],129:[function(t,e,r){function i(t){for(var e="",r=0;r<t;r++)r>0&&(e+="\nelse "),r<t-1&&(e+="if(test == "+r+".0){}");return e}var n=t("pixi-gl-core"),s=["precision mediump float;","void main(void){","float test = 0.1;","%forloop%","gl_FragColor = vec4(0.0);","}"].join("\n"),o=function(t,e){var r=!e;if(r){var o=document.createElement("canvas");o.width=1,o.height=1,e=n.createContext(o)}for(var a=e.createShader(e.FRAGMENT_SHADER);;){var h=s.replace(/%forloop%/gi,i(t));if(e.shaderSource(a,h),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS))break;t=t/2|0}return r&&e.getExtension("WEBGL_lose_context")&&e.getExtension("WEBGL_lose_context").loseContext(),t};e.exports=o},{"pixi-gl-core":7}],130:[function(t,e,r){function i(t,e){return e=e||[],e[n.BLEND_MODES.NORMAL]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.ADD]=[t.ONE,t.DST_ALPHA],e[n.BLEND_MODES.MULTIPLY]=[t.DST_COLOR,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.SCREEN]=[t.ONE,t.ONE_MINUS_SRC_COLOR],e[n.BLEND_MODES.OVERLAY]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.DARKEN]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.LIGHTEN]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.COLOR_DODGE]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.COLOR_BURN]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.HARD_LIGHT]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.SOFT_LIGHT]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.DIFFERENCE]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.EXCLUSION]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.HUE]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.SATURATION]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.COLOR]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e[n.BLEND_MODES.LUMINOSITY]=[t.ONE,t.ONE_MINUS_SRC_ALPHA],e}var n=t("../../../const");e.exports=i},{"../../../const":78}],131:[function(t,e,r){function i(t,e){e=e||{},e[n.DRAW_MODES.POINTS]=t.POINTS,e[n.DRAW_MODES.LINES]=t.LINES,e[n.DRAW_MODES.LINE_LOOP]=t.LINE_LOOP,e[n.DRAW_MODES.LINE_STRIP]=t.LINE_STRIP,e[n.DRAW_MODES.TRIANGLES]=t.TRIANGLES,e[n.DRAW_MODES.TRIANGLE_STRIP]=t.TRIANGLE_STRIP,e[n.DRAW_MODES.TRIANGLE_FAN]=t.TRIANGLE_FAN}var n=t("../../../const");e.exports=i},{"../../../const":78}],132:[function(t,e,r){function i(t){var e=t.getContextAttributes();e.stencil||console.warn("Provided WebGL context does not have a stencil buffer, masks may not render correctly")}e.exports=i},{}],133:[function(t,e,r){function i(t){o.call(this),this.anchor=new n.ObservablePoint(this.onAnchorUpdate,this),this._texture=null,this._width=0,this._height=0,this._tint=null,this._tintRGB=null,this.tint=16777215,this.blendMode=h.BLEND_MODES.NORMAL,this.shader=null,this.cachedTint=16777215,this.texture=t||s.EMPTY,this.vertexData=new Float32Array(8),this.vertexTrimmedData=null,this._transformID=-1,this._textureID=-1}var n=t("../math"),s=t("../textures/Texture"),o=t("../display/Container"),a=t("../utils"),h=t("../const"),u=new n.Point;i.prototype=Object.create(o.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{width:{get:function(){return Math.abs(this.scale.x)*this.texture.orig.width},set:function(t){var e=a.sign(this.scale.x)||1;this.scale.x=e*t/this.texture.orig.width,this._width=t}},height:{get:function(){return Math.abs(this.scale.y)*this.texture.orig.height},set:function(t){var e=a.sign(this.scale.y)||1;this.scale.y=e*t/this.texture.orig.height,this._height=t}},tint:{get:function(){return this._tint},set:function(t){this._tint=t,this._tintRGB=(t>>16)+(65280&t)+((255&t)<<16)}},texture:{get:function(){return this._texture},set:function(t){this._texture!==t&&(this._texture=t,this.cachedTint=16777215,this._textureID=-1,t&&(t.baseTexture.hasLoaded?this._onTextureUpdate():t.once("update",this._onTextureUpdate,this)))}}}),i.prototype._onTextureUpdate=function(){this._textureID=-1,this._width&&(this.scale.x=a.sign(this.scale.x)*this._width/this.texture.orig.width),this._height&&(this.scale.y=a.sign(this.scale.y)*this._height/this.texture.orig.height)},i.prototype.onAnchorUpdate=function(){this._transformID=-1},i.prototype.calculateVertices=function(){if(this._transformID!==this.transform._worldID||this._textureID!==this._texture._updateID){this._transformID=this.transform._worldID,this._textureID=this._texture._updateID;var t,e,r,i,n=this._texture,s=this.transform.worldTransform,o=s.a,a=s.b,h=s.c,u=s.d,l=s.tx,c=s.ty,d=this.vertexData,p=n.trim,f=n.orig;p?(e=p.x-this.anchor._x*f.width,t=e+p.width,i=p.y-this.anchor._y*f.height,r=i+p.height):(t=f.width*(1-this.anchor._x),e=f.width*-this.anchor._x,r=f.height*(1-this.anchor._y),i=f.height*-this.anchor._y),d[0]=o*e+h*i+l,d[1]=u*i+a*e+c,d[2]=o*t+h*i+l,d[3]=u*i+a*t+c,d[4]=o*t+h*r+l,d[5]=u*r+a*t+c,d[6]=o*e+h*r+l,d[7]=u*r+a*e+c}},i.prototype.calculateTrimmedVertices=function(){this.vertexTrimmedData||(this.vertexTrimmedData=new Float32Array(8));var t,e,r,i,n=this._texture,s=this.vertexTrimmedData,o=n.orig,a=this.transform.worldTransform,h=a.a,u=a.b,l=a.c,c=a.d,d=a.tx,p=a.ty;t=o.width*(1-this.anchor._x),e=o.width*-this.anchor._x,r=o.height*(1-this.anchor._y),i=o.height*-this.anchor._y,s[0]=h*e+l*i+d,s[1]=c*i+u*e+p,s[2]=h*t+l*i+d,s[3]=c*i+u*t+p,s[4]=h*t+l*r+d,s[5]=c*r+u*t+p,s[6]=h*e+l*r+d,s[7]=c*r+u*e+p},i.prototype._renderWebGL=function(t){this.calculateVertices(),t.setObjectRenderer(t.plugins.sprite),t.plugins.sprite.render(this)},i.prototype._renderCanvas=function(t){t.plugins.sprite.render(this)},i.prototype._calculateBounds=function(){var t=this._texture.trim,e=this._texture.orig;!t||t.width===e.width&&t.height===e.height?(this.calculateVertices(),this._bounds.addQuad(this.vertexData)):(this.calculateTrimmedVertices(),this._bounds.addQuad(this.vertexTrimmedData))},i.prototype.getLocalBounds=function(t){return 0===this.children.length?(this._bounds.minX=-this._texture.orig.width*this.anchor._x,this._bounds.minY=-this._texture.orig.height*this.anchor._y,this._bounds.maxX=this._texture.orig.width,this._bounds.maxY=this._texture.orig.height,t||(this._localBoundsRect||(this._localBoundsRect=new n.Rectangle),t=this._localBoundsRect),this._bounds.getRectangle(t)):o.prototype.getLocalBounds.call(this,t)},i.prototype.containsPoint=function(t){this.worldTransform.applyInverse(t,u);var e,r=this._texture.orig.width,i=this._texture.orig.height,n=-r*this.anchor.x;return u.x>n&&u.x<n+r&&(e=-i*this.anchor.y,u.y>e&&u.y<e+i)},i.prototype.destroy=function(t){o.prototype.destroy.call(this,t),this.anchor=null;var e="boolean"==typeof t?t:t&&t.texture;if(e){var r="boolean"==typeof t?t:t&&t.baseTexture;this._texture.destroy(!!r)}this._texture=null,this.shader=null},i.from=function(t){return new i(s.from(t))},i.fromFrame=function(t){var e=a.TextureCache[t];if(!e)throw new Error('The frameId "'+t+'" does not exist in the texture cache');return new i(e)},i.fromImage=function(t,e,r){return new i(s.fromImage(t,e,r))}},{"../const":78,"../display/Container":80,"../math":102,"../textures/Texture":144,"../utils":151}],134:[function(t,e,r){function i(t){this.renderer=t}var n=t("../../renderers/canvas/CanvasRenderer"),s=t("../../const"),o=t("../../math"),a=new o.Matrix,h=t("./CanvasTinter");i.prototype.constructor=i,e.exports=i,n.registerPlugin("sprite",i),i.prototype.render=function(t){var e,r,i=t._texture,n=this.renderer,u=t.transform.worldTransform,l=i._frame.width,c=i._frame.height;if(!(i.orig.width<=0||i.orig.height<=0)&&i.baseTexture.source&&(n.setBlendMode(t.blendMode),i.valid)){n.context.globalAlpha=t.worldAlpha;var d=i.baseTexture.scaleMode===s.SCALE_MODES.LINEAR;n.smoothProperty&&n.context[n.smoothProperty]!==d&&(n.context[n.smoothProperty]=d),i.trim?(e=i.trim.width/2+i.trim.x-t.anchor.x*i.orig.width,r=i.trim.height/2+i.trim.y-t.anchor.y*i.orig.height):(e=(.5-t.anchor.x)*i.orig.width,r=(.5-t.anchor.y)*i.orig.height),i.rotate&&(u.copy(a),u=a,o.GroupD8.matrixAppendRotationInv(u,i.rotate,e,r),e=0,r=0),e-=l/2,r-=c/2,n.roundPixels?(n.context.setTransform(u.a,u.b,u.c,u.d,u.tx*n.resolution|0,u.ty*n.resolution|0),e=0|e,r=0|r):n.context.setTransform(u.a,u.b,u.c,u.d,u.tx*n.resolution,u.ty*n.resolution);var p=i.baseTexture.resolution;16777215!==t.tint?(t.cachedTint!==t.tint&&(t.cachedTint=t.tint,t.tintedTexture=h.getTintedTexture(t,t.tint)),n.context.drawImage(t.tintedTexture,0,0,l*p,c*p,e*n.resolution,r*n.resolution,l*n.resolution,c*n.resolution)):n.context.drawImage(i.baseTexture.source,i._frame.x*p,i._frame.y*p,l*p,c*p,e*n.resolution,r*n.resolution,l*n.resolution,c*n.resolution)}},i.prototype.destroy=function(){this.renderer=null}},{"../../const":78,"../../math":102,"../../renderers/canvas/CanvasRenderer":109,"./CanvasTinter":135}],135:[function(t,e,r){var i=t("../../utils"),n=t("../../renderers/canvas/utils/canUseNewCanvasBlendModes"),s=e.exports={getTintedTexture:function(t,e){var r=t.texture;e=s.roundColor(e);var i="#"+("00000"+(0|e).toString(16)).substr(-6);if(r.tintCache=r.tintCache||{},r.tintCache[i])return r.tintCache[i];var n=s.canvas||document.createElement("canvas");if(s.tintMethod(r,e,n),s.convertTintToImage){var o=new Image;o.src=n.toDataURL(),r.tintCache[i]=o}else r.tintCache[i]=n,s.canvas=null;return n},tintWithMultiply:function(t,e,r){var i=r.getContext("2d"),n=t._frame.clone(),s=t.baseTexture.resolution;n.x*=s,n.y*=s,n.width*=s,n.height*=s,r.width=n.width,r.height=n.height,i.fillStyle="#"+("00000"+(0|e).toString(16)).substr(-6),i.fillRect(0,0,n.width,n.height),i.globalCompositeOperation="multiply",i.drawImage(t.baseTexture.source,n.x,n.y,n.width,n.height,0,0,n.width,n.height),i.globalCompositeOperation="destination-atop",i.drawImage(t.baseTexture.source,n.x,n.y,n.width,n.height,0,0,n.width,n.height)},tintWithOverlay:function(t,e,r){var i=r.getContext("2d"),n=t._frame.clone(),s=t.baseTexture.resolution;n.x*=s,n.y*=s,n.width*=s,n.height*=s,r.width=n.width,r.height=n.height,i.globalCompositeOperation="copy",i.fillStyle="#"+("00000"+(0|e).toString(16)).substr(-6),i.fillRect(0,0,n.width,n.height),i.globalCompositeOperation="destination-atop",i.drawImage(t.baseTexture.source,n.x,n.y,n.width,n.height,0,0,n.width,n.height)},tintWithPerPixel:function(t,e,r){var n=r.getContext("2d"),s=t._frame.clone(),o=t.baseTexture.resolution;s.x*=o,s.y*=o,s.width*=o,s.height*=o,r.width=s.width,r.height=s.height,n.globalCompositeOperation="copy",n.drawImage(t.baseTexture.source,s.x,s.y,s.width,s.height,0,0,s.width,s.height);for(var a=i.hex2rgb(e),h=a[0],u=a[1],l=a[2],c=n.getImageData(0,0,s.width,s.height),d=c.data,p=0;p<d.length;p+=4)d[p+0]*=h,d[p+1]*=u,d[p+2]*=l;n.putImageData(c,0,0)},roundColor:function(t){var e=s.cacheStepsPerColorChannel,r=i.hex2rgb(t);return r[0]=Math.min(255,r[0]/e*e),r[1]=Math.min(255,r[1]/e*e),r[2]=Math.min(255,r[2]/e*e),i.rgb2hex(r)},cacheStepsPerColorChannel:8,convertTintToImage:!1,canUseMultiply:n(),tintMethod:0};s.tintMethod=s.canUseMultiply?s.tintWithMultiply:s.tintWithPerPixel},{"../../renderers/canvas/utils/canUseNewCanvasBlendModes":112,"../../utils":151}],136:[function(t,e,r){var i=function(t){this.vertices=new ArrayBuffer(t),this.float32View=new Float32Array(this.vertices),this.uint32View=new Uint32Array(this.vertices)};e.exports=i,i.prototype.destroy=function(){this.vertices=null,this.positions=null,this.uvs=null,this.colors=null}},{}],137:[function(t,e,r){function i(t){n.call(this,t),this.vertSize=5,this.vertByteSize=4*this.vertSize,this.size=l.SPRITE_BATCH_SIZE,this.buffers=[];for(var e=1;e<=d.nextPow2(this.size);e*=2){var r=4*e*this.vertByteSize;this.buffers.push(new u(r))}this.indices=o(this.size),this.shaders=null,this.currentIndex=0,p=0,this.groups=[];for(var i=0;i<this.size;i++)this.groups[i]={textures:[],textureCount:0,ids:[],size:0,start:0,blend:0};this.sprites=[],this.vertexBuffers=[],this.vaos=[],this.vaoMax=2,this.vertexCount=0,this.renderer.on("prerender",this.onPrerender,this)}var n=t("../../renderers/webgl/utils/ObjectRenderer"),s=t("../../renderers/webgl/WebGLRenderer"),o=t("../../utils/createIndicesForQuads"),a=t("./generateMultiTextureShader"),h=t("../../renderers/webgl/utils/checkMaxIfStatmentsInShader"),u=t("./BatchBuffer"),l=t("../../const"),c=t("pixi-gl-core"),d=t("bit-twiddle"),p=0;i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,s.registerPlugin("sprite",i),i.prototype.onContextChange=function(){var t=this.renderer.gl;this.MAX_TEXTURES=Math.min(t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),l.SPRITE_MAX_TEXTURES),this.MAX_TEXTURES=h(this.MAX_TEXTURES,t),this.shaders=new Array(this.MAX_TEXTURES),this.shaders[0]=a(t,1),this.shaders[1]=a(t,2),this.indexBuffer=c.GLBuffer.createIndexBuffer(t,this.indices,t.STATIC_DRAW);for(var e=this.shaders[1],r=0;r<this.vaoMax;r++)this.vertexBuffers[r]=c.GLBuffer.createVertexBuffer(t,null,t.STREAM_DRAW),this.vaos[r]=this.renderer.createVao().addIndex(this.indexBuffer).addAttribute(this.vertexBuffers[r],e.attributes.aVertexPosition,t.FLOAT,!1,this.vertByteSize,0).addAttribute(this.vertexBuffers[r],e.attributes.aTextureCoord,t.UNSIGNED_SHORT,!0,this.vertByteSize,8).addAttribute(this.vertexBuffers[r],e.attributes.aColor,t.UNSIGNED_BYTE,!0,this.vertByteSize,12).addAttribute(this.vertexBuffers[r],e.attributes.aTextureId,t.FLOAT,!1,this.vertByteSize,16);this.vao=this.vaos[0],this.currentBlendMode=99999},i.prototype.onPrerender=function(){this.vertexCount=0},i.prototype.render=function(t){this.currentIndex>=this.size&&this.flush(),t.texture._uvs&&(this.sprites[this.currentIndex++]=t)},i.prototype.flush=function(){if(0!==this.currentIndex){var t,e,r,i,n,s,o,h=this.renderer.gl,u=d.nextPow2(this.currentIndex),l=d.log2(u),f=this.buffers[l],v=this.sprites,g=this.groups,y=f.float32View,x=f.uint32View,m=0,_=1,b=0,T=g[0],E=v[0].blendMode;T.textureCount=0,T.start=0,T.blend=E,p++;for(var w=0;w<this.currentIndex;w++){var S=v[w];if(t=S._texture.baseTexture,E!==S.blendMode&&(E=S.blendMode,e=null,b=this.MAX_TEXTURES,p++),e!==t&&(e=t,t._enabled!==p&&(b===this.MAX_TEXTURES&&(p++,b=0,T.size=w-T.start,T=g[_++],T.textureCount=0,T.blend=E,T.start=w),t._enabled=p,t._id=b,T.textures[T.textureCount++]=t,b++)),r=S.vertexData,i=S._tintRGB+(255*S.worldAlpha<<24),n=S._texture._uvs.uvsUint32,s=t._id,this.renderer.roundPixels){var C=this.renderer.resolution;y[m]=(r[0]*C|0)/C,y[m+1]=(r[1]*C|0)/C,y[m+5]=(r[2]*C|0)/C,y[m+6]=(r[3]*C|0)/C,y[m+10]=(r[4]*C|0)/C,y[m+11]=(r[5]*C|0)/C,y[m+15]=(r[6]*C|0)/C,y[m+16]=(r[7]*C|0)/C}else y[m]=r[0],y[m+1]=r[1],y[m+5]=r[2],y[m+6]=r[3],y[m+10]=r[4],y[m+11]=r[5],y[m+15]=r[6],y[m+16]=r[7];x[m+2]=n[0],x[m+7]=n[1],x[m+12]=n[2],x[m+17]=n[3],x[m+3]=x[m+8]=x[m+13]=x[m+18]=i,y[m+4]=y[m+9]=y[m+14]=y[m+19]=s,m+=20}for(T.size=w-T.start,this.vertexCount++,this.vaoMax<=this.vertexCount&&(this.vaoMax++,o=this.shaders[1],this.vertexBuffers[this.vertexCount]=c.GLBuffer.createVertexBuffer(h,null,h.STREAM_DRAW),this.vaos[this.vertexCount]=this.renderer.createVao().addIndex(this.indexBuffer).addAttribute(this.vertexBuffers[this.vertexCount],o.attributes.aVertexPosition,h.FLOAT,!1,this.vertByteSize,0).addAttribute(this.vertexBuffers[this.vertexCount],o.attributes.aTextureCoord,h.UNSIGNED_SHORT,!0,this.vertByteSize,8).addAttribute(this.vertexBuffers[this.vertexCount],o.attributes.aColor,h.UNSIGNED_BYTE,!0,this.vertByteSize,12).addAttribute(this.vertexBuffers[this.vertexCount],o.attributes.aTextureId,h.FLOAT,!1,this.vertByteSize,16)),this.vertexBuffers[this.vertexCount].upload(f.vertices,0),this.vao=this.vaos[this.vertexCount].bind(),w=0;w<_;w++){var M=g[w],R=M.textureCount;o=this.shaders[R-1],o||(o=this.shaders[R-1]=a(h,R)),this.renderer.bindShader(o);for(var A=0;A<R;A++)this.renderer.bindTexture(M.textures[A],A);this.renderer.state.setBlendMode(M.blend),h.drawElements(h.TRIANGLES,6*M.size,h.UNSIGNED_SHORT,6*M.start*2)}this.currentIndex=0}},i.prototype.start=function(){},i.prototype.stop=function(){this.flush(),this.vao.unbind()},i.prototype.destroy=function(){for(var t=0;t<this.vaoMax;t++)this.vertexBuffers[t].destroy(),this.vaos[t].destroy();for(this.indexBuffer.destroy(),this.renderer.off("prerender",this.onPrerender,this),n.prototype.destroy.call(this),t=0;t<this.shaders.length;t++)this.shaders[t]&&this.shaders[t].destroy();for(this.vertexBuffers=null,this.vaos=null,this.indexBuffer=null,this.indices=null,this.sprites=null,t=0;t<this.buffers.length;t++)this.buffers[t].destroy()}},{"../../const":78,"../../renderers/webgl/WebGLRenderer":116,"../../renderers/webgl/utils/ObjectRenderer":126,"../../renderers/webgl/utils/checkMaxIfStatmentsInShader":129,"../../utils/createIndicesForQuads":149,"./BatchBuffer":136,"./generateMultiTextureShader":138,"bit-twiddle":30,"pixi-gl-core":7}],138:[function(t,e,r){function i(t,e){var r="#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\nattribute float aTextureId;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying float vTextureId;\n\nvoid main(void){\n   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n   vTextureCoord = aTextureCoord;\n   vTextureId = aTextureId;\n   vColor = vec4(aColor.rgb * aColor.a, aColor.a);\n}\n",i=o;i=i.replace(/%count%/gi,e),i=i.replace(/%forloop%/gi,n(e));for(var a=new s(t,r,i,{aVertexPosition:3,aColor:2,aTextureCoord:1,aTextureId:0}),h=[],u=0;u<e;u++)h[u]=u;return a.bind(),a.uniforms.uSamplers=h,a}function n(t){var e="";e+="\n",e+="\n";for(var r=0;r<t;r++)r>0&&(e+="\nelse "),r<t-1&&(e+="if(textureId == "+r+".0)"),e+="\n{",e+="\n\tcolor = texture2D(uSamplers["+r+"], vTextureCoord);",e+="\n}";return e+="\n",e+="\n"}var s=t("../../Shader"),o=["varying vec2 vTextureCoord;","varying vec4 vColor;","varying float vTextureId;","uniform sampler2D uSamplers[%count%];","void main(void){","vec4 color;","float textureId = floor(vTextureId+0.5);","%forloop%","gl_FragColor = color * vColor;","}"].join("\n");e.exports=i},{"../../Shader":77}],139:[function(t,e,r){function i(t,e){this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d"),this.resolution=h.RESOLUTION,this._text=null,this._style=null,this._styleListener=null,this._font="";var r=s.fromCanvas(this.canvas);r.orig=new o.Rectangle,r.trim=new o.Rectangle,n.call(this,r),this.text=t,this.style=e,this.localStyleID=-1}var n=t("../sprites/Sprite"),s=t("../textures/Texture"),o=t("../math"),a=t("../utils"),h=t("../const"),u=t("./TextStyle"),l={texture:!0,children:!1,baseTexture:!0};i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.fontPropertiesCache={},i.fontPropertiesCanvas=document.createElement("canvas"),i.fontPropertiesContext=i.fontPropertiesCanvas.getContext("2d"),Object.defineProperties(i.prototype,{width:{get:function(){return this.updateText(!0),Math.abs(this.scale.x)*this.texture.orig.width},set:function(t){this.updateText(!0);var e=a.sign(this.scale.x)||1;this.scale.x=e*t/this.texture.orig.width,this._width=t}},height:{get:function(){return this.updateText(!0),Math.abs(this.scale.y)*this._texture.orig.height},set:function(t){this.updateText(!0);var e=a.sign(this.scale.y)||1;this.scale.y=e*t/this.texture.orig.height,this._height=t}},style:{get:function(){return this._style},set:function(t){t=t||{},t instanceof u?this._style=t:this._style=new u(t),this.localStyleID=-1,this.dirty=!0}},text:{get:function(){return this._text},set:function(t){t=t||" ",t=t.toString(),this._text!==t&&(this._text=t,this.dirty=!0)}}}),i.prototype.updateText=function(t){var e=this._style;if(this.localStyleID!==e.styleID&&(this.dirty=!0,this.localStyleID=e.styleID),this.dirty||!t){var r="number"==typeof e.fontSize?e.fontSize+"px":e.fontSize;this._font=e.fontStyle+" "+e.fontVariant+" "+e.fontWeight+" "+r+" "+e.fontFamily,this.context.font=this._font;var i,n=e.wordWrap?this.wordWrap(this._text):this._text,s=n.split(/(?:\r\n|\r|\n)/),o=new Array(s.length),a=0,h=this.determineFontProperties(this._font);for(i=0;i<s.length;i++){var u=this.context.measureText(s[i]).width+(s[i].length-1)*e.letterSpacing;o[i]=u,a=Math.max(a,u)}var l=a+e.strokeThickness;e.dropShadow&&(l+=e.dropShadowDistance),l+=2*e.padding,this.canvas.width=Math.ceil((l+this.context.lineWidth)*this.resolution);var c=this.style.lineHeight||h.fontSize+e.strokeThickness,d=Math.max(c,h.fontSize+e.strokeThickness)+(s.length-1)*c;e.dropShadow&&(d+=e.dropShadowDistance),this.canvas.height=Math.ceil((d+2*this._style.padding)*this.resolution),this.context.scale(this.resolution,this.resolution),navigator.isCocoonJS&&this.context.clearRect(0,0,this.canvas.width,this.canvas.height),this.context.font=this._font,this.context.strokeStyle=e.stroke,this.context.lineWidth=e.strokeThickness,this.context.textBaseline=e.textBaseline,this.context.lineJoin=e.lineJoin,this.context.miterLimit=e.miterLimit;var p,f;if(e.dropShadow){e.dropShadowBlur>0?(this.context.shadowColor=e.dropShadowColor,this.context.shadowBlur=e.dropShadowBlur):this.context.fillStyle=e.dropShadowColor;var v=Math.cos(e.dropShadowAngle)*e.dropShadowDistance,g=Math.sin(e.dropShadowAngle)*e.dropShadowDistance;for(i=0;i<s.length;i++)p=e.strokeThickness/2,f=e.strokeThickness/2+i*c+h.ascent,"right"===e.align?p+=a-o[i]:"center"===e.align&&(p+=(a-o[i])/2),e.fill&&(this.drawLetterSpacing(s[i],p+v+e.padding,f+g+e.padding),e.stroke&&e.strokeThickness&&(this.context.strokeStyle=e.dropShadowColor,this.drawLetterSpacing(s[i],p+v+e.padding,f+g+e.padding,!0),this.context.strokeStyle=e.stroke))}for(this.context.fillStyle=this._generateFillStyle(e,s),i=0;i<s.length;i++)p=e.strokeThickness/2,f=e.strokeThickness/2+i*c+h.ascent,"right"===e.align?p+=a-o[i]:"center"===e.align&&(p+=(a-o[i])/2),e.stroke&&e.strokeThickness&&this.drawLetterSpacing(s[i],p+e.padding,f+e.padding,!0),e.fill&&this.drawLetterSpacing(s[i],p+e.padding,f+e.padding);this.updateTexture()}},i.prototype.drawLetterSpacing=function(t,e,r,i){var n=this._style,s=n.letterSpacing;if(0===s)return void(i?this.context.strokeText(t,e,r):this.context.fillText(t,e,r));for(var o,a=String.prototype.split.call(t,""),h=0,u=e;h<t.length;)o=a[h++],i?this.context.strokeText(o,u,r):this.context.fillText(o,u,r),u+=this.context.measureText(o).width+s},i.prototype.updateTexture=function(){var t=this._texture,e=this._style;t.baseTexture.hasLoaded=!0,t.baseTexture.resolution=this.resolution,t.baseTexture.realWidth=this.canvas.width,t.baseTexture.realHeight=this.canvas.height,t.baseTexture.width=this.canvas.width/this.resolution,t.baseTexture.height=this.canvas.height/this.resolution,t.trim.width=t._frame.width=this.canvas.width/this.resolution,t.trim.height=t._frame.height=this.canvas.height/this.resolution,t.trim.x=-e.padding,t.trim.y=-e.padding,t.orig.width=t._frame.width-2*e.padding,t.orig.height=t._frame.height-2*e.padding,this._onTextureUpdate(),t.baseTexture.emit("update",t.baseTexture),this.dirty=!1},i.prototype.renderWebGL=function(t){this.resolution!==t.resolution&&(this.resolution=t.resolution,this.dirty=!0),this.updateText(!0),n.prototype.renderWebGL.call(this,t)},i.prototype._renderCanvas=function(t){this.resolution!==t.resolution&&(this.resolution=t.resolution,this.dirty=!0),this.updateText(!0),n.prototype._renderCanvas.call(this,t)},i.prototype.determineFontProperties=function(t){var e=i.fontPropertiesCache[t];if(!e){e={};var r=i.fontPropertiesCanvas,n=i.fontPropertiesContext;n.font=t;var s=Math.ceil(n.measureText("|MÉq").width),o=Math.ceil(n.measureText("M").width),a=2*o;o=1.4*o|0,r.width=s,r.height=a,n.fillStyle="#f00",n.fillRect(0,0,s,a),n.font=t,n.textBaseline="alphabetic",n.fillStyle="#000",n.fillText("|MÉq",0,o);var h,u,l=n.getImageData(0,0,s,a).data,c=l.length,d=4*s,p=0,f=!1;for(h=0;h<o;h++){for(u=0;u<d;u+=4)if(255!==l[p+u]){f=!0;break}if(f)break;p+=d}for(e.ascent=o-h,p=c-d,f=!1,h=a;h>o;h--){for(u=0;u<d;u+=4)if(255!==l[p+u]){f=!0;break}if(f)break;p-=d}e.descent=h-o,e.fontSize=e.ascent+e.descent,i.fontPropertiesCache[t]=e;
}return e},i.prototype.wordWrap=function(t){for(var e="",r=t.split("\n"),i=this._style.wordWrapWidth,n=0;n<r.length;n++){for(var s=i,o=r[n].split(" "),a=0;a<o.length;a++){var h=this.context.measureText(o[a]).width;if(this._style.breakWords&&h>i)for(var u=o[a].split(""),l=0;l<u.length;l++){var c=this.context.measureText(u[l]).width;c>s?(e+="\n"+u[l],s=i-c):(0===l&&(e+=" "),e+=u[l],s-=c)}else{var d=h+this.context.measureText(" ").width;0===a||d>s?(a>0&&(e+="\n"),e+=o[a],s=i-h):(s-=d,e+=" "+o[a])}}n<r.length-1&&(e+="\n")}return e},i.prototype._calculateBounds=function(){this.updateText(!0),this.calculateVertices(),this._bounds.addQuad(this.vertexData)},i.prototype._onStyleChange=function(){this.dirty=!0},i.prototype._generateFillStyle=function(t,e){if(Array.isArray(t.fill)){if(navigator.isCocoonJS)return t.fill[0];var r,i,n,s,o,a=this.canvas.width/this.resolution,u=this.canvas.height/this.resolution;if(t.fillGradientType===h.TEXT_GRADIENT.LINEAR_VERTICAL)for(i=this.context.createLinearGradient(a/2,0,a/2,u),n=(t.fill.length+1)*e.length,s=0,r=0;r<e.length;r++){s+=1;for(var l=0;l<t.fill.length;l++)o=s/n,i.addColorStop(o,t.fill[l]),s++}else for(i=this.context.createLinearGradient(0,u/2,a,u/2),n=t.fill.length+1,s=1,r=0;r<t.fill.length;r++)o=s/n,i.addColorStop(o,t.fill[r]),s++;return i}return t.fill},i.prototype.destroy=function(t){"boolean"==typeof t&&(t={children:t}),t=Object.assign({},l,t),n.prototype.destroy.call(this,t),this.context=null,this.canvas=null,this._style=null}},{"../const":78,"../math":102,"../sprites/Sprite":133,"../textures/Texture":144,"../utils":151,"./TextStyle":140}],140:[function(t,e,r){function i(t){this.styleID=0,Object.assign(this,this._defaults,t)}function n(t){if("number"==typeof t)return o.hex2string(t);if(Array.isArray(t))for(var e=0;e<t.length;++e)"number"==typeof t[e]&&(t[e]=o.hex2string(t[e]));return t}var s=t("../const"),o=t("../utils");i.prototype.constructor=i,e.exports=i,i.prototype._defaults={align:"left",breakWords:!1,dropShadow:!1,dropShadowAngle:Math.PI/6,dropShadowBlur:0,dropShadowColor:"#000000",dropShadowDistance:5,fill:"black",fillGradientType:s.TEXT_GRADIENT.LINEAR_VERTICAL,fontFamily:"Arial",fontSize:26,fontStyle:"normal",fontVariant:"normal",fontWeight:"normal",letterSpacing:0,lineHeight:0,lineJoin:"miter",miterLimit:10,padding:0,stroke:"black",strokeThickness:0,textBaseline:"alphabetic",wordWrap:!1,wordWrapWidth:100},i.prototype.clone=function(){var t={};for(var e in this._defaults)t[e]=this[e];return new i(t)},i.prototype.reset=function(){Object.assign(this,this._defaults)},Object.defineProperties(i.prototype,{align:{get:function(){return this._align},set:function(t){this._align!==t&&(this._align=t,this.styleID++)}},breakWords:{get:function(){return this._breakWords},set:function(t){this._breakWords!==t&&(this._breakWords=t,this.styleID++)}},dropShadow:{get:function(){return this._dropShadow},set:function(t){this._dropShadow!==t&&(this._dropShadow=t,this.styleID++)}},dropShadowAngle:{get:function(){return this._dropShadowAngle},set:function(t){this._dropShadowAngle!==t&&(this._dropShadowAngle=t,this.styleID++)}},dropShadowBlur:{get:function(){return this._dropShadowBlur},set:function(t){this._dropShadowBlur!==t&&(this._dropShadowBlur=t,this.styleID++)}},dropShadowColor:{get:function(){return this._dropShadowColor},set:function(t){var e=n(t);this._dropShadowColor!==e&&(this._dropShadowColor=e,this.styleID++)}},dropShadowDistance:{get:function(){return this._dropShadowDistance},set:function(t){this._dropShadowDistance!==t&&(this._dropShadowDistance=t,this.styleID++)}},fill:{get:function(){return this._fill},set:function(t){var e=n(t);this._fill!==e&&(this._fill=e,this.styleID++)}},fillGradientType:{get:function(){return this._fillGradientType},set:function(t){this._fillGradientType!==t&&(this._fillGradientType=t,this.styleID++)}},fontFamily:{get:function(){return this._fontFamily},set:function(t){this.fontFamily!==t&&(this._fontFamily=t,this.styleID++)}},fontSize:{get:function(){return this._fontSize},set:function(t){this._fontSize!==t&&(this._fontSize=t,this.styleID++)}},fontStyle:{get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this.styleID++)}},fontVariant:{get:function(){return this._fontVariant},set:function(t){this._fontVariant!==t&&(this._fontVariant=t,this.styleID++)}},fontWeight:{get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this.styleID++)}},letterSpacing:{get:function(){return this._letterSpacing},set:function(t){this._letterSpacing!==t&&(this._letterSpacing=t,this.styleID++)}},lineHeight:{get:function(){return this._lineHeight},set:function(t){this._lineHeight!==t&&(this._lineHeight=t,this.styleID++)}},lineJoin:{get:function(){return this._lineJoin},set:function(t){this._lineJoin!==t&&(this._lineJoin=t,this.styleID++)}},miterLimit:{get:function(){return this._miterLimit},set:function(t){this._miterLimit!==t&&(this._miterLimit=t,this.styleID++)}},padding:{get:function(){return this._padding},set:function(t){this._padding!==t&&(this._padding=t,this.styleID++)}},stroke:{get:function(){return this._stroke},set:function(t){var e=n(t);this._stroke!==e&&(this._stroke=e,this.styleID++)}},strokeThickness:{get:function(){return this._strokeThickness},set:function(t){this._strokeThickness!==t&&(this._strokeThickness=t,this.styleID++)}},textBaseline:{get:function(){return this._textBaseline},set:function(t){this._textBaseline!==t&&(this._textBaseline=t,this.styleID++)}},wordWrap:{get:function(){return this._wordWrap},set:function(t){this._wordWrap!==t&&(this._wordWrap=t,this.styleID++)}},wordWrapWidth:{get:function(){return this._wordWrapWidth},set:function(t){this._wordWrapWidth!==t&&(this._wordWrapWidth=t,this.styleID++)}}})},{"../const":78,"../utils":151}],141:[function(t,e,r){function i(t,e,r,i){n.call(this,null,r),this.resolution=i||s.RESOLUTION,this.width=t||100,this.height=e||100,this.realWidth=this.width*this.resolution,this.realHeight=this.height*this.resolution,this.scaleMode=r||s.SCALE_MODES.DEFAULT,this.hasLoaded=!0,this._glRenderTargets=[],this._canvasRenderTarget=null,this.valid=!1}var n=t("./BaseTexture"),s=t("../const");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.resize=function(t,e){t===this.width&&e===this.height||(this.valid=t>0&&e>0,this.width=t,this.height=e,this.realWidth=this.width*this.resolution,this.realHeight=this.height*this.resolution,this.valid&&this.emit("update",this))},i.prototype.destroy=function(){n.prototype.destroy.call(this,!0),this.renderer=null}},{"../const":78,"./BaseTexture":142}],142:[function(t,e,r){function i(t,e,r){o.call(this),this.uid=n.uid(),this.touched=0,this.resolution=r||s.RESOLUTION,this.width=100,this.height=100,this.realWidth=100,this.realHeight=100,this.scaleMode=e||s.SCALE_MODES.DEFAULT,this.hasLoaded=!1,this.isLoading=!1,this.source=null,this.premultipliedAlpha=!0,this.imageUrl=null,this.isPowerOfTwo=!1,this.mipmap=s.MIPMAP_TEXTURES,this.wrapMode=s.WRAP_MODES.DEFAULT,this._glTextures=[],this._enabled=0,this._id=0,t&&this.loadSource(t)}var n=t("../utils"),s=t("../const"),o=t("eventemitter3"),a=t("../utils/determineCrossOrigin"),h=t("bit-twiddle");i.prototype=Object.create(o.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.update=function(){this.realWidth=this.source.naturalWidth||this.source.videoWidth||this.source.width,this.realHeight=this.source.naturalHeight||this.source.videoHeight||this.source.height,this.width=this.realWidth/this.resolution,this.height=this.realHeight/this.resolution,this.isPowerOfTwo=h.isPow2(this.realWidth)&&h.isPow2(this.realHeight),this.emit("update",this)},i.prototype.loadSource=function(t){var e=this.isLoading;if(this.hasLoaded=!1,this.isLoading=!1,e&&this.source&&(this.source.onload=null,this.source.onerror=null),this.source=t,(this.source.complete||this.source.getContext)&&this.source.width&&this.source.height)this._sourceLoaded();else if(!t.getContext){this.isLoading=!0;var r=this;t.onload=function(){t.onload=null,t.onerror=null,r.isLoading&&(r.isLoading=!1,r._sourceLoaded(),r.emit("loaded",r))},t.onerror=function(){t.onload=null,t.onerror=null,r.isLoading&&(r.isLoading=!1,r.emit("error",r))},t.complete&&t.src&&(this.isLoading=!1,t.onload=null,t.onerror=null,t.width&&t.height?(this._sourceLoaded(),e&&this.emit("loaded",this)):e&&this.emit("error",this))}},i.prototype._sourceLoaded=function(){this.hasLoaded=!0,this.update()},i.prototype.destroy=function(){this.imageUrl?(delete n.BaseTextureCache[this.imageUrl],delete n.TextureCache[this.imageUrl],this.imageUrl=null,navigator.isCocoonJS||(this.source.src="")):this.source&&this.source._pixiId&&delete n.BaseTextureCache[this.source._pixiId],this.source=null,this.dispose()},i.prototype.dispose=function(){this.emit("dispose",this)},i.prototype.updateSourceImage=function(t){this.source.src=t,this.loadSource(this.source)},i.fromImage=function(t,e,r){var s=n.BaseTextureCache[t];if(!s){var o=new Image;void 0===e&&0!==t.indexOf("data:")&&(o.crossOrigin=a(t)),s=new i(o,r),s.imageUrl=t,o.src=t,n.BaseTextureCache[t]=s,s.resolution=n.getResolutionOfUrl(t)}return s},i.fromCanvas=function(t,e){t._pixiId||(t._pixiId="canvas_"+n.uid());var r=n.BaseTextureCache[t._pixiId];return r||(r=new i(t,e),n.BaseTextureCache[t._pixiId]=r),r}},{"../const":78,"../utils":151,"../utils/determineCrossOrigin":150,"bit-twiddle":30,eventemitter3:32}],143:[function(t,e,r){function i(t,e){if(this.legacyRenderer=null,!(t instanceof n)){var r=arguments[1],i=arguments[2],o=arguments[3]||0,a=arguments[4]||1;console.warn("v4 RenderTexture now expects a new BaseRenderTexture. Please use RenderTexture.create("+r+", "+i+")"),this.legacyRenderer=arguments[0],e=null,t=new n(r,i,o,a)}s.call(this,t,e),this.valid=!0,this._updateUvs()}var n=t("./BaseRenderTexture"),s=t("./Texture");i.prototype=Object.create(s.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.resize=function(t,e,r){this.valid=t>0&&e>0,this._frame.width=this.orig.width=t,this._frame.height=this.orig.height=e,r||this.baseTexture.resize(t,e),this._updateUvs()},i.create=function(t,e,r,s){return new i(new n(t,e,r,s))}},{"./BaseRenderTexture":141,"./Texture":144}],144:[function(t,e,r){function i(t,e,r,n,s){if(a.call(this),this.noFrame=!1,e||(this.noFrame=!0,e=new h.Rectangle(0,0,1,1)),t instanceof i&&(t=t.baseTexture),this.baseTexture=t,this._frame=e,this.trim=n,this.valid=!1,this.requiresUpdate=!1,this._uvs=null,this.orig=r||e,this._rotate=+(s||0),s===!0)this._rotate=2;else if(this._rotate%2!==0)throw"attempt to use diamond-shaped UVs. If you are sure, set rotation manually";t.hasLoaded?(this.noFrame&&(e=new h.Rectangle(0,0,t.width,t.height),t.on("update",this.onBaseTextureUpdated,this)),this.frame=e):t.once("loaded",this.onBaseTextureLoaded,this),this._updateID=0}var n=t("./BaseTexture"),s=t("./VideoBaseTexture"),o=t("./TextureUvs"),a=t("eventemitter3"),h=t("../math"),u=t("../utils");i.prototype=Object.create(a.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{frame:{get:function(){return this._frame},set:function(t){if(this._frame=t,this.noFrame=!1,t.x+t.width>this.baseTexture.width||t.y+t.height>this.baseTexture.height)throw new Error("Texture Error: frame does not fit inside the base Texture dimensions "+this);this.valid=t&&t.width&&t.height&&this.baseTexture.hasLoaded,this.trim||this.rotate||(this.orig=t),this.valid&&this._updateUvs()}},rotate:{get:function(){return this._rotate},set:function(t){this._rotate=t,this.valid&&this._updateUvs()}},width:{get:function(){return this.orig?this.orig.width:0}},height:{get:function(){return this.orig?this.orig.height:0}}}),i.prototype.update=function(){this.baseTexture.update()},i.prototype.onBaseTextureLoaded=function(t){this._updateID++,this.noFrame?this.frame=new h.Rectangle(0,0,t.width,t.height):this.frame=this._frame,this.baseTexture.on("update",this.onBaseTextureUpdated,this),this.emit("update",this)},i.prototype.onBaseTextureUpdated=function(t){this._updateID++,this._frame.width=t.width,this._frame.height=t.height,this.emit("update",this)},i.prototype.destroy=function(t){this.baseTexture&&(t&&(u.TextureCache[this.baseTexture.imageUrl]&&delete u.TextureCache[this.baseTexture.imageUrl],this.baseTexture.destroy()),this.baseTexture.off("update",this.onBaseTextureUpdated,this),this.baseTexture.off("loaded",this.onBaseTextureLoaded,this),this.baseTexture=null),this._frame=null,this._uvs=null,this.trim=null,this.orig=null,this.valid=!1,this.off("dispose",this.dispose,this),this.off("update",this.update,this)},i.prototype.clone=function(){return new i(this.baseTexture,this.frame,this.orig,this.trim,this.rotate)},i.prototype._updateUvs=function(){this._uvs||(this._uvs=new o),this._uvs.set(this._frame,this.baseTexture,this.rotate),this._updateID++},i.fromImage=function(t,e,r){var s=u.TextureCache[t];return s||(s=new i(n.fromImage(t,e,r)),u.TextureCache[t]=s),s},i.fromFrame=function(t){var e=u.TextureCache[t];if(!e)throw new Error('The frameId "'+t+'" does not exist in the texture cache');return e},i.fromCanvas=function(t,e){return new i(n.fromCanvas(t,e))},i.fromVideo=function(t,e){return"string"==typeof t?i.fromVideoUrl(t,e):new i(s.fromVideo(t,e))},i.fromVideoUrl=function(t,e){return new i(s.fromUrl(t,e))},i.from=function(t){if("string"==typeof t){var e=u.TextureCache[t];if(!e){var r=null!==t.match(/\.(mp4|webm|ogg|h264|avi|mov)$/);return r?i.fromVideoUrl(t):i.fromImage(t)}return e}return t instanceof HTMLCanvasElement?i.fromCanvas(t):t instanceof HTMLVideoElement?i.fromVideo(t):t instanceof n?new i(n):t},i.addTextureToCache=function(t,e){u.TextureCache[e]=t},i.removeTextureFromCache=function(t){var e=u.TextureCache[t];return delete u.TextureCache[t],delete u.BaseTextureCache[t],e},i.EMPTY=new i(new n),i.EMPTY.destroy=function(){},i.EMPTY.on=function(){},i.EMPTY.once=function(){},i.EMPTY.emit=function(){}},{"../math":102,"../utils":151,"./BaseTexture":142,"./TextureUvs":145,"./VideoBaseTexture":146,eventemitter3:32}],145:[function(t,e,r){function i(){this.x0=0,this.y0=0,this.x1=1,this.y1=0,this.x2=1,this.y2=1,this.x3=0,this.y3=1,this.uvsUint32=new Uint32Array(4)}e.exports=i;var n=t("../math/GroupD8");i.prototype.set=function(t,e,r){var i=e.width,s=e.height;if(r){var o=t.width/2/i,a=t.height/2/s,h=t.x/i+o,u=t.y/s+a;r=n.add(r,n.NW),this.x0=h+o*n.uX(r),this.y0=u+a*n.uY(r),r=n.add(r,2),this.x1=h+o*n.uX(r),this.y1=u+a*n.uY(r),r=n.add(r,2),this.x2=h+o*n.uX(r),this.y2=u+a*n.uY(r),r=n.add(r,2),this.x3=h+o*n.uX(r),this.y3=u+a*n.uY(r)}else this.x0=t.x/i,this.y0=t.y/s,this.x1=(t.x+t.width)/i,this.y1=t.y/s,this.x2=(t.x+t.width)/i,this.y2=(t.y+t.height)/s,this.x3=t.x/i,this.y3=(t.y+t.height)/s;this.uvsUint32[0]=(65535*this.y0&65535)<<16|65535*this.x0&65535,this.uvsUint32[1]=(65535*this.y1&65535)<<16|65535*this.x1&65535,this.uvsUint32[2]=(65535*this.y2&65535)<<16|65535*this.x2&65535,this.uvsUint32[3]=(65535*this.y3&65535)<<16|65535*this.x3&65535}},{"../math/GroupD8":98}],146:[function(t,e,r){function i(t,e){if(!t)throw new Error("No video source element specified.");(t.readyState===t.HAVE_ENOUGH_DATA||t.readyState===t.HAVE_FUTURE_DATA)&&t.width&&t.height&&(t.complete=!0),s.call(this,t,e),this.autoUpdate=!1,this._onUpdate=this._onUpdate.bind(this),this._onCanPlay=this._onCanPlay.bind(this),t.complete||(t.addEventListener("canplay",this._onCanPlay),t.addEventListener("canplaythrough",this._onCanPlay),t.addEventListener("play",this._onPlayStart.bind(this)),t.addEventListener("pause",this._onPlayStop.bind(this))),this.__loaded=!1}function n(t,e){e||(e="video/"+t.substr(t.lastIndexOf(".")+1));var r=document.createElement("source");return r.src=t,r.type=e,r}var s=t("./BaseTexture"),o=t("../utils");i.prototype=Object.create(s.prototype),i.prototype.constructor=i,e.exports=i,i.prototype._onUpdate=function(){this.autoUpdate&&(window.requestAnimationFrame(this._onUpdate),this.update())},i.prototype._onPlayStart=function(){this.hasLoaded||this._onCanPlay(),this.autoUpdate||(window.requestAnimationFrame(this._onUpdate),this.autoUpdate=!0)},i.prototype._onPlayStop=function(){this.autoUpdate=!1},i.prototype._onCanPlay=function(){this.hasLoaded=!0,this.source&&(this.source.removeEventListener("canplay",this._onCanPlay),this.source.removeEventListener("canplaythrough",this._onCanPlay),this.width=this.source.videoWidth,this.height=this.source.videoHeight,this.source.play(),this.__loaded||(this.__loaded=!0,this.emit("loaded",this)))},i.prototype.destroy=function(){this.source&&this.source._pixiId&&(delete o.BaseTextureCache[this.source._pixiId],delete this.source._pixiId),s.prototype.destroy.call(this)},i.fromVideo=function(t,e){t._pixiId||(t._pixiId="video_"+o.uid());var r=o.BaseTextureCache[t._pixiId];return r||(r=new i(t,e),o.BaseTextureCache[t._pixiId]=r),r},i.fromUrl=function(t,e){var r=document.createElement("video");if(Array.isArray(t))for(var s=0;s<t.length;++s)r.appendChild(n(t[s].src||t[s],t[s].mime));else r.appendChild(n(t.src||t,t.mime));return r.load(),r.play(),i.fromVideo(r,e)},i.fromUrls=i.fromUrl},{"../utils":151,"./BaseTexture":142}],147:[function(t,e,r){function i(){var t=this;this._tick=function(e){t._requestId=null,t.started&&(t.update(e),t.started&&null===t._requestId&&t._emitter.listeners(o,!0)&&(t._requestId=requestAnimationFrame(t._tick)))},this._emitter=new s,this._requestId=null,this._maxElapsedMS=100,this.autoStart=!1,this.deltaTime=1,this.elapsedMS=1/n.TARGET_FPMS,this.lastTime=0,this.speed=1,this.started=!1}var n=t("../const"),s=t("eventemitter3"),o="tick";Object.defineProperties(i.prototype,{FPS:{get:function(){return 1e3/this.elapsedMS}},minFPS:{get:function(){return 1e3/this._maxElapsedMS},set:function(t){var e=Math.min(Math.max(0,t)/1e3,n.TARGET_FPMS);this._maxElapsedMS=1/e}}}),i.prototype._requestIfNeeded=function(){null===this._requestId&&this._emitter.listeners(o,!0)&&(this.lastTime=performance.now(),this._requestId=requestAnimationFrame(this._tick))},i.prototype._cancelIfNeeded=function(){null!==this._requestId&&(cancelAnimationFrame(this._requestId),this._requestId=null)},i.prototype._startIfPossible=function(){this.started?this._requestIfNeeded():this.autoStart&&this.start()},i.prototype.add=function(t,e){return this._emitter.on(o,t,e),this._startIfPossible(),this},i.prototype.addOnce=function(t,e){return this._emitter.once(o,t,e),this._startIfPossible(),this},i.prototype.remove=function(t,e){return this._emitter.off(o,t,e),this._emitter.listeners(o,!0)||this._cancelIfNeeded(),this},i.prototype.start=function(){this.started||(this.started=!0,this._requestIfNeeded())},i.prototype.stop=function(){this.started&&(this.started=!1,this._cancelIfNeeded())},i.prototype.update=function(t){var e;t=t||performance.now(),t>this.lastTime?(e=this.elapsedMS=t-this.lastTime,e>this._maxElapsedMS&&(e=this._maxElapsedMS),this.deltaTime=e*n.TARGET_FPMS*this.speed,this._emitter.emit(o,this.deltaTime)):this.deltaTime=this.elapsedMS=0,this.lastTime=t},e.exports=i},{"../const":78,eventemitter3:32}],148:[function(t,e,r){var i=t("./Ticker"),n=new i;n.autoStart=!0,e.exports={shared:n,Ticker:i}},{"./Ticker":147}],149:[function(t,e,r){var i=function(t){for(var e=6*t,r=new Uint16Array(e),i=0,n=0;i<e;i+=6,n+=4)r[i+0]=n+0,r[i+1]=n+1,r[i+2]=n+2,r[i+3]=n+0,r[i+4]=n+2,r[i+5]=n+3;return r};e.exports=i},{}],150:[function(t,e,r){var i,n=t("url"),s=function(t,e){if(0===t.indexOf("data:"))return"";e=e||window.location,i||(i=document.createElement("a")),i.href=t,t=n.parse(i.href);var r=!t.port&&""===e.port||t.port===e.port;return t.hostname===e.hostname&&r&&t.protocol===e.protocol?"":"anonymous"};e.exports=s},{url:72}],151:[function(t,e,r){var i=t("../const"),n=e.exports={_uid:0,_saidHello:!1,EventEmitter:t("eventemitter3"),pluginTarget:t("./pluginTarget"),uid:function(){return++n._uid},hex2rgb:function(t,e){return e=e||[],e[0]=(t>>16&255)/255,e[1]=(t>>8&255)/255,e[2]=(255&t)/255,e},hex2string:function(t){return t=t.toString(16),t="000000".substr(0,6-t.length)+t,"#"+t},rgb2hex:function(t){return(255*t[0]<<16)+(255*t[1]<<8)+255*t[2]},getResolutionOfUrl:function(t){var e=i.RETINA_PREFIX.exec(t);return e?parseFloat(e[1]):1},sayHello:function(t){if(!n._saidHello){if(navigator.userAgent.toLowerCase().indexOf("chrome")>-1){var e=["\n %c %c %c Pixi.js "+i.VERSION+" - ✰ "+t+" ✰  %c  %c  http://www.pixijs.com/  %c %c ♥%c♥%c♥ \n\n","background: #ff66a5; padding:5px 0;","background: #ff66a5; padding:5px 0;","color: #ff66a5; background: #030307; padding:5px 0;","background: #ff66a5; padding:5px 0;","background: #ffc3dc; padding:5px 0;","background: #ff66a5; padding:5px 0;","color: #ff2424; background: #fff; padding:5px 0;","color: #ff2424; background: #fff; padding:5px 0;","color: #ff2424; background: #fff; padding:5px 0;"];window.console.log.apply(console,e)}else window.console&&window.console.log("Pixi.js "+i.VERSION+" - "+t+" - http://www.pixijs.com/");n._saidHello=!0}},isWebGLSupported:function(){var t={stencil:!0,failIfMajorPerformanceCaveat:!0};try{if(!window.WebGLRenderingContext)return!1;var e=document.createElement("canvas"),r=e.getContext("webgl",t)||e.getContext("experimental-webgl",t),i=!(!r||!r.getContextAttributes().stencil);if(r){var n=r.getExtension("WEBGL_lose_context");n&&n.loseContext()}return r=null,i}catch(t){return!1}},sign:function(t){return t?t<0?-1:1:0},removeItems:function(t,e,r){var i=t.length;if(!(e>=i||0===r)){r=e+r>i?i-e:r;for(var n=e,s=i-r;n<s;++n)t[n]=t[n+r];t.length=s}},TextureCache:{},BaseTextureCache:{}}},{"../const":78,"./pluginTarget":153,eventemitter3:32}],152:[function(t,e,r){var i=t("ismobilejs"),n=function(t){return i.tablet||i.phone?2:t};e.exports=n},{ismobilejs:33}],153:[function(t,e,r){function i(t){t.__plugins={},t.registerPlugin=function(e,r){t.__plugins[e]=r},t.prototype.initPlugins=function(){this.plugins=this.plugins||{};for(var e in t.__plugins)this.plugins[e]=new t.__plugins[e](this)},t.prototype.destroyPlugins=function(){for(var t in this.plugins)this.plugins[t].destroy(),this.plugins[t]=null;this.plugins=null}}e.exports={mixin:function(t){i(t)}}},{}],154:[function(t,e,r){var i=t("./core"),n=t("./mesh"),s=t("./particles"),o=t("./extras"),a=t("./filters");i.SpriteBatch=function(){throw new ReferenceError("SpriteBatch does not exist any more, please use the new ParticleContainer instead.")},i.AssetLoader=function(){throw new ReferenceError("The loader system was overhauled in pixi v3, please see the new PIXI.loaders.Loader class.")},Object.defineProperties(i,{Stage:{get:function(){return i.Container}},DisplayObjectContainer:{get:function(){return i.Container}},Strip:{get:function(){return n.Mesh}},Rope:{get:function(){return n.Rope}},ParticleContainer:{get:function(){return s.ParticleContainer}},MovieClip:{get:function(){return o.MovieClip}},TilingSprite:{get:function(){return o.TilingSprite}},BitmapText:{get:function(){return o.BitmapText}},blendModes:{get:function(){return i.BLEND_MODES}},scaleModes:{get:function(){return i.SCALE_MODES}},BaseTextureCache:{get:function(){return i.utils.BaseTextureCache}},TextureCache:{get:function(){return i.utils.TextureCache}},math:{get:function(){return i}},AbstractFilter:{get:function(){return i.Filter}},TransformManual:{get:function(){return i.TransformBase}}}),i.DisplayObject.prototype.generateTexture=function(t,e,r){return t.generateTexture(this,e,r)},i.Graphics.prototype.generateTexture=function(t,e){return this.generateCanvasTexture(t,e)},i.RenderTexture.prototype.render=function(t,e,r,i){this.legacyRenderer.render(t,this,r,e,!i)},i.RenderTexture.prototype.getImage=function(t){return this.legacyRenderer.extract.image(t)},i.RenderTexture.prototype.getBase64=function(t){return this.legacyRenderer.extract.base64(t)},i.RenderTexture.prototype.getCanvas=function(t){return this.legacyRenderer.extract.canvas(t)},i.RenderTexture.prototype.getPixels=function(t){return this.legacyRenderer.pixels(t)},i.Sprite.prototype.setTexture=function(t){this.texture=t},o.BitmapText.prototype.setText=function(t){this.text=t},i.Text.prototype.setText=function(t){this.text=t},i.Text.prototype.setStyle=function(t){this.style=t},Object.defineProperties(i.TextStyle.prototype,{font:{get:function(){var t="number"==typeof this._fontSize?this._fontSize+"px":this._fontSize;return this._fontStyle+" "+this._fontVariant+" "+this._fontWeight+" "+t+" "+this._fontFamily},set:function(t){t.indexOf("italic")>1?this._fontStyle="italic":t.indexOf("oblique")>-1?this._fontStyle="oblique":this._fontStyle="normal",t.indexOf("small-caps")>-1?this._fontVariant="small-caps":this._fontVariant="normal";var e,r=t.split(" "),i=-1;for(this._fontSize=26,e=0;e<r.length;++e)if(r[e].match(/(px|pt|em|%)/)){i=e,this._fontSize=r[e];break}for(this._fontWeight="normal",e=0;e<i;++e)if(r[e].match(/(bold|bolder|lighter|100|200|300|400|500|600|700|800|900)/)){this._fontWeight=r[e];break}if(i>-1&&i<r.length-1){for(this._fontFamily="",e=i+1;e<r.length;++e)this._fontFamily+=r[e]+" ";this._fontFamily=this._fontFamily.slice(0,-1)}else this._fontFamily="Arial";this.styleID++}}}),i.Texture.prototype.setFrame=function(t){this.frame=t},Object.defineProperties(a,{AbstractFilter:{get:function(){return i.AbstractFilter}},SpriteMaskFilter:{get:function(){return i.SpriteMaskFilter}}}),i.utils.uuid=function(){return i.utils.uid()},i.utils.canUseNewCanvasBlendModes=function(){return i.CanvasTinter.canUseMultiply}},{"./core":97,"./extras":164,"./filters":175,"./mesh":191,"./particles":194}],155:[function(t,e,r){function i(t){this.renderer=t,t.extract=this}var n=t("../../core"),s=new n.Rectangle;i.prototype.constructor=i,e.exports=i,i.prototype.image=function(t){var e=new Image;return e.src=this.base64(t),e},i.prototype.base64=function(t){return this.canvas(t).toDataURL()},i.prototype.canvas=function(t){var e,r,i,o,a=this.renderer;t&&(o=t instanceof n.RenderTexture?t:a.generateTexture(t)),o?(e=o.baseTexture._canvasRenderTarget.context,r=o.baseTexture._canvasRenderTarget.resolution,i=o.frame):(e=a.rootContext,r=a.rootResolution,i=s,i.width=this.renderer.width,i.height=this.renderer.height);var h=i.width*r,u=i.height*r,l=new n.CanvasRenderTarget(h,u),c=e.getImageData(i.x*r,i.y*r,h,u);return l.context.putImageData(c,0,0),l.canvas},i.prototype.pixels=function(t){var e,r,i,o,a=this.renderer;return t&&(o=t instanceof n.RenderTexture?t:a.generateTexture(t)),o?(e=o.baseTexture._canvasRenderTarget.context,r=o.baseTexture._canvasRenderTarget.resolution,i=o.frame):(e=a.rootContext,r=a.rootResolution,i=s,i.width=a.width,i.height=a.height),e.getImageData(0,0,i.width*r,i.height*r).data},i.prototype.destroy=function(){this.renderer.extract=null,this.renderer=null},n.CanvasRenderer.registerPlugin("extract",i)},{"../../core":97}],156:[function(t,e,r){e.exports={webGL:t("./webgl/WebGLExtract"),canvas:t("./canvas/CanvasExtract")}},{"./canvas/CanvasExtract":155,"./webgl/WebGLExtract":157}],157:[function(t,e,r){function i(t){this.renderer=t,t.extract=this}var n=t("../../core"),s=new n.Rectangle;i.prototype.constructor=i,e.exports=i,i.prototype.image=function(t){var e=new Image;return e.src=this.base64(t),e},i.prototype.base64=function(t){return this.canvas(t).toDataURL()},i.prototype.canvas=function(t){var e,r,i,o,a=this.renderer,h=!1;t&&(o=t instanceof n.RenderTexture?t:this.renderer.generateTexture(t)),o?(e=o.baseTexture._glRenderTargets[this.renderer.CONTEXT_UID],r=e.resolution,i=o.frame,h=!1):(e=this.renderer.rootRenderTarget,r=e.resolution,h=!0,i=s,i.width=e.size.width,i.height=e.size.height);var u=i.width*r,l=i.height*r,c=new n.CanvasRenderTarget(u,l);if(e){a.bindRenderTarget(e);var d=new Uint8Array(4*u*l),p=a.gl;p.readPixels(i.x*r,i.y*r,u,l,p.RGBA,p.UNSIGNED_BYTE,d);var f=c.context.getImageData(0,0,u,l);f.data.set(d),c.context.putImageData(f,0,0),h&&(c.context.scale(1,-1),c.context.drawImage(c.canvas,0,-l))}return c.canvas},i.prototype.pixels=function(t){var e,r,i,o,a=this.renderer;t&&(o=t instanceof n.RenderTexture?t:this.renderer.generateTexture(t)),o?(e=o.baseTexture._glRenderTargets[this.renderer.CONTEXT_UID],r=e.resolution,i=o.frame):(e=this.renderer.rootRenderTarget,r=e.resolution,i=s,i.width=e.size.width,i.height=e.size.height);var h=i.width*r,u=i.height*r,l=new Uint8Array(4*h*u);if(e){a.bindRenderTarget(e);var c=a.gl;c.readPixels(i.x*r,i.y*r,h,u,c.RGBA,c.UNSIGNED_BYTE,l)}return l},i.prototype.destroy=function(){this.renderer.extract=null,this.renderer=null},n.WebGLRenderer.registerPlugin("extract",i)},{"../../core":97}],158:[function(t,e,r){function i(t,e){n.Container.call(this),e=e||{},this.textWidth=0,this.textHeight=0,this._glyphs=[],this._font={tint:void 0!==e.tint?e.tint:16777215,align:e.align||"left",name:null,size:0},this.font=e.font,this._text=t,this.maxWidth=0,this.maxLineHeight=0,this._anchor=new s(this.makeDirty,this,0,0),this.dirty=!1,this.updateText()}var n=t("../core"),s=t("../core/math/ObservablePoint");i.prototype=Object.create(n.Container.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{tint:{get:function(){return this._font.tint},set:function(t){this._font.tint="number"==typeof t&&t>=0?t:16777215,this.dirty=!0}},align:{get:function(){return this._font.align},set:function(t){this._font.align=t||"left",this.dirty=!0}},anchor:{get:function(){return this._anchor},set:function(t){"number"==typeof t?this._anchor.set(t):this._anchor.copy(t)}},font:{get:function(){return this._font},set:function(t){t&&("string"==typeof t?(t=t.split(" "),this._font.name=1===t.length?t[0]:t.slice(1).join(" "),this._font.size=t.length>=2?parseInt(t[0],10):i.fonts[this._font.name].size):(this._font.name=t.name,this._font.size="number"==typeof t.size?t.size:parseInt(t.size,10)),this.dirty=!0)}},text:{get:function(){return this._text},set:function(t){t=t.toString()||" ",this._text!==t&&(this._text=t,this.dirty=!0)}}}),i.prototype.updateText=function(){for(var t=i.fonts[this._font.name],e=new n.Point,r=null,s=[],o=0,a=0,h=[],u=0,l=this._font.size/t.size,c=-1,d=0,p=0,f=0;f<this.text.length;f++){var v=this.text.charCodeAt(f);if(/(\s)/.test(this.text.charAt(f))&&(c=f,d=o),/(?:\r\n|\r|\n)/.test(this.text.charAt(f)))h.push(o),a=Math.max(a,o),u++,e.x=0,e.y+=t.lineHeight,r=null;else if(c!==-1&&this.maxWidth>0&&e.x*l>this.maxWidth)n.utils.removeItems(s,c,f-c),f=c,c=-1,h.push(d),a=Math.max(a,d),u++,e.x=0,e.y+=t.lineHeight,r=null;else{var g=t.chars[v];g&&(r&&g.kerning[r]&&(e.x+=g.kerning[r]),s.push({texture:g.texture,line:u,charCode:v,position:new n.Point(e.x+g.xOffset,e.y+g.yOffset)}),o=e.x+(g.texture.width+g.xOffset),e.x+=g.xAdvance,p=Math.max(p,g.yOffset+g.texture.height),r=v)}}h.push(o),a=Math.max(a,o);var y=[];for(f=0;f<=u;f++){var x=0;"right"===this._font.align?x=a-h[f]:"center"===this._font.align&&(x=(a-h[f])/2),y.push(x)}var m=s.length,_=this.tint;for(f=0;f<m;f++){var b=this._glyphs[f];b?b.texture=s[f].texture:(b=new n.Sprite(s[f].texture),this._glyphs.push(b)),b.position.x=(s[f].position.x+y[s[f].line])*l,b.position.y=s[f].position.y*l,b.scale.x=b.scale.y=l,b.tint=_,b.parent||this.addChild(b)}for(f=m;f<this._glyphs.length;++f)this.removeChild(this._glyphs[f]);if(this.textWidth=a*l,this.textHeight=(e.y+t.lineHeight)*l,0!==this.anchor.x||0!==this.anchor.y)for(f=0;f<m;f++)this._glyphs[f].x-=this.textWidth*this.anchor.x,this._glyphs[f].y-=this.textHeight*this.anchor.y;this.maxLineHeight=p*l},i.prototype.updateTransform=function(){this.validate(),this.containerUpdateTransform()},i.prototype.getLocalBounds=function(){return this.validate(),n.Container.prototype.getLocalBounds.call(this)},i.prototype.validate=function(){this.dirty&&(this.updateText(),this.dirty=!1)},i.prototype.makeDirty=function(){this.dirty=!0},i.fonts={}},{"../core":97,"../core/math/ObservablePoint":100}],159:[function(t,e,r){function i(t){n.Sprite.call(this,t[0]instanceof n.Texture?t[0]:t[0].texture),this._textures=null,this._durations=null,this.textures=t,this.animationSpeed=1,this.loop=!0,this.onComplete=null,this._currentTime=0,this.playing=!1}var n=t("../core");i.prototype=Object.create(n.Sprite.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{totalFrames:{get:function(){
return this._textures.length}},textures:{get:function(){return this._textures},set:function(t){if(t[0]instanceof n.Texture)this._textures=t,this._durations=null;else{this._textures=[],this._durations=[];for(var e=0;e<t.length;e++)this._textures.push(t[e].texture),this._durations.push(t[e].time)}}},currentFrame:{get:function(){var t=Math.floor(this._currentTime)%this._textures.length;return t<0&&(t+=this._textures.length),t}}}),i.prototype.stop=function(){this.playing&&(this.playing=!1,n.ticker.shared.remove(this.update,this))},i.prototype.play=function(){this.playing||(this.playing=!0,n.ticker.shared.add(this.update,this))},i.prototype.gotoAndStop=function(t){this.stop(),this._currentTime=t,this._texture=this._textures[this.currentFrame],this._textureID=-1},i.prototype.gotoAndPlay=function(t){this._currentTime=t,this.play()},i.prototype.update=function(t){var e=this.animationSpeed*t;if(null!==this._durations){var r=this._currentTime%1*this._durations[this.currentFrame];for(r+=e/60*1e3;r<0;)this._currentTime--,r+=this._durations[this.currentFrame];var i=Math.sign(this.animationSpeed*t);for(this._currentTime=Math.floor(this._currentTime);r>=this._durations[this.currentFrame];)r-=this._durations[this.currentFrame]*i,this._currentTime+=i;this._currentTime+=r/this._durations[this.currentFrame]}else this._currentTime+=e;this._currentTime<0&&!this.loop?(this.gotoAndStop(0),this.onComplete&&this.onComplete()):this._currentTime>=this._textures.length&&!this.loop?(this.gotoAndStop(this._textures.length-1),this.onComplete&&this.onComplete()):(this._texture=this._textures[this.currentFrame],this._textureID=-1)},i.prototype.destroy=function(){this.stop(),n.Sprite.prototype.destroy.call(this)},i.fromFrames=function(t){for(var e=[],r=0;r<t.length;++r)e.push(n.Texture.fromFrame(t[r]));return new i(e)},i.fromImages=function(t){for(var e=[],r=0;r<t.length;++r)e.push(n.Texture.fromImage(t[r]));return new i(e)}},{"../core":97}],160:[function(t,e,r){function i(t,e,r){n.Sprite.call(this,t),this.tileScale=new n.Point(1,1),this.tilePosition=new n.Point(0,0),this._width=e||100,this._height=r||100,this._uvs=new n.TextureUvs,this._canvasPattern=null,this._glDatas=[]}var n=t("../core"),s=new n.Point,o=t("../core/textures/Texture"),a=t("../core/sprites/canvas/CanvasTinter"),h=t("./webgl/TilingShader"),u=new Float32Array(4);i.prototype=Object.create(n.Sprite.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{width:{get:function(){return this._width},set:function(t){this._width=t}},height:{get:function(){return this._height},set:function(t){this._height=t}}}),i.prototype._onTextureUpdate=function(){},i.prototype._renderWebGL=function(t){var e=this._texture;if(e&&e._uvs){t.flush();var r=t.gl,i=this._glDatas[t.CONTEXT_UID];i||(i={shader:new h(r),quad:new n.Quad(r)},this._glDatas[t.CONTEXT_UID]=i,i.quad.initVao(i.shader));var s=i.quad.vertices;s[0]=s[6]=this._width*-this.anchor.x,s[1]=s[3]=this._height*-this.anchor.y,s[2]=s[4]=this._width*(1-this.anchor.x),s[5]=s[7]=this._height*(1-this.anchor.y),i.quad.upload(),t.bindShader(i.shader);var o=e._uvs,a=e._frame.width,l=e._frame.height,c=e.baseTexture.width,d=e.baseTexture.height,p=i.shader.uniforms.uPixelSize;p[0]=1/c,p[1]=1/d,i.shader.uniforms.uPixelSize=p;var f=i.shader.uniforms.uFrame;f[0]=o.x0,f[1]=o.y0,f[2]=o.x1-o.x0,f[3]=o.y2-o.y0,i.shader.uniforms.uFrame=f;var v=i.shader.uniforms.uTransform;v[0]=this.tilePosition.x%(a*this.tileScale.x)/this._width,v[1]=this.tilePosition.y%(l*this.tileScale.y)/this._height,v[2]=c/this._width*this.tileScale.x,v[3]=d/this._height*this.tileScale.y,i.shader.uniforms.uTransform=v,i.shader.uniforms.translationMatrix=this.worldTransform.toArray(!0);var g=u;n.utils.hex2rgb(this.tint,g),g[3]=this.worldAlpha,i.shader.uniforms.uColor=g,t.bindTexture(this._texture,0),t.state.setBlendMode(this.blendMode),i.quad.draw()}},i.prototype._renderCanvas=function(t){var e=this._texture;if(e.baseTexture.hasLoaded){var r=t.context,i=this.worldTransform,s=t.resolution,o=e.baseTexture,h=this.tilePosition.x/this.tileScale.x%e._frame.width,u=this.tilePosition.y/this.tileScale.y%e._frame.height;if(!this._canvasPattern){var l=new n.CanvasRenderTarget(e._frame.width,e._frame.height);16777215!==this.tint?(this.cachedTint!==this.tint&&(this.cachedTint=this.tint,this.tintedTexture=a.getTintedTexture(this,this.tint)),l.context.drawImage(this.tintedTexture,0,0)):l.context.drawImage(o.source,-e._frame.x,-e._frame.y),this._canvasPattern=l.context.createPattern(l.canvas,"repeat")}r.globalAlpha=this.worldAlpha,r.setTransform(i.a*s,i.b*s,i.c*s,i.d*s,i.tx*s,i.ty*s),r.scale(this.tileScale.x,this.tileScale.y),r.translate(h+this.anchor.x*-this._width,u+this.anchor.y*-this._height);var c=t.blendModes[this.blendMode];c!==t.context.globalCompositeOperation&&(r.globalCompositeOperation=c),r.fillStyle=this._canvasPattern,r.fillRect(-h,-u,this._width/this.tileScale.x,this._height/this.tileScale.y)}},i.prototype.getBounds=function(){var t,e,r,i,n=this._width,s=this._height,o=n*(1-this.anchor.x),a=n*-this.anchor.x,h=s*(1-this.anchor.y),u=s*-this.anchor.y,l=this.worldTransform,c=l.a,d=l.b,p=l.c,f=l.d,v=l.tx,g=l.ty,y=c*a+p*u+v,x=f*u+d*a+g,m=c*o+p*u+v,_=f*u+d*o+g,b=c*o+p*h+v,T=f*h+d*o+g,E=c*a+p*h+v,w=f*h+d*a+g;t=y,t=m<t?m:t,t=b<t?b:t,t=E<t?E:t,r=x,r=_<r?_:r,r=T<r?T:r,r=w<r?w:r,e=y,e=m>e?m:e,e=b>e?b:e,e=E>e?E:e,i=x,i=_>i?_:i,i=T>i?T:i,i=w>i?w:i;var S=this._bounds;return S.x=t,S.width=e-t,S.y=r,S.height=i-r,this._currentBounds=S,S},i.prototype.containsPoint=function(t){this.worldTransform.applyInverse(t,s);var e,r=this._width,i=this._height,n=-r*this.anchor.x;return s.x>n&&s.x<n+r&&(e=-i*this.anchor.y,s.y>e&&s.y<e+i)},i.prototype.destroy=function(){n.Sprite.prototype.destroy.call(this),this.tileScale=null,this._tileScaleOffset=null,this.tilePosition=null,this._uvs=null},i.from=function(t,e,r){return new i(o.from(t),e,r)},i.fromFrame=function(t,e,r){var s=n.utils.TextureCache[t];if(!s)throw new Error('The frameId "'+t+'" does not exist in the texture cache '+this);return new i(s,e,r)},i.fromImage=function(t,e,r,s,o){return new i(n.Texture.fromImage(t,s,o),e,r)}},{"../core":97,"../core/sprites/canvas/CanvasTinter":135,"../core/textures/Texture":144,"./webgl/TilingShader":165}],161:[function(t,e,r){var i=t("../core"),n=i.DisplayObject,s=new i.Matrix;n.prototype._cacheAsBitmap=!1,n.prototype._cacheData=!1;var o=function(){this.originalRenderWebGL=null,this.originalRenderCanvas=null,this.originalCalculateBounds=null,this.originalGetLocalBounds=null,this.originalUpdateTransform=null,this.originalHitTest=null,this.originalDestroy=null,this.originalMask=null,this.originalFilterArea=null,this.sprite=null};Object.defineProperties(n.prototype,{cacheAsBitmap:{get:function(){return this._cacheAsBitmap},set:function(t){if(this._cacheAsBitmap!==t){this._cacheAsBitmap=t;var e;t?(this._cacheData||(this._cacheData=new o),e=this._cacheData,e.originalRenderWebGL=this.renderWebGL,e.originalRenderCanvas=this.renderCanvas,e.originalUpdateTransform=this.updateTransform,e.originalCalculateBounds=this._calculateBounds,e.originalGetLocalBounds=this.getLocalBounds,e.originalDestroy=this.destroy,e.originalContainsPoint=this.containsPoint,e.originalMask=this._mask,e.originalFilterArea=this.filterArea,this.renderWebGL=this._renderCachedWebGL,this.renderCanvas=this._renderCachedCanvas,this.destroy=this._cacheAsBitmapDestroy):(e=this._cacheData,e.sprite&&this._destroyCachedDisplayObject(),this.renderWebGL=e.originalRenderWebGL,this.renderCanvas=e.originalRenderCanvas,this._calculateBounds=e.originalCalculateBounds,this.getLocalBounds=e.originalGetLocalBounds,this.destroy=e.originalDestroy,this.updateTransform=e.originalUpdateTransform,this.containsPoint=e.originalContainsPoint,this._mask=e.originalMask,this.filterArea=e.originalFilterArea)}}}}),n.prototype._renderCachedWebGL=function(t){!this.visible||this.worldAlpha<=0||!this.renderable||(this._initCachedDisplayObject(t),this._cacheData.sprite._transformID=-1,this._cacheData.sprite.worldAlpha=this.worldAlpha,this._cacheData.sprite._renderWebGL(t))},n.prototype._initCachedDisplayObject=function(t){if(!this._cacheData||!this._cacheData.sprite){var e=this.alpha;this.alpha=1,t.currentRenderer.flush();var r=this.getLocalBounds().clone();if(this._filters){var n=this._filters[0].padding;r.pad(n)}var o=t._activeRenderTarget,a=t.filterManager.filterStack,h=i.RenderTexture.create(0|r.width,0|r.height),u=s;u.tx=-r.x,u.ty=-r.y,this.transform.worldTransform.identity(),this.renderWebGL=this._cacheData.originalRenderWebGL,t.render(this,h,!0,u,!0),t.bindRenderTarget(o),t.filterManager.filterStack=a,this.renderWebGL=this._renderCachedWebGL,this.updateTransform=this.displayObjectUpdateTransform,this._mask=null,this.filterArea=null;var l=new i.Sprite(h);l.transform.worldTransform=this.transform.worldTransform,l.anchor.x=-(r.x/r.width),l.anchor.y=-(r.y/r.height),l.alpha=e,l._bounds=this._bounds,this._calculateBounds=this._calculateCachedBounds,this.getLocalBounds=this._getCachedLocalBounds,this._cacheData.sprite=l,this.transform._parentID=-1,this.updateTransform(),this.containsPoint=l.containsPoint.bind(l)}},n.prototype._renderCachedCanvas=function(t){!this.visible||this.worldAlpha<=0||!this.renderable||(this._initCachedDisplayObjectCanvas(t),this._cacheData.sprite.worldAlpha=this.worldAlpha,this._cacheData.sprite.renderCanvas(t))},n.prototype._initCachedDisplayObjectCanvas=function(t){if(!this._cacheData||!this._cacheData.sprite){var e=this.getLocalBounds(),r=this.alpha;this.alpha=1;var n=t.context,o=new i.RenderTexture.create(0|e.width,0|e.height),a=s;this.transform.worldTransform.copy(a),a.invert(),a.tx-=e.x,a.ty-=e.y,this.renderCanvas=this._cacheData.originalRenderCanvas,t.render(this,o,!0,a,!1),t.context=n,this.renderCanvas=this._renderCachedCanvas,this._calculateBounds=this._calculateCachedBounds,this._mask=null,this.filterArea=null;var h=new i.Sprite(o);h.transform.worldTransform=this.transform.worldTransform,h.anchor.x=-(e.x/e.width),h.anchor.y=-(e.y/e.height),h._bounds=this._bounds,h.alpha=r,this.updateTransform(),this.updateTransform=this.displayObjectUpdateTransform,this._cacheData.sprite=h,this.containsPoint=h.containsPoint.bind(h)}},n.prototype._calculateCachedBounds=function(){return this._cacheData.sprite._calculateBounds()},n.prototype._getCachedLocalBounds=function(){return this._cacheData.sprite.getLocalBounds()},n.prototype._destroyCachedDisplayObject=function(){this._cacheData.sprite._texture.destroy(!0),this._cacheData.sprite=null},n.prototype._cacheAsBitmapDestroy=function(){this.cacheAsBitmap=!1,this.destroy()}},{"../core":97}],162:[function(t,e,r){var i=t("../core");i.DisplayObject.prototype.name=null,i.Container.prototype.getChildByName=function(t){for(var e=0;e<this.children.length;e++)if(this.children[e].name===t)return this.children[e];return null}},{"../core":97}],163:[function(t,e,r){var i=t("../core");i.DisplayObject.prototype.getGlobalPosition=function(t){return t=t||new i.Point,this.parent?(this.displayObjectUpdateTransform(),t.x=this.worldTransform.tx,t.y=this.worldTransform.ty):(t.x=this.position.x,t.y=this.position.y),t}},{"../core":97}],164:[function(t,e,r){t("./cacheAsBitmap"),t("./getChildByName"),t("./getGlobalPosition"),e.exports={MovieClip:t("./MovieClip"),TilingSprite:t("./TilingSprite"),BitmapText:t("./BitmapText")}},{"./BitmapText":158,"./MovieClip":159,"./TilingSprite":160,"./cacheAsBitmap":161,"./getChildByName":162,"./getGlobalPosition":163}],165:[function(t,e,r){function i(t){n.call(this,t,"#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\n\nuniform vec4 uFrame;\nuniform vec4 uTransform;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vec2 coord = aTextureCoord;\n    coord -= uTransform.xy;\n    coord /= uTransform.zw;\n    vTextureCoord = coord;\n}\n","#define GLSLIFY 1\nvarying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\nuniform vec4 uColor;\nuniform vec4 uFrame;\nuniform vec2 uPixelSize;\n\nvoid main(void)\n{\n\n   \tvec2 coord = mod(vTextureCoord, uFrame.zw);\n   \tcoord = clamp(coord, uPixelSize, uFrame.zw - uPixelSize);\n   \tcoord += uFrame.xy;\n\n   \tvec4 sample = texture2D(uSampler, coord);\n  \tvec4 color = vec4(uColor.rgb * uColor.a, uColor.a);\n\n   \tgl_FragColor = sample * color ;\n}\n")}var n=t("../../core/Shader");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i},{"../../core/Shader":77}],166:[function(t,e,r){function i(t,e,r){n.Filter.call(this),this.blurXFilter=new s,this.blurYFilter=new o,this.resolution=1,this.padding=0,this.resolution=r||1,this.quality=e||4,this.blur=t||8}var n=t("../../core"),s=t("./BlurXFilter"),o=t("./BlurYFilter");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.apply=function(t,e,r){var i=t.getRenderTarget(!0);this.blurXFilter.apply(t,e,i,!0),this.blurYFilter.apply(t,i,r,!1),t.returnRenderTarget(i)},Object.defineProperties(i.prototype,{blur:{get:function(){return this.blurXFilter.blur},set:function(t){this.blurXFilter.blur=this.blurYFilter.blur=t,this.padding=2*Math.max(Math.abs(this.blurYFilter.strength),Math.abs(this.blurYFilter.strength))}},quality:{get:function(){return this.blurXFilter.quality},set:function(t){this.blurXFilter.quality=this.blurYFilter.quality=t}},blurX:{get:function(){return this.blurXFilter.blur},set:function(t){this.blurXFilter.blur=t,this.padding=2*Math.max(Math.abs(this.blurYFilter.strength),Math.abs(this.blurYFilter.strength))}},blurY:{get:function(){return this.blurYFilter.blur},set:function(t){this.blurYFilter.blur=t,this.padding=2*Math.max(Math.abs(this.blurYFilter.strength),Math.abs(this.blurYFilter.strength))}}})},{"../../core":97,"./BlurXFilter":167,"./BlurYFilter":168}],167:[function(t,e,r){function i(t,e,r){var i=s(5,!0),a=o(5);n.Filter.call(this,i,a),this.resolution=r||1,this._quality=0,this.quality=e||4,this.strength=t||8,this.firstRun=!0}var n=t("../../core"),s=t("./generateBlurVertSource"),o=t("./generateBlurFragSource"),a=t("./getMaxBlurKernelSize");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.apply=function(t,e,r,i){if(this.firstRun){var n=t.renderer.gl,h=a(n);this.vertexSrc=s(h,!0),this.fragmentSrc=o(h),this.firstRun=!1}if(this.uniforms.strength=1/r.size.width*(r.size.width/e.size.width),this.uniforms.strength*=this.strength,this.uniforms.strength/=this.passes,1===this.passes)t.applyFilter(this,e,r,i);else{for(var u=t.getRenderTarget(!0),l=e,c=u,d=0;d<this.passes-1;d++){t.applyFilter(this,l,c,!0);var p=c;c=l,l=p}t.applyFilter(this,l,r,i),t.returnRenderTarget(u)}},Object.defineProperties(i.prototype,{blur:{get:function(){return this.strength},set:function(t){this.padding=2*Math.abs(t),this.strength=t}},quality:{get:function(){return this._quality},set:function(t){this._quality=t,this.passes=t}}})},{"../../core":97,"./generateBlurFragSource":169,"./generateBlurVertSource":170,"./getMaxBlurKernelSize":171}],168:[function(t,e,r){function i(t,e,r){var i=s(5,!1),a=o(5);n.Filter.call(this,i,a),this.resolution=r||1,this._quality=0,this.quality=e||4,this.strength=t||8,this.firstRun=!0}var n=t("../../core"),s=t("./generateBlurVertSource"),o=t("./generateBlurFragSource"),a=t("./getMaxBlurKernelSize");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.apply=function(t,e,r,i){if(this.firstRun){var n=t.renderer.gl,h=a(n);this.vertexSrc=s(h,!1),this.fragmentSrc=o(h),this.firstRun=!1}if(this.uniforms.strength=1/r.size.height*(r.size.height/e.size.height),this.uniforms.strength*=this.strength,this.uniforms.strength/=this.passes,1===this.passes)t.applyFilter(this,e,r,i);else{for(var u=t.getRenderTarget(!0),l=e,c=u,d=0;d<this.passes-1;d++){t.applyFilter(this,l,c,!0);var p=c;c=l,l=p}t.applyFilter(this,l,r,i),t.returnRenderTarget(u)}},Object.defineProperties(i.prototype,{blur:{get:function(){return this.strength},set:function(t){this.padding=2*Math.abs(t),this.strength=t}},quality:{get:function(){return this._quality},set:function(t){this._quality=t,this.passes=t}}})},{"../../core":97,"./generateBlurFragSource":169,"./generateBlurVertSource":170,"./getMaxBlurKernelSize":171}],169:[function(t,e,r){var i={5:[.153388,.221461,.250301],7:[.071303,.131514,.189879,.214607],9:[.028532,.067234,.124009,.179044,.20236],11:[.0093,.028002,.065984,.121703,.175713,.198596],13:[.002406,.009255,.027867,.065666,.121117,.174868,.197641],15:[489e-6,.002403,.009246,.02784,.065602,.120999,.174697,.197448]},n=["varying vec2 vBlurTexCoords[%size%];","uniform sampler2D uSampler;","void main(void)","{","\tgl_FragColor = vec4(0.0);","\t%blur%","}"].join("\n"),s=function(t){for(var e,r=i[t],s=r.length,o=n,a="",h="gl_FragColor += texture2D(uSampler, vBlurTexCoords[%index%]) * %value%;",u=0;u<t;u++){var l=h.replace("%index%",u);e=u,u>=s&&(e=t-u-1),l=l.replace("%value%",r[e]),a+=l,a+="\n"}return o=o.replace("%blur%",a),o=o.replace("%size%",t)};e.exports=s},{}],170:[function(t,e,r){var i=["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform float strength;","uniform mat3 projectionMatrix;","varying vec2 vBlurTexCoords[%size%];","void main(void)","{","gl_Position = vec4((projectionMatrix * vec3((aVertexPosition), 1.0)).xy, 0.0, 1.0);","%blur%","}"].join("\n"),n=function(t,e){var r,n,s=Math.ceil(t/2),o=i,a="";r=e?"vBlurTexCoords[%index%] = aTextureCoord + vec2(%sampleIndex% * strength, 0.0);":"vBlurTexCoords[%index%] = aTextureCoord + vec2(0.0, %sampleIndex% * strength);";for(var h=0;h<t;h++){var u=r.replace("%index%",h);n=h,h>=s&&(n=t-h-1),u=u.replace("%sampleIndex%",h-(s-1)+".0"),a+=u,a+="\n"}return o=o.replace("%blur%",a),o=o.replace("%size%",t)};e.exports=n},{}],171:[function(t,e,r){var i=function(t){for(var e=t.getParameter(t.MAX_VARYING_VECTORS),r=15;r>e;)r-=2;return r};e.exports=i},{}],172:[function(t,e,r){function i(){n.Filter.call(this,"#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}","#define GLSLIFY 1\nvarying vec2 vTextureCoord;\nuniform sampler2D uSampler;\nuniform float m[20];\n\nvoid main(void)\n{\n\n    vec4 c = texture2D(uSampler, vTextureCoord);\n\n    gl_FragColor.r = (m[0] * c.r);\n        gl_FragColor.r += (m[1] * c.g);\n        gl_FragColor.r += (m[2] * c.b);\n        gl_FragColor.r += (m[3] * c.a);\n        gl_FragColor.r += m[4] * c.a;\n\n    gl_FragColor.g = (m[5] * c.r);\n        gl_FragColor.g += (m[6] * c.g);\n        gl_FragColor.g += (m[7] * c.b);\n        gl_FragColor.g += (m[8] * c.a);\n        gl_FragColor.g += m[9] * c.a;\n\n     gl_FragColor.b = (m[10] * c.r);\n        gl_FragColor.b += (m[11] * c.g);\n        gl_FragColor.b += (m[12] * c.b);\n        gl_FragColor.b += (m[13] * c.a);\n        gl_FragColor.b += m[14] * c.a;\n\n     gl_FragColor.a = (m[15] * c.r);\n        gl_FragColor.a += (m[16] * c.g);\n        gl_FragColor.a += (m[17] * c.b);\n        gl_FragColor.a += (m[18] * c.a);\n        gl_FragColor.a += m[19] * c.a;\n\n//    gl_FragColor = vec4(m[0]);\n}\n"),this.uniforms.m=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0]}var n=t("../../core");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i,i.prototype._loadMatrix=function(t,e){e=!!e;var r=t;e&&(this._multiply(r,this.uniforms.m,t),r=this._colorMatrix(r)),this.uniforms.m=r},i.prototype._multiply=function(t,e,r){return t[0]=e[0]*r[0]+e[1]*r[5]+e[2]*r[10]+e[3]*r[15],t[1]=e[0]*r[1]+e[1]*r[6]+e[2]*r[11]+e[3]*r[16],t[2]=e[0]*r[2]+e[1]*r[7]+e[2]*r[12]+e[3]*r[17],t[3]=e[0]*r[3]+e[1]*r[8]+e[2]*r[13]+e[3]*r[18],t[4]=e[0]*r[4]+e[1]*r[9]+e[2]*r[14]+e[3]*r[19],t[5]=e[5]*r[0]+e[6]*r[5]+e[7]*r[10]+e[8]*r[15],t[6]=e[5]*r[1]+e[6]*r[6]+e[7]*r[11]+e[8]*r[16],t[7]=e[5]*r[2]+e[6]*r[7]+e[7]*r[12]+e[8]*r[17],t[8]=e[5]*r[3]+e[6]*r[8]+e[7]*r[13]+e[8]*r[18],t[9]=e[5]*r[4]+e[6]*r[9]+e[7]*r[14]+e[8]*r[19],t[10]=e[10]*r[0]+e[11]*r[5]+e[12]*r[10]+e[13]*r[15],t[11]=e[10]*r[1]+e[11]*r[6]+e[12]*r[11]+e[13]*r[16],t[12]=e[10]*r[2]+e[11]*r[7]+e[12]*r[12]+e[13]*r[17],t[13]=e[10]*r[3]+e[11]*r[8]+e[12]*r[13]+e[13]*r[18],t[14]=e[10]*r[4]+e[11]*r[9]+e[12]*r[14]+e[13]*r[19],t[15]=e[15]*r[0]+e[16]*r[5]+e[17]*r[10]+e[18]*r[15],t[16]=e[15]*r[1]+e[16]*r[6]+e[17]*r[11]+e[18]*r[16],t[17]=e[15]*r[2]+e[16]*r[7]+e[17]*r[12]+e[18]*r[17],t[18]=e[15]*r[3]+e[16]*r[8]+e[17]*r[13]+e[18]*r[18],t[19]=e[15]*r[4]+e[16]*r[9]+e[17]*r[14]+e[18]*r[19],t},i.prototype._colorMatrix=function(t){var e=new Float32Array(t);return e[4]/=255,e[9]/=255,e[14]/=255,e[19]/=255,e},i.prototype.brightness=function(t,e){var r=[t,0,0,0,0,0,t,0,0,0,0,0,t,0,0,0,0,0,1,0];this._loadMatrix(r,e)},i.prototype.greyscale=function(t,e){var r=[t,t,t,0,0,t,t,t,0,0,t,t,t,0,0,0,0,0,1,0];this._loadMatrix(r,e)},i.prototype.grayscale=i.prototype.greyscale,i.prototype.blackAndWhite=function(t){var e=[.3,.6,.1,0,0,.3,.6,.1,0,0,.3,.6,.1,0,0,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.hue=function(t,e){t=(t||0)/180*Math.PI;var r=Math.cos(t),i=Math.sin(t),n=Math.sqrt,s=1/3,o=n(s),a=r+(1-r)*s,h=s*(1-r)-o*i,u=s*(1-r)+o*i,l=s*(1-r)+o*i,c=r+s*(1-r),d=s*(1-r)-o*i,p=s*(1-r)-o*i,f=s*(1-r)+o*i,v=r+s*(1-r),g=[a,h,u,0,0,l,c,d,0,0,p,f,v,0,0,0,0,0,1,0];this._loadMatrix(g,e)},i.prototype.contrast=function(t,e){var r=(t||0)+1,i=-128*(r-1),n=[r,0,0,0,i,0,r,0,0,i,0,0,r,0,i,0,0,0,1,0];this._loadMatrix(n,e)},i.prototype.saturate=function(t,e){var r=2*(t||0)/3+1,i=(r-1)*-.5,n=[r,i,i,0,0,i,r,i,0,0,i,i,r,0,0,0,0,0,1,0];this._loadMatrix(n,e)},i.prototype.desaturate=function(){this.saturate(-1)},i.prototype.negative=function(t){var e=[0,1,1,0,0,1,0,1,0,0,1,1,0,0,0,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.sepia=function(t){var e=[.393,.7689999,.18899999,0,0,.349,.6859999,.16799999,0,0,.272,.5339999,.13099999,0,0,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.technicolor=function(t){var e=[1.9125277891456083,-.8545344976951645,-.09155508482755585,0,11.793603434377337,-.3087833385928097,1.7658908555458428,-.10601743074722245,0,-70.35205161461398,-.231103377548616,-.7501899197440212,1.847597816108189,0,30.950940869491138,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.polaroid=function(t){var e=[1.438,-.062,-.062,0,0,-.122,1.378,-.122,0,0,-.016,-.016,1.483,0,0,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.toBGR=function(t){var e=[0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.kodachrome=function(t){var e=[1.1285582396593525,-.3967382283601348,-.03992559172921793,0,63.72958762196502,-.16404339962244616,1.0835251566291304,-.05498805115633132,0,24.732407896706203,-.16786010706155763,-.5603416277695248,1.6014850761964943,0,35.62982807460946,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.browni=function(t){var e=[.5997023498159715,.34553243048391263,-.2708298674538042,0,47.43192855600873,-.037703249837783157,.8609577587992641,.15059552388459913,0,-36.96841498319127,.24113635128153335,-.07441037908422492,.44972182064877153,0,-7.562075277591283,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.vintage=function(t){var e=[.6279345635605994,.3202183420819367,-.03965408211312453,0,9.651285835294123,.02578397704808868,.6441188644374771,.03259127616149294,0,7.462829176470591,.0466055556782719,-.0851232987247891,.5241648018700465,0,5.159190588235296,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.colorTone=function(t,e,r,i,n){t=t||.2,e=e||.15,r=r||16770432,i=i||3375104;var s=(r>>16&255)/255,o=(r>>8&255)/255,a=(255&r)/255,h=(i>>16&255)/255,u=(i>>8&255)/255,l=(255&i)/255,c=[.3,.59,.11,0,0,s,o,a,t,0,h,u,l,e,0,s-h,o-u,a-l,0,0];this._loadMatrix(c,n)},i.prototype.night=function(t,e){t=t||.1;var r=[t*-2,-t,0,0,0,-t,0,t,0,0,0,t,2*t,0,0,0,0,0,1,0];this._loadMatrix(r,e)},i.prototype.predator=function(t,e){var r=[11.224130630493164*t,-4.794486999511719*t,-2.8746118545532227*t,0*t,.40342438220977783*t,-3.6330697536468506*t,9.193157196044922*t,-2.951810836791992*t,0*t,-1.316135048866272*t,-3.2184197902679443*t,-4.2375030517578125*t,7.476448059082031*t,0*t,.8044459223747253*t,0,0,0,1,0];this._loadMatrix(r,e)},i.prototype.lsd=function(t){var e=[2,-.4,.5,0,0,-.5,2,-.4,0,0,-.4,-.5,3,0,0,0,0,0,1,0];this._loadMatrix(e,t)},i.prototype.reset=function(){var t=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0];this._loadMatrix(t,!1)},Object.defineProperties(i.prototype,{matrix:{get:function(){return this.uniforms.m},set:function(t){this.uniforms.m=t}}})},{"../../core":97}],173:[function(t,e,r){function i(t,e){var r=new n.Matrix;t.renderable=!1,n.Filter.call(this,"#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 filterMatrix;\n\nvarying vec2 vTextureCoord;\nvarying vec2 vFilterCoord;\n\nvoid main(void)\n{\n   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n   vFilterCoord = ( filterMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n   vTextureCoord = aTextureCoord;\n}","#define GLSLIFY 1\nvarying vec2 vFilterCoord;\nvarying vec2 vTextureCoord;\n\nuniform vec2 scale;\n\nuniform sampler2D uSampler;\nuniform sampler2D mapSampler;\n\nuniform vec4 filterClamp;\n\nvoid main(void)\n{\n   vec4 map =  texture2D(mapSampler, vFilterCoord);\n\n   map -= 0.5;\n   map.xy *= scale;\n\n   gl_FragColor = texture2D(uSampler, clamp(vec2(vTextureCoord.x + map.x, vTextureCoord.y + map.y), filterClamp.xy, filterClamp.zw));\n}\n"),this.maskSprite=t,this.maskMatrix=r,this.uniforms.mapSampler=t.texture,this.uniforms.filterMatrix=r.toArray(!0),this.uniforms.scale={x:1,y:1},null!==e&&void 0!==e||(e=20),this.scale=new n.Point(e,e)}var n=t("../../core");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.apply=function(t,e,r){var i=1/r.destinationFrame.width*(r.size.width/e.size.width);this.uniforms.filterMatrix=t.calculateSpriteMatrix(this.maskMatrix,this.maskSprite),this.uniforms.scale.x=this.scale.x*i,this.uniforms.scale.y=this.scale.y*i,t.applyFilter(this,e,r)},Object.defineProperties(i.prototype,{map:{get:function(){return this.uniforms.mapSampler},set:function(t){this.uniforms.mapSampler=t}}})},{"../../core":97}],174:[function(t,e,r){function i(){n.Filter.call(this,"#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nuniform vec4 filterArea;\n\nvarying vec2 vTextureCoord;\n\nvec2 mapCoord( vec2 coord )\n{\n    coord *= filterArea.xy;\n    coord += filterArea.zw;\n\n    return coord;\n}\n\nvec2 unmapCoord( vec2 coord )\n{\n    coord -= filterArea.zw;\n    coord /= filterArea.xy;\n\n    return coord;\n}\n\nvoid texcoords(vec2 fragCoord, vec2 resolution,\n               out vec2 v_rgbNW, out vec2 v_rgbNE,\n               out vec2 v_rgbSW, out vec2 v_rgbSE,\n               out vec2 v_rgbM) {\n    vec2 inverseVP = 1.0 / resolution.xy;\n    v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;\n    v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;\n    v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;\n    v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;\n    v_rgbM = vec2(fragCoord * inverseVP);\n}\n\nvoid main(void) {\n\n   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n   vTextureCoord = aTextureCoord;\n\n   vec2 fragCoord = vTextureCoord * filterArea.xy;\n\n   texcoords(fragCoord, filterArea.xy, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n}",'#define GLSLIFY 1\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nvarying vec2 vTextureCoord;\nuniform sampler2D uSampler;\nuniform vec4 filterArea;\n\n/**\n Basic FXAA implementation based on the code on geeks3d.com with the\n modification that the texture2DLod stuff was removed since it\'s\n unsupported by WebGL.\n \n --\n \n From:\n https://github.com/mitsuhiko/webgl-meincraft\n \n Copyright (c) 2011 by Armin Ronacher.\n \n Some rights reserved.\n \n Redistribution and use in source and binary forms, with or without\n modification, are permitted provided that the following conditions are\n met:\n \n * Redistributions of source code must retain the above copyright\n notice, this list of conditions and the following disclaimer.\n \n * Redistributions in binary form must reproduce the above\n copyright notice, this list of conditions and the following\n disclaimer in the documentation and/or other materials provided\n with the distribution.\n \n * The names of the contributors may not be used to endorse or\n promote products derived from this software without specific\n prior written permission.\n \n THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n#ifndef FXAA_REDUCE_MIN\n#define FXAA_REDUCE_MIN   (1.0/ 128.0)\n#endif\n#ifndef FXAA_REDUCE_MUL\n#define FXAA_REDUCE_MUL   (1.0 / 8.0)\n#endif\n#ifndef FXAA_SPAN_MAX\n#define FXAA_SPAN_MAX     8.0\n#endif\n\n//optimized version for mobile, where dependent\n//texture reads can be a bottleneck\nvec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,\n          vec2 v_rgbNW, vec2 v_rgbNE,\n          vec2 v_rgbSW, vec2 v_rgbSE,\n          vec2 v_rgbM) {\n    vec4 color;\n    mediump vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;\n    vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;\n    vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;\n    vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;\n    vec4 texColor = texture2D(tex, v_rgbM);\n    vec3 rgbM  = texColor.xyz;\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaNW = dot(rgbNW, luma);\n    float lumaNE = dot(rgbNE, luma);\n    float lumaSW = dot(rgbSW, luma);\n    float lumaSE = dot(rgbSE, luma);\n    float lumaM  = dot(rgbM,  luma);\n    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n    \n    mediump vec2 dir;\n    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n    \n    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *\n                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n    \n    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),\n              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),\n                  dir * rcpDirMin)) * inverseVP;\n    \n    vec3 rgbA = 0.5 * (\n                       texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +\n                       texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n    vec3 rgbB = rgbA * 0.5 + 0.25 * (\n                                     texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +\n                                     texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n    \n    float lumaB = dot(rgbB, luma);\n    if ((lumaB < lumaMin) || (lumaB > lumaMax))\n        color = vec4(rgbA, texColor.a);\n    else\n        color = vec4(rgbB, texColor.a);\n    return color;\n}\n\nvoid main() {\n\n  \tvec2 fragCoord = vTextureCoord * filterArea.xy;\n\n  \tvec4 color;\n\n    color = fxaa(uSampler, fragCoord, filterArea.xy, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n\n  \tgl_FragColor = color;\n}\n');
}var n=t("../../core");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i},{"../../core":97}],175:[function(t,e,r){e.exports={FXAAFilter:t("./fxaa/FXAAFilter"),NoiseFilter:t("./noise/NoiseFilter"),DisplacementFilter:t("./displacement/DisplacementFilter"),BlurFilter:t("./blur/BlurFilter"),BlurXFilter:t("./blur/BlurXFilter"),BlurYFilter:t("./blur/BlurYFilter"),ColorMatrixFilter:t("./colormatrix/ColorMatrixFilter"),VoidFilter:t("./void/VoidFilter")}},{"./blur/BlurFilter":166,"./blur/BlurXFilter":167,"./blur/BlurYFilter":168,"./colormatrix/ColorMatrixFilter":172,"./displacement/DisplacementFilter":173,"./fxaa/FXAAFilter":174,"./noise/NoiseFilter":176,"./void/VoidFilter":177}],176:[function(t,e,r){function i(){n.Filter.call(this,"#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}","precision highp float;\n#define GLSLIFY 1\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\n\nuniform float noise;\nuniform sampler2D uSampler;\n\nfloat rand(vec2 co)\n{\n    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);\n}\n\nvoid main()\n{\n    vec4 color = texture2D(uSampler, vTextureCoord);\n\n    float diff = (rand(gl_FragCoord.xy) - 0.5) * noise;\n\n    color.r += diff;\n    color.g += diff;\n    color.b += diff;\n\n    gl_FragColor = color;\n}\n"),this.noise=.5}var n=t("../../core");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{noise:{get:function(){return this.uniforms.noise},set:function(t){this.uniforms.noise=t}}})},{"../../core":97}],177:[function(t,e,r){function i(){n.Filter.call(this,"#define GLSLIFY 1\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}","#define GLSLIFY 1\nvarying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\n\nvoid main(void)\n{\n   gl_FragColor = texture2D(uSampler, vTextureCoord);\n}\n"),this.glShaderKey="void"}var n=t("../../core");i.prototype=Object.create(n.Filter.prototype),i.prototype.constructor=i,e.exports=i},{"../../core":97}],178:[function(t,e,r){function i(){this.global=new n.Point,this.target=null,this.originalEvent=null}var n=t("../core");i.prototype.constructor=i,e.exports=i,i.prototype.getLocalPosition=function(t,e,r){return t.worldTransform.applyInverse(r||this.global,e)}},{"../core":97}],179:[function(t,e,r){function i(t,e){o.call(this),e=e||{},this.renderer=t,this.autoPreventDefault=void 0===e.autoPreventDefault||e.autoPreventDefault,this.interactionFrequency=e.interactionFrequency||10,this.mouse=new s,this.mouse.global.set(-999999),this.eventData={stopped:!1,target:null,type:null,data:this.mouse,stopPropagation:function(){this.stopped=!0}},this.interactiveDataPool=[],this.interactionDOMElement=null,this.moveWhenInside=!1,this.eventsAdded=!1,this.onMouseUp=this.onMouseUp.bind(this),this.processMouseUp=this.processMouseUp.bind(this),this.onMouseDown=this.onMouseDown.bind(this),this.processMouseDown=this.processMouseDown.bind(this),this.onMouseMove=this.onMouseMove.bind(this),this.processMouseMove=this.processMouseMove.bind(this),this.onMouseOut=this.onMouseOut.bind(this),this.processMouseOverOut=this.processMouseOverOut.bind(this),this.onMouseOver=this.onMouseOver.bind(this),this.onTouchStart=this.onTouchStart.bind(this),this.processTouchStart=this.processTouchStart.bind(this),this.onTouchEnd=this.onTouchEnd.bind(this),this.processTouchEnd=this.processTouchEnd.bind(this),this.onTouchMove=this.onTouchMove.bind(this),this.processTouchMove=this.processTouchMove.bind(this),this.defaultCursorStyle="inherit",this.currentCursorStyle="inherit",this._tempPoint=new n.Point,this.resolution=1,this.setTargetElement(this.renderer.view,this.renderer.resolution)}var n=t("../core"),s=t("./InteractionData"),o=t("eventemitter3");Object.assign(n.DisplayObject.prototype,t("./interactiveTarget")),i.prototype=Object.create(o.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.setTargetElement=function(t,e){this.removeEvents(),this.interactionDOMElement=t,this.resolution=e||1,this.addEvents()},i.prototype.addEvents=function(){this.interactionDOMElement&&(n.ticker.shared.add(this.update,this),window.navigator.msPointerEnabled&&(this.interactionDOMElement.style["-ms-content-zooming"]="none",this.interactionDOMElement.style["-ms-touch-action"]="none"),window.document.addEventListener("mousemove",this.onMouseMove,!0),this.interactionDOMElement.addEventListener("mousedown",this.onMouseDown,!0),this.interactionDOMElement.addEventListener("mouseout",this.onMouseOut,!0),this.interactionDOMElement.addEventListener("mouseover",this.onMouseOver,!0),this.interactionDOMElement.addEventListener("touchstart",this.onTouchStart,!0),this.interactionDOMElement.addEventListener("touchend",this.onTouchEnd,!0),this.interactionDOMElement.addEventListener("touchmove",this.onTouchMove,!0),window.addEventListener("mouseup",this.onMouseUp,!0),this.eventsAdded=!0)},i.prototype.removeEvents=function(){this.interactionDOMElement&&(n.ticker.shared.remove(this.update),window.navigator.msPointerEnabled&&(this.interactionDOMElement.style["-ms-content-zooming"]="",this.interactionDOMElement.style["-ms-touch-action"]=""),window.document.removeEventListener("mousemove",this.onMouseMove,!0),this.interactionDOMElement.removeEventListener("mousedown",this.onMouseDown,!0),this.interactionDOMElement.removeEventListener("mouseout",this.onMouseOut,!0),this.interactionDOMElement.removeEventListener("mouseover",this.onMouseOver,!0),this.interactionDOMElement.removeEventListener("touchstart",this.onTouchStart,!0),this.interactionDOMElement.removeEventListener("touchend",this.onTouchEnd,!0),this.interactionDOMElement.removeEventListener("touchmove",this.onTouchMove,!0),this.interactionDOMElement=null,window.removeEventListener("mouseup",this.onMouseUp,!0),this.eventsAdded=!1)},i.prototype.update=function(t){if(this._deltaTime+=t,!(this._deltaTime<this.interactionFrequency)&&(this._deltaTime=0,this.interactionDOMElement)){if(this.didMove)return void(this.didMove=!1);this.cursor=this.defaultCursorStyle,this.processInteractive(this.mouse.global,this.renderer._lastObjectRendered,this.processMouseOverOut,!0),this.currentCursorStyle!==this.cursor&&(this.currentCursorStyle=this.cursor,this.interactionDOMElement.style.cursor=this.cursor)}},i.prototype.dispatchEvent=function(t,e,r){r.stopped||(r.target=t,r.type=e,t.emit(e,r),t[e]&&t[e](r))},i.prototype.mapPositionToPoint=function(t,e,r){var i;i=this.interactionDOMElement.parentElement?this.interactionDOMElement.getBoundingClientRect():{x:0,y:0,width:0,height:0},t.x=(e-i.left)*(this.interactionDOMElement.width/i.width)/this.resolution,t.y=(r-i.top)*(this.interactionDOMElement.height/i.height)/this.resolution},i.prototype.processInteractive=function(t,e,r,i,n){if(!e||!e.visible)return!1;var s=!1,o=n=e.interactive||n;if(e.hitArea&&(o=!1),i&&e._mask&&(e._mask.containsPoint(t)||(i=!1)),i&&e.filterArea&&(e.filterArea.contains(t.x,t.y)||(i=!1)),e.interactiveChildren)for(var a=e.children,h=a.length-1;h>=0;h--){var u=a[h];if(this.processInteractive(t,u,r,i,o)){if(!u.parent)continue;s=!0,o=!1,i=!1}}return n&&(i&&!s&&(e.hitArea?(e.worldTransform.applyInverse(t,this._tempPoint),s=e.hitArea.contains(this._tempPoint.x,this._tempPoint.y)):e.containsPoint&&(s=e.containsPoint(t))),e.interactive&&r(e,s)),s},i.prototype.onMouseDown=function(t){this.mouse.originalEvent=t,this.eventData.data=this.mouse,this.eventData.stopped=!1,this.mapPositionToPoint(this.mouse.global,t.clientX,t.clientY),this.autoPreventDefault&&this.mouse.originalEvent.preventDefault(),this.processInteractive(this.mouse.global,this.renderer._lastObjectRendered,this.processMouseDown,!0);var e=2===t.button||3===t.which;this.emit(e?"rightdown":"mousedown",this.eventData)},i.prototype.processMouseDown=function(t,e){var r=this.mouse.originalEvent,i=2===r.button||3===r.which;e&&(t[i?"_isRightDown":"_isLeftDown"]=!0,this.dispatchEvent(t,i?"rightdown":"mousedown",this.eventData))},i.prototype.onMouseUp=function(t){this.mouse.originalEvent=t,this.eventData.data=this.mouse,this.eventData.stopped=!1,this.mapPositionToPoint(this.mouse.global,t.clientX,t.clientY),this.processInteractive(this.mouse.global,this.renderer._lastObjectRendered,this.processMouseUp,!0);var e=2===t.button||3===t.which;this.emit(e?"rightup":"mouseup",this.eventData)},i.prototype.processMouseUp=function(t,e){var r=this.mouse.originalEvent,i=2===r.button||3===r.which,n=i?"_isRightDown":"_isLeftDown";e?(this.dispatchEvent(t,i?"rightup":"mouseup",this.eventData),t[n]&&(t[n]=!1,this.dispatchEvent(t,i?"rightclick":"click",this.eventData))):t[n]&&(t[n]=!1,this.dispatchEvent(t,i?"rightupoutside":"mouseupoutside",this.eventData))},i.prototype.onMouseMove=function(t){this.mouse.originalEvent=t,this.eventData.data=this.mouse,this.eventData.stopped=!1,this.mapPositionToPoint(this.mouse.global,t.clientX,t.clientY),this.didMove=!0,this.cursor=this.defaultCursorStyle,this.processInteractive(this.mouse.global,this.renderer._lastObjectRendered,this.processMouseMove,!0),this.emit("mousemove",this.eventData),this.currentCursorStyle!==this.cursor&&(this.currentCursorStyle=this.cursor,this.interactionDOMElement.style.cursor=this.cursor)},i.prototype.processMouseMove=function(t,e){this.processMouseOverOut(t,e),this.moveWhenInside&&!e||this.dispatchEvent(t,"mousemove",this.eventData)},i.prototype.onMouseOut=function(t){this.mouse.originalEvent=t,this.eventData.data=this.mouse,this.eventData.stopped=!1,this.mapPositionToPoint(this.mouse.global,t.clientX,t.clientY),this.interactionDOMElement.style.cursor=this.defaultCursorStyle,this.mapPositionToPoint(this.mouse.global,t.clientX,t.clientY),this.processInteractive(this.mouse.global,this.renderer._lastObjectRendered,this.processMouseOverOut,!1),this.emit("mouseout",this.eventData)},i.prototype.processMouseOverOut=function(t,e){e?(t._over||(t._over=!0,this.dispatchEvent(t,"mouseover",this.eventData)),t.buttonMode&&(this.cursor=t.defaultCursor)):t._over&&(t._over=!1,this.dispatchEvent(t,"mouseout",this.eventData))},i.prototype.onMouseOver=function(t){this.mouse.originalEvent=t,this.eventData.data=this.mouse,this.eventData.stopped=!1,this.emit("mouseover",this.eventData)},i.prototype.onTouchStart=function(t){this.autoPreventDefault&&t.preventDefault();for(var e=t.changedTouches,r=e.length,i=0;i<r;i++){var n=e[i],s=this.getTouchData(n);s.originalEvent=t,this.eventData.data=s,this.eventData.stopped=!1,this.processInteractive(s.global,this.renderer._lastObjectRendered,this.processTouchStart,!0),this.emit("touchstart",this.eventData),this.returnTouchData(s)}},i.prototype.processTouchStart=function(t,e){e&&(t._touchDown=!0,this.dispatchEvent(t,"touchstart",this.eventData))},i.prototype.onTouchEnd=function(t){this.autoPreventDefault&&t.preventDefault();for(var e=t.changedTouches,r=e.length,i=0;i<r;i++){var n=e[i],s=this.getTouchData(n);s.originalEvent=t,this.eventData.data=s,this.eventData.stopped=!1,this.processInteractive(s.global,this.renderer._lastObjectRendered,this.processTouchEnd,!0),this.emit("touchend",this.eventData),this.returnTouchData(s)}},i.prototype.processTouchEnd=function(t,e){e?(this.dispatchEvent(t,"touchend",this.eventData),t._touchDown&&(t._touchDown=!1,this.dispatchEvent(t,"tap",this.eventData))):t._touchDown&&(t._touchDown=!1,this.dispatchEvent(t,"touchendoutside",this.eventData))},i.prototype.onTouchMove=function(t){this.autoPreventDefault&&t.preventDefault();for(var e=t.changedTouches,r=e.length,i=0;i<r;i++){var n=e[i],s=this.getTouchData(n);s.originalEvent=t,this.eventData.data=s,this.eventData.stopped=!1,this.processInteractive(s.global,this.renderer._lastObjectRendered,this.processTouchMove,this.moveWhenInside),this.emit("touchmove",this.eventData),this.returnTouchData(s)}},i.prototype.processTouchMove=function(t,e){this.moveWhenInside&&!e||this.dispatchEvent(t,"touchmove",this.eventData)},i.prototype.getTouchData=function(t){var e=this.interactiveDataPool.pop();return e||(e=new s),e.identifier=t.identifier,this.mapPositionToPoint(e.global,t.clientX,t.clientY),navigator.isCocoonJS&&(e.global.x=e.global.x/this.resolution,e.global.y=e.global.y/this.resolution),t.globalX=e.global.x,t.globalY=e.global.y,e},i.prototype.returnTouchData=function(t){this.interactiveDataPool.push(t)},i.prototype.destroy=function(){this.removeEvents(),this.removeAllListeners(),this.renderer=null,this.mouse=null,this.eventData=null,this.interactiveDataPool=null,this.interactionDOMElement=null,this.onMouseUp=null,this.processMouseUp=null,this.onMouseDown=null,this.processMouseDown=null,this.onMouseMove=null,this.processMouseMove=null,this.onMouseOut=null,this.processMouseOverOut=null,this.onMouseOver=null,this.onTouchStart=null,this.processTouchStart=null,this.onTouchEnd=null,this.processTouchEnd=null,this.onTouchMove=null,this.processTouchMove=null,this._tempPoint=null},n.WebGLRenderer.registerPlugin("interaction",i),n.CanvasRenderer.registerPlugin("interaction",i)},{"../core":97,"./InteractionData":178,"./interactiveTarget":181,eventemitter3:32}],180:[function(t,e,r){e.exports={InteractionData:t("./InteractionData"),InteractionManager:t("./InteractionManager"),interactiveTarget:t("./interactiveTarget")}},{"./InteractionData":178,"./InteractionManager":179,"./interactiveTarget":181}],181:[function(t,e,r){var i={interactive:!1,interactiveChildren:!0,hitArea:null,buttonMode:!1,defaultCursor:"pointer",_over:!1,_isLeftDown:!1,_isRightDown:!1,_touchDown:!1};e.exports=i},{}],182:[function(t,e,r){function i(t,e){var r={},i=t.data.getElementsByTagName("info")[0],n=t.data.getElementsByTagName("common")[0];r.font=i.getAttribute("face"),r.size=parseInt(i.getAttribute("size"),10),r.lineHeight=parseInt(n.getAttribute("lineHeight"),10),r.chars={};for(var a=t.data.getElementsByTagName("char"),h=0;h<a.length;h++){var u=parseInt(a[h].getAttribute("id"),10),l=new s.Rectangle(parseInt(a[h].getAttribute("x"),10)+e.frame.x,parseInt(a[h].getAttribute("y"),10)+e.frame.y,parseInt(a[h].getAttribute("width"),10),parseInt(a[h].getAttribute("height"),10));r.chars[u]={xOffset:parseInt(a[h].getAttribute("xoffset"),10),yOffset:parseInt(a[h].getAttribute("yoffset"),10),xAdvance:parseInt(a[h].getAttribute("xadvance"),10),kerning:{},texture:new s.Texture(e.baseTexture,l)}}var c=t.data.getElementsByTagName("kerning");for(h=0;h<c.length;h++){var d=parseInt(c[h].getAttribute("first"),10),p=parseInt(c[h].getAttribute("second"),10),f=parseInt(c[h].getAttribute("amount"),10);r.chars[p]&&(r.chars[p].kerning[d]=f)}t.bitmapFont=r,o.BitmapText.fonts[r.font]=r}var n=t("resource-loader").Resource,s=t("../core"),o=t("../extras"),a=t("path");e.exports=function(){return function(t,e){if(!t.data||!t.isXml)return e();if(0===t.data.getElementsByTagName("page").length||0===t.data.getElementsByTagName("info").length||null===t.data.getElementsByTagName("info")[0].getAttribute("face"))return e();var r=t.isDataUrl?"":a.dirname(t.url);t.isDataUrl&&("."===r&&(r=""),this.baseUrl&&r&&("/"===this.baseUrl.charAt(this.baseUrl.length-1)&&(r+="/"),r=r.replace(this.baseUrl,""))),r&&"/"!==r.charAt(r.length-1)&&(r+="/");var o=r+t.data.getElementsByTagName("page")[0].getAttribute("file");if(s.utils.TextureCache[o])i(t,s.utils.TextureCache[o]),e();else{var h={crossOrigin:t.crossOrigin,loadType:n.LOAD_TYPE.IMAGE,metadata:t.metadata.imageMetadata};this.add(t.name+"_image",o,h,function(r){i(t,r.texture),e()})}}}},{"../core":97,"../extras":164,path:60,"resource-loader":69}],183:[function(t,e,r){e.exports={Loader:t("./loader"),bitmapFontParser:t("./bitmapFontParser"),spritesheetParser:t("./spritesheetParser"),textureParser:t("./textureParser"),Resource:t("resource-loader").Resource}},{"./bitmapFontParser":182,"./loader":184,"./spritesheetParser":185,"./textureParser":186,"resource-loader":69}],184:[function(t,e,r){function i(t,e){n.call(this,t,e);for(var r=0;r<i._pixiMiddleware.length;++r)this.use(i._pixiMiddleware[r]())}var n=t("resource-loader"),s=t("./textureParser"),o=t("./spritesheetParser"),a=t("./bitmapFontParser");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i._pixiMiddleware=[n.middleware.parsing.blob,s,o,a],i.addPixiMiddleware=function(t){i._pixiMiddleware.push(t)};var h=n.Resource;h.setExtensionXhrType("fnt",h.XHR_RESPONSE_TYPE.DOCUMENT)},{"./bitmapFontParser":182,"./spritesheetParser":185,"./textureParser":186,"resource-loader":69}],185:[function(t,e,r){var i=t("resource-loader").Resource,n=t("path"),s=t("../core"),o=1e3;e.exports=function(){return function(t,e){var r,a=t.name+"_image";if(!t.data||!t.isJson||!t.data.frames||this.resources[a])return e();var h={crossOrigin:t.crossOrigin,loadType:i.LOAD_TYPE.IMAGE,metadata:t.metadata.imageMetadata};r=t.isDataUrl?t.data.meta.image:n.dirname(t.url.replace(this.baseUrl,""))+"/"+t.data.meta.image,this.add(a,r,h,function(r){function i(e,i){for(var n=e;n-e<i&&n<l.length;){var o=l[n],a=u[o].frame;if(a){var h=null,d=null,p=new s.Rectangle(0,0,u[o].sourceSize.w/c,u[o].sourceSize.h/c);h=u[o].rotated?new s.Rectangle(a.x/c,a.y/c,a.h/c,a.w/c):new s.Rectangle(a.x/c,a.y/c,a.w/c,a.h/c),u[o].trimmed&&(d=new s.Rectangle(u[o].spriteSourceSize.x/c,u[o].spriteSourceSize.y/c,u[o].spriteSourceSize.w/c,u[o].spriteSourceSize.h/c)),t.textures[o]=new s.Texture(r.texture.baseTexture,h,p,d,u[o].rotated?2:0),s.utils.TextureCache[o]=t.textures[o]}n++}}function n(){return d*o<l.length}function a(t){i(d*o,o),d++,setTimeout(t,0)}function h(){a(function(){n()?h():e()})}t.textures={};var u=t.data.frames,l=Object.keys(u),c=s.utils.getResolutionOfUrl(t.url),d=0;l.length<=o?(i(0,o),e()):h()})}}},{"../core":97,path:60,"resource-loader":69}],186:[function(t,e,r){var i=t("../core");e.exports=function(){return function(t,e){if(t.data&&t.isImage){var r=new i.BaseTexture(t.data,null,i.utils.getResolutionOfUrl(t.url));r.imageUrl=t.url,t.texture=new i.Texture(r),i.utils.BaseTextureCache[t.url]=r,i.utils.TextureCache[t.url]=t.texture}e()}}},{"../core":97}],187:[function(t,e,r){function i(t,e,r,s,o){n.Container.call(this),this._texture=null,this.uvs=r||new Float32Array([0,0,1,0,1,1,0,1]),this.vertices=e||new Float32Array([0,0,100,0,100,100,0,100]),this.indices=s||new Uint16Array([0,1,3,2]),this.dirty=0,this.indexDirty=0,this.blendMode=n.BLEND_MODES.NORMAL,this.canvasPadding=0,this.drawMode=o||i.DRAW_MODES.TRIANGLE_MESH,this.texture=t,this.shader=null,this.tintRgb=new Float32Array([1,1,1]),this._glDatas=[]}var n=t("../core"),s=t("pixi-gl-core"),o=t("./webgl/MeshShader"),a=new n.Point,h=new n.Polygon;i.prototype=Object.create(n.Container.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{texture:{get:function(){return this._texture},set:function(t){this._texture!==t&&(this._texture=t,t&&(t.baseTexture.hasLoaded?this._onTextureUpdate():t.once("update",this._onTextureUpdate,this)))}},tint:{get:function(){return n.utils.rgb2hex(this.tintRgb)},set:function(t){this.tintRgb=n.utils.hex2rgb(t,this.tintRgb)}}}),i.prototype._renderWebGL=function(t){t.flush();var e=t.gl,r=this._glDatas[t.CONTEXT_UID];r||(r={shader:new o(e),vertexBuffer:s.GLBuffer.createVertexBuffer(e,this.vertices,e.STREAM_DRAW),uvBuffer:s.GLBuffer.createVertexBuffer(e,this.uvs,e.STREAM_DRAW),indexBuffer:s.GLBuffer.createIndexBuffer(e,this.indices,e.STATIC_DRAW),vao:new s.VertexArrayObject(e),dirty:this.dirty,indexDirty:this.indexDirty},r.vao=new s.VertexArrayObject(e).addIndex(r.indexBuffer).addAttribute(r.vertexBuffer,r.shader.attributes.aVertexPosition,e.FLOAT,!1,8,0).addAttribute(r.uvBuffer,r.shader.attributes.aTextureCoord,e.FLOAT,!1,8,0),this._glDatas[t.CONTEXT_UID]=r),this.dirty!==r.dirty&&(r.dirty=this.dirty,r.uvBuffer.upload()),this.indexDirty!==r.indexDirty&&(r.indexDirty=this.indexDirty,r.indexBuffer.upload()),r.vertexBuffer.upload(),t.bindShader(r.shader),t.bindTexture(this._texture,0),t.state.setBlendMode(this.blendMode),r.shader.uniforms.translationMatrix=this.worldTransform.toArray(!0),r.shader.uniforms.alpha=this.worldAlpha,r.shader.uniforms.tint=this.tintRgb;var n=this.drawMode===i.DRAW_MODES.TRIANGLE_MESH?e.TRIANGLE_STRIP:e.TRIANGLES;r.vao.bind().draw(n,this.indices.length).unbind()},i.prototype._renderCanvas=function(t){var e=t.context,r=this.worldTransform,n=t.resolution;t.roundPixels?e.setTransform(r.a*n,r.b*n,r.c*n,r.d*n,r.tx*n|0,r.ty*n|0):e.setTransform(r.a*n,r.b*n,r.c*n,r.d*n,r.tx*n,r.ty*n),this.drawMode===i.DRAW_MODES.TRIANGLE_MESH?this._renderCanvasTriangleMesh(e):this._renderCanvasTriangles(e)},i.prototype._renderCanvasTriangleMesh=function(t){for(var e=this.vertices,r=this.uvs,i=e.length/2,n=0;n<i-2;n++){var s=2*n;this._renderCanvasDrawTriangle(t,e,r,s,s+2,s+4)}},i.prototype._renderCanvasTriangles=function(t){for(var e=this.vertices,r=this.uvs,i=this.indices,n=i.length,s=0;s<n;s+=3){var o=2*i[s],a=2*i[s+1],h=2*i[s+2];this._renderCanvasDrawTriangle(t,e,r,o,a,h)}},i.prototype._renderCanvasDrawTriangle=function(t,e,r,i,n,s){var o=this._texture.baseTexture,a=o.source,h=o.width,u=o.height,l=e[i],c=e[n],d=e[s],p=e[i+1],f=e[n+1],v=e[s+1],g=r[i]*o.width,y=r[n]*o.width,x=r[s]*o.width,m=r[i+1]*o.height,_=r[n+1]*o.height,b=r[s+1]*o.height;if(this.canvasPadding>0){var T=this.canvasPadding/this.worldTransform.a,E=this.canvasPadding/this.worldTransform.d,w=(l+c+d)/3,S=(p+f+v)/3,C=l-w,M=p-S,R=Math.sqrt(C*C+M*M);l=w+C/R*(R+T),p=S+M/R*(R+E),C=c-w,M=f-S,R=Math.sqrt(C*C+M*M),c=w+C/R*(R+T),f=S+M/R*(R+E),C=d-w,M=v-S,R=Math.sqrt(C*C+M*M),d=w+C/R*(R+T),v=S+M/R*(R+E)}t.save(),t.beginPath(),t.moveTo(l,p),t.lineTo(c,f),t.lineTo(d,v),t.closePath(),t.clip();var A=g*_+m*x+y*b-_*x-m*y-g*b,O=l*_+m*d+c*b-_*d-m*c-l*b,D=g*c+l*x+y*d-c*x-l*y-g*d,P=g*_*d+m*c*x+l*y*b-l*_*x-m*y*d-g*c*b,I=p*_+m*v+f*b-_*v-m*f-p*b,L=g*f+p*x+y*v-f*x-p*y-g*v,F=g*_*v+m*f*x+p*y*b-p*_*x-m*y*v-g*f*b;t.transform(O/A,I/A,D/A,L/A,P/A,F/A),t.drawImage(a,0,0,h*o.resolution,u*o.resolution,0,0,h,u),t.restore()},i.prototype.renderMeshFlat=function(t){var e=this.context,r=t.vertices,i=r.length/2;e.beginPath();for(var n=1;n<i-2;n++){var s=2*n,o=r[s],a=r[s+2],h=r[s+4],u=r[s+1],l=r[s+3],c=r[s+5];e.moveTo(o,u),e.lineTo(a,l),e.lineTo(h,c)}e.fillStyle="#FF0000",e.fill(),e.closePath()},i.prototype._onTextureUpdate=function(){},i.prototype._calculateBounds=function(){this._bounds.addVertices(this.transform,this.vertices,0,this.vertices.length)},i.prototype.containsPoint=function(t){if(!this.getBounds().contains(t.x,t.y))return!1;this.worldTransform.applyInverse(t,a);for(var e=this.vertices,r=h.points,n=this.indices,s=this.indices.length,o=this.drawMode===i.DRAW_MODES.TRIANGLES?3:1,u=0;u+2<s;u+=o){var l=2*n[u],c=2*n[u+1],d=2*n[u+2];if(r[0]=e[l],r[1]=e[l+1],r[2]=e[c],r[3]=e[c+1],r[4]=e[d],r[5]=e[d+1],h.contains(a.x,a.y))return!0}return!1},i.DRAW_MODES={TRIANGLE_MESH:0,TRIANGLES:1}},{"../core":97,"./webgl/MeshShader":192,"pixi-gl-core":7}],188:[function(t,e,r){function i(t,e,r,i,o){s.call(this,t,4,4);var a=this.uvs;a[6]=a[14]=a[22]=a[30]=1,a[25]=a[27]=a[29]=a[31]=1,this._origWidth=t.width,this._origHeight=t.height,this._uvw=1/this._origWidth,this._uvh=1/this._origHeight,this.width=t.width,this.height=t.height,a[2]=a[10]=a[18]=a[26]=this._uvw*e,a[4]=a[12]=a[20]=a[28]=1-this._uvw*i,a[9]=a[11]=a[13]=a[15]=this._uvh*r,a[17]=a[19]=a[21]=a[23]=1-this._uvh*o,this.leftWidth="undefined"!=typeof e?e:n,this.rightWidth="undefined"!=typeof i?i:n,this.topHeight="undefined"!=typeof r?r:n,this.bottomHeight="undefined"!=typeof o?o:n}var n=10,s=t("./Plane");i.prototype=Object.create(s.prototype),i.prototype.constructor=i,e.exports=i,Object.defineProperties(i.prototype,{width:{get:function(){return this._width},set:function(t){this._width=t,this.updateVerticalVertices()}},height:{get:function(){return this._height},set:function(t){this._height=t,this.updateHorizontalVertices()}},leftWidth:{get:function(){return this._leftWidth},set:function(t){this._leftWidth=t;var e=this.uvs,r=this.vertices;e[2]=e[10]=e[18]=e[26]=this._uvw*t,r[2]=r[10]=r[18]=r[26]=t,this.dirty=!0}},rightWidth:{get:function(){return this._rightWidth},set:function(t){this._rightWidth=t;var e=this.uvs,r=this.vertices;e[4]=e[12]=e[20]=e[28]=1-this._uvw*t,r[4]=r[12]=r[20]=r[28]=this._width-t,this.dirty=!0}},topHeight:{get:function(){return this._topHeight},set:function(t){this._topHeight=t;var e=this.uvs,r=this.vertices;e[9]=e[11]=e[13]=e[15]=this._uvh*t,r[9]=r[11]=r[13]=r[15]=t,this.dirty=!0}},bottomHeight:{get:function(){return this._bottomHeight},set:function(t){this._bottomHeight=t;var e=this.uvs,r=this.vertices;e[17]=e[19]=e[21]=e[23]=1-this._uvh*t,r[17]=r[19]=r[21]=r[23]=this._height-t,this.dirty=!0}}}),i.prototype.updateHorizontalVertices=function(){var t=this.vertices;t[9]=t[11]=t[13]=t[15]=this._topHeight,t[17]=t[19]=t[21]=t[23]=this._height-this._bottomHeight,t[25]=t[27]=t[29]=t[31]=this._height},i.prototype.updateVerticalVertices=function(){var t=this.vertices;t[2]=t[10]=t[18]=t[26]=this._leftWidth,t[4]=t[12]=t[20]=t[28]=this._width-this._rightWidth,t[6]=t[14]=t[22]=t[30]=this._width},i.prototype._renderCanvas=function(t){var e=t.context;e.globalAlpha=this.worldAlpha;var r=this.worldTransform,i=t.resolution;t.roundPixels?e.setTransform(r.a*i,r.b*i,r.c*i,r.d*i,r.tx*i|0,r.ty*i|0):e.setTransform(r.a*i,r.b*i,r.c*i,r.d*i,r.tx*i,r.ty*i);var n=this._texture.baseTexture,s=n.source,o=n.width,a=n.height;this.drawSegment(e,s,o,a,0,1,10,11),this.drawSegment(e,s,o,a,2,3,12,13),this.drawSegment(e,s,o,a,4,5,14,15),this.drawSegment(e,s,o,a,8,9,18,19),this.drawSegment(e,s,o,a,10,11,20,21),this.drawSegment(e,s,o,a,12,13,22,23),this.drawSegment(e,s,o,a,16,17,26,27),this.drawSegment(e,s,o,a,18,19,28,29),this.drawSegment(e,s,o,a,20,21,30,31)},i.prototype.drawSegment=function(t,e,r,i,n,s,o,a){var h=this.uvs,u=this.vertices,l=(h[o]-h[n])*r,c=(h[a]-h[s])*i,d=u[o]-u[n],p=u[a]-u[s];l<1&&(l=1),c<1&&(c=1),d<1&&(d=1),p<1&&(p=1),t.drawImage(e,h[n]*r,h[s]*i,l,c,u[n],u[s],d,p)}},{"./Plane":189}],189:[function(t,e,r){function i(t,e,r){n.call(this,t),this._ready=!0,this.verticesX=e||10,this.verticesY=r||10,this.drawMode=n.DRAW_MODES.TRIANGLES,this.refresh()}var n=t("./Mesh");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.refresh=function(){var t=this.verticesX*this.verticesY,e=[],r=[],i=[],n=[],s=this.texture,o=this.verticesX-1,a=this.verticesY-1,h=0,u=s.width/o,l=s.height/a;for(h=0;h<t;h++){var c=h%this.verticesX,d=h/this.verticesX|0;e.push(c*u,d*l),i.push(s._uvs.x0+(s._uvs.x1-s._uvs.x0)*(c/(this.verticesX-1)),s._uvs.y0+(s._uvs.y3-s._uvs.y0)*(d/(this.verticesY-1)))}var p=o*a;for(h=0;h<p;h++){var f=h%o,v=h/o|0,g=v*this.verticesX+f,y=v*this.verticesX+f+1,x=(v+1)*this.verticesX+f,m=(v+1)*this.verticesX+f+1;n.push(g,y,x),n.push(y,m,x)}this.vertices=new Float32Array(e),this.uvs=new Float32Array(i),this.colors=new Float32Array(r),this.indices=new Uint16Array(n),this.indexDirty=!0},i.prototype._onTextureUpdate=function(){n.prototype._onTextureUpdate.call(this),this._ready&&this.refresh()}},{"./Mesh":187}],190:[function(t,e,r){function i(t,e){n.call(this,t),this.points=e,this.vertices=new Float32Array(4*e.length),this.uvs=new Float32Array(4*e.length),this.colors=new Float32Array(2*e.length),this.indices=new Uint16Array(2*e.length),this._ready=!0,this.refresh()}var n=t("./Mesh"),s=t("../core");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.refresh=function(){var t=this.points;if(!(t.length<1)&&this._texture._uvs){var e=this.uvs,r=this.indices,i=this.colors,n=this._texture._uvs,o=new s.Point(n.x0,n.y0),a=new s.Point(n.x2-n.x0,n.y2-n.y0);e[0]=0+o.x,e[1]=0+o.y,e[2]=0+o.x,e[3]=1*a.y+o.y,i[0]=1,i[1]=1,r[0]=0,r[1]=1;for(var h,u,l,c=t.length,d=1;d<c;d++)h=t[d],u=4*d,l=d/(c-1),e[u]=l*a.x+o.x,e[u+1]=0+o.y,e[u+2]=l*a.x+o.x,e[u+3]=1*a.y+o.y,u=2*d,i[u]=1,i[u+1]=1,u=2*d,r[u]=u,r[u+1]=u+1;this.dirty=!0,this.indexDirty=!0}},i.prototype._onTextureUpdate=function(){n.prototype._onTextureUpdate.call(this),this._ready&&this.refresh()},i.prototype.updateTransform=function(){var t=this.points;if(!(t.length<1)){for(var e,r,i,n,s,o,a=t[0],h=0,u=0,l=this.vertices,c=t.length,d=0;d<c;d++)r=t[d],i=4*d,e=d<t.length-1?t[d+1]:r,u=-(e.x-a.x),h=e.y-a.y,n=10*(1-d/(c-1)),n>1&&(n=1),s=Math.sqrt(h*h+u*u),o=this._texture.height/2,h/=s,u/=s,h*=o,u*=o,l[i]=r.x+h,l[i+1]=r.y+u,l[i+2]=r.x-h,l[i+3]=r.y-u,a=r;this.containerUpdateTransform()}}},{"../core":97,"./Mesh":187}],191:[function(t,e,r){e.exports={Mesh:t("./Mesh"),Plane:t("./Plane"),NineSlicePlane:t("./NineSlicePlane"),Rope:t("./Rope"),MeshShader:t("./webgl/MeshShader")}},{"./Mesh":187,"./NineSlicePlane":188,"./Plane":189,"./Rope":190,"./webgl/MeshShader":192}],192:[function(t,e,r){function i(t){n.call(this,t,["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform mat3 translationMatrix;","uniform mat3 projectionMatrix;","varying vec2 vTextureCoord;","void main(void){","   gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);","   vTextureCoord = aTextureCoord;","}"].join("\n"),["varying vec2 vTextureCoord;","uniform float alpha;","uniform vec3 tint;","uniform sampler2D uSampler;","void main(void){","   gl_FragColor = texture2D(uSampler, vTextureCoord) * vec4(tint * alpha, alpha);","}"].join("\n"))}var n=t("../../core/Shader");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i},{"../../core/Shader":77}],193:[function(t,e,r){function i(t,e,r){n.Container.call(this),r=r||15e3,t=t||15e3;var i=16384;r>i&&(r=i),r>t&&(r=t),this._properties=[!1,!0,!1,!1,!1],this._maxSize=t,this._batchSize=r,this._glBuffers=[],this._bufferToUpdate=0,this.interactiveChildren=!1,this.blendMode=n.BLEND_MODES.NORMAL,this.roundPixels=!0,this.baseTexture=null,this.setProperties(e)}var n=t("../core");i.prototype=Object.create(n.Container.prototype),i.prototype.constructor=i,e.exports=i,i.prototype.setProperties=function(t){t&&(this._properties[0]="scale"in t?!!t.scale:this._properties[0],this._properties[1]="position"in t?!!t.position:this._properties[1],this._properties[2]="rotation"in t?!!t.rotation:this._properties[2],this._properties[3]="uvs"in t?!!t.uvs:this._properties[3],this._properties[4]="alpha"in t?!!t.alpha:this._properties[4])},i.prototype.updateTransform=function(){this.displayObjectUpdateTransform()},i.prototype.renderWebGL=function(t){this.visible&&!(this.worldAlpha<=0)&&this.children.length&&this.renderable&&(this.baseTexture||(this.baseTexture=this.children[0]._texture.baseTexture,this.baseTexture.hasLoaded||this.baseTexture.once("update",function(){this.onChildrenChange(0)},this)),t.setObjectRenderer(t.plugins.particle),t.plugins.particle.render(this))},i.prototype.onChildrenChange=function(t){var e=Math.floor(t/this._batchSize);e<this._bufferToUpdate&&(this._bufferToUpdate=e)},i.prototype.renderCanvas=function(t){if(this.visible&&!(this.worldAlpha<=0)&&this.children.length&&this.renderable){var e=t.context,r=this.worldTransform,i=!0,n=0,s=0,o=0,a=0,h=t.blendModes[this.blendMode];h!==e.globalCompositeOperation&&(e.globalCompositeOperation=h),e.globalAlpha=this.worldAlpha,this.displayObjectUpdateTransform();for(var u=0;u<this.children.length;++u){var l=this.children[u];if(l.visible){var c=l.texture.frame;if(e.globalAlpha=this.worldAlpha*l.alpha,l.rotation%(2*Math.PI)===0)i&&(e.setTransform(r.a,r.b,r.c,r.d,r.tx*t.resolution,r.ty*t.resolution),i=!1),n=l.anchor.x*(-c.width*l.scale.x)+l.position.x+.5,s=l.anchor.y*(-c.height*l.scale.y)+l.position.y+.5,o=c.width*l.scale.x,a=c.height*l.scale.y;else{i||(i=!0),l.displayObjectUpdateTransform();var d=l.worldTransform;t.roundPixels?e.setTransform(d.a,d.b,d.c,d.d,d.tx*t.resolution|0,d.ty*t.resolution|0):e.setTransform(d.a,d.b,d.c,d.d,d.tx*t.resolution,d.ty*t.resolution),n=l.anchor.x*-c.width+.5,s=l.anchor.y*-c.height+.5,o=c.width,a=c.height;
}var p=l.texture.baseTexture.resolution;e.drawImage(l.texture.baseTexture.source,c.x*p,c.y*p,c.width*p,c.height*p,n*p,s*p,o*p,a*p)}}}},i.prototype.destroy=function(){if(n.Container.prototype.destroy.apply(this,arguments),this._buffers)for(var t=0;t<this._buffers.length;++t)this._buffers[t].destroy();this._properties=null,this._buffers=null}},{"../core":97}],194:[function(t,e,r){e.exports={ParticleContainer:t("./ParticleContainer"),ParticleRenderer:t("./webgl/ParticleRenderer")}},{"./ParticleContainer":193,"./webgl/ParticleRenderer":196}],195:[function(t,e,r){function i(t,e,r,i){this.gl=t,this.vertSize=2,this.vertByteSize=4*this.vertSize,this.size=i,this.dynamicProperties=[],this.staticProperties=[];for(var n=0;n<e.length;n++){var s=e[n];s={attribute:s.attribute,size:s.size,uploadFunction:s.uploadFunction,offset:s.offset},r[n]?this.dynamicProperties.push(s):this.staticProperties.push(s)}this.staticStride=0,this.staticBuffer=null,this.staticData=null,this.dynamicStride=0,this.dynamicBuffer=null,this.dynamicData=null,this.initBuffers()}var n=t("pixi-gl-core"),s=t("../../core/utils/createIndicesForQuads");i.prototype.constructor=i,e.exports=i,i.prototype.initBuffers=function(){var t,e,r=this.gl,i=0;for(this.indices=s(this.size),this.indexBuffer=n.GLBuffer.createIndexBuffer(r,this.indices,r.STATIC_DRAW),this.dynamicStride=0,t=0;t<this.dynamicProperties.length;t++)e=this.dynamicProperties[t],e.offset=i,i+=e.size,this.dynamicStride+=e.size;this.dynamicData=new Float32Array(this.size*this.dynamicStride*4),this.dynamicBuffer=n.GLBuffer.createVertexBuffer(r,this.dynamicData,r.STREAM_DRAW);var o=0;for(this.staticStride=0,t=0;t<this.staticProperties.length;t++)e=this.staticProperties[t],e.offset=o,o+=e.size,this.staticStride+=e.size;for(this.staticData=new Float32Array(this.size*this.staticStride*4),this.staticBuffer=n.GLBuffer.createVertexBuffer(r,this.staticData,r.STATIC_DRAW),this.vao=new n.VertexArrayObject(r).addIndex(this.indexBuffer),t=0;t<this.dynamicProperties.length;t++)e=this.dynamicProperties[t],this.vao.addAttribute(this.dynamicBuffer,e.attribute,r.FLOAT,!1,4*this.dynamicStride,4*e.offset);for(t=0;t<this.staticProperties.length;t++)e=this.staticProperties[t],this.vao.addAttribute(this.staticBuffer,e.attribute,r.FLOAT,!1,4*this.staticStride,4*e.offset)},i.prototype.uploadDynamic=function(t,e,r){for(var i=0;i<this.dynamicProperties.length;i++){var n=this.dynamicProperties[i];n.uploadFunction(t,e,r,this.dynamicData,this.dynamicStride,n.offset)}this.dynamicBuffer.upload()},i.prototype.uploadStatic=function(t,e,r){for(var i=0;i<this.staticProperties.length;i++){var n=this.staticProperties[i];n.uploadFunction(t,e,r,this.staticData,this.staticStride,n.offset)}this.staticBuffer.upload()},i.prototype.bind=function(){this.vao.bind()},i.prototype.destroy=function(){this.dynamicProperties=null,this.dynamicData=null,this.dynamicBuffer.destroy(),this.staticProperties=null,this.staticData=null,this.staticBuffer.destroy()}},{"../../core/utils/createIndicesForQuads":149,"pixi-gl-core":7}],196:[function(t,e,r){function i(t){n.ObjectRenderer.call(this,t),this.shader=null,this.indexBuffer=null,this.properties=null,this.tempMatrix=new n.Matrix,this.CONTEXT_UID=0}var n=t("../../core"),s=t("./ParticleShader"),o=t("./ParticleBuffer");i.prototype=Object.create(n.ObjectRenderer.prototype),i.prototype.constructor=i,e.exports=i,n.WebGLRenderer.registerPlugin("particle",i),i.prototype.onContextChange=function(){var t=this.renderer.gl;this.CONTEXT_UID=this.renderer.CONTEXT_UID,this.shader=new s(t),this.properties=[{attribute:this.shader.attributes.aVertexPosition,size:2,uploadFunction:this.uploadVertices,offset:0},{attribute:this.shader.attributes.aPositionCoord,size:2,uploadFunction:this.uploadPosition,offset:0},{attribute:this.shader.attributes.aRotation,size:1,uploadFunction:this.uploadRotation,offset:0},{attribute:this.shader.attributes.aTextureCoord,size:2,uploadFunction:this.uploadUvs,offset:0},{attribute:this.shader.attributes.aColor,size:1,uploadFunction:this.uploadAlpha,offset:0}]},i.prototype.start=function(){this.renderer.bindShader(this.shader)},i.prototype.render=function(t){var e=t.children,r=e.length,i=t._maxSize,n=t._batchSize;if(0!==r){r>i&&(r=i);var s=t._glBuffers[this.renderer.CONTEXT_UID];s||(s=t._glBuffers[this.renderer.CONTEXT_UID]=this.generateBuffers(t)),this.renderer.setBlendMode(t.blendMode);var o=this.renderer.gl,a=t.worldTransform.copy(this.tempMatrix);a.prepend(this.renderer._activeRenderTarget.projectionMatrix),this.shader.uniforms.projectionMatrix=a.toArray(!0),this.shader.uniforms.uAlpha=t.worldAlpha;var h=e[0]._texture.baseTexture;this.renderer.bindTexture(h);for(var u=0,l=0;u<r;u+=n,l+=1){var c=r-u;c>n&&(c=n);var d=s[l];d.uploadDynamic(e,u,c),t._bufferToUpdate===l&&(d.uploadStatic(e,u,c),t._bufferToUpdate=l+1),d.vao.bind().draw(o.TRIANGLES,6*c).unbind()}}},i.prototype.generateBuffers=function(t){var e,r=this.renderer.gl,i=[],n=t._maxSize,s=t._batchSize,a=t._properties;for(e=0;e<n;e+=s)i.push(new o(r,this.properties,a,s));return i},i.prototype.uploadVertices=function(t,e,r,i,n,s){for(var o,a,h,u,l,c,d,p,f,v,g=0;g<r;g++)o=t[e+g],a=o._texture,l=o.scale.x,c=o.scale.y,h=a.trim,u=a.orig,h?(p=h.x-o.anchor.x*u.width,d=p+h.width,v=h.y-o.anchor.y*u.height,f=v+h.height):(d=u.width*(1-o.anchor.x),p=u.width*-o.anchor.x,f=u.height*(1-o.anchor.y),v=u.height*-o.anchor.y),i[s]=p*l,i[s+1]=v*c,i[s+n]=d*l,i[s+n+1]=v*c,i[s+2*n]=d*l,i[s+2*n+1]=f*c,i[s+3*n]=p*l,i[s+3*n+1]=f*c,s+=4*n},i.prototype.uploadPosition=function(t,e,r,i,n,s){for(var o=0;o<r;o++){var a=t[e+o].position;i[s]=a.x,i[s+1]=a.y,i[s+n]=a.x,i[s+n+1]=a.y,i[s+2*n]=a.x,i[s+2*n+1]=a.y,i[s+3*n]=a.x,i[s+3*n+1]=a.y,s+=4*n}},i.prototype.uploadRotation=function(t,e,r,i,n,s){for(var o=0;o<r;o++){var a=t[e+o].rotation;i[s]=a,i[s+n]=a,i[s+2*n]=a,i[s+3*n]=a,s+=4*n}},i.prototype.uploadUvs=function(t,e,r,i,n,s){for(var o=0;o<r;o++){var a=t[e+o]._texture._uvs;a?(i[s]=a.x0,i[s+1]=a.y0,i[s+n]=a.x1,i[s+n+1]=a.y1,i[s+2*n]=a.x2,i[s+2*n+1]=a.y2,i[s+3*n]=a.x3,i[s+3*n+1]=a.y3,s+=4*n):(i[s]=0,i[s+1]=0,i[s+n]=0,i[s+n+1]=0,i[s+2*n]=0,i[s+2*n+1]=0,i[s+3*n]=0,i[s+3*n+1]=0,s+=4*n)}},i.prototype.uploadAlpha=function(t,e,r,i,n,s){for(var o=0;o<r;o++){var a=t[e+o].alpha;i[s]=a,i[s+n]=a,i[s+2*n]=a,i[s+3*n]=a,s+=4*n}},i.prototype.destroy=function(){this.renderer.gl&&this.renderer.gl.deleteBuffer(this.indexBuffer),n.ObjectRenderer.prototype.destroy.apply(this,arguments),this.shader.destroy(),this.indices=null,this.tempMatrix=null}},{"../../core":97,"./ParticleBuffer":195,"./ParticleShader":197}],197:[function(t,e,r){function i(t){n.call(this,t,["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","attribute float aColor;","attribute vec2 aPositionCoord;","attribute vec2 aScale;","attribute float aRotation;","uniform mat3 projectionMatrix;","varying vec2 vTextureCoord;","varying float vColor;","void main(void){","   vec2 v = aVertexPosition;","   v.x = (aVertexPosition.x) * cos(aRotation) - (aVertexPosition.y) * sin(aRotation);","   v.y = (aVertexPosition.x) * sin(aRotation) + (aVertexPosition.y) * cos(aRotation);","   v = v + aPositionCoord;","   gl_Position = vec4((projectionMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);","   vTextureCoord = aTextureCoord;","   vColor = aColor;","}"].join("\n"),["varying vec2 vTextureCoord;","varying float vColor;","uniform sampler2D uSampler;","uniform float uAlpha;","void main(void){","  vec4 color = texture2D(uSampler, vTextureCoord) * vColor * uAlpha;","  if (color.a == 0.0) discard;","  gl_FragColor = color;","}"].join("\n"))}var n=t("../../core/Shader");i.prototype=Object.create(n.prototype),i.prototype.constructor=i,e.exports=i},{"../../core/Shader":77}],198:[function(t,e,r){Math.sign||(Math.sign=function(t){return t=+t,0===t||isNaN(t)?t:t>0?1:-1})},{}],199:[function(t,e,r){Object.assign||(Object.assign=t("object-assign"))},{"object-assign":59}],200:[function(t,e,r){t("./Object.assign"),t("./requestAnimationFrame"),t("./Math.sign"),window.ArrayBuffer||(window.ArrayBuffer=Array),window.Float32Array||(window.Float32Array=Array),window.Uint32Array||(window.Uint32Array=Array),window.Uint16Array||(window.Uint16Array=Array)},{"./Math.sign":198,"./Object.assign":199,"./requestAnimationFrame":201}],201:[function(t,e,r){(function(t){if(Date.now&&Date.prototype.getTime||(Date.now=function(){return(new Date).getTime()}),!t.performance||!t.performance.now){var e=Date.now();t.performance||(t.performance={}),t.performance.now=function(){return Date.now()-e}}for(var r=Date.now(),i=["ms","moz","webkit","o"],n=0;n<i.length&&!t.requestAnimationFrame;++n)t.requestAnimationFrame=t[i[n]+"RequestAnimationFrame"],t.cancelAnimationFrame=t[i[n]+"CancelAnimationFrame"]||t[i[n]+"CancelRequestAnimationFrame"];t.requestAnimationFrame||(t.requestAnimationFrame=function(t){if("function"!=typeof t)throw new TypeError(t+"is not a function");var e=Date.now(),i=16+r-e;return i<0&&(i=0),r=e,setTimeout(function(){r=Date.now(),t(performance.now())},i)}),t.cancelAnimationFrame||(t.cancelAnimationFrame=function(t){clearTimeout(t)})}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],202:[function(t,e,r){function i(){}var n=t("../../core");i.prototype.constructor=i,e.exports=i,i.prototype.upload=function(t,e){"function"==typeof t&&(e=t,t=null),e()},i.prototype.register=function(){return this},i.prototype.add=function(){return this},i.prototype.destroy=function(){},n.CanvasRenderer.registerPlugin("prepare",i)},{"../../core":97}],203:[function(t,e,r){e.exports={webGL:t("./webgl/WebGLPrepare"),canvas:t("./canvas/CanvasPrepare")}},{"./canvas/CanvasPrepare":202,"./webgl/WebGLPrepare":204}],204:[function(t,e,r){function i(t){this.renderer=t,this.queue=[],this.addHooks=[],this.uploadHooks=[],this.completes=[],this.ticking=!1,this.register(o,n).register(a,s)}function n(t,e){return e instanceof h.BaseTexture&&(t.textureManager.updateTexture(e),!0)}function s(t,e){return e instanceof h.Graphics&&(t.plugins.graphics.updateGraphics(e),!0)}function o(t,e){if(t instanceof h.BaseTexture)return e.indexOf(t)===-1&&e.push(t),!0;if(t._texture&&t._texture instanceof h.Texture){var r=t._texture.baseTexture;return e.indexOf(r)===-1&&e.push(r),!0}return!1}function a(t,e){return t instanceof h.Graphics&&(e.push(t),!0)}var h=t("../../core"),u=h.ticker.shared;i.UPLOADS_PER_FRAME=4,i.prototype.constructor=i,e.exports=i,i.prototype.upload=function(t,e){"function"==typeof t&&(e=t,t=null),t&&this.add(t),this.queue.length?(this.numLeft=i.UPLOADS_PER_FRAME,this.completes.push(e),this.ticking||(this.ticking=!0,u.add(this.tick,this))):e()},i.prototype.tick=function(){for(var t,e;this.queue.length&&this.numLeft>0;){var r=this.queue[0],n=!1;for(t=0,e=this.uploadHooks.length;t<e;t++)if(this.uploadHooks[t](this.renderer,r)){this.numLeft--,this.queue.shift(),n=!0;break}n||this.queue.shift()}if(this.queue.length)this.numLeft=i.UPLOADS_PER_FRAME;else{this.ticking=!1,u.remove(this.tick,this);var s=this.completes.slice(0);for(this.completes.length=0,t=0,e=s.length;t<e;t++)s[t]()}},i.prototype.register=function(t,e){return t&&this.addHooks.push(t),e&&this.uploadHooks.push(e),this},i.prototype.add=function(t){var e,r;for(e=0,r=this.addHooks.length;e<r&&!this.addHooks[e](t,this.queue);e++);if(t instanceof h.Container)for(e=t.children.length-1;e>=0;e--)this.add(t.children[e]);return this},i.prototype.destroy=function(){this.ticking&&u.remove(this.tick,this),this.ticking=!1,this.addHooks=null,this.uploadHooks=null,this.renderer=null,this.completes=null,this.queue=null},h.WebGLRenderer.registerPlugin("prepare",i)},{"../../core":97}],205:[function(t,e,r){(function(r){t("./polyfill");var i=e.exports=t("./core");i.extras=t("./extras"),i.filters=t("./filters"),i.interaction=t("./interaction"),i.loaders=t("./loaders"),i.mesh=t("./mesh"),i.particles=t("./particles"),i.accessibility=t("./accessibility"),i.extract=t("./extract"),i.prepare=t("./prepare"),i.loader=new i.loaders.Loader,Object.assign(i,t("./deprecation")),r.PIXI=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./accessibility":76,"./core":97,"./deprecation":154,"./extract":156,"./extras":164,"./filters":175,"./interaction":180,"./loaders":183,"./mesh":191,"./particles":194,"./polyfill":200,"./prepare":203}]},{},[205])(205)});

function _toConsumableArray(a){if(Array.isArray(a)){for(var b=0,c=Array(a.length);b<a.length;b++)c[b]=a[b];return c}return Array.from(a)}function _classCallCheck(a,b){if(!(a instanceof b))throw new TypeError("Cannot call a class as a function")}var _createClass=function(){function a(a,b){for(var c=0;c<b.length;c++){var d=b[c];d.enumerable=d.enumerable||!1,d.configurable=!0,"value"in d&&(d.writable=!0),Object.defineProperty(a,d.key,d)}}return function(b,c,d){return c&&a(b.prototype,c),d&&a(b,d),b}}(),Charm=function(){function a(){var b=this,c=arguments.length<=0||void 0===arguments[0]?PIXI:arguments[0];if(_classCallCheck(this,a),void 0===c)throw new Error("Please assign a rendering engine in the constructor before using charm.js");this.renderer="",c.ParticleContainer&&c.Sprite&&(this.renderer="pixi"),this.globalTweens=[],this.easingFormulas={linear:function(b){return b},smoothstep:function(b){return b*b*(3-2*b)},smoothstepSquared:function(b){return Math.pow(b*b*(3-2*b),2)},smoothstepCubed:function(b){return Math.pow(b*b*(3-2*b),3)},acceleration:function(b){return b*b},accelerationCubed:function(b){return Math.pow(b*b,3)},deceleration:function(b){return 1-Math.pow(1-b,2)},decelerationCubed:function(b){return 1-Math.pow(1-b,3)},sine:function(b){return Math.sin(b*Math.PI/2)},sineSquared:function(b){return Math.pow(Math.sin(b*Math.PI/2),2)},sineCubed:function(b){return Math.pow(Math.sin(b*Math.PI/2),2)},inverseSine:function(b){return 1-Math.sin((1-b)*Math.PI/2)},inverseSineSquared:function(b){return 1-Math.pow(Math.sin((1-b)*Math.PI/2),2)},inverseSineCubed:function(b){return 1-Math.pow(Math.sin((1-b)*Math.PI/2),3)},spline:function(b,c,d,e,f){return.5*(2*d+(-c+e)*b+(2*c-5*d+4*e-f)*b*b+(-c+3*d-3*e+f)*b*b*b)},cubicBezier:function(b,c,d,e,f){var g=b*b,h=g*b;return c+(3*-c+b*(3*c-c*b))*b+(3*d+b*(-6*d+3*d*b))*b+(3*e-3*e*b)*g+f*h}},this._addScaleProperties=function(a){"pixi"===b.renderer&&(!a.scaleX&&a.scale.x&&Object.defineProperty(a,"scaleX",{get:function(){return a.scale.x},set:function(c){a.scale.x=c}}),!a.scaleY&&a.scale.y&&Object.defineProperty(a,"scaleY",{get:function(){return a.scale.y},set:function(c){a.scale.y=c}}))}}return _createClass(a,[{key:"tweenProperty",value:function(b,c,d,e,f){var g=arguments.length<=5||void 0===arguments[5]?"smoothstep":arguments[5],h=this,i=!(arguments.length<=6||void 0===arguments[6])&&arguments[6],j=arguments.length<=7||void 0===arguments[7]?0:arguments[7],k={},l=g.split(" ");return"bounce"===l[0]&&(k.startMagnitude=parseInt(l[1]),k.endMagnitude=parseInt(l[2])),k.start=function(a,b){k.startValue=JSON.parse(JSON.stringify(a)),k.endValue=JSON.parse(JSON.stringify(b)),k.playing=!0,k.totalFrames=f,k.frameCounter=0,h.globalTweens.push(k)},k.start(d,e),k.update=function(){var d=void 0;if(k.playing)if(k.frameCounter<k.totalFrames){var e=k.frameCounter/k.totalFrames;d="bounce"!==l[0]?h.easingFormulas[g](e):h.easingFormulas.spline(e,k.startMagnitude,0,1,k.endMagnitude),b[c]=k.endValue*d+k.startValue*(1-d),k.frameCounter+=1}else b[c]=k.endValue,k.end()},k.end=function(){k.playing=!1,k.onComplete&&k.onComplete(),h.globalTweens.splice(h.globalTweens.indexOf(k),1),i&&h.wait(j).then(function(){k.start(k.endValue,k.startValue)})},k.play=function(){return k.playing=!0},k.pause=function(){return k.playing=!1},k}},{key:"makeTween",value:function(b){var c=this,d={};d.tweens=[],b.forEach(function(a){var b=c.tweenProperty.apply(c,_toConsumableArray(a));d.tweens.push(b)});var e=0;return d.completed=function(){e+=1,e===d.tweens.length&&(d.onComplete&&d.onComplete(),e=0)},d.tweens.forEach(function(a){a.onComplete=function(){return d.completed()}}),d.pause=function(){d.tweens.forEach(function(a){a.playing=!1})},d.play=function(){d.tweens.forEach(function(a){a.playing=!0})},d}},{key:"fadeOut",value:function(b){var c=arguments.length<=1||void 0===arguments[1]?60:arguments[1];return this.tweenProperty(b,"alpha",b.alpha,0,c,"sine")}},{key:"fadeIn",value:function(b){var c=arguments.length<=1||void 0===arguments[1]?60:arguments[1];return this.tweenProperty(b,"alpha",b.alpha,1,c,"sine")}},{key:"pulse",value:function(b){var c=arguments.length<=1||void 0===arguments[1]?60:arguments[1],d=arguments.length<=2||void 0===arguments[2]?0:arguments[2];return this.tweenProperty(b,"alpha",b.alpha,d,c,"smoothstep",!0)}},{key:"slide",value:function(b,c,d){var e=arguments.length<=3||void 0===arguments[3]?60:arguments[3],f=arguments.length<=4||void 0===arguments[4]?"smoothstep":arguments[4],g=!(arguments.length<=5||void 0===arguments[5])&&arguments[5],h=arguments.length<=6||void 0===arguments[6]?0:arguments[6];return this.makeTween([[b,"x",b.x,c,e,f,g,h],[b,"y",b.y,d,e,f,g,h]])}},{key:"breathe",value:function(b){var c=arguments.length<=1||void 0===arguments[1]?.8:arguments[1],d=arguments.length<=2||void 0===arguments[2]?.8:arguments[2],e=arguments.length<=3||void 0===arguments[3]?60:arguments[3],f=arguments.length<=4||void 0===arguments[4]||arguments[4],g=arguments.length<=5||void 0===arguments[5]?0:arguments[5];return this._addScaleProperties(b),this.makeTween([[b,"scaleX",b.scaleX,c,e,"smoothstepSquared",f,g],[b,"scaleY",b.scaleY,d,e,"smoothstepSquared",f,g]])}},{key:"scale",value:function(b){var c=arguments.length<=1||void 0===arguments[1]?.5:arguments[1],d=arguments.length<=2||void 0===arguments[2]?.5:arguments[2],e=arguments.length<=3||void 0===arguments[3]?60:arguments[3];return this._addScaleProperties(b),this.makeTween([[b,"scaleX",b.scaleX,c,e,"smoothstep",!1],[b,"scaleY",b.scaleY,d,e,"smoothstep",!1]])}},{key:"strobe",value:function(b){var c=arguments.length<=1||void 0===arguments[1]?1.3:arguments[1],d=arguments.length<=2||void 0===arguments[2]?10:arguments[2],e=arguments.length<=3||void 0===arguments[3]?20:arguments[3],f=arguments.length<=4||void 0===arguments[4]?10:arguments[4],g=arguments.length<=5||void 0===arguments[5]||arguments[5],h=arguments.length<=6||void 0===arguments[6]?0:arguments[6],i="bounce "+d+" "+e;return this._addScaleProperties(b),this.makeTween([[b,"scaleX",b.scaleX,c,f,i,g,h],[b,"scaleY",b.scaleY,c,f,i,g,h]])}},{key:"wobble",value:function(b){var c=arguments.length<=1||void 0===arguments[1]?1.2:arguments[1],d=arguments.length<=2||void 0===arguments[2]?1.2:arguments[2],e=arguments.length<=3||void 0===arguments[3]?10:arguments[3],f=arguments.length<=4||void 0===arguments[4]?10:arguments[4],g=arguments.length<=5||void 0===arguments[5]?10:arguments[5],h=arguments.length<=6||void 0===arguments[6]?-10:arguments[6],i=arguments.length<=7||void 0===arguments[7]?-10:arguments[7],j=arguments.length<=8||void 0===arguments[8]?.98:arguments[8],k=this,l=arguments.length<=9||void 0===arguments[9]||arguments[9],m=arguments.length<=10||void 0===arguments[10]?0:arguments[10],n="bounce "+f+" "+g,o="bounce "+h+" "+i;this._addScaleProperties(b);var p=this.makeTween([[b,"scaleX",b.scaleX,c,e,n,l,m],[b,"scaleY",b.scaleY,d,e,o,l,m]]);return p.tweens.forEach(function(a){a.onComplete=function(){a.endValue>1&&(a.endValue*=j,a.endValue<=1&&(a.endValue=1,k.removeTween(a)))}}),p}},{key:"followCurve",value:function(b,c,d){var e=arguments.length<=3||void 0===arguments[3]?"smoothstep":arguments[3],f=this,g=!(arguments.length<=4||void 0===arguments[4])&&arguments[4],h=arguments.length<=5||void 0===arguments[5]?0:arguments[5],i={},j=e.split(" ");return"bounce"===j[0]&&(i.startMagnitude=parseInt(j[1]),i.endMagnitude=parseInt(j[2])),i.start=function(a){i.playing=!0,i.totalFrames=d,i.frameCounter=0,i.pointsArray=JSON.parse(JSON.stringify(a)),f.globalTweens.push(i)},i.start(c),i.update=function(){var a=void 0,c=void 0,d=i.pointsArray;i.playing&&(i.frameCounter<i.totalFrames?(a=i.frameCounter/i.totalFrames,c="bounce"!==j[0]?f.easingFormulas[e](a):f.easingFormulas.spline(a,i.startMagnitude,0,1,i.endMagnitude),b.x=f.easingFormulas.cubicBezier(c,d[0][0],d[1][0],d[2][0],d[3][0]),b.y=f.easingFormulas.cubicBezier(c,d[0][1],d[1][1],d[2][1],d[3][1]),i.frameCounter+=1):i.end())},i.end=function(){i.playing=!1,i.onComplete&&i.onComplete(),f.globalTweens.splice(f.globalTweens.indexOf(i),1),g&&f.wait(h).then(function(){i.pointsArray=i.pointsArray.reverse(),i.start(i.pointsArray)})},i.pause=function(){i.playing=!1},i.play=function(){i.playing=!0},i}},{key:"walkPath",value:function(b,c){var d=arguments.length<=2||void 0===arguments[2]?300:arguments[2],e=arguments.length<=3||void 0===arguments[3]?"smoothstep":arguments[3],f=!(arguments.length<=4||void 0===arguments[4])&&arguments[4],g=this,h=!(arguments.length<=5||void 0===arguments[5])&&arguments[5],i=arguments.length<=6||void 0===arguments[6]?0:arguments[6],j=JSON.parse(JSON.stringify(c)),k=d/j.length,l=0,m=function a(c){var d=g.makeTween([[b,"x",j[c][0],j[c+1][0],k,e],[b,"y",j[c][1],j[c+1][1],k,e]]);return d.onComplete=function(){c+=1,c<j.length-1?g.wait(i).then(function(){d=a(c)}):f&&(h&&j.reverse(),g.wait(i).then(function(){c=0,b.x=j[0][0],b.y=j[0][1],d=a(c)}))},d},n=m(l);return n}},{key:"walkCurve",value:function(b,c){var d=arguments.length<=2||void 0===arguments[2]?300:arguments[2],e=arguments.length<=3||void 0===arguments[3]?"smoothstep":arguments[3],f=!(arguments.length<=4||void 0===arguments[4])&&arguments[4],g=this,h=!(arguments.length<=5||void 0===arguments[5])&&arguments[5],i=arguments.length<=6||void 0===arguments[6]?0:arguments[6],j=d/c.length,k=0,l=function a(d){var k=g.followCurve(b,c[d],j,e);return k.onComplete=function(){d+=1,d<c.length?g.wait(i).then(function(){k=a(d)}):f&&(h&&(c.reverse(),c.forEach(function(a){return a.reverse()})),g.wait(i).then(function(){d=0,b.x=c[0][0],b.y=c[0][1],k=a(d)}))},k},m=l(k);return m}},{key:"wait",value:function(){var b=arguments.length<=0||void 0===arguments[0]?0:arguments[0];return new Promise(function(a,c){setTimeout(a,b)})}},{key:"removeTween",value:function(b){var c=this;b.tweens?(b.pause(),b.tweens.forEach(function(a){c.globalTweens.splice(c.globalTweens.indexOf(a),1)})):(b.pause(),this.globalTweens.splice(this.globalTweens.indexOf(b),1))}},{key:"update",value:function(){if(this.globalTweens.length>0)for(var b=this.globalTweens.length-1;b>=0;b--){var c=this.globalTweens[b];c&&c.update()}}}]),a}();

// Ion.Sound | version 3.0.7 | https://github.com/IonDen/ion.sound
(function(l,e,n,r){l.ion=l.ion||{};if(!ion.sound){var m=function(a){a||(a="undefined");if(l.console){console.warn&&"function"===typeof console.warn?console.warn(a):console.log&&"function"===typeof console.log&&console.log(a);var g=n&&n("#debug");if(g&&g.length){var b=g.html();g.html(b+a+"<br/>")}}},f=function(a,b){var c;b=b||{};for(c in a)a.hasOwnProperty(c)&&(b[c]=a[c]);return b};if("function"!==typeof Audio&&"object"!==typeof Audio)e=function(){m("HTML5 Audio is not supported in this browser")},
ion.sound=e,ion.sound.play=e,ion.sound.stop=e,ion.sound.pause=e,ion.sound.preload=e,ion.sound.destroy=e,e();else{e=/iPad|iPhone|iPod/.test(e.appVersion);var q=0,c={},d={},b;!c.supported&&e?c.supported=["mp3","mp4","aac"]:c.supported||(c.supported=["mp3","ogg","mp4","aac","wav"]);ion.sound=function(a){f(a,c);c.path=c.path||"";c.volume=c.volume||1;c.preload=c.preload||!1;c.multiplay=c.multiplay||!1;c.loop=c.loop||!1;c.sprite=c.sprite||null;c.scope=c.scope||null;c.ready_callback=c.ready_callback||null;
c.ended_callback=c.ended_callback||null;if(q=c.sounds.length)for(b=0;b<q;b++){a=c.sounds[b];var g=a.alias||a.name;d[g]||(d[g]=new p(a),d[g].init())}else m("No sound-files provided!")};ion.sound.VERSION="3.0.7";ion.sound._method=function(a,c,e){if(c)d[c]&&d[c][a](e);else for(b in d)if(d.hasOwnProperty(b)&&d[b])d[b][a](e)};ion.sound.preload=function(a,b){b=b||{};f({preload:!0},b);ion.sound._method("init",a,b)};ion.sound.destroy=function(a){ion.sound._method("destroy",a);if(a)d[a]=null;else for(b in d)d.hasOwnProperty(b)&&
d[b]&&(d[b]=null)};ion.sound.play=function(a,b){ion.sound._method("play",a,b)};ion.sound.stop=function(a,b){ion.sound._method("stop",a,b)};ion.sound.pause=function(a,b){ion.sound._method("pause",a,b)};ion.sound.volume=function(a,b){ion.sound._method("volume",a,b)};n&&(n.ionSound=ion.sound);e=l.AudioContext||l.webkitAudioContext;var h;e&&(h=new e);var p=function(a){this.options=f(c);delete this.options.sounds;f(a,this.options);this.request=null;this.streams={};this.result={};this.ext=0;this.url="";
this.autoplay=this.no_file=this.decoded=this.loaded=!1};p.prototype={init:function(a){a&&f(a,this.options);this.options.preload&&this.load()},destroy:function(){var a;for(b in this.streams)(a=this.streams[b])&&a.destroy();this.streams={};this.result=null;this.options=this.options.buffer=null;this.request&&(this.request.removeEventListener("load",this.ready.bind(this),!1),this.request.removeEventListener("error",this.error.bind(this),!1),this.request.abort(),this.request=null)},createUrl:function(){var a=
(new Date).valueOf();this.url=this.options.path+encodeURIComponent(this.options.name)+"."+this.options.supported[this.ext]+"?"+a},load:function(){this.no_file?m('No sources for "'+this.options.name+'" sound :('):this.request||(this.createUrl(),this.request=new XMLHttpRequest,this.request.open("GET",this.url,!0),this.request.responseType="arraybuffer",this.request.addEventListener("load",this.ready.bind(this),!1),this.request.addEventListener("error",this.error.bind(this),!1),this.request.send())},
reload:function(){this.ext++;this.options.supported[this.ext]?this.load():(this.no_file=!0,m('No sources for "'+this.options.name+'" sound :('))},ready:function(a){this.result=a.target;4!==this.result.readyState?this.reload():200!==this.result.status&&0!==this.result.status?(m(this.url+" was not found on server!"),this.reload()):(this.request.removeEventListener("load",this.ready.bind(this),!1),this.request.removeEventListener("error",this.error.bind(this),!1),this.request=null,this.loaded=!0,this.decode())},
decode:function(){h&&h.decodeAudioData(this.result.response,this.setBuffer.bind(this),this.error.bind(this))},setBuffer:function(a){this.options.buffer=a;this.decoded=!0;a={name:this.options.name,alias:this.options.alias,ext:this.options.supported[this.ext],duration:this.options.buffer.duration};this.options.ready_callback&&"function"===typeof this.options.ready_callback&&this.options.ready_callback.call(this.options.scope,a);if(this.options.sprite)for(b in this.options.sprite)this.options.start=
this.options.sprite[b][0],this.options.end=this.options.sprite[b][1],this.streams[b]=new k(this.options,b);else this.streams[0]=new k(this.options);this.autoplay&&(this.autoplay=!1,this.play())},error:function(){this.reload()},play:function(a){delete this.options.part;a&&f(a,this.options);if(!this.loaded)this.autoplay=!0,this.load();else if(!this.no_file&&this.decoded)if(this.options.sprite)if(this.options.part)this.streams[this.options.part].play(this.options);else for(b in this.options.sprite)this.streams[b].play(this.options);
else this.streams[0].play(this.options)},stop:function(a){if(this.options.sprite)if(a)this.streams[a.part].stop();else for(b in this.options.sprite)this.streams[b].stop();else this.streams[0].stop()},pause:function(a){if(this.options.sprite)if(a)this.streams[a.part].pause();else for(b in this.options.sprite)this.streams[b].pause();else this.streams[0].pause()},volume:function(a){if(a)if(f(a,this.options),this.options.sprite)if(this.options.part)(a=this.streams[this.options.part])&&a.setVolume(this.options);
else for(b in this.options.sprite)(a=this.streams[b])&&a.setVolume(this.options);else(a=this.streams[0])&&a.setVolume(this.options)}};var k=function(a,b){this.alias=a.alias;this.name=a.name;this.sprite_part=b;this.buffer=a.buffer;this.start=a.start||0;this.end=a.end||this.buffer.duration;this.multiplay=a.multiplay||!1;this.volume=a.volume||1;this.scope=a.scope;this.ended_callback=a.ended_callback;this.setLoop(a);this.gain=this.source=null;this.paused=this.playing=!1;this.time_offset=this.time_played=
this.time_ended=this.time_started=0};k.prototype={destroy:function(){this.stop();this.source=this.buffer=null;this.gain&&this.gain.disconnect();this.source&&this.source.disconnect();this.source=this.gain=null},setLoop:function(a){this.loop=!0===a.loop?9999999:"number"===typeof a.loop?+a.loop-1:!1},update:function(a){this.setLoop(a);"volume"in a&&(this.volume=a.volume)},play:function(a){a&&this.update(a);if(this.multiplay||!this.playing)this.gain=h.createGain(),this.source=h.createBufferSource(),this.source.buffer=
this.buffer,this.source.connect(this.gain),this.gain.connect(h.destination),this.gain.gain.value=this.volume,this.source.onended=this.ended.bind(this),this._play()},_play:function(){var a,b;this.paused?(a=this.start+this.time_offset,b=this.end-this.time_offset):(a=this.start,b=this.end);0>=b?this.clear():("function"===typeof this.source.start?this.source.start(0,a,b):this.source.noteOn(0,a,b),this.playing=!0,this.paused=!1,this.time_started=(new Date).valueOf())},stop:function(){this.playing&&this.source&&
("function"===typeof this.source.stop?this.source.stop(0):this.source.noteOff(0));this.clear()},pause:function(){this.paused?this.play():this.playing&&(this.source&&this.source.stop(0),this.paused=!0)},ended:function(){this.playing=!1;this.time_ended=(new Date).valueOf();this.time_played=(this.time_ended-this.time_started)/1E3;this.time_offset+=this.time_played;if(this.time_offset>=this.end||.015>this.end-this.time_offset)this._ended(),this.clear(),this.loop&&(this.loop--,this.play())},_ended:function(){var a=
{name:this.name,alias:this.alias,part:this.sprite_part,start:this.start,duration:this.end};this.ended_callback&&"function"===typeof this.ended_callback&&this.ended_callback.call(this.scope,a)},clear:function(){this.time_offset=this.time_played=0;this.playing=this.paused=!1},setVolume:function(a){this.volume=a.volume;this.gain&&(this.gain.gain.value=this.volume)}};h||(function(){var a=new Audio,b=a.canPlayType("audio/mpeg"),e=a.canPlayType("audio/ogg"),a=a.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
d,f;for(f=0;f<c.supported.length;f++)d=c.supported[f],b||"mp3"!==d||c.supported.splice(f,1),e||"ogg"!==d||c.supported.splice(f,1),a||"aac"!==d||c.supported.splice(f,1),a||"mp4"!==d||c.supported.splice(f,1)}(),p.prototype={init:function(a){a&&f(a,this.options);this.inited=!0;this.options.preload&&this.load()},destroy:function(){var a;for(b in this.streams)(a=this.streams[b])&&a.destroy();this.streams={};this.inited=this.loaded=!1},load:function(){var a;this.options.preload=!0;this.options._ready=this.ready;
this.options._scope=this;if(this.options.sprite)for(b in this.options.sprite)a=this.options.sprite[b],this.options.start=a[0],this.options.end=a[1],this.streams[b]=new k(this.options,b);else this.streams[0]=new k(this.options)},ready:function(a){this.loaded||(this.loaded=!0,a={name:this.options.name,alias:this.options.alias,ext:this.options.supported[this.ext],duration:a},this.options.ready_callback&&"function"===typeof this.options.ready_callback&&this.options.ready_callback.call(this.options.scope,
a),this.autoplay&&(this.autoplay=!1,this.play()))},play:function(a){if(this.inited)if(delete this.options.part,a&&f(a,this.options),console.log(1),this.loaded)if(this.options.sprite)if(this.options.part)this.streams[this.options.part].play(this.options);else for(b in this.options.sprite)this.streams[b].play(this.options);else this.streams[0].play(this.options);else this.options.preload?this.autoplay=!0:(this.autoplay=!0,this.load())},stop:function(a){if(this.inited)if(this.options.sprite)if(a)this.streams[a.part].stop();
else for(b in this.options.sprite)this.streams[b].stop();else this.streams[0].stop()},pause:function(a){if(this.inited)if(this.options.sprite)if(a)this.streams[a.part].pause();else for(b in this.options.sprite)this.streams[b].pause();else this.streams[0].pause()},volume:function(a){if(a)if(f(a,this.options),this.options.sprite)if(this.options.part)(a=this.streams[this.options.part])&&a.setVolume(this.options);else for(b in this.options.sprite)(a=this.streams[b])&&a.setVolume(this.options);else(a=
this.streams[0])&&a.setVolume(this.options)}},k=function(a,b){this.name=a.name;this.alias=a.alias;this.sprite_part=b;this.multiplay=a.multiplay;this.volume=a.volume;this.preload=a.preload;this.path=c.path;this.start=a.start||0;this.end=a.end||0;this.scope=a.scope;this.ended_callback=a.ended_callback;this._scope=a._scope;this._ready=a._ready;this.setLoop(a);this.url=this.sound=null;this.loaded=!1;this.played_time=this.paused_time=this.start_time=0;this.init()},k.prototype={init:function(){this.sound=
new Audio;this.sound.volume=this.volume;this.createUrl();this.sound.addEventListener("ended",this.ended.bind(this),!1);this.sound.addEventListener("canplaythrough",this.can_play_through.bind(this),!1);this.sound.addEventListener("timeupdate",this._update.bind(this),!1);this.load()},destroy:function(){this.stop();this.sound.removeEventListener("ended",this.ended.bind(this),!1);this.sound.removeEventListener("canplaythrough",this.can_play_through.bind(this),!1);this.sound.removeEventListener("timeupdate",
this._update.bind(this),!1);this.sound=null;this.loaded=!1},createUrl:function(){var a=(new Date).valueOf();this.url=this.path+encodeURIComponent(this.name)+"."+c.supported[0]+"?"+a},can_play_through:function(){this.preload&&this.ready()},load:function(){this.sound.src=this.url;this.sound.preload=this.preload?"auto":"none";this.preload&&this.sound.load()},setLoop:function(a){this.loop=!0===a.loop?9999999:"number"===typeof a.loop?+a.loop-1:!1},update:function(a){this.setLoop(a);"volume"in a&&(this.volume=
a.volume)},ready:function(){!this.loaded&&this.sound&&(this.loaded=!0,this._ready.call(this._scope,this.sound.duration),this.end||(this.end=this.sound.duration))},play:function(a){a&&this.update(a);!this.multiplay&&this.playing||this._play()},_play:function(){if(this.paused)this.paused=!1;else try{this.sound.currentTime=this.start}catch(a){}this.playing=!0;this.start_time=(new Date).valueOf();this.sound.volume=this.volume;this.sound.play()},stop:function(){if(this.playing){this.paused=this.playing=
!1;this.sound.pause();this.clear();try{this.sound.currentTime=this.start}catch(a){}}},pause:function(){this.paused?this._play():(this.playing=!1,this.paused=!0,this.sound.pause(),this.paused_time=(new Date).valueOf(),this.played_time+=this.paused_time-this.start_time)},_update:function(){this.start_time&&(this.played_time+((new Date).valueOf()-this.start_time))/1E3>=this.end&&this.playing&&(this.stop(),this._ended())},ended:function(){this.playing&&(this.stop(),this._ended())},_ended:function(){this.playing=
!1;var a={name:this.name,alias:this.alias,part:this.sprite_part,start:this.start,duration:this.end};this.ended_callback&&"function"===typeof this.ended_callback&&this.ended_callback.call(this.scope,a);this.loop&&setTimeout(this.looper.bind(this),15)},looper:function(){this.loop--;this.play()},clear:function(){this.paused_time=this.played_time=this.start_time=0},setVolume:function(a){this.volume=a.volume;this.sound&&(this.sound.volume=this.volume)}})}}})(window,navigator,window.jQuery||window.$);

/* https://telegram.org/js/games.js */
(function(){function g(a){try{return decodeURIComponent(a)}catch(b){return a}}function n(a,b,c){b||(b=function(){});void 0===c&&(c="");if(void 0!==window.TelegramWebviewProxy)TelegramWebviewProxy.postEvent(a,c),b();else if(window.external&&"notify"in window.external)window.external.notify(JSON.stringify({eventType:a,eventData:c})),b();else if(k)try{var d="https://web.telegram.org",d="*";window.parent.postMessage(JSON.stringify({eventType:a,eventData:c}),d)}catch(e){b(e)}else b({notAvailable:!0})}
function l(a,b){var c=f[a];if(void 0!==c&&c.length)for(var d=0;d<c.length;d++)try{c[d](a,b)}catch(e){}}var f={},m="";try{m=location.hash.toString()}catch(a){}var h=function(a){a=a.replace(/^#/,"");var b={};if(!a.length)return b;if(0>a.indexOf("=")&&0>a.indexOf("?"))return b._path=g(a),b;var c=a.indexOf("?");if(0<=c){var d=a.substr(0,c);b._path=g(d);a=a.substr(c+1)}a=a.split("&");for(var e,c=0;c<a.length;c++)e=a[c].split("="),d=g(e[0]),e=null==e[1]?null:g(e[1]),b[d]=e;return b}(m),k=!1;try{k=null!=
window.parent&&window!=window.parent}catch(a){}window.TelegramGameProxy_receiveEvent=l;window.TelegramGameProxy={initParams:h,receiveEvent:l,onEvent:function(a,b){void 0===f[a]&&(f[a]=[]);-1===f[a].indexOf(b)&&f[a].push(b)},shareScore:function(){n("share_score",function(a){if(a&&(a=h.tgShareScoreUrl||h.shareScoreUrl)){var b=!1;try{b=window.open(a,"_blank")}catch(c){b=!1}b||(location.href=a)}})}}})();let _hostUrl = 'https://apicorsair.metayoka.io';
let http = {
    httpRequest(paramObj, fun, errFun) {

        var xmlhttp = null;

        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }

        if (xmlhttp == null) {
            alert('unSupport XMLHttp');
            return;
        }

        var httpType = (paramObj.type || 'GET').toUpperCase();

        var dataType = paramObj.dataType || 'json';

        var httpUrl = paramObj.httpUrl || '';

        var async = paramObj.async || true;

        var paramData = paramObj.data || [];
        var requestData = '';
        for (var name in paramData) {
            requestData += name + '=' + paramData[name] + '&';
        }
        requestData = requestData == '' ? '' : requestData.substring(0, requestData.length - 1);
        // console.log(requestData)


        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                fun(xmlhttp.responseText);
            } else {

                errFun;
            }
        }


        if (httpType == 'GET') {
            console.log(paramObj['data']['token'])
            xmlhttp.open("GET", _hostUrl + httpUrl + paramObj['token'], async);
            xmlhttp.send(null);
        } else if (httpType == 'POST') {
            xmlhttp.open("POST", _hostUrl + httpUrl + "?token=" + paramObj['token'], async);

            xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xmlhttp.send(requestData);
        }
    }
}

let api = {
    BASE_URI: "https://apicorsair.metayoka.io",
    userToken: localStorage.getItem('access-token'),
    getUserInfo: "/corsair/info",
    login: "/corsair/login",
    getUsersList: "/corsair/list",
    setUserScore: "/corsair/setscore",
    setUserAddress: "/corsair/setaddr",
    setInviter: "/corsair/setinviter",
    getInviters: "/corsair/inviters"
}
let Service = {
    login(data, cb) {
        let paramObj = {
            httpUrl: api.login,
            type: 'post',
            token: '',
            data: data
        }
        http.httpRequest(paramObj, function (respondDada) {
            cb(JSON.parse(respondDada))
        }, function () {
            cb('Error')
        });
    },
    getUserInfo(cb) {
        console.log(api.userToken)
        if (!api.userToken) {
            return
        }
        let paramObj = {
            httpUrl: api.getUserInfo,
            type: 'post',
            token: api.userToken,
            data: null
        }
        http.httpRequest(paramObj, function (respondDada) {
            cb(JSON.parse(respondDada))
        }, function () {
            cb('Error')
        });
    },
    getUsersList(cb) {
        let paramObj = {
            httpUrl: api.getUsersList,
            type: 'post',
            token: api.userToken,
            data: null
        };
        http.httpRequest(paramObj, function (respondDada) {
            cb(JSON.parse(respondDada))
        }, function () {
            cb('Error')
        });
    },
    setUsersScore(data, cb) {
        if (!api.userToken) {
            return
        }
        let paramObj = {
            httpUrl: api.setUserScore,
            type: 'post',
            token: api.userToken,
            data: data
        };
        http.httpRequest(paramObj, function (respondDada) {
            cb(JSON.parse(respondDada))
        }, function () {
            cb('Error')
        });
    },
    setUserAddress(data, cb) {
        if (!api.userToken) {
            return
        }
        let paramObj = {
            httpUrl: api.setUserAddress,
            type: 'post',
            token: api.userToken,
            data: data
        };
        http.httpRequest(paramObj, function (respondDada) {
            cb(JSON.parse(respondDada))
        }, function () {
            cb('Error')
        });
    },
    get(type, data, cb) {
        let paramObj = {
            httpUrl: api[type],
            type: 'post',
            token: api.userToken,
            data: data
        };
        http.httpRequest(paramObj, function (respondDada) {
            cb(JSON.parse(respondDada))
        }, function () {
            cb('Error')
        });
    },
}

window.Service = Service;var Graphics = {
  tower: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/tower.svg?v=0.10',
  coin: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/coin.svg?v=0.10',
  btn: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/btn.svg?v=0.10',
  btnplay: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/btnplay.svg?v=0.10',

  btnswitch: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/btnswitch.svg?v=0.10',
  heart: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/icon_love@2x.png?v=0.10',
  revivebtnBg: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/btn_01@2x.png?v=0.10',
  levelBg: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/bg_level@2x.png?v=0.10',
  lifeBg: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/bg_life@2x.png?v=0.10',
  coinBig: 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/pic_currency@2x.png?v=0.10',
}

for (let _skIndex = 1; _skIndex < 11; _skIndex++) {
  Graphics['island_' + _skIndex] = 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/' + _skIndex + '/island.png?v=0.10';
  Graphics['bullet_' + _skIndex] = 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/' + _skIndex + '/bullet.png?v=0.10';
  Graphics['ship_' + _skIndex] = 'https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/' + _skIndex + '/ship.png?v=0.10';
}

var Textures = {}
var panel, playfield, money, shipDiv, fpsDiv;
var started = false
var rotAnim = 0;
var direction = true;
var prevTs = false;
var playW = 0;
var prevBullet = 0;
var bulletFrac;
var bulletSpeed;
var shipSpeed = 100
var fireMode = 0;
var coins = {}
var coinF = false;
var coinL = false;
var bulletsArr = [];
var bulletsPull = [];
var bangParts = [];
var score = 0;
var level = 0;
let revive = 0;
var titres = true;
var dieing = false;
var switchOn = false;
var pause = false
var curData;
var audio = {};
var fps = 0;
var fts = 0;
var coinsCount = 30,
  coinSize;
var stage, ship, shipLayer, renderer, imgs, cham, island, tower
var bang, finishGameBtn, btnbg, btn, btnCont, fade, game, btnplay, btnswitch;
var angle, allW, stageW, allH, cX, cY, radius = 0;
var scale = 1
var orientation = 0;
var userScore = 0;
var wave1, wave2, moneyCont, circle;
let frontPage = null;
let skinIndex = 10;
let lvlCont, lvlText, lvlContBg;
let reviveCont, reviveContBg, reviveText, reviveIcon;
let reviveBtnCont, reviveBtnBg, reviveBtnText, reviveBtnText2, reviveBtnIcon;
let scoreText, scoreCoin, scoreBg;
let userInfo = {};
let revived = false;
let revivescore = 0;

let playTimeData = [];


let isMute = false;
if (isMute) {
  ge('soundOpen').className = 'show';
  ge('soundClose').className = 'hidden'
} else {
  ge('soundOpen').className = 'hidden';
  ge('soundClose').className = 'show';
}



function start() {
  //console.log('start titres', titres)
  if (titres) {
    titres = false;
    // if (switchOn) {
    //   cham.fadeIn(btnplay, 10) //START PLAY BTN
    // }
    newGame();
  } else {
    started = true;
    //console.log("Level Start", new Date())
    let _levelTime = [Date.parse(new Date())]
    playTimeData.push(_levelTime);
    cham.fadeIn(btnswitch, 10)
    cham.fadeOut(btnplay, 10)
    prevTs = false;
  }
}

function newGame(isFirst) {
  if (isFirst) {
    swicthSkin(isFirst)
    return
  }

  bulletFrac = 400;
  bulletSpeed = 130;
  score = 0;
  level = 1;
  pause = false;
  if (lvlText) {
    lvlText.text = 'Level ' + level
  }
  if (scoreText) {
    scoreText.text = Number(score) + ''
  };
  resetLevel();
}

function swicthSkin() {

  var id = parseInt(Math.random() * 10) + 1;
  if (id == 3) {
    if (parseInt(Math.random() * 10) % 2 == 0) {
      skinIndex = id;
    } else {
      skinIndex = parseInt(Math.random() * 10) + 1;
    }
  } else {
    skinIndex = id;
  }
  console.log("........", skinIndex)
  return;
}

function resetLevel() {
  angle = 0, rotAnim = 0;
  prevBullet = 0;
  fireMode = 0;
  var b;
  while (b = bulletsArr.shift()) {
    b.done = true
    b.alpha = 0
    bulletsPull.push(b)
  }
  if (!direction) {
    ship.scale.x = -ship.scale.x;
    direction = true;
  }
  prevTs = false
  coinF = 360
  coinL = 0
  if (ship) {
    ship.alpha = 1;
  }

  var delay = 0
  for (var deg in coins) {
    var c = coins[deg]
    coinF = Math.min(coinF, deg)
    coinL = Math.max(coinL, deg)
    if (!c.done) {
      continue;
    }
    c.done = false
    setTimeout((function (c) {
      return function () {
        for (var i in c.chams) {
          c.chams[i].pause()
        }
        c.chams = []

        cham.fadeIn(c, 15);
        cham.scale(c, c.stScale, c.stScale, 15)

      }
    })(c), delay)
    delay += 20
  }
  if (tower) {
    var tSc = tower.scale.x
    var iSc = island.scale.x
    cham.scale(tower, tSc * 1.15, tSc * 1.15, 15).onComplete = function () {
      cham.scale(tower, tSc, tSc, 18)
    };
    cham.scale(island, iSc * 1.08, iSc * 1.08, 10).onComplete = function () {
      cham.scale(island, iSc, iSc, 12)
    };
  }

}

function stop() {
  if (!titres) {
    if (!revived && revive > 0) {
      cham.fadeOut(btnCont, 10)
      cham.fadeIn(reviveBtnCont, 10)
      cham.fadeIn(finishGameBtn, 0)
      reviveBtnCont.interactive = true;
      finishGameBtn.interactive = true;
      return
    }

    titres = true
    dieing = false;
    cham.fadeOut(btnswitch, 10)

    switchOn = true;
    finishGame()
  }
}

function swap() {
  if (dieing || pause) {
    return false;
  }

  cham.scale(btnCont, 0.9, 0.9, 5).onComplete = function () {
    cham.scale(btnCont, 1, 1, 5)
  }
  if (!started) {
    titres = false;
    start()
    return false;
  }
  direction = !direction
  ship.scale.x = -ship.scale.x;
  fireMode = 3
  //ion.sound.play("swap");
  return false;
}

function nextLevel() {
  if (!started) {
    return false;
  }
  swicthSkin();

  //console.log(skinIndex);

  ship.texture = imgs['ship_' + skinIndex];
  island.texture = imgs['island_' + skinIndex];

  bulletsPull.map((bullet) => {
    bullet.texture = imgs['bullet_' + skinIndex];
  })
  bulletsArr.map((bullet) => {
    bullet.texture = imgs['bullet_' + skinIndex];
  })
  pause = true;
  level += 1;
  score += 10;
  bulletFrac = bulletFrac * 0.9
  bulletSpeed = bulletSpeed * 1.1
  if (level % 10 == 0) {
    shipSpeed = shipSpeed * 1.1
  }

  lvlText.text = 'Level ' + level
  scoreText.text = Number(score) + ''
  cham.scale(lvlText, 1.3, 1.3, 20).onComplete = function () {
    cham.scale(lvlText, 1, 1, 20)
  }


  cham.fadeIn(fade, 10).onComplete = function () {
    started = false;
    pause = false;
    cham.fadeOut(btnswitch, 10)
    cham.fadeIn(btnplay, 10)
    resetLevel()
    cham.fadeOut(fade, 40)
  }
}

function fireBullet() {
  var bullet = bulletsPull.shift();
  if (bullet) {
    bullet.alpha = 1;
    bullet.done = false;
  } else {
    var bullet = new PIXI.Sprite(imgs['bullet_' + skinIndex])
    stage.addChildAt(bullet, stage.getChildIndex(tower));
  }
  bullet.anchor.set(0.5, 0.5);

  var a;
  var calcAngle = shipSpeed * 92 / bulletSpeed
  if (fireMode == 4) {
    fireMode = 0
    a = angle + (Math.random() * 90 - 45)
  } else if (fireMode == 3) {
    a = angle
  } else if (fireMode == 2) {
    fireMode = 0
    a = angle + (direction ? calcAngle : -calcAngle)
  } else {
    a = angle + (direction ? calcAngle : -calcAngle)
    a += (Math.random() * 60 - 30)
  }
  fireMode += 1;
  if (a > 360) {
    a -= 360
  }
  bullet.deg = a;
  bullet.rotation = bullet.a = radians(a)
  bullet.dist = 0
  bullet.width = p(9)
  bullet.height = p(9)
  // bullet.height = bullet.width * 3
  bullet.x = rX(a, bullet.dist)
  bullet.y = rY(a, bullet.dist)
  bulletsArr.push(bullet)
}

function drawBullets(time) {
  for (var i in bulletsArr) {

    var bullet = bulletsArr[i]
    var a = bullet.a
    bullet.dist += time * bulletSpeed / 1000
    bullet.x = rX(a, bullet.dist)
    bullet.y = rY(a, bullet.dist)

    if (bullet.dist > 200) {
      bullet.alpha = 0
      bulletsPull.push(bulletsArr.splice(i, 1)[0])
      break;
    } else if (bullet.dist > 85 && bullet.dist < 95 && started && !pause) {
      var aDif = Math.abs(bullet.deg - angle)
      while (aDif > 360) {
        aDif -= 360
      }

      if (aDif < 10 || aDif > 350) {
        cham.fadeOut(bullet, 10)
        bulletsPull.push(bulletsArr.splice(i, 1)[0])
        die()
        break;
      }
    }
  }
}

function die(quit) {
  if (!started) {
    return false;
  };
  started = false;
  dieing = shipSpeed;
  if (!bang) {
    bang = new PIXI.Container();
    bang.x = 0
    bang.y = 0
    var colors = [0xCC1A1A, 0xFFE594, 0xFFC749, 0xFFFFFF, 0xA52323, 0xFB5923]

    for (var i = 0; i < 25; i++) {
      var circ = new PIXI.Graphics();
      circ.beginFill(colors[Math.floor(Math.random() * colors.length)], 1)
      circ.drawCircle(0, 0, p(5))
      circ.endFill()
      bang.addChild(circ);
      circ.alpha = 0;
      bangParts.push(circ)
    }
    stage.addChild(bang)
  }
  var size = 1.5
  var delay = 0;
  for (var i in bangParts) {
    var part = bangParts[i]
    var bRand = p(4)
    part.scaleTo = 0.8

    setTimeout((function (part) {
      return function () {
        part.alpha = 0
        part.scale.set(0.01, 0.01)
        var anim = cham.scale(part, part.scaleTo, part.scaleTo, 20);
        var aX = rX(radians(angle), 100)
        var aY = rY(radians(angle), 100)
        part.x = aX + rand(bRand, true)
        part.y = aY + rand(bRand, true)
        cham.fadeIn(part, 20);
        cham.slide(part, aX + rand(bRand, true), aY + rand(bRand, true), 20)
        anim.onComplete = function () {
          var aX = rX(radians(angle), 100)
          var aY = rY(radians(angle), 100)
          cham.scale(part, 0, 0, 70);
          cham.fadeOut(part, 40);
          cham.slide(part, aX + rand(bRand, true), aY + rand(bRand, true), 40)
        }
      }
    })(part), delay)
    delay += 30;
  }
  var oldScaleX = ship.scale.x
  var oldScaleY = ship.scale.y
  cham.scale(ship, -ship.scale.x * 1.5, ship.scale.y * 1.5, 15).onComplete = function () {
    cham.scale(ship, oldScaleX, oldScaleY, 15)
  }
  setTimeout(function () {
    cham.fadeOut(ship, 30)
  }, 800)
  setTimeout(stop, 2000);

  if (!isMute) {
    ion.sound.play("explosion");
  }

}







function tryFallbackImage(img) {
  if (img.src.substr(0, 5) == 'data:') {
    return (img.src = 'images/' + img.filename + '.svg?v=0.10');
  }
  if (img.src.substr(-3, 3) == 'svg') {
    return (img.src = 'images/' + img.filename + '.png?v=0.10');
  }
  return false;
}

function loadImages(files, cb) {
  var images = {}
  var cnt = 0,
    done = 0
  for (var i in files) {
    cnt += 1;
  }
  for (var i in files) {
    var img = new Image();
    img.crossOrigin = "anonymous"
    img.src = files[i];
    img.filename = i;
    img.onload = function () {
      if (!this.width || !this.height) {
        return tryFallbackImage(this);
      }
      done += 1;
      if (done == cnt) {
        cb(images)
      }
    }
    img.onerror = function (e) {
      tryFallbackImage(this);
    }
    images[i] = img;
  }
}

function p(w) {
  return stageW * w / 100;
}

function radians(degrees) {
  return degrees * Math.PI / 180;
};


function degrees(radians) {
  return radians * 180 / Math.PI;
};
var a90 = radians(90)

function aX(a, pos) {
  return (pos / 100) * (radius) * Math.cos(a - a90);
}

function aY(a, pos) {
  return (pos / 100) * (radius) * Math.sin(a - a90);
}

function rX(a, pos) {
  return cX + (pos / 100) * (radius) * Math.cos(a - a90);
}

function rY(a, pos) {
  return cY + (pos / 100) * (radius) * Math.sin(a - a90);
}

function rand(num, sign) {
  if (sign) {
    return Math.floor((Math.random() * num * 2) - num)
  } else {
    return Math.floor((Math.random() * num))
  }
}

function doneCoin(coinN) {
  if (!started) return;
  var c = coins[coinN]
  if (!c || c.done) return;
  c.done = true
  c.chams = []

  //cham.slide(c, c.x-(c.width*3/3), c.y-(c.height*3/2), 20);
  c.chams.push(cham.fadeOut(c, 20));
  c.chams.push(cham.scale(c, c.stScale * 2, c.stScale * 2, 20))
  coinF = false
  var has = false
  for (var i in coins) {
    if (coins[i].done) continue;
    has = true
    if (coinF === false) {
      coinF = i
    }
    coinL = i
  }
  if (!has) {
    //console.log("Level End", new Date())
    setLevelEndTime()

    nextLevel()
  } else {
    score += 1
    if (skinIndex == 3) {
      score += 1;
    }
  }
  scoreText.text = Number(score) + ''
  if (!isMute) {
    ion.sound.play("coin2", {
      volume: 1
    });
  }

}

function setLevelEndTime() {
  let _lvlTime = playTimeData.pop()
  _lvlTime.push(Date.parse(new Date()))
  playTimeData.push(_lvlTime);
}

function drawMoney() {
  let _coinsCount = coinsCount;
  // if (skinIndex === 3) {
  //   _coinsCount = 2 * coinsCount;
  // }
  for (var i = 0; i < _coinsCount; i += 1) {
    var deg = parseInt(i / _coinsCount * 360)
    if (deg > 360) {
      deg -= 360
    }
    var a = radians(deg)
    if (deg && deg != 360) {
      var coin = new PIXI.Sprite(imgs.coin)
      coin.anchor.set(0.5, 0.5);
      moneyCont.addChild(coin)
      coin.height = coin.width = coinSize
      coin.stScale = coin.scale.x
      coin.scale.set(coin.stScale * 2, coin.stScale * 2)
      coin.alpha = 0
      coin.done = 1;
      coins[deg] = coin
    }
  }
}

function go(ts) {
  requestAnimationFrame(go)
  cham.update()
  if (!ts) {
    return
  }

  if (prevTs === false) {
    prevTs = ts;
    return;
  }


  var time = ts - prevTs
  prevTs = ts
  drawBullets(time)

  if (started || dieing > 0) { //TODO

    var add = time * shipSpeed / 1000

    if (dieing) {
      var add = time * dieing / 1000
      dieing -= time / 1.5
    }

    if (direction) {
      angle += add
      if (angle > 360) {
        angle -= 360
      }
      var am = angle - coinF
      if (am > -5 && am < 5) {
        doneCoin(coinF)
      }
    } else {
      angle -= add
      if (angle < 0) {
        angle += 360
      }
      var am = coinL - angle
      if (am > -5 && am < 5) {
        doneCoin(coinL)
      }
    }


    if (!prevBullet || ts - prevBullet > bulletFrac) {
      prevBullet = ts
      fireBullet()
    }
  }

  var rAngle = radians(angle)


  ship.x = rX(rAngle, 100);
  ship.y = rY(rAngle, 100);
  ship.rotation = rAngle

  //island.rotation -= 0.001
  //tower.rotation -= 0.001
  //tower.rotation = rAngle / 2

  renderer.render(stage);
}

function ge(id) {
  return document.getElementById(id)
}

function createWave() {
  var wave = new PIXI.Graphics();
  //wave.beginFill(0xFFFFFF)
  stage.addChild(wave);
  return wave
}

function startWave1(wave, duration) {
  wave.scale.set(1, 1)
  wave.alpha = 0.1
  cham.scale(wave, 1.1, 1.1, duration).onComplete = function () {
    cham.scale(wave, 1.2, 1.2, duration - 1)
    cham.fadeOut(wave, duration).onComplete = function () {
      startWave1(wave, duration)
    }
  }
};

function startWave2(wave, duration) {
  wave.scale.set(1, 1)
  wave.alpha = 0.08
  cham.scale(wave, 1.05, 1.05, duration).onComplete = function () {
    cham.scale(wave, 1.1, 1.1, duration - 1)
    cham.fadeOut(wave, duration).onComplete = function () {
      startWave2(wave, duration)
    }
  }
}


function sizeStage() {

  allW = game.offsetWidth;
  allH = game.offsetHeight
  allW = allW * scale
  allH = allH * scale

  //console.log("123.....", allW, allH, scale)
  if (!renderer) {
    renderer = PIXI.autoDetectRenderer(allW, allH);
  } else {
    renderer.resize(allW, allH)
  };
  var canvas = renderer.view;
  canvas.width = allW;
  canvas.height = allH;
  canvas.style.width = allW / scale + 'px';
  canvas.style.height = allH / scale + 'px';
  if (allW > allH) {
    cX = (allW * 0.7) / 2
    cY = allH / 2
    if (allW * 0.7 < allH) {
      stageW = allW * 0.7
    } else {
      stageW = allH
    }
  } else {
    cX = allW / 2
    cY = (allH * 0.8) / 2
    if (allW * 1.3 > allH) {
      stageW = allH * 0.7
    } else {
      stageW = allW
    }
  }
}



function posElements() {
  radius = p(41)
  var islandSize = p(30)
  island.x = cX;
  island.y = cY;
  island.width = islandSize;
  island.height = islandSize;
  var shipSize = p(24) //ship
  ship.x = rX(radians(0), 100);
  ship.y = rY(radians(0), 100);
  ship.width = shipSize
  ship.height = shipSize

  var towerSize = p(14)
  tower.x = cX;
  tower.y = cY;
  tower.width = towerSize
  tower.height = towerSize



  btnCont.x = cX;
  reviveBtnCont.x = cX;
  finishGameBtn.x = cX;

  reviveBtnCont.y = allH * 0.7 + allH * 0.2 * 0.45;
  finishGameBtn.y = reviveBtnCont.y + reviveBtnBg.height;

  reviveBtnText.x = -reviveBtnText.width * 0.2;
  reviveBtnIcon.x = reviveBtnText.x + reviveBtnText.width * 0.5;
  reviveBtnText2.x = reviveBtnIcon.x + reviveBtnIcon.width * 0.7;

  btnbg.height = btnbg.width = p(24);
  btnplay.height = btnplay.width = btnbg.height * 0.8;
  btnswitch.height = btnswitch.width = btnbg.height * 0.8;


  // btnCont.y = allH - btnbg.height;
  btnCont.y = allH - btnbg.height;
  reviveBtnBg.width = p(35);
  reviveBtnBg.height = p(14)


  lvlContBg.width = p(24)
  lvlContBg.height = p(10)
  lvlCont.x = p(3) + (lvlContBg.width / 2)
  lvlCont.y = p(3) + (lvlContBg.height / 2)

  scoreBg.width = p(24)
  scoreBg.height = p(10)
  scoreBg.x = allW - p(3) - scoreBg.width / 2;
  scoreBg.y = p(3) + scoreBg.height / 2;
  scoreCoin.height = scoreCoin.width = p(7.5)
  scoreCoin.x = scoreBg.x + scoreBg.width / 2 - scoreCoin.width;
  scoreCoin.y = scoreBg.y - scoreCoin.height / 2;
  scoreText.x = scoreCoin.x - scoreCoin.width * 0.1;
  scoreText.y = scoreCoin.y + scoreCoin.height / 2;
  //
  reviveContBg.width = p(40);
  reviveContBg.height = p(10);
  reviveCont.x = allW / 2;
  reviveCont.y = p(3) + reviveContBg.height / 2;
  reviveIcon.x = -reviveContBg.width * 0.1;
  reviveIcon.height = reviveIcon.width = p(7)

  reviveText.x = reviveIcon.x + reviveIcon.width / 2 + reviveContBg.width * 0.075;

  wave1.x = cX
  wave1.y = cY
  wave1.clear()
  wave1.beginFill(16777215)
  wave1.drawCircle(0, 0, p(25))
  wave1.alpha = 0.08;

  wave2.x = cX
  wave2.y = cY
  wave2.clear()
  wave2.beginFill(16777215)
  wave2.drawCircle(0, 0, p(16))
  wave2.alpha = 0.1;

  circle.x = cX
  circle.y = cY

  moneyCont.x = cX
  moneyCont.y = cY


  circle.clear()
  circle.lineStyle(p(0.5), 16777215, 1)
  circle.drawCircle(0, 0, radius)
  circle.alpha = 0.1;

  coinSize = p(4)
  for (var deg in coins) {
    var coin = coins[deg]
    var a = radians(deg)
    coin.x = coin.startX = aX(a, 100)
    coin.y = coin.startY = aY(a, 100)
    coin.height = coin.width = coinSize
  }
}

function onResize() {
  sizeStage()
  posElements()

}

function urlParse() {
  var url = window.location.search;
  var obj = {};
  var reg = /[?&][^?&]+=[^?&]+/g;
  var arr = url.match(reg);

  if (arr) {
    arr.forEach(function (item) {
      var tempArr = item.substring(1).split('=');
      var key = decodeURIComponent(tempArr[0]);
      var val = decodeURIComponent(tempArr[1]);
      obj[key] = val;
    });
  }
  return obj;
}

function main() {

  bindHtmlEvent()

  var params = urlParse()

  if (params.token) {
    localStorage.setItem('access-token', params.token)

    getNetInfo()
  } else {
    var token = localStorage.getItem('access-token')
    if (!token) {
      ge("startGame").className = 'hidden'
      ge("loginGame").className = 'start-btn'
    } else {
      getNetInfo()
    }
  }


  curData = (location.hash || '').substr(1);
  curData = curData.replace(/[\?&].*/g, '');
  game = ge('game')
  scale = window.devicePixelRatio || 1
  sizeStage()

  renderer.backgroundColor = 750798;
  game.appendChild(renderer.view);

  stage = new PIXI.Container();
  cham = new Charm(PIXI); //tween

  loadImages(Graphics, function (loadedImgs) {
    imgs = {}
    for (var i in loadedImgs) {
      imgs[i] = new PIXI.Texture(new PIXI.BaseTexture(loadedImgs[i]))
    };
    wave1 = createWave();

    startWave1(wave1, 100)

    wave2 = createWave()
    cham.scale(wave2, 1, 1, 110).onComplete = function () {
      startWave2(wave2, 110)
    }

    radius = p(41)
    circle = new PIXI.Graphics();
    stage.addChild(circle);

    coinSize = p(4)
    moneyCont = new PIXI.Container();
    stage.addChild(moneyCont)
    drawMoney()

    ship = new PIXI.Sprite(imgs['ship_' + skinIndex])
    //console.log('ship', skinIndex)
    ship.rotation = 0.04
    ship.anchor.set(0.5, 0.5);
    stage.addChild(ship);

    tower = new PIXI.Sprite(imgs.tower)
    tower.anchor.set(0.5, 0.5);
    stage.addChild(tower);


    island = new PIXI.Sprite(imgs['island_' + skinIndex])
    island.anchor.set(0.5, 0.5);
    stage.addChild(island);

    btnCont = new PIXI.Container();
    btnCont.interactive = true;
    btnCont.on('mousedown', swap);
    btnCont.on('touchstart', function () {
      if (!isMute) {
        ion.sound.play("coin2", {
          volume: 0
        });
      }

      swap()
    });

    btnbg = new PIXI.Sprite(imgs.btn)
    btnplay = new PIXI.Sprite(imgs.btnplay) //PLAY
    btnswitch = new PIXI.Sprite(imgs.btnswitch) //SWITCH

    btnbg.anchor.set(0.5, 0.5);
    btnCont.addChild(btnbg);
    btnplay.anchor.set(0.5, 0.5);
    btnplay.alpha = 1;
    btnCont.addChild(btnplay);

    btnswitch.anchor.set(0.5, 0.5);
    btnswitch.alpha = 0;
    btnCont.addChild(btnswitch);



    stage.addChild(btnCont)

    reviveBtnBg = new PIXI.Sprite(imgs.revivebtnBg);
    reviveBtnCont = new PIXI.Container();

    reviveBtnCont.addChild(reviveBtnBg)
    reviveBtnBg.anchor.set(0.5, 0.5);

    reviveBtnIcon = new PIXI.Sprite(imgs.heart);

    reviveBtnText = new PIXI.Text('REVIVE', {
      fontFamily: 'Gotham-Black',
      dropShadowColor: '0x111111',
      dropShadowDistance: 10,
      fill: ['#ffffff'],
      stroke: '#000000',
      fontSize: p(4),
      fontWeight: 'bold',
      strokeThickness: 2.5,
    });

    reviveBtnText2 = new PIXI.Text('-1', {
      fontFamily: 'Gotham-Black',
      dropShadowColor: '0x111111',
      dropShadowDistance: 10,
      fill: ['#ffffff'],
      stroke: '#000000',
      fontSize: p(4),
      fontWeight: 'bold',
      strokeThickness: 2.5,
    });

    stage.addChild(reviveBtnCont);
    reviveBtnCont.addChild(reviveBtnText)
    reviveBtnCont.addChild(reviveBtnIcon)
    reviveBtnCont.addChild(reviveBtnText2)



    reviveBtnText.anchor.set(0.5, 0.5);
    reviveBtnText2.anchor.set(0, 0.3);

    reviveBtnIcon.anchor.set(0, 0.5);


    cham.fadeOut(reviveBtnCont, 0)

    reviveBtnCont.interactive = false;
    reviveBtnCont.on('mousedown', toRevive);
    reviveBtnCont.on('touchstart', function () {
      toRevive()
    });

    //LV
    lvlCont = new PIXI.Container();
    lvlContBg = new PIXI.Sprite(imgs.levelBg);
    lvlText = new PIXI.Text('Level 1', {
      fontFamily: 'Gotham-Black',
      fontSize: p(4),
      fontWeight: 'bold',
      fill: 16777215
    });
    lvlContBg.anchor.set(0.45, 0.5)
    lvlText.anchor.set(0.5, 0.5);
    stage.addChild(lvlCont);
    lvlCont.addChild(lvlContBg);
    lvlCont.addChild(lvlText);


    //score 
    scoreText = new PIXI.Text('0', {
      fontFamily: 'Gotham-Black',
      fontSize: p(4),
      fontWeight: 'bold',
      fill: 16777215
    });

    scoreText.anchor.set(1, 0.5);
    stage.addChild(scoreText);

    //score icon
    scoreCoin = new PIXI.Sprite(imgs.coinBig)
    scoreBg = new PIXI.Sprite(imgs.lifeBg)
    scoreBg.anchor.set(0.5, 0.5);
    scoreBg.alpha = 0;
    stage.addChild(scoreCoin)
    stage.addChild(scoreBg)

    fade = new PIXI.Graphics();
    fade.alpha = 0
    stage.addChild(fade);


    //revive
    reviveText = new PIXI.Text(revive + '', {
      fontFamily: 'Gotham-Black',
      fontSize: p(4),
      fontWeight: 'bold',
      fill: 16777215
    });

    // reviveCont
    reviveCont = new PIXI.Container();
    reviveContBg = new PIXI.Sprite(imgs.lifeBg)
    reviveContBg.alpha = 0;
    reviveIcon = new PIXI.Sprite(imgs.heart)
    reviveText.anchor.set(0.5, 0.5);
    reviveContBg.anchor.set(0.5, 0.5);
    reviveIcon.anchor.set(0.5, 0.5);
    stage.addChild(reviveCont);
    reviveCont.addChild(reviveContBg);
    reviveCont.addChild(reviveIcon);
    reviveCont.addChild(reviveText)

    //16777215
    finishGameBtn = new PIXI.Text('OVER', {
      fontFamily: 'Gotham-Black',
      fontSize: p(4),
      fontWeight: 'bold',
      fill: 16777215
    });

    finishGameBtn.anchor.set(0.5, 0.5);
    stage.addChild(finishGameBtn)
    cham.fadeOut(finishGameBtn, 0)
    finishGameBtn.interactive = false;
    finishGameBtn.on('mousedown', finishGame);
    finishGameBtn.on('touchstart', finishGame);
    posElements(true)
    go()
    window.onresize = onResize;
  });

  //sounds
  ion.sound({
    sounds: [{
        name: "coin2"
      },
      {
        name: "explosion"
      },
      {
        name: "swap"
      },

    ],
    path: "https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/audio/",
    multiplay: true,
    volume: 1,
    preload: true
  });

  renderer.render(stage);


  // ge('score_share').onclick = function () {
  //   TelegramGameProxy && TelegramGameProxy.shareScore();
  // }
  document.onkeydown = function (e) {
    var key = e.which || e.keyCode;
    if (key == 40 || key == 38 || key == 32) {
      swap()
    } else if (key == 37 || key == 39) {
      swap()
    }
  }
  // document.body.className = 'results_show'
  showFrontPage()
}

function loginGame() {
  initWeb3(function (res) {
    if (res.code == 0) {
      localStorage.setItem('access-token', res.data.access_token)
      setTimeout(function () {
        getNetInfo()
      }, 100)
      ge("startGame").className = 'start-btn'
      ge("loginGame").className = 'hidden'

      _showTips('Login success')

    } else {
      _showTips('Please use MetaMask to login')
    }
  })
}

function initWeb3(cb) {
  connectWeb3(function (code, web3) {
    if (code != 0) {
      return cb({
        code: 1
      })
    }
    var coinbase = web3.coinbase

    var _coinbase = localStorage.getItem('coinbase')
    if (_coinbase != coinbase) {
      var dataToSign = JSON.stringify({
        address: coinbase
      }).toLocaleLowerCase()
      web3.web3().eth.personal.sign(dataToSign, coinbase).then(dataSigned => {
        console.log('sign.....', dataToSign, dataSigned)

        Service.login({
          sign: dataSigned,
          address: coinbase
        }, (res) => {
          localStorage.setItem('sign', dataSigned)
          localStorage.setItem('coinbase', coinbase)
          cb && cb(res)
        })

      }).catch(err => {
        console.log(err)
      })
    } else {
      var sign = localStorage.getItem('sign')
      console.log(coinbase)
      Service.login({
        sign: sign,
        address: coinbase
      }, (res) => {
        cb && cb(res)
      })
    }
  })
}

function getNetInfo() {
  getUserInfo()
  getRankList()
  getInviterList()
}

function getInviterList() {
  var inviter_html = '';
  Service.get("getInviters", null, (respondData) => {
    if (respondData.code != 0) {
      return
    }
    let inviterList = respondData['data']['inviters'];
    inviterList.map((inviterItem) => {
      inviter_html += '<div class="invite-list-item"><div class="name">';
      if (inviterItem.firstname) {
        inviter_html += inviterItem.firstname + ' '
      }
      if (inviterItem.lastname) {
        inviter_html += inviterItem.lastname;
      }
      inviter_html += '</div><div class="reward"><img src="https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/icon_love@2x.png" alt=""><span>+1</span> </div></div>';
    });
    ge('invitelist').innerHTML = inviter_html;
  })
}

function getUserInfo() {
  Service.getUserInfo((respondData) => {
    if (respondData.code != 0) {
      if (respondData.msg == "token invalid") {
        localStorage.setItem('access-token', '')
        ge("startGame").className = 'hidden'
        ge("loginGame").className = 'start-btn'
      }
      return
    }
    userInfo = respondData['data']['user'];
    //console.log(userInfo, 'userInfo')
    revive = userInfo['life'];

    if (reviveText) {
      reviveText.text = Number(revive) + '';
    }

    ge('addressContent').className = 'hidden';
    // ge('changeAddressBtn').className = 'hidden';
    ge('addAddressBtn').className = 'hidden';
    ge("addressInput").className = 'hidden';
    // ge('cancelChangeAddress').className = 'hidden';
    ge("userScoreNum").innerHTML = userInfo['score'];
    ge("integralUserScoreNum").innerHTML = userInfo['score'];
    ge('inviteCode').innerHTML = userInfo['code'];
    if (userInfo['inviter']) {
      ge("inviteInput").value = 'Your inviter code: ' + userInfo['inviter'];
      ge("inviteInput").disabled = true;

      ge('setInviteBtn').className = 'hidden';
    };

    for (let _index = 0; _index < document.getElementsByClassName('lifeReviveNum').length; _index++) {
      document.getElementsByClassName('lifeReviveNum')[_index].innerHTML = userInfo['life'];
    };

    if (userInfo['address']) {
      ge('addressContent').innerHTML = addressFilter(userInfo['address']);
      ge('addressContent').className = 'show';
      // ge('changeAddressBtn').className = 'show';
      ge('addAddressBtn').className = 'hidden';
      ge("addressInput").className = 'hidden';
      // ge('cancelChangeAddress').className = 'hidden';
      // ge("addrtips").className = 'hidden'
    } else {
      ge('addressContent').className = 'hidden';
      ge("addressInput").className = 'show';
      // ge('changeAddressBtn').className = 'hidden';
      ge('addAddressBtn').className = 'show';

    };
  });
};

function toChangeAddress() {
  ge('addressContent').className = 'hidden';
  ge("addressInput").className = 'show';
  ge('changeAddressBtn').className = 'hidden';
  ge('addAddressBtn').className = 'show';
  ge("addressInput").value = '';
  ge('cancelChangeAddress').className = 'show';
}

function cancelChangeAddress() {
  ge('addressContent').innerHTML = addressFilter(userInfo['address']);
  ge('addressContent').className = 'show';
  // ge('changeAddressBtn').className = 'show';
  ge('addAddressBtn').className = 'hidden';
  ge("addressInput").className = 'hidden';
  // ge('cancelChangeAddress').className = 'hidden';
}

function getRankList() {
  var rank_html = '';
  Service.getUsersList((respondData) => {
    if (respondData.code != 0) {
      return
    }
    let rankData = respondData['data']['users'];
    let mineRank = respondData['data']['my'];
    // let rankPercent = (respondData['data']['total'] - respondData['data']['rank']) / (respondData['data']['total'] - 1);
    // TODO userRankPercent
    rankData.map((user, index) => {
      let _rankItemHtml = '<div class="rank-item"><div class="type rank">' +
        '<p class="' + (user.rank > 3 ? 'show' : 'hidden') + '">' + user.rank + '</p>';
      if (user.rank < 4) {
        _rankItemHtml +=
          '<img src="https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/rank_' + user.rank + '.png">';
      }
      _rankItemHtml += '</div>' +
        ' <div class="type nick-name">';

      if (user.firstname) {
        _rankItemHtml += user.firstname + ' '
      }
      if (user.lastname) {
        _rankItemHtml += user.lastname;
      }
      _rankItemHtml += '</div>' +
        '<div class="type point">' + user['score'] + '</div>' +
        ' <div class="type reward">' + user['spice'] +
        ' <img src="https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/coin.svg?v=0.10" alt="">' +
        '</div>' +
        ' </div>';
      rank_html += _rankItemHtml;
    });
    ge('rankListRank').innerHTML = rank_html;
    ge('rankListOver').innerHTML = rank_html;


    if (mineRank) {
      let mineRankHtml =
        '<div class="type rank">' +
        mineRank.rank +
        '</div><div class="type nick-name">';
      if (mineRank.firstname) {
        mineRankHtml += mineRank.firstname + ' '
      };

      if (mineRank.lastname) {
        mineRankHtml += mineRank.lastname;
      };

      mineRankHtml += '</div><div class="type point"> ' +
        mineRank.score +
        '</div><div class="type reward">' +
        mineRank.spice +
        '<img src="https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/coin.svg?v=0.10" alt=""></div>';

      ge('rankMineRank').innerHTML = mineRankHtml;
    }
    // ge('rankMineOver').innerHTML = mineRankHtml;

  });
}

function buyYoka() {
  window.location.href = "https://metayoka.io/yoka?ref=corsair"
}

function setUserScore(score) {

  playTimeData.map((_levelTime, index) => {
    if (_levelTime.length === 1) {
      playTimeData[index + 1][0] = _levelTime[0];
      playTimeData.splice(index, 1)
    }
  })
  //console.log('setUserScore', 'setUserScore', playTimeData);
  let _data = {
    score: score,
    level: level,
    revived: Number(revived),
    revivescore: revivescore,
    data: JSON.stringify(playTimeData)
  };
  playTimeData = [];
  Service.setUsersScore(_data, (respondData) => {
    if (!respondData['data']) {
      return
    }
    ge("userRankPercent").innerHTML = respondData['data']['defeated'];

    // getNetInfo()
    // getUserInfo()

    for (let _index = 0; _index < document.getElementsByClassName('lifeReviveNum').length; _index++) {
      document.getElementsByClassName('lifeReviveNum')[_index].innerHTML = respondData['data']['life'];
    };
  });
}

function setUsersAddress() {
  let address = ge('addressInput').value;
  if (!address || address.length !== 42) {
    return
  }
  Service.setUserAddress({
    address: address
  }, (respondData) => {
    getNetInfo()
  });

}

function addressFilter(address) {
  let _address = address.slice(0, 4);
  _address += "****";
  _address += address.slice(address.length - 4, address.length);
  return _address;
}

var gameStatus = false

function startGame() {
  // if (!window.TelegramWebviewProxy) {
  //   ge('message-tip').className = 'show';
  //   ge('message-tip').innerHTML = 'Start game in Telegram.';
  //   setTimeout(() => {
  //     ge('message-tip').className = 'hidden';
  //   }, 2000);
  //   return //TODO
  // };

  if (gameStatus) {
    return;
  }
  gameStatus = true;
  ge('frontPage').className = 'hidden';
  ge('ad-banner').className = 'hidden'
  ge('ruleDialog').className = 'hidden';

  setTimeout(() => {
    ge('game').className = 'show';
    gameStatus = false;
  }, 100)
  newGame()
}

function toRevive() {
  revive = revive - 1;
  revived = true;
  revivescore = score;
  cham.scale(reviveIcon, 1.3, 1.3, 20).onComplete = function () {
    cham.scale(reviveIcon, 1, 1, 20);
    reviveText.text = Number(revive) + '';
  }


  resetLevel();
  cham.fadeIn(btnCont, 10)
  cham.fadeOut(reviveBtnCont, 10)
  reviveBtnCont.interactive = false;
  finishGameBtn.interactive = false;
  cham.fadeOut(finishGameBtn, 0)
  titres = false;
  dieing = false;
  started = false;

  cham.fadeOut(btnswitch, 10)

  cham.fadeIn(btnplay, 10)
  // switchOn = true;
}

function showFrontPage() {
  ge('rankPage').className = 'hidden';
  ge('overPage').className = 'hidden';
  ge('invitePage').className = 'hidden';
  ge('game').className = 'gameHidden';
  ge('frontPage').className = 'show';
  ge('ad-banner').className = 'ad-banner'

  newGame(true);
}

function showInviteView() {
  ge('invitePage').className = 'show';
}

function showRankPage() {
  ge('rankPage').className = 'show'
  ge('game').className = 'gameHidden'
  ge('frontPage').className = 'hidden'
  ge('ad-banner').className = 'hidden'
}

function showOverPage() {
  ge('overPage').className = 'show'
  ge('game').className = 'gameHidden'
  ge('frontPage').className = 'hidden'
  ge('ad-banner').className = 'hidden'

}

function showShareView() {
  ge('lifeDialog').className = 'show';

}

function hideShareView() {
  ge('lifeDialog').className = 'hidden'
}

function hideRuleView() {
  ge('ruleDialog').className = 'hidden'

}

function showRuleView() {
  ge('ruleDialog').className = 'show';
}

function hideIntegralView() {
  ge('integralDialog').className = 'hidden';

}

function showIntegralView() {
  ge('integralDialog').className = 'show';

}

function finishGame() {
  setLevelEndTime()
  setUserScore(score)
  ge("curScoreNum").innerHTML = score;
  cham.fadeIn(btnCont, 0);
  cham.fadeOut(btnswitch, 10);
  cham.fadeIn(btnplay, 10);
  titres = true;
  dieing = false;
  pause = false;
  switchOn = false;
  revived = false;
  start();

  reviveBtnCont.interactive = false;
  finishGameBtn.interactive = false;
  cham.fadeOut(finishGameBtn, 10);
  cham.fadeOut(reviveBtnCont, 10)
  onResize()
  newGame()
  showOverPage()
}

function toInviteFriend(obj) {
  var Url2 = document.getElementById("inviteCode").innerText;
  var oInput = document.createElement('input');
  oInput.value = "You can fill my code to get 2 resurrection props " + Url2;
  document.body.appendChild(oInput);
  oInput.select();
  document.execCommand("Copy");
  oInput.className = 'oInput';
  oInput.style.display = 'none';

  ge('message-tip').className = 'show';
  ge('message-tip').innerHTML = '<img src="https://cdn.jsdelivr.net/gh/MetaYoka/YokaCorsair/static/images/ico-success.svg" alt="">Invitation code copied'
  setTimeout(() => {
    ge('message-tip').className = 'hidden';
  }, 1000)
  TelegramGameProxy.shareScore()
}

function toSetinviter() {
  let inviteCode = ge('inviteInput').value;
  if (!inviteCode) {
    return
  }
  Service.get("setInviter", {
    code: inviteCode
  }, (respondData) => {
    getNetInfo()
  })
}

function showLifeDialog() {
  ge("lifeDialog").className = 'show';
}

function switchSounds() {
  isMute = !isMute;
  if (isMute) {

    ge('soundOpen').className = 'show';
    ge('soundClose').className = 'hidden';
  } else {

    ge('soundOpen').className = 'hidden';
    ge('soundClose').className = 'show';
  }
}


function bindHtmlEvent() {

}

function showTips(text, tips) {
  var Url2 = text;
  var oInput = document.createElement('input');
  oInput.value = Url2;
  document.body.appendChild(oInput);
  oInput.select();
  document.execCommand("Copy");
  oInput.className = 'oInput';
  oInput.style.display = 'none';
  ge('message-tip').className = 'show';
  ge('message-tip').innerHTML = tips;
  setTimeout(() => {
    ge('message-tip').className = 'hidden';
  }, 4000);
}

function _showTips(tips) {
  ge('message-tip').className = 'show';
  ge('message-tip').innerHTML = tips;
  setTimeout(() => {
    ge('message-tip').className = 'hidden';
  }, 4000);
}

window.onLoad = main;

if (window.loaded) {

  main();

};