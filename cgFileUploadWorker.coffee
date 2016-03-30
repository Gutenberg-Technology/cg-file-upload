uploadChunk = (blob, url, filename, chunk, chunks) ->
    xhr = new XMLHttpRequest
    xhr.open 'POST', url, false
    xhr.onerror = -> throw new Error 'error while uploading'
    formData = new FormData
    formData.append 'name', filename
    formData.append 'chunk', chunk
    formData.append 'chunks', chunks
    formData.append 'file', blob
    xhr.send formData
    return xhr.responseText

@onmessage = (e) ->
    file = e.data.file
    url = e.data.url
    blobs = []
    bytes_per_chunk = 1024 * 1024 * 36 # 36MB
    start = 0
    end = bytes_per_chunk
    size = file.size
    name = file.name.replace /[^a-zA-Z-_.0-9]/g, '_'

    while start < size
        blobs.push file.slice(start, end)
        start = end
        end = start + bytes_per_chunk

    for blob, i in blobs
        response = uploadChunk(blob, url, name, i, blobs.length)
        data =
            message: 'progress'
            body: ((i + 1) * 100 / blobs.length).toFixed(0)
        @postMessage data

    data =
        message: 'load'
        body: response
    @postMessage data
