let movies = [];

const movieGrid = document.getElementById('movie-grid');
const catalogSection = document.getElementById('catalog-section');
const playerSection = document.getElementById('player-section');
const videoContainer = document.getElementById('video-container');
const similarMoviesGrid = document.getElementById('similar-movies-grid');
const navMenu = document.getElementById('nav-menu');
const paginationContainer = document.getElementById('pagination');

let currentCategory = 'all';
let currentTag = null;
let searchQuery = '';
let currentPage = 1;       
const moviesPerPage = 50;   

let allSimilarMovies = [];
let shownSimilarCount = 0;
const similarPerPage = 9;  

async function loadMoviesData() {
    try {
        const response = await fetch('movies.json');
        if (!response.ok) throw new Error('Не удалось загрузить базу данных фильмов');
        movies = await response.json();
        renderMovies();
        checkInitialUrl();
    } catch (error) {
        console.error('Ошибка:', error);
        if (movieGrid) movieGrid.innerHTML = '<p style="color:red; text-align:center; width:100%;">Ошибка загрузки базы данных фильмов.</p>';
    }
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const moviePoster = movie.poster ? movie.poster.trim() : "";

    // HTML-разметка теперь абсолютно чистая, без длинных скриптов внутри тегов
    card.innerHTML = `
        <div class="poster-container">
            <img src="${moviePoster}" alt="${movie.title}" loading="lazy">
        </div>
        <div class="movie-info">
            <h4>${movie.title}</h4>
            <div class="movie-tags">
                ${movie.tags ? movie.tags.map(t => `<span class="tag-badge">${t}</span>`).join('') : ''}
            </div>
        </div>
    `;

    // Безопасная обработка ошибки 404 через чистый JavaScript (без риска запутаться в кавычках)
    const img = card.querySelector('img');
    if (img) {
        img.onerror = function() {
            this.onerror = null; // Предотвращаем бесконечный цикл
            this.outerHTML = '<div class="no-poster-vertical">🎬</div>';
        };
    }

    card.addEventListener('click', () => openMovie(movie));
    return card;
}


function renderMovies() {
    if (!movieGrid) return;
    movieGrid.innerHTML = '';

    const filtered = movies.filter(movie => {
        const matchCategory = currentCategory === 'all' || movie.category === currentCategory;
        const matchTag = !currentTag || movie.tags.includes(currentTag);
        const matchSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchTag && matchSearch;
    });

    const totalPages = Math.ceil(filtered.length / moviesPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * moviesPerPage;
    const endIndex = startIndex + moviesPerPage;
    const moviesToDisplay = filtered.slice(startIndex, endIndex);

    moviesToDisplay.forEach(movie => movieGrid.appendChild(createMovieCard(movie)));
    renderPagination(totalPages);
}


function renderPagination(totalPages) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '&larr; Назад';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        currentPage--;
        renderMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.innerText = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderMovies();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationContainer.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = 'Вперед &rarr;';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        currentPage++;
        renderMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationContainer.appendChild(nextBtn);
}

function renderSimilarMovies(currentMovie) {
    if (!similarMoviesGrid) return;
    similarMoviesGrid.innerHTML = '';
    
    allSimilarMovies = movies.filter(movie => movie.category === currentMovie.category && movie.id !== currentMovie.id);
    shownSimilarCount = 0; 

    const loadMoreBtn = document.getElementById('load-more-similar-btn');

    if (allSimilarMovies.length === 0) {
        similarMoviesGrid.innerHTML = '<p style="color: #666; grid-column: 1/-1;">Похожих фильмов пока нет</p>';
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        return;
    }

    loadNextSimilar();
}

function loadNextSimilar() {
    const loadMoreBtn = document.getElementById('load-more-similar-btn');
    const nextChunk = allSimilarMovies.slice(shownSimilarCount, shownSimilarCount + similarPerPage);
    
    nextChunk.forEach(movie => {
        similarMoviesGrid.appendChild(createMovieCard(movie));
    });

    shownSimilarCount += nextChunk.length;

    if (loadMoreBtn) {
        if (shownSimilarCount >= allSimilarMovies.length) {
            loadMoreBtn.classList.add('hidden');
        } else {
            loadMoreBtn.classList.remove('hidden');
        }
    }
}

