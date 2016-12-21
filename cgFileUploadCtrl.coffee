angular.module('cg.fileupload')
.factory 'cgFileUploadCtrl', ($timeout, $q) ->

    class cgFileUploadCtrl

        constructor: (
            @elem = null
            { @accept, @uploadUrl, @awscredentials }
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


        _setDestFolder: (destFolder) =>
            @awscredentials.destFolder = destFolder


        _uploadS3: (file) ->
            defer = $q.defer()
            awsS3 = @awscredentials

            AWS.config.update(
                signatureVersion: 'v4'
                region: awsS3.region
            )
            AWS.config.credentials = new AWS.Credentials(
                accessKeyId: awsS3.accessKeyId
                sessionToken: awsS3.sessionToken
                secretAccessKey: awsS3.secretAccessKey
            )
            bucket = new AWS.S3(
                params: Bucket: awsS3.bucket
            )

            _prefixRand = "#{ Math.floor(Math.random() * 10000) }-#{ Date.now() }_"
            _fileName = if awsS3.destFolder then "#{ awsS3.destFolder }/#{ _prefixRand }#{ file.name }" else "#{ _prefixRand }#{ file.name }"

            fileParams =
                Key: _fileName
                ContentType: file.type
                Body: file
                ACL: "public-read"

            options =
                partSize: 50 * 1024 * 1024
                queueSize: 1

            bucket.upload fileParams, options, (err, data) ->
                if err
                    defer.reject(err)
                else defer.resolve(url: data.Location)
            .on 'httpUploadProgress', (data) ->
                defer.notify( Math.round(data.loaded / data.total) * 100 )

            return defer.promise


        _uploadWorker: (file) ->
            defer = $q.defer()
            script = document.querySelectorAll('[src*="file-upload"]')[0]
            URL = URLPolyfill
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
            worker.postMessage data

            return defer.promise

        upload: (file) ->
            return unless file
            @_size = (file.size / Math.pow(1024, 2)).toFixed(2)
            @_mimetype = file.type
            @onUploadStart?(
                size: @_size
                filename: file.name
                progress: 0
            )

            @onBeforeUpload?(
                filename: file.name
                setDestFolder: @_setDestFolder
            )

            @_disabled = true

            func = if @awscredentials then '_uploadS3' else '_uploadWorker'
            this[func](file).then(
                (data) => @_loadHandler(data) # success
                (err) => @_errorHandler(err) # error
                (data) => @onProgress?(data) # notify
            )


    return cgFileUploadCtrl
