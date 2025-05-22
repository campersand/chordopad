let title = '';
let transposeValue = 0;

let rawSongContent = '';  // holds original content for preview.html

document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname;

  if (page.includes('index.html') || page.endsWith('/')) {
    loadIndex();
  } else if (page.includes('song.html')) {
    loadEditor();
  } else if (page.includes('preview.html')) {
    loadPreview();
  }
});

function viewSong(title) {
  location.href = `preview.html?title=${encodeURIComponent(title)}`;
}

function getTitle() {
  const params = new URLSearchParams(location.search);
  return params.get('title') || 'Untitled';
}

// ========== Halaman Index ==========
function loadIndex() {
  const list = document.getElementById('songList');
  const search = document.getElementById('search');

  function renderList() {
    list.innerHTML = '';
    const query = (search.value || '').toLowerCase();

    Object.keys(localStorage).forEach(key => {
      if (!key.startsWith('song_')) return;
      const songTitle = key.replace('song_', '');
      if (!songTitle.toLowerCase().includes(query)) return;

      const item = document.createElement('div');
      item.className = 'songItem';
      item.innerHTML = `
        <span>${songTitle}⠀⠀</span>
        <div>
        <button onclick="viewSong('${songTitle}')">👁️ Lihat</button>
          <button onclick="editSong('${songTitle}')">✏️ Edit</button>
          <button onclick="deleteSongFromList('${songTitle}')">🗑️ Hapus</button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  search.addEventListener('input', renderList);
  renderList();
}

function createNewSong() {
  location.href = `song.html`;
}

function editSong(title) {
  location.href = `song.html?title=${encodeURIComponent(title)}`;
}

function deleteSongFromList(title) {
  if (confirm(`Hapus lagu "${title}"?`)) {
    localStorage.removeItem(`song_${title}`);
    location.reload();
  }
}

// ========== Halaman Song Editor ==========
function loadEditor() {
  const editor = document.getElementById('editor');
  const titleInput = document.getElementById('songTitleInput');
  const authorInput = document.getElementById('author');
  const capoInput = document.getElementById('capo');

  if (!editor || !titleInput) return;

  title = getTitle();
if (!title) {
  title = 'Untitled';
}
  titleInput.value = title;

  const raw = localStorage.getItem(`song_${title}`);
  let data = { content: '', author: '', capo: '' };

  try {
    data = JSON.parse(raw); // try to parse JSON if stored as an object
  } catch {
    data.content = raw || ''; // fallback if it's just plain text
  }

  editor.value = data.content || '';
  if (authorInput) authorInput.value = data.author || '';
  if (capoInput) capoInput.value = data.capo || '';
  updatePreview();
  document.title = `Edit: ${title}`;
}

function saveSong() {
  const editor = document.getElementById('editor');
  const titleInput = document.getElementById('songTitleInput');
  const authorInput = document.getElementById('author');
  const capoInput = document.getElementById('capo');

  const newTitle = titleInput.value.trim();
  if (!newTitle) {
    alert('Judul lagu tidak boleh kosong.');
    return;
  }

  const content = editor.value;
  const author = authorInput.value.trim();
  const capo = capoInput.value.trim();

  const songData = {
    content,
    author,
    capo
  };

  const oldKey = `song_${title}`;
  const newKey = `song_${newTitle}`;

  if (title !== newTitle) {
    if (localStorage.getItem(newKey)) {
      if (!confirm(`Lagu "${newTitle}" sudah ada. Timpa?`)) return;
    }
    localStorage.removeItem(oldKey);
  }

  localStorage.setItem(newKey, JSON.stringify(songData));
  title = newTitle;
  history.replaceState(null, '', `song.html?title=${encodeURIComponent(newTitle)}`);
  alert('Lagu disimpan!');
}



function deleteSong() {
  if (confirm("Yakin ingin menghapus lagu ini?")) {
    localStorage.removeItem(`song_${title}`);
    goBack();
  }
}

function goBack() {
  location.href = 'index.html';
}

function updatePreview(overrideContent = null) {
  const preview = document.getElementById('preview');
  let raw;

  const onPreviewPage = window.location.pathname.includes('preview.html');

  if (overrideContent) {
    raw = overrideContent;
  } else if (onPreviewPage) {
    raw = rawSongContent;
  } else {
    const editor = document.getElementById('editor');
    if (!editor) return;
    raw = editor.value;
  }

  const transposed = raw.split('\n').map(line => {
    const words = line.split(/(\s+)/);
    return words.map(word => {
      if (isChord(word.trim())) {
        return `<span class="chord">${transposeChord(word.trim(), transposeValue)}</span>`;
      }
      return word;
    }).join('');
  }).join('\n');

  preview.innerHTML = transposed;
}
function transpose(val) {
  transposeValue += val;
  document.getElementById('transposeInfo').textContent = `Transpose: ${transposeValue}`;
  updatePreview(); // Update preview after transpose
}

// ========== Chord Detection & Transpose ==========
const chordRoots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const flatToSharp = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

function normalizeChord(chord) {
  // Convert flat to sharp
  const flat = chord.slice(0, 2);
  if (flatToSharp[flat]) {
    return flatToSharp[flat] + chord.slice(2);
  }
  return chord;
}

function isChord(token) {
  return /^[A-G](#|b)?(m|M|maj|min|dim|aug|sus|add)?\d*(\/[A-G](#|b)?)?$/.test(token);
}

function transposeChord(chord, steps) {
  const normalized = normalizeChord(chord);
  const match = /^([A-G](#|b)?)(.*)$/.exec(normalized);
  if (!match) return chord;

  let [ , root, , suffix ] = match;
  const index = chordRoots.indexOf(root);
  if (index === -1) return chord;

  const newIndex = (index + steps + 12) % 12;
  return chordRoots[newIndex] + suffix;
}

function loadPreview() {
  title = getTitle();
  const preview = document.getElementById('preview');
  const heading = document.getElementById('songTitle');
  const subtitle = document.getElementById('subtitle');

  if (!preview || !heading) {
    console.error('Preview or heading element not found!');
    return;
  }

  const raw = localStorage.getItem(`song_${title}`);
  let data = { content: '', author: '', capo: '' };

  try {
    data = JSON.parse(raw);
  } catch {
    data.content = raw || '';
  }

  document.title = `Lihat: ${title}`;
  heading.textContent = `🎵 ${title}`;
  if (subtitle) {
    subtitle.textContent = [data.author, data.capo ? `Capo: ${data.capo}` : '']
      .filter(Boolean)
      .join(' • ');
  }

    rawSongContent = data.content || '';
    updatePreview(rawSongContent);

}