var uploadChunk;

uploadChunk = function(blob, url, method, filename, chunk, chunks, contentType) {
  var formData, xhr;
  xhr = new XMLHttpRequest;
  xhr.open(method, url, false);
  xhr.onerror = function() {
    throw new Error('error while uploading');
  };
  formData = new FormData;
  formData.append('name', filename);
  formData.append('chunk', chunk);
  formData.append('chunks', chunks);
  formData.append('file', blob);
  formData.append('contentType', contentType);
  xhr.send(formData);
  return xhr.responseText;
};

this.onmessage = function(e) {
  var blob, blobs, bytes_per_chunk, data, end, file, i, j, len, method, name, response, size, start, url;
  file = e.data.file;
  url = e.data.url;
  method = e.data.method || 'POST';
  name = e.data.name;
  blobs = [];
  bytes_per_chunk = 1024 * 1024 * 10;
  start = 0;
  end = bytes_per_chunk;
  size = file.size;
  while (start < size) {
    blobs.push(file.slice(start, end));
    start = end;
    end = start += bytes_per_chunk;
  }
  for (i = j = 0, len = blobs.length; j < len; i = ++j) {
    blob = blobs[i];
    response = uploadChunk(blob, url, method, name, i, blobs.length, file.type);
    data = {
      message: 'progress',
      body: ((i + 1) * 100 / blobs.length).toFixed(0)
    };
    this.postMessage(data);
  }
  data = {
    message: 'load',
    body: response
  };
  return this.postMessage(data);
};
