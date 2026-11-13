const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.port === '3000'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : '');

const API_BASE = `${BACKEND_BASE}/api`;

export const apiClient = {
  /**
   * Create a new room
   */
  async createRoom(data = {}) {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create room');
    return json.room;
  },

  /**
   * Find room by 4-char code
   */
  async getRoomByCode(code) {
    const res = await fetch(`${API_BASE}/rooms/code/${encodeURIComponent(code)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Room not found');
    return json.room;
  },

  /**
   * Get room by ID
   */
  async getRoomById(roomId, token) {
    const headers = {};
    if (token) headers['x-pairing-token'] = token;
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}`, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to get room');
    return json.room;
  },

  /**
   * Validate room session for TV/mobile auto-reconnect
   */
  async validateRoom({ roomId, roomCode }) {
    const params = new URLSearchParams();
    if (roomId) params.append('roomId', roomId);
    if (roomCode) params.append('roomCode', roomCode);

    const res = await fetch(`${API_BASE}/rooms/validate?${params.toString()}`);
    const json = await res.json();
    return json;
  },

  /**
   * Upload multiple files with real progress tracking via XMLHttpRequest
   */
  uploadFiles({ roomId, files, uploaderName, onProgress }) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('roomId', roomId);
      formData.append('uploaderName', uploaderName || 'Mobile User');

      for (const file of files) {
        formData.append('files', file);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress({ percent, loaded: e.loaded, total: e.total });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            resolve(resp.files || []);
          } catch (err) {
            reject(new Error('Invalid upload response'));
          }
        } else {
          try {
            const resp = JSON.parse(xhr.responseText);
            reject(new Error(resp.message || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during file upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });

      xhr.open('POST', `${API_BASE}/uploads`);
      xhr.send(formData);
    });
  },

  /**
   * Send text message to room
   */
  async sendMessage({ roomId, text, senderName, senderType = 'mobile' }) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, text, senderName, senderType }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to send message');
    return json.message;
  },

  /**
   * Delete a file
   */
  async deleteFile(roomId, fileId, userName) {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete file');
    return json;
  },

  /**
   * Rename a file
   */
  async renameFile(roomId, fileId, newName, userName) {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName, userName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to rename file');
    return json.file;
  },

  /**
   * End room
   */
  async endRoom(roomId) {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}/end`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to end room');
    return json;
  },

  /**
   * Get room history
   */
  async getRoomHistory(roomId) {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}/history`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch history');
    return json;
  },
};

