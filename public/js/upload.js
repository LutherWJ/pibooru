(function() {
  const fileInput = document.getElementById('file-input');
  const queueList = document.getElementById('queue-list');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const previewContent = document.getElementById('preview-content');
  const uploadForm = document.getElementById('upload-form');
  const uploadButton = document.getElementById('upload-button');

  let fileQueue = [];
  let currentPreviewUrl = null;

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    fileQueue = files.map(file => ({
      file,
      status: 'pending',
      error: null
    }));

    renderQueue();
    showPreview(0);
  });

  function renderQueue() {
    queueList.innerHTML = '';
    if (fileQueue.length === 0) {
      queueList.innerHTML = '<li style="padding: 10px; color: #666; text-align: center;">No files selected</li>';
      return;
    }

    fileQueue.forEach((item, index) => {
      const li = document.createElement('li');
      li.style.padding = '8px 12px';
      li.style.borderBottom = '1px solid #222';
      li.style.cursor = 'pointer';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.fontSize = '12px';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.file.name;
      nameSpan.style.overflow = 'hidden';
      nameSpan.style.textOverflow = 'ellipsis';
      nameSpan.style.whiteSpace = 'nowrap';
      nameSpan.style.maxWidth = '70%';

      const statusSpan = document.createElement('span');
      statusSpan.textContent = item.status;
      statusSpan.style.fontSize = '10px';
      statusSpan.style.textTransform = 'uppercase';

      if (item.status === 'pending') statusSpan.style.color = '#888';
      else if (item.status === 'uploading') statusSpan.style.color = '#3b82f6';
      else if (item.status === 'done') statusSpan.style.color = '#10b981';
      else if (item.status === 'error') statusSpan.style.color = '#ef4444';

      li.appendChild(nameSpan);
      li.appendChild(statusSpan);

      li.addEventListener('click', () => showPreview(index));
      queueList.appendChild(li);
    });
  }

  function showPreview(index) {
    const item = fileQueue[index];
    if (!item) return;

    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
    }

    currentPreviewUrl = URL.createObjectURL(item.file);
    previewPlaceholder.style.display = 'none';
    previewContent.style.display = 'flex';
    previewContent.innerHTML = '';

    const isVideo = item.file.type.startsWith('video/');
    if (isVideo) {
      const video = document.createElement('video');
      video.src = currentPreviewUrl;
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '400px';
      previewContent.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = currentPreviewUrl;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '400px';
      img.style.objectFit = 'contain';
      previewContent.appendChild(img);
    }
  }

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (fileQueue.length === 0) return;

    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';

    const rating = uploadForm.rating.value;
    const source = uploadForm.source.value;
    const tags = uploadForm.tags.value;

    for (let i = 0; i < fileQueue.length; i++) {
      if (fileQueue[i].status === 'done') continue;

      fileQueue[i].status = 'uploading';
      renderQueue();

      const formData = new FormData();
      formData.append('file', fileQueue[i].file);
      formData.append('rating', rating);
      formData.append('source', source);
      formData.append('tags', tags);

      try {
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          fileQueue[i].status = 'done';
        } else {
          fileQueue[i].status = 'error';
          const errorData = await response.json().catch(() => ({}));
          console.error('Upload failed:', errorData);
        }
      } catch (err) {
        fileQueue[i].status = 'error';
        console.error('Upload error:', err);
      }
      renderQueue();
    }

    uploadButton.disabled = false;
    uploadButton.textContent = 'Upload';
    
    const allDone = fileQueue.every(item => item.status === 'done');
    if (allDone) {
        alert('All uploads complete!');
        window.location.href = '/';
    }
  });
})();
