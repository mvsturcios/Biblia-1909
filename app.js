let bible = {};
let currentBookIndex = 0;
let currentChapterIndex = 0; // 0-based index for array access, displayed as 1-based
let fontSize = 18;
let bookmarks = JSON.parse(localStorage.getItem('bible_bookmarks')) || [];
let history = JSON.parse(localStorage.getItem('bible_history')) || [];

const reader = document.getElementById('reader');
const bookSelect = document.getElementById('book-select');
const chapterSelect = document.getElementById('chapter-select');
const prevBtn = document.getElementById('prev-chapter');
const nextBtn = document.getElementById('next-chapter');
const searchPanel = document.getElementById('search-panel');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const menuContent = document.getElementById('menu-content');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    fetch('bible.json')
        .then(r => r.json())
        .then(data => {
            bible = data;
            initSelectors();
            loadLastPosition();
        })
        .catch(err => {
            reader.innerHTML = '<p style="color:red">Error cargando la Biblia. Por favor recargue.</p>';
            console.error(err);
        });

    // Event Listeners
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('font-increase').addEventListener('click', () => changeFont(2));
    document.getElementById('font-decrease').addEventListener('click', () => changeFont(-2));
    document.getElementById('search-toggle').addEventListener('click', () => {
        searchPanel.style.display = searchPanel.style.display === 'block' ? 'none' : 'block';
        if (searchPanel.style.display === 'block') searchInput.focus();
    });
    document.getElementById('search-btn').addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') performSearch(); });
    
    document.getElementById('menu-toggle').addEventListener('click', () => showModal('menu-modal'));
    document.getElementById('close-menu').addEventListener('click', () => hideModal('menu-modal'));
    
    document.getElementById('bookmarks-btn').addEventListener('click', showBookmarks);
    document.getElementById('history-btn').addEventListener('click', showHistory);
    document.getElementById('daily-reading-btn').addEventListener('click', loadDailyReading);

    prevBtn.addEventListener('click', prevChapter);
    nextBtn.addEventListener('click', nextChapter);

    bookSelect.addEventListener('change', () => {
        currentBookIndex = parseInt(bookSelect.value);
        loadChaptersSelect(); // Reset to chapter 1
        currentChapterIndex = 0;
        loadText();
    });

    chapterSelect.addEventListener('change', () => {
        currentChapterIndex = parseInt(chapterSelect.value);
        loadText();
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    }
});

function initSelectors() {
    bookSelect.innerHTML = '';
    bible.books.forEach((b, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = b.name;
        bookSelect.appendChild(option);
    });
}

function loadChaptersSelect() {
    chapterSelect.innerHTML = '';
    const book = bible.books[currentBookIndex];
    if (!book) return;
    
    book.chapters.forEach((c, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = c.chapter;
        chapterSelect.appendChild(option);
    });
}

function loadText() {
    if (!bible.books) return;
    const book = bible.books[currentBookIndex];
    const chapter = book.chapters[currentChapterIndex];
    
    // Update selectors if they differ (e.g. from nav buttons)
    if (parseInt(bookSelect.value) !== currentBookIndex) {
        bookSelect.value = currentBookIndex;
        loadChaptersSelect();
    }
    chapterSelect.value = currentChapterIndex;

    // Build HTML
    let html = `<h2>${book.name} ${chapter.chapter}</h2>`;
    
    // Sort verses numerically
    const verseKeys = Object.keys(chapter.verses).sort((a, b) => parseInt(a) - parseInt(b));
    
    verseKeys.forEach(vNum => {
        const text = chapter.verses[vNum];
        const isBookmarked = bookmarks.some(b => b.book === currentBookIndex && b.chapter === currentChapterIndex && b.verse === vNum);
        const bookmarkClass = isBookmarked ? 'highlight' : '';
        
        html += `
            <div class="verse ${bookmarkClass}" id="v${vNum}">
                <sup>${vNum}</sup> ${text}
                <div class="actions">
                    <button class="action-btn" onclick="toggleBookmark(${currentBookIndex}, ${currentChapterIndex}, '${vNum}')">${isBookmarked ? '★ Desmarcar' : '☆ Marcar'}</button>
                    <button class="action-btn" onclick="copyVerse('${book.name} ${chapter.chapter}:${vNum}', '${text.replace(/'/g, "\\'")}')">📋 Copiar</button>
                    <button class="action-btn" onclick="shareVerse('${book.name} ${chapter.chapter}:${vNum}', '${text.replace(/'/g, "\\'")}')">📤 Compartir</button>
                </div>
            </div>
        `;
    });
    
    reader.innerHTML = html;
    window.scrollTo(0, 0);
    
    savePosition();
    addToHistory();
    
    // Update nav buttons
    prevBtn.disabled = (currentBookIndex === 0 && currentChapterIndex === 0);
    // Check if last chapter of last book
    const lastBook = bible.books.length - 1;
    const lastChapter = bible.books[lastBook].chapters.length - 1;
    nextBtn.disabled = (currentBookIndex === lastBook && currentChapterIndex === lastChapter);
}

