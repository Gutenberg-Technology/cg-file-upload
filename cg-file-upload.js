angular.module('cg.fileupload', []);


/*
<div
    cg-file-upload
    upload-url="http://path/to/upload/endpoint"
    upload-method="PUT"
    accept="*.xml,image/*"
    progress="MyCtrl.progress"
    filename="MyCtrl.filename"
    droppable="true"
    onerror="MyCtrl.onError($error)"
    onupload="MyCtrl.onUpload($file)"
    ng-disabled="MyCtrl.disabled"
    awscredentials="MyCtrl.credentials"
    onbeforeupload="MyCtrl.onBeforeUpload($upload_ctrl)"
></div>
 */
angular.module('cg.fileupload').provider('CgFileUpload', function() {
  var _uploadMethod, _uploadUrl;
  _uploadUrl = _uploadMethod = null;
  this.setUploadUrl = function(uploadUrl) {
    return _uploadUrl = uploadUrl;
  };
  this.setUploadMethod = function(uploadMethod) {
    return _uploadMethod = uploadMethod;
  };
  this.$get = function() {
    return {
      uploadUrl: _uploadUrl,
      uploadMethod: _uploadMethod
    };
  };
}).directive('cgFileUpload', function(cgFileUploadCtrl, $parse, CgFileUpload) {
  return {
    restrict: 'A',
    scope: {
      accept: '@',
      progress: '=?',
      filename: '=?',
      onupload: '&',
      onbeforeupload: '&',
      onerror: '&',
      uploadUrl: '@',
      uploadMethod: '@',
      ondragenter: '&',
      mainlist: '=?'
    },
    link: function(scope, elem, attrs) {
      var _finally, _onBeforeUpload, _onError, _onLoad, _onNextUpload, _onProgress, _onUploadStart, ctrl, dropStyle, events, fileQueue, isUploading, options;
      elem = elem[0];
      isUploading = false;
      fileQueue = [];
      _onNextUpload = function(listFiles) {
        if (!scope.mainlist) {
          scope.mainlist = Object.assign([], listFiles);
        }
        if (!isUploading) {
          if (listFiles) {
            fileQueue = listFiles;
          }
          if (fileQueue.length > 0) {
            return ctrl.upload(fileQueue.shift());
          }
        }
      };
      _onUploadStart = function(arg) {
        var filename, progress, size;
        size = arg.size, filename = arg.filename, progress = arg.progress;
        scope.size = size;
        scope.filename = filename;
        scope.progress = progress;
        attrs.$set('disabled', true);
        return scope.$evalAsync();
      };
      _onProgress = function(progress) {
        scope.progress = progress;
        return scope.$evalAsync();
      };
      _onLoad = function(file) {
        if (typeof scope.onupload === "function") {
          scope.onupload({
            $file: file
          });
        }
        return _finally();
      };
      _onBeforeUpload = function(ctrl) {
        isUploading = true;
        return typeof scope.onbeforeupload === "function" ? scope.onbeforeupload({
          $upload_ctrl: ctrl
        }) : void 0;
      };
      _onError = function(e) {
        if (typeof scope.onerror === "function") {
          scope.onerror({
            $error: e
          });
        }
        return _finally();
      };
      _finally = function() {
        isUploading = false;
        attrs.$set('disabled', false);
        scope.progress = 100;
        _onNextUpload();
        return scope.$evalAsync();
      };
      attrs.$observe('disabled', function(disabled) {
        if (disabled) {
          return elem.style.cursor = 'not-allowed';
        } else {
          return elem.style.cursor = null;
        }
      });
      options = {
        accept: scope.accept,
        uploadUrl: scope.uploadUrl || CgFileUpload.uploadUrl,
        uploadMethod: scope.uploadMethod || CgFileUpload.uploadMethod,
        awscredentials: $parse(attrs.awscredentials)(scope),
        disableNormalization: attrs.disableNormalization != null
      };
      events = {
        onBeforeUpload: _onBeforeUpload,
        onUploadStart: _onUploadStart,
        onProgress: _onProgress,
        onLoad: _onLoad,
        onError: _onError,
        onNextUpload: _onNextUpload
      };
      ctrl = new cgFileUploadCtrl(elem, options, events);
      if (attrs.droppable === 'true') {
        dropStyle = 'dropping';
        elem.addEventListener('dragenter', function(e) {
          if (typeof scope.ondragenter === "function") {
            scope.ondragenter();
          }
          e.preventDefault();
          return true;
        });
        elem.addEventListener('dragleave', function(e) {
          elem.classList.remove(dropStyle);
          return true;
        });
        elem.addEventListener('dragover', function(e) {
          e.preventDefault();
          elem.classList.add(dropStyle);
          return false;
        });
        return elem.addEventListener('drop', function(e) {
          var files;
          e.preventDefault();
          e.stopPropagation();
          files = e.dataTransfer.files;
          if (files.length > 0) {
            Object.keys(files).forEach(function(key) {
              return fileQueue.push(files[key]);
            });
          }
          _onNextUpload(fileQueue);
          return false;
        });
      }
    }
  };
});

