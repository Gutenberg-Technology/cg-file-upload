var uploadChunk;

uploadChunk = function(blob, url, filename, chunk, chunks) {
  var formData, xhr;
  xhr = new XMLHttpRequest;
  xhr.open('POST', url, false);
  xhr.onerror = function() {
    throw new Error('error while uploading');
  };
  formData = new FormData;
  formData.append('name', filename);
  formData.append('chunk', chunk);
  formData.append('chunks', chunks);
  formData.append('file', blob);
  xhr.send(formData);
  return xhr.responseText;
};

this.onmessage = function(e) {
  var blob, blobs, bytes_per_chunk, data, end, file, i, j, len, name, response, size, start, url;
  file = e.data.file;
  url = e.data.url;
  blobs = [];
  bytes_per_chunk = 1024 * 1024 * 10;
  start = 0;
  end = bytes_per_chunk;
  size = file.size;
  name = file.name.replace(/[^a-zA-Z-_.0-9]/g, '_');
  name = (Date.now()) + "-" + name;
  while (start < size) {
    blobs.push(file.slice(start, end));
    start = end;
    end = start + bytes_per_chunk;
  }
  for (i = j = 0, len = blobs.length; j < len; i = ++j) {
    blob = blobs[i];
    response = uploadChunk(blob, url, name, i, blobs.length);
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