function prevChapter() {
    if (currentChapterIndex > 0) {
        currentChapterIndex--;
    } else if (currentBookIndex > 0) {
        currentBookIndex--;
        loadChaptersSelect();
        currentChapterIndex = bible.books[currentBookIndex].chapters.length - 1;
    }
    loadText();
}

function nextChapter() {
    const book = bible.books[currentBookIndex];
    if (currentChapterIndex < book.chapters.length - 1) {
        currentChapterIndex++;
    } else if (currentBookIndex < bible.books.length - 1) {
        currentBookIndex++;
        loadChaptersSelect();
        currentChapterIndex = 0;
    }
    loadText();
}

// Settings & Storage
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('bible_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function loadSettings() {
    const theme = localStorage.getItem('bible_theme');
    if (theme === 'dark') document.body.classList.add('dark');
    
    const savedSize = localStorage.getItem('bible_fontsize');
    if (savedSize) {
        fontSize = parseInt(savedSize);
        document.body.style.fontSize = fontSize + 'px';
    }
}

function changeFont(delta) {
    fontSize += delta;
    if (fontSize < 12) fontSize = 12;
    if (fontSize > 32) fontSize = 32;
    document.body.style.fontSize = fontSize + 'px';
    localStorage.setItem('bible_fontsize', fontSize);
}

function savePosition() {
    localStorage.setItem('bible_position', JSON.stringify({
        book: currentBookIndex,
        chapter: currentChapterIndex
    }));
}

function loadLastPosition() {
    const pos = JSON.parse(localStorage.getItem('bible_position'));
    if (pos) {
        currentBookIndex = pos.book;
        loadChaptersSelect(); // vital to fill chapter select before setting value
        currentChapterIndex = pos.chapter;
    } else {
        loadChaptersSelect();
    }
    loadText();
}

function addToHistory() {
    const book = bible.books[currentBookIndex];
    const entry = {
        bookIdx: currentBookIndex,
        chapterIdx: currentChapterIndex,
        label: `${book.name} ${book.chapters[currentChapterIndex].chapter}`,
        timestamp: Date.now()
    };
    
    // Remove duplicate if exists at top
    if (history.length > 0 && history[0].label === entry.label) return;
    
    history.unshift(entry);
    if (history.length > 20) history.pop(); // Keep last 20
    localStorage.setItem('bible_history', JSON.stringify(history));
}

// Features
function toggleBookmark(bIdx, cIdx, vNum) {
    const idx = bookmarks.findIndex(b => b.book === bIdx && b.chapter === cIdx && b.verse === vNum);
    if (idx > -1) {
        bookmarks.splice(idx, 1);
    } else {
        bookmarks.push({ book: bIdx, chapter: cIdx, verse: vNum, timestamp: Date.now() });
    }
    localStorage.setItem('bible_bookmarks', JSON.stringify(bookmarks));
    loadText(); // Re-render to show highlight
}

function copyVerse(ref, text) {
    const fullText = `${ref} - ${text}`;
    navigator.clipboard.writeText(fullText).then(() => {
        alert('Versículo copiado al portapapeles');
    });
}

function shareVerse(ref, text) {
    if (navigator.share) {
        navigator.share({
            title: 'Biblia RV1909',
            text: `${ref} - ${text}`,
            url: window.location.href
        });
    } else {
        copyVerse(ref, text);
    }
}

let searchIndex = null; // Inverted index: word -> [ {b, c, v} ]

function performSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return;
    
    if (!bible.books) {
        searchResults.innerHTML = '<p>Cargando datos...</p>';
        return;
    }

    searchResults.innerHTML = '<p>Buscando...</p>';
    
    const results = [];
    const maxResults = 50;

    // Use Inverted Index if available (word search), else linear (phrase search)
    const isSingleWord = !query.includes(' ');
    
    if (isSingleWord && searchIndex) {
        const matches = searchIndex[query];
        if (matches) {
            for (let i = 0; i < matches.length && i < maxResults; i++) {
                const m = matches[i];
                const book = bible.books[m.b];
                const chapter = book.chapters[m.c];
                const text = chapter.verses[m.v];
                results.push({
                    bookName: book.name,
                    chapterNum: chapter.chapter,
                    verseNum: m.v,
                    text: text,
                    bIdx: m.b, cIdx: m.c
                });
            }
        }
    } else {
        // Fallback to linear search for phrases or if index not ready
        bible.books.forEach((b, bIdx) => {
            b.chapters.forEach((c, cIdx) => {
                Object.entries(c.verses).forEach(([vNum, text]) => {
                    if (results.length >= maxResults) return;
                    
                    if (text.toLowerCase().includes(query)) {
                        results.push({
                            bookName: b.name,
                            chapterNum: c.chapter,
                            verseNum: vNum,
                            text: text,
                            bIdx, cIdx
                        });
                    }
                });
            });
        });
    }
    
    if (results.length === 0) {
        searchResults.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }
    
    searchResults.innerHTML = '';
    
    // Escape regex chars for highlighting
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeQuery = escapeRegExp(query);
    
    results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        // Highlight query safely
        const highlighted = res.text.replace(new RegExp(safeQuery, 'gi'), match => `<mark>${match}</mark>`);
        
        div.innerHTML = `<strong>${res.bookName} ${res.chapterNum}:${res.verseNum}</strong><br>${highlighted}`;
        div.onclick = () => {
            currentBookIndex = res.bIdx;
            loadChaptersSelect();
            currentChapterIndex = res.cIdx;
            loadText();
            searchPanel.style.display = 'none';
            // Scroll to verse
            setTimeout(() => {
                const el = document.getElementById('v' + res.verseNum);
                if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
                // Highlight temporarily
                el.style.backgroundColor = 'yellow';
                setTimeout(() => el.style.backgroundColor = '', 2000);
            }, 100);
        };
        searchResults.appendChild(div);
    });
    if (results.length >= maxResults) {
        searchResults.innerHTML += '<p><i>Se mostraron los primeros 50 resultados.</i></p>';
    }
}

function buildSearchIndex() {
    // Run in background / timeout to not block UI
    setTimeout(() => {
        searchIndex = {};
        bible.books.forEach((b, bIdx) => {
            b.chapters.forEach((c, cIdx) => {
                Object.entries(c.verses).forEach(([vNum, text]) => {
                    // Simple tokenizer
                    const words = text.toLowerCase().match(/\b\w+\b/g);
                    if (words) {
                        const uniqueWords = new Set(words);
                        uniqueWords.forEach(word => {
                            if (!searchIndex[word]) searchIndex[word] = [];
                            // Store reference
                            searchIndex[word].push({ b: bIdx, c: cIdx, v: vNum });
                        });
                    }
                });
            });
        });
        console.log('Search Index Built');
    }, 1000);
}

function loadDailyReading() {
    if (!bible.books) return;

    // Simple algorithm: Day of year -> specific chapter?
    // Or just random for now?
    // Let's do Day of Year maps to a chapter sequentially.
    // Total chapters ~1189. 365 days. 
    // We can just pick a random chapter or one based on date hash.
    
    const today = new Date().toDateString();
    let daily = JSON.parse(localStorage.getItem('bible_daily'));
    
    if (!daily || daily.date !== today) {
        // Pick random
        const bIdx = Math.floor(Math.random() * bible.books.length);
        const book = bible.books[bIdx];
        const cIdx = Math.floor(Math.random() * book.chapters.length);
        
        daily = { date: today, book: bIdx, chapter: cIdx };
        localStorage.setItem('bible_daily', JSON.stringify(daily));
    }
    
    currentBookIndex = daily.book;
    loadChaptersSelect();
    currentChapterIndex = daily.chapter;
    loadText();
    hideModal('menu-modal');
}

function showBookmarks() {
    let html = '<h4>Versículos Guardados</h4>';
    if (bookmarks.length === 0) {
        html += '<p>No hay marcadores.</p>';
    } else {
        bookmarks.forEach(b => {
            const book = bible.books[b.book];
            const text = book.chapters[b.chapter].verses[b.verse];
            // Truncate text
            const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;
            
            html += `
                <div class="bookmark-item" onclick="goTo(${b.book}, ${b.chapter})">
                    <div>
                        <strong>${book.name} ${book.chapters[b.chapter].chapter}:${b.verse}</strong>
                        <br><small>${shortText}</small>
                    </div>
                    <button onclick="event.stopPropagation(); toggleBookmark(${b.book}, ${b.chapter}, '${b.verse}'); showBookmarks();">❌</button>
                </div>
            `;
        });
    }
    menuContent.innerHTML = html;
}

function showHistory() {
    let html = '<h4>Historial Reciente</h4>';
    if (history.length === 0) {
        html += '<p>Vacío.</p>';
    } else {
        history.forEach(h => {
            html += `
                <div class="search-result-item" onclick="goTo(${h.bookIdx}, ${h.chapterIdx})">
                    ${h.label} <small>(${new Date(h.timestamp).toLocaleTimeString()})</small>
                </div>
            `;
        });
    }
    menuContent.innerHTML = html;
}

function goTo(bIdx, cIdx) {
    currentBookIndex = bIdx;
    loadChaptersSelect();
    currentChapterIndex = cIdx;
    loadText();
    hideModal('menu-modal');
}

function showModal(id) {
    document.getElementById(id).style.display = 'flex';
}
function hideModal(id) {
    document.getElementById(id).style.display = 'none';
}
