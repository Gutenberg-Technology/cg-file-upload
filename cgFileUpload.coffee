# polyfill for IE/Edge (URL object)

((global) ->

    URLPolyfill = (url, baseURL) ->
        if typeof url != 'string'
            throw new TypeError('URL must be a string')
        m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(?:\/\/(?:([^:@\/?#]*)(?::([^:@\/?#]*))?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/)
        if !m
            throw new RangeError('Invalid URL format')
        protocol = m[1] or ''
        username = m[2] or ''
        password = m[3] or ''
        host = m[4] or ''
        hostname = m[5] or ''
        port = m[6] or ''
        pathname = m[7] or ''
        search = m[8] or ''
        hash = m[9] or ''
        if baseURL != undefined
            base = if baseURL instanceof URLPolyfill then baseURL else new URLPolyfill(baseURL)
            flag = !protocol and !host and !username
            if flag and !pathname and !search
                search = base.search
            if flag and pathname[0] != '/'
                pathname = if pathname then (if (base.host or base.username) and !base.pathname then '/' else '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + pathname else base.pathname
            # dot segments removal
            output = []
            pathname.replace(/^(\.\.?(\/|$))+/, '').replace(/\/(\.(\/|$))+/g, '/').replace(/\/\.\.$/, '/../').replace /\/?[^\/]*/g, (p) ->
                if p == '/..'
                    output.pop()
                else
                    output.push p
                return
            pathname = output.join('').replace(/^\//, if pathname[0] == '/' then '/' else '')
            if flag
                port = base.port
                hostname = base.hostname
                host = base.host
                password = base.password
                username = base.username
            if !protocol
                protocol = base.protocol
        # convert URLs to use / always
        pathname = pathname.replace(/\\/g, '/')
        @origin = if host then protocol + (if protocol != '' or host != '' then '//' else '') + host else ''
        @href = protocol + (if protocol and host or protocol == 'file:' then '//' else '') + (if username != '' then username + (if password != '' then ':' + password else '') + '@' else '') + host + pathname + search + hash
        @protocol = protocol
        @username = username
        @password = password
        @host = host
        @hostname = hostname
        @port = port
        @pathname = pathname
        @search = search
        @hash = hash
        return

    global.URLPolyfill = URLPolyfill
    return
) if typeof self != 'undefined' then self else global

# ---

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
