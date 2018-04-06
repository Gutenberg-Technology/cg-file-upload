###
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
###
angular.module('cg.fileupload')
.provider 'CgFileUpload', ->

    _uploadUrl = _uploadMethod = null

    @setUploadUrl = (uploadUrl) -> _uploadUrl = uploadUrl
    @setUploadMethod = (uploadMethod) -> _uploadMethod = uploadMethod

    @$get = ->
        uploadUrl: _uploadUrl
        uploadMethod: _uploadMethod

    return
.directive 'cgFileUpload', (cgFileUploadCtrl, $parse, CgFileUpload) ->

    restrict: 'A'
    scope:
        accept: '@'
        progress: '=?'
        filename: '=?'
        onupload: '&'
        onbeforeupload: '&'
        onerror: '&'
        uploadUrl: '@'
        uploadMethod: '@'
        ondragenter: '&'
        mainlist: '=?'
    link: (scope, elem, attrs) ->

        elem = elem[0]
        isUploading = false
        fileQueue = []

        _onNextUpload = (listFiles) ->
            if not scope.mainlist
                scope.mainlist = Object.assign [], listFiles
            if not isUploading
                if listFiles
                    fileQueue = listFiles
                if fileQueue.length > 0
                    ctrl.upload(fileQueue.shift())

        _onUploadStart = ({ size, filename, progress }) ->
            scope.size = size
            scope.filename = filename
            scope.progress = progress
            attrs.$set 'disabled', true
            scope.$evalAsync()

        _onProgress = (progress) ->
            scope.progress = progress
            scope.$evalAsync()

        _onLoad = (file) ->
            scope.onupload?($file: file)
            _finally()

        _onBeforeUpload = (ctrl) ->
            isUploading = true
            scope.onbeforeupload?($upload_ctrl: ctrl)

        _onError = (e) ->
            scope.onerror?($error: e)
            _finally()

        _finally = ->
            isUploading = false
            attrs.$set 'disabled', false
            scope.progress = 100
            _onNextUpload()
            scope.$evalAsync()

        attrs.$observe 'disabled', (disabled) ->
            if disabled
                elem.style.cursor = 'not-allowed'
            else elem.style.cursor = null

        options =
            accept: scope.accept
            uploadUrl: scope.uploadUrl or CgFileUpload.uploadUrl
            uploadMethod: scope.uploadMethod or CgFileUpload.uploadMethod
            awscredentials: $parse(attrs.awscredentials)(scope)
            disableNormalization: attrs.disableNormalization?

        events =
            onBeforeUpload: _onBeforeUpload
            onUploadStart: _onUploadStart
            onProgress: _onProgress
            onLoad: _onLoad
            onError: _onError
            onNextUpload: _onNextUpload

        ctrl = new cgFileUploadCtrl(elem, options, events)

        if attrs.droppable is 'true'
            dropStyle = 'dropping'

            elem.addEventListener 'dragenter', (e) ->
                scope.ondragenter?()
                e.preventDefault()
                return true

            elem.addEventListener 'dragleave', (e) ->
                elem.classList.remove dropStyle
                return true

            elem.addEventListener 'dragover', (e) ->
                e.preventDefault()
                elem.classList.add dropStyle
                return false

            elem.addEventListener 'drop', (e) ->
                e.preventDefault()
                e.stopPropagation()
                # elem.classList.remove dropStyle
                files = e.dataTransfer.files
                if files.length > 0
                    Object.keys(files).forEach (key) ->
                        fileQueue.push files[key]
                _onNextUpload(fileQueue)
                
                return false
