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
></div>
 */
angular.module('cg.fileupload').directive('cgFileUpload', function(cgFileUploadCtrl) {
  return {
    restrict: 'A',
    scope: {
      accept: '@',
      progress: '=?',
      filename: '=?',
      onupload: '&',
      onerror: '&',
      uploadUrl: '@'
    },
    link: function(scope, elem, attrs) {
      var _finally, _onError, _onLoad, _onProgress, _onUploadStart, ctrl, dropStyle, events, options;
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
        uploadUrl: scope.uploadUrl
      };
      events = {
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

angular.module('cg.fileupload').factory('cgFileUploadCtrl', function($timeout) {
  var cgFileUploadCtrl;
  cgFileUploadCtrl = (function() {
    function cgFileUploadCtrl(elem, arg, arg1) {
      this.elem = elem != null ? elem : null;
      this.accept = arg.accept, this.uploadUrl = arg.uploadUrl;
      this.onUploadStart = arg1.onUploadStart, this.onProgress = arg1.onProgress, this.onLoad = arg1.onLoad, this.onError = arg1.onError;
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

    cgFileUploadCtrl.prototype._loadHandler = function(response) {
      var e, error, file;
      try {
        file = JSON.parse(response);
        file.size = this._size;
      } catch (error) {
        e = error;
        file = response;
      }
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

    cgFileUploadCtrl.prototype.upload = function(file) {
      var data, script, worker, workerUrl;
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
      this._disabled = true;
      script = document.querySelectorAll('[src*="cg-file-upload"]')[0];
      workerUrl = script.src.replace('cg-file-upload.js', 'cg-file-upload-worker.js');
      worker = new Worker(workerUrl);
      worker.onmessage = (function(_this) {
        return function(e) {
          switch (e.data.message) {
            case 'load':
              return _this._loadHandler(e.data.body);
            case 'progress':
              return typeof _this.onProgress === "function" ? _this.onProgress(e.data.body) : void 0;
          }
        };
      })(this);
      worker.onerror = this._errorHandler;
      data = {
        file: file,
        url: this.uploadUrl
      };
      return worker.postMessage(data);
    };

    return cgFileUploadCtrl;

  })();
  return cgFileUploadCtrl;
});
