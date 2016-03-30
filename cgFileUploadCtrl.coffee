angular.module('cg.fileupload').factory 'cgFileUploadCtrl', ($timeout) ->

    class cgFileUploadCtrl

        constructor: (
            @elem = null
            { @accept, @uploadUrl }
            { @onUploadStart, @onProgress, @onLoad, @onError }
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
            try
                file = JSON.parse(response)
                file.size = @_size
            catch e then file = response
            @onLoad?(file)
            @_disabled = false
            @_createInput()

        _errorHandler: (e) =>
            @onError?(e)
            @_disabled = false
            @_createInput()

        upload: (file) ->
            return unless file
            @_size = (file.size / Math.pow(1024, 2)).toFixed(2)
            @onUploadStart?(
                size: @_size
                filename: file.name
                progress: 0
            )
            @_disabled = true

            script = document.querySelectorAll('[src*="cg-file-upload"]')[0]
            workerUrl = script.src.replace 'cg-file-upload.js', 'cg-file-upload-worker.js'
            worker = new Worker workerUrl
            worker.onmessage = (e) =>
                switch e.data.message
                    when 'load' then @_loadHandler(e.data.body)
                    when 'progress' then @onProgress?(e.data.body)

            worker.onerror = @_errorHandler

            data =
                file: file
                url: @uploadUrl
            worker.postMessage data

    return cgFileUploadCtrl
