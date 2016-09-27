angular.module('cg.fileupload', []);


/*
<div
    cg-file-upload
    upload-url="http://path/to/upload/endpoint"
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
angular.module('cg.fileupload').directive('cgFileUpload', function(cgFileUploadCtrl, $parse) {
  return {
    restrict: 'A',
    scope: {
      accept: '@',
      progress: '=?',
      filename: '=?',
      onupload: '&',
      onbeforeupload: '&',
      onerror: '&',
      uploadUrl: '@'
    },
    link: function(scope, elem, attrs) {
      var _finally, _onBeforeUpload, _onError, _onLoad, _onProgress, _onUploadStart, ctrl, dropStyle, events, options;
      elem = elem[0];
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
        attrs.$set('disabled', false);
        scope.progress = 100;
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
        uploadUrl: scope.uploadUrl,
        awscredentials: $parse(attrs.awscredentials)(scope)
      };
      events = {
        onBeforeUpload: _onBeforeUpload,
        onUploadStart: _onUploadStart,
        onProgress: _onProgress,
        onLoad: _onLoad,
        onError: _onError
      };
      ctrl = new cgFileUploadCtrl(elem, options, events);
      if (attrs.droppable === 'true') {
        dropStyle = 'dropping';
        elem.addEventListener('dragenter', function(e) {
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
          e.preventDefault();
          e.stopPropagation();
          elem.classList.remove(dropStyle);
          ctrl.upload(e.dataTransfer.files[0]);
          return false;
        });
      }
    }
  };
});

var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

angular.module('cg.fileupload').factory('cgFileUploadCtrl', function($timeout, $q) {
  var cgFileUploadCtrl;
  cgFileUploadCtrl = (function() {
    function cgFileUploadCtrl(elem, arg, arg1) {
      this.elem = elem != null ? elem : null;
      this.accept = arg.accept, this.uploadUrl = arg.uploadUrl, this.awscredentials = arg.awscredentials;
      this.onBeforeUpload = arg1.onBeforeUpload, this.onUploadStart = arg1.onUploadStart, this.onProgress = arg1.onProgress, this.onLoad = arg1.onLoad, this.onError = arg1.onError;
      this._setDestFolder = bind(this._setDestFolder, this);
      this._errorHandler = bind(this._errorHandler, this);
      this.start = bind(this.start, this);
      this._createInput();
    }

    cgFileUploadCtrl.prototype._createInput = function() {
      var ref;
      if ((ref = this._input) != null) {
        ref.parentElement.removeChild(this._input);
      }
      this._input = document.createElement('input');
      this._input.type = 'file';
      this._input.style.display = 'none';
      if (this.accept) {
        this._input.accept = this.accept;
      }
      this._input.addEventListener('change', (function(_this) {
        return function() {
          return _this.upload(_this._input.files[0]);
        };
      })(this));
      if (this.elem) {
        this.elem.parentElement.appendChild(this._input);
        return this.elem.addEventListener('click', this.start);
      } else {
        return document.body.appendChild(this._input);
      }
    };

    cgFileUploadCtrl.prototype.start = function() {
      if (this._disabled) {
        return;
      }
      return $timeout((function(_this) {
        return function() {
          return _this._input.click();
        };
      })(this));
    };

    cgFileUploadCtrl.prototype._loadHandler = function(file) {
      try {
        if (typeof file !== 'object') {
          file = JSON.parse(file);
        }
        file.size = this._size;
      } catch (undefined) {}
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

    cgFileUploadCtrl.prototype._setDestFolder = function(destFolder) {
      return this.awscredentials.destFolder = destFolder;
    };

    cgFileUploadCtrl.prototype._uploadS3 = function(file) {
      var _fileName, _prefixRand, awsS3, bucket, defer, fileParams, options;
      defer = $q.defer();
      awsS3 = this.awscredentials;
      AWS.config.update({
        signatureVersion: 'v4',
        region: awsS3.region
      });
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
      _prefixRand = (Math.floor(Math.random() * 10000)) + "-" + (Date.now()) + "_";
      _fileName = awsS3.destFolder ? awsS3.destFolder + "/" + _prefixRand + file.name : "" + _prefixRand + file.name;
      fileParams = {
        Key: _fileName,
        ContentType: file.type,
        Body: file,
        ACL: "public-read"
      };
      options = {
        partSize: 50 * 1024 * 1024,
        queueSize: 1
      };
      bucket.upload(fileParams, options, function(err, data) {
        if (err) {
          return defer.reject(err);
        } else {
          return defer.resolve({
            url: data.Location
          });
        }
      }).on('httpUploadProgress', function(data) {
        return defer.notify(Math.round(data.loaded / data.total) * 100);
      });
      return defer.promise;
    };

    cgFileUploadCtrl.prototype._uploadWorker = function(file) {
      var data, defer, script, worker, workerUrl;
      defer = $q.defer();
      script = document.querySelectorAll('[src*="file-upload"]')[0];
      workerUrl = script.src.replace('file-upload.js', 'file-upload-worker.js');
      worker = new Worker(workerUrl);
      worker.onmessage = function(e) {
        switch (e.data.message) {
          case 'load':
            return defer.resolve(e.data.body);
          case 'progress':
            return defer.notify(e.data.body);
        }
      };
      worker.onerror = defer.reject;
      data = {
        file: file,
        url: this.uploadUrl
      };
      worker.postMessage(data);
      return defer.promise;
    };

    cgFileUploadCtrl.prototype.upload = function(file) {
      var func;
      if (!file) {
        return;
      }
      this._size = (file.size / Math.pow(1024, 2)).toFixed(2);
      if (typeof this.onUploadStart === "function") {
        this.onUploadStart({
          size: this._size,
          filename: file.name,
          progress: 0
        });
      }
      if (typeof this.onBeforeUpload === "function") {
        this.onBeforeUpload({
          filename: file.name,
          setDestFolder: this._setDestFolder
        });
      }
      this._disabled = true;
      func = this.awscredentials ? '_uploadS3' : '_uploadWorker';
      return this[func](file).then((function(_this) {
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

    return cgFileUploadCtrl;

  })();
  return cgFileUploadCtrl;
});
