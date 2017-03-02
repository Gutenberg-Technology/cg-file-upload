angular.module('cg.fileupload')
.factory 'cgFileUploadCtrl', ($timeout, $q) ->

    class cgFileUploadCtrl

        constructor: (
            @elem = null
            { @accept, @uploadUrl, @awscredentials, @disableNormalization }
            { @onBeforeUpload, @onUploadStart, @onProgress, @onLoad, @onError }
        ) ->
            @_createInput()

        _createInput: ->
            @_input?.parentElement.removeChild @_input
            @_input = document.createElement 'input'
            @_input.type = 'file'
            @_input.style.display = 'none'
            @_input.accept = @accept if @accept
            @_input.addEventListener 'change', => @upload @_input.files[0]
            if @elem
                @elem.parentElement.appendChild @_input
                @elem.addEventListener 'click', @start
            else document.body.appendChild @_input

        start: =>
            return if @_disabled
            $timeout => @_input.click()

        _loadHandler: (response) ->
            # should not happend, just to be sure ;)
            if typeof response is 'string'
                response = JSON.parse(response)

            # manage old response format
            if response.file
                file = response.file
                file.url = file.directurl
            else file = response

            file.size = @_size
            file.type = @_mimetype

            @onLoad?(file)
            @_disabled = false
            @_createInput()

        _errorHandler: (e) =>
            @onError?(e)
            @_disabled = false
            @_createInput()

        _uploadS3: ({ file, filename, destFolder }) ->
            defer = $q.defer()
            awsS3 = @awscredentials

            AWS.config.update(
                signatureVersion: 'v4'
                region: awsS3.region
            )
            if awsS3.endpoint
                AWS.config.endpoint = new AWS.Endpoint(awsS3.endpoint)
                AWS.config.s3ForcePathStyle = true
            AWS.config.credentials = new AWS.Credentials(
                accessKeyId: awsS3.accessKeyId
                sessionToken: awsS3.sessionToken
                secretAccessKey: awsS3.secretAccessKey
            )
            bucket = new AWS.S3(
                params: Bucket: awsS3.bucket
            )

            filename = "#{ destFolder }/#{ filename }" if destFolder

            fileParams =
                Key: filename
                ContentType: file.type
                Body: file
                ACL: "public-read"

            # For multipart upload to work:
            # Etag header needs to be exposed in the bucket
            # Keep the partSize less than 30mb
            options =
                partSize: 10 * 1024 * 1024
                queueSize: 1

            bucket.upload fileParams, options
            .on 'httpUploadProgress', (data) ->
                defer.notify Math.round (data.loaded / data.total) * 100
            .send (err, data) ->
                if err
                    defer.reject(err)
                else defer.resolve(url: data.Location)

            return defer.promise

        _uploadWorker: ({ file, filename }) ->
            defer = $q.defer()
            script = document.querySelectorAll('[src*="cg-file-upload.js"]')[0]
            workerUrl = new URL script.src.replace 'file-upload.js', 'file-upload-worker.js'
            worker = new Worker workerUrl.pathname
            worker.onmessage = (e) ->
                switch e.data.message
                    when 'load' then defer.resolve(e.data.body)
                    when 'progress' then defer.notify(e.data.body)

            worker.onerror = defer.reject

            data =
                file: file
                url: @uploadUrl
                name: filename
            worker.postMessage data

            return defer.promise

        _normalizeName: (name) ->
            return name if @disableNormalization
            name = name.replace /[^a-zA-Z-_.0-9]/g, '_'
            _prefixRand = "#{ Math.floor(Math.random() * 10000) }-#{ Date.now() }"
            return "#{ _prefixRand }-#{ name }"

        upload: (file) ->
            return unless file
            @_size = (file.size / Math.pow(1024, 2)).toFixed(2)
            @_mimetype = file.type
            _originalFilename = file.name
            _filename = @_normalizeName(file.name)
            @onUploadStart?(
                size: @_size
                filename: _filename
                progress: 0
            )

            _ctrl =
                filename: _filename
                originalFilename: _originalFilename
                setDestFolder: (destFolder) -> _ctrl.destFolder = destFolder
                setFileName: (filename) -> _ctrl.filename = filename
            @onBeforeUpload?(_ctrl)

            @_disabled = true

            func = if @awscredentials then '_uploadS3' else '_uploadWorker'
            this[func](
                file: file
                filename: _ctrl.filename
                destFolder: _ctrl.destFolder
            ).then(
                (data) => @_loadHandler(data) # success
                (err) => @_errorHandler(err) # error
                (data) => @onProgress?(data) # notify
            )

    return cgFileUploadCtrl