var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

angular.module('cg.fileupload').factory('cgFileUploadCtrl', function($timeout, $q, $http) {
  var cgFileUploadCtrl;
  cgFileUploadCtrl = (function() {
    var _tempArray;

    function cgFileUploadCtrl(elem, arg, arg1) {
      this.elem = elem != null ? elem : null;
      this.accept = arg.accept, this.uploadUrl = arg.uploadUrl, this.uploadMethod = arg.uploadMethod, this.awscredentials = arg.awscredentials, this.disableNormalization = arg.disableNormalization;
      this.onNextUpload = arg1.onNextUpload, this.onBeforeUpload = arg1.onBeforeUpload, this.onUploadStart = arg1.onUploadStart, this.onProgress = arg1.onProgress, this.onLoad = arg1.onLoad, this.onError = arg1.onError;
      this._errorHandler = bind(this._errorHandler, this);
      this.start = bind(this.start, this);
      this._createInput();
    }

    _tempArray = [];

    cgFileUploadCtrl.prototype._createInput = function() {
      var ref, ref1, ref2;
      if ((ref = this._input) != null) {
        if ((ref1 = ref.parentElement) != null) {
          ref1.removeChild(this._input);
        }
      }
      this._input = document.createElement('input');
      this._input.type = 'file';
      this._input.setAttribute('multiple', '');
      this._input.style.display = 'none';
      if (this.accept) {
        this._input.accept = this.accept;
      }
      this._input.addEventListener('change', (function(_this) {
        return function() {
          Object.keys(_this._input.files).forEach(function(key) {
            return _tempArray.push(_this._input.files[key]);
          });
          return _this.onNextUpload(_tempArray);
        };
      })(this));
      if (this.elem) {
        if ((ref2 = this.elem.parentElement) != null) {
          ref2.appendChild(this._input);
        }
        return this.elem.addEventListener('click', this.start);
      } else {
        return document.body.appendChild(this._input);
      }
    };

    cgFileUploadCtrl.prototype.start = function() {
      if (this._disabled) {
        return;
      }
      this._input.click();
    };

    cgFileUploadCtrl.prototype._loadHandler = function(response) {
      var file;
      if (response == null) {
        response = {};
      }
      if (typeof response === 'string') {
        if (response.length) {
          response = JSON.parse(response);
        } else {
          response = {};
        }
      }
      if (response.file) {
        file = response.file;
        file.url = file.directurl;
      } else {
        file = response;
      }
      file.size = this._size;
      file.type = this._mimetype;
      if (typeof this.onLoad === "function") {
        this.onLoad(file);
      }
      this._disabled = false;
      return this._createInput();
    };

    cgFileUploadCtrl.prototype._errorHandler = function(e) {
      if (typeof this.onError === "function") {
        this.onError(e);
      }
      this._disabled = false;
      return this._createInput();
    };

    cgFileUploadCtrl.prototype._uploadS3BySignedUrl = function(file, uploadUrl, cacheControl) {
      var defer;
      defer = $q.defer();
      $http.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
          'Cache-Control': cacheControl
        },
        uploadEventHandlers: {
          progress: function(data) {
            return defer.notify(Math.round((data.loaded / data.total) * 100));
          }
        }
      }).then(function(data) {
        return defer.resolve(data);
      }, function(err) {
        return defer.reject(err);
      });
      return defer.promise;
    };

    cgFileUploadCtrl.prototype._uploadS3 = function(arg) {
      var awsS3, bucket, cacheControl, defer, destFolder, file, fileParams, filename, options, signedUrl, uploadMethod, uploadUrl;
      file = arg.file, filename = arg.filename, destFolder = arg.destFolder, signedUrl = arg.signedUrl, uploadMethod = arg.uploadMethod, uploadUrl = arg.uploadUrl, cacheControl = arg.cacheControl;
      if (signedUrl) {
        return this._uploadS3BySignedUrl(file, uploadUrl, cacheControl);
      }
      defer = $q.defer();
      awsS3 = this.awscredentials;
      AWS.config.update({
        signatureVersion: 'v4',
        region: awsS3.region
      });
      if (awsS3.endpoint) {
        AWS.config.endpoint = new AWS.Endpoint(awsS3.endpoint);
        AWS.config.s3ForcePathStyle = true;
      }
      AWS.config.credentials = new AWS.Credentials({
        accessKeyId: awsS3.accessKeyId,
        sessionToken: awsS3.sessionToken,
        secretAccessKey: awsS3.secretAccessKey
      });
      bucket = new AWS.S3({
        params: {
          Bucket: awsS3.bucket
        }
      });
      if (destFolder) {
        filename = destFolder + "/" + filename;
      }
      fileParams = {
        Key: filename,
        ContentType: file.type,
        CacheControl: cacheControl,
        Body: file,
        ACL: "public-read"
      };
      options = {
        partSize: 10 * 1024 * 1024,
        queueSize: 1
      };
      bucket.upload(fileParams, options).on('httpUploadProgress', function(data) {
        return defer.notify(Math.round((data.loaded / data.total) * 100));
      }).send(function(err, data) {
        if (err) {
          return defer.reject(err);
        } else {
          return defer.resolve({
            url: data.Location
          });
        }
      });
      return defer.promise;
    };

    cgFileUploadCtrl.prototype._uploadWorker = function(arg) {
      var data, defer, destFolder, file, filename, script, uploadMethod, uploadUrl, worker, workerUrl;
      file = arg.file, filename = arg.filename, uploadUrl = arg.uploadUrl, uploadMethod = arg.uploadMethod, destFolder = arg.destFolder;
      defer = $q.defer();
      script = document.querySelectorAll('[src*="cg-file-upload.js"]')[0];
      workerUrl = new URL(script.src.replace('file-upload.js', 'file-upload-worker.js'));
      worker = new Worker(workerUrl.pathname);
      worker.onmessage = function(e) {
        switch (e.data.message) {
          case 'load':
            return defer.resolve(e.data.body);
          case 'progress':
            return defer.notify(e.data.body);
        }
      };
      worker.onerror = defer.reject;
      if (destFolder) {
        filename = destFolder + "/" + filename;
      }
      data = {
        file: file,
        url: uploadUrl,
        method: uploadMethod,
        name: filename
      };
      worker.postMessage(data);
      return defer.promise;
    };

    cgFileUploadCtrl.prototype._normalizeName = function(name) {
      var _prefixRand;
      if (this.disableNormalization) {
        return name;
      }
      name = name.replace(/[^a-zA-Z-_.0-9]/g, '_');
      _prefixRand = (Math.floor(Math.random() * 10000)) + "-" + (Date.now());
      return _prefixRand + "-" + name;
    };

    cgFileUploadCtrl.prototype._upload = function(arg) {
      var cacheControl, destFolder, file, filename, func, signedUrl, uploadMethod, uploadUrl;
      file = arg.file, filename = arg.filename, destFolder = arg.destFolder, uploadUrl = arg.uploadUrl, uploadMethod = arg.uploadMethod, signedUrl = arg.signedUrl, cacheControl = arg.cacheControl;
      this._disabled = true;
      func = this.awscredentials || signedUrl ? '_uploadS3' : '_uploadWorker';
      return this[func]({
        file: file,
        filename: filename,
        destFolder: destFolder,
        uploadUrl: uploadUrl,
        uploadMethod: uploadMethod,
        signedUrl: signedUrl,
        cacheControl: cacheControl
      }).then((function(_this) {
        return function(data) {
          return _this._loadHandler(data);
        };
      })(this), (function(_this) {
        return function(err) {
          return _this._errorHandler(err);
        };
      })(this), (function(_this) {
        return function(data) {
          return typeof _this.onProgress === "function" ? _this.onProgress(data) : void 0;
        };
      })(this));
    };

    cgFileUploadCtrl.prototype.upload = function(file) {
      var _ctrl, _doUpload, _filename, _originalFilename, promise;
      if (!file) {
        return;
      }
      this._size = (file.size / Math.pow(1024, 2)).toFixed(2);
      this._mimetype = file.type;
      _originalFilename = file.name;
      _filename = this._normalizeName(file.name);
      if (typeof this.onUploadStart === "function") {
        this.onUploadStart({
          size: this._size,
          filename: _filename,
          progress: 0
        });
      }
      _ctrl = {
        filename: _filename,
        originalFilename: _originalFilename,
        file: file,
        signedUrl: false,
        setDestFolder: function(destFolder) {
          return _ctrl.destFolder = destFolder;
        },
        setFileName: function(filename) {
          return _ctrl.filename = filename;
        },
        setUploadUrl: function(uploadUrl) {
          return _ctrl.uploadUrl = uploadUrl;
        },
        setUploadMethod: function(uploadMethod) {
          return _ctrl.uploadMethod = uploadMethod;
        },
        isSignedUrl: function(signedUrl) {
          return _ctrl.signedUrl = signedUrl;
        },
        setCacheControl: function(cacheControl) {
          return _ctrl.cacheControl = cacheControl;
        }
      };
      _doUpload = (function(_this) {
        return function() {
          return _this._upload({
            file: file,
            filename: _ctrl.filename,
            destFolder: _ctrl.destFolder,
            uploadUrl: _ctrl.uploadUrl || _this.uploadUrl,
            uploadMethod: _ctrl.uploadMethod || _this.uploadMethod,
            signedUrl: _ctrl.signedUrl,
            cacheControl: _ctrl.cacheControl || 'no-cache'
          });
        };
      })(this);
      if (this.onBeforeUpload) {
        promise = this.onBeforeUpload(_ctrl);
        if ((promise != null ? promise.then : void 0) != null) {
          return promise.then(_doUpload);
        } else {
          return _doUpload();
        }
      } else {
        return _doUpload();
      }
    };

    return cgFileUploadCtrl;

  })();
  return cgFileUploadCtrl;
});