function openMovie(movie, pushState = true) {
    if (!catalogSection || !playerSection || !videoContainer) return;
    
    if (pushState) {
        history.pushState({ movieId: movie.id }, movie.title, `?id=${movie.id}`);
    }

    catalogSection.classList.add('hidden');
    playerSection.classList.remove('hidden');

    document.getElementById('movie-title').innerText = movie.title;
    document.getElementById('movie-desc').innerText = movie.description;
    document.getElementById('movie-category').innerText = `Жанр: ${movie.category}`;
    videoContainer.innerHTML = `<div class="video-wrapper">${movie.vkEmbed}</div>`;
    
    const playerTagsContainer = document.getElementById('movie-player-tags');
    if (playerTagsContainer) {
        playerTagsContainer.innerHTML = movie.tags.map(t => `<button class="btn-tag" data-tag="${t}" style="margin:0;">#${t}</button>`).join('');
        playerTagsContainer.onclick = (e) => {
            if (!e.target.classList.contains('btn-tag')) return;
            const selectedTag = e.target.dataset.tag;
            
            document.querySelectorAll('#tag-buttons .btn-tag').forEach(b => b.classList.remove('active'));
            const mainTagBtn = document.querySelector(`#tag-buttons .btn-tag[data-tag="${selectedTag}"]`);
            if (mainTagBtn) mainTagBtn.classList.add('active');
            
            currentTag = selectedTag;
            currentPage = 1;
            closeMovie();
            renderMovies();
        };
    }

    renderSimilarMovies(movie);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeMovie(pushState = true) {
    if (!catalogSection || !playerSection || !videoContainer || !similarMoviesGrid) return;
    
    if (pushState) {
        history.pushState(null, '', window.location.pathname);
    }

    playerSection.classList.add('hidden');
    catalogSection.classList.remove('hidden');
    videoContainer.innerHTML = '';
    similarMoviesGrid.innerHTML = '';
    
    allSimilarMovies = [];
    shownSimilarCount = 0;
    
    const loadMoreBtn = document.getElementById('load-more-similar-btn');
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
}

if (document.getElementById('back-to-catalog')) {
    document.getElementById('back-to-catalog').addEventListener('click', () => closeMovie());
}

if (document.getElementById('load-more-similar-btn')) {
    document.getElementById('load-more-similar-btn').addEventListener('click', loadNextSimilar);
}

if (document.getElementById('logo-link')) {
    document.getElementById('logo-link').addEventListener('click', (e) => {
        e.preventDefault();
        currentCategory = 'all';
        currentTag = null;
        searchQuery = '';
        currentPage = 1;
        document.getElementById('search-input').value = '';
        document.querySelectorAll('.menu-cat').forEach(link => link.classList.remove('active'));
        const allBtn = document.querySelector('.menu-cat[data-category="all"]');
        if (allBtn) allBtn.classList.add('active');
        document.querySelectorAll('.btn-tag').forEach(b => b.classList.remove('active'));
        closeMovie();
        renderMovies();
    });
}

if (document.getElementById('category-menu')) {
    document.getElementById('category-menu').addEventListener('click', (e) => {
        if(!e.target.classList.contains('menu-cat')) return;
        e.preventDefault();
        document.querySelectorAll('.menu-cat').forEach(link => link.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        currentPage = 1;
        closeMovie();
        renderMovies();
        if(navMenu && navMenu.classList.contains('open')) navMenu.classList.remove('open');
    });
}

if (document.getElementById('tag-buttons')) {
    document.getElementById('tag-buttons').addEventListener('click', (e) => {
        if(!e.target.classList.contains('btn-tag')) return;
        if(e.target.classList.contains('active')) {
            e.target.classList.remove('active');
            currentTag = null;
        } else {
            document.querySelectorAll('.btn-tag').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTag = e.target.dataset.tag;
        }
        currentPage = 1;
        closeMovie();
        renderMovies();
    });
}

if (document.getElementById('player-tag-buttons')) {
    document.getElementById('player-tag-buttons').addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-tag')) return;
        const selectedTag = e.target.dataset.tag;
        document.querySelectorAll('#tag-buttons .btn-tag').forEach(b => b.classList.remove('active'));
        const mainTagBtn = document.querySelector(`#tag-buttons .btn-tag[data-tag="${selectedTag}"]`);
        if (mainTagBtn) mainTagBtn.classList.add('active');
        currentTag = selectedTag;
        currentPage = 1;
        closeMovie();
        renderMovies();
    });
}

if (document.getElementById('search-input')) {
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        closeMovie();
        renderMovies();
    });
}

const menuToggle = document.getElementById('menu-toggle');
if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
}

const scrollTopBtn = document.getElementById('scroll-top-btn');
if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) scrollTopBtn.classList.add('show');
        else scrollTopBtn.classList.remove('show');
    });
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.movieId) {
        const movie = movies.find(m => m.id === e.state.movieId);
        if (movie) openMovie(movie, false);
    } else {
        closeMovie(false);
        renderMovies();
    }
});

function checkInitialUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const initialMovieId = urlParams.get('id');
    if (initialMovieId) {
        const movie = movies.find(m => m.id === initialMovieId);
        if (movie) {
            setTimeout(() => openMovie(movie, false), 100);
        }
    }
}

loadMoviesData();
