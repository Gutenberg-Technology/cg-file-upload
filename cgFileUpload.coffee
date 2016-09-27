###
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
###
angular.module('cg.fileupload')
.provider 'CgFileUpload', ->

    _uploadUrl = null

    @setUploadUrl = (uploadUrl) -> _uploadUrl = uploadUrl

    @$get = ->
        uploadUrl: _uploadUrl

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
    link: (scope, elem, attrs) ->

        elem = elem[0]

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
            scope.onbeforeupload?($upload_ctrl: ctrl)

        _onError = (e) ->
            scope.onerror?($error: e)
            _finally()

        _finally = ->
            attrs.$set 'disabled', false
            scope.progress = 100
            scope.$evalAsync()

        attrs.$observe 'disabled', (disabled) ->
            if disabled
                elem.style.cursor = 'not-allowed'
            else elem.style.cursor = null

        options =
            accept: scope.accept
            uploadUrl: scope.uploadUrl or CgFileUpload.uploadUrl
            awscredentials: $parse(attrs.awscredentials)(scope)

        events =
            onBeforeUpload: _onBeforeUpload
            onUploadStart: _onUploadStart
            onProgress: _onProgress
            onLoad: _onLoad
            onError: _onError

        ctrl = new cgFileUploadCtrl(elem, options, events)

        if attrs.droppable is 'true'
            dropStyle = 'dropping'

            elem.addEventListener 'dragenter', (e) ->
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
                elem.classList.remove dropStyle
                ctrl.upload(e.dataTransfer.files[0])
                return false
