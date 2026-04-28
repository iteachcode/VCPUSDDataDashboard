const defaultFeeds = [
  "https://feeds.npr.org/1001/rss.xml",
  "https://www.engadget.com/rss.xml",
  "https://lifehacker.com/feed/rss",
  "https://gizmodo.com/rss",
  "https://9to5mac.com/rss",
  "https://heydingus.net/feed.rss",
  "https://feedpress.me/sixcolors"
];

let feeds = JSON.parse(localStorage.getItem('feeds')) || defaultFeeds;
let lastFetchTime = parseInt(localStorage.getItem('lastFetchTime')) || 0;

const feedList = document.getElementById('feedList');
const refreshButton = document.getElementById('refreshFeeds');
const lastRefreshEl = document.getElementById('lastRefresh');
const addFeedButton = document.getElementById('addFeed');
const newFeedInput = document.getElementById('newFeedUrl');

document.addEventListener('DOMContentLoaded', () => {
  const savedTime = localStorage.getItem('lastRefreshTime');
  if (savedTime) {
    lastRefreshEl.textContent = `Last updated: ${savedTime}`;
  }

  const cachedArticles = JSON.parse(localStorage.getItem('cachedArticles')) || [];
  if (!navigator.onLine && cachedArticles.length > 0) {
    feedList.innerHTML = '<p>Offline mode: showing cached articles</p>';
    renderArticles(cachedArticles);
  } else {
    refreshFeeds();
  }
});

async function fetchFeed(url) {
  const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
  return response.json();
}

async function refreshFeeds() {
  feedList.innerHTML = '<p>Loading...</p>';
  feedList.classList.add('loading');

  const articles = [];

  for (const feedUrl of feeds) {
    try {
      const data = await fetchFeed(feedUrl);
      if (data.items) {
        data.items.forEach(item => {
          const pubTime = new Date(item.pubDate).getTime();
          if (pubTime > lastFetchTime) {
            articles.push({
              title: item.title,
              link: item.link,
              pubDate: pubTime
            });
          }
        });
      }
    } catch (err) {
      console.error(`Error fetching ${feedUrl}`, err);
    }
  }

  articles.sort((a, b) => b.pubDate - a.pubDate);
  feedList.classList.remove('loading');
  feedList.innerHTML = '';

  if (articles.length === 0) {
    const cachedArticles = JSON.parse(localStorage.getItem('cachedArticles')) || [];
    if (!navigator.onLine && cachedArticles.length > 0) {
      feedList.innerHTML = '<p>Offline: showing cached articles</p>';
      renderArticles(cachedArticles);
    } else {
      feedList.innerHTML = '<p>No new articles.</p>';
    }
  } else {
    renderArticles(articles);

    // Update lastFetchTime to newest article pubDate
    lastFetchTime = Math.max(...articles.map(a => a.pubDate));
    localStorage.setItem('lastFetchTime', lastFetchTime);

    // Cache last 50 articles for offline use
    localStorage.setItem('cachedArticles', JSON.stringify(articles.slice(0, 50)));
  }

  // Update visible last refresh
  const now = new Date();
  const formattedTime = now.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  lastRefreshEl.textContent = `Last updated: ${formattedTime}`;
  localStorage.setItem('lastRefreshTime', formattedTime);
}

function renderArticles(articles) {
  feedList.innerHTML = '';
  articles.forEach(article => {
    const el = document.createElement('article');
    el.innerHTML = `<h2><a href="${article.link}" target="_blank">${article.title}</a></h2>
                    <time>${new Date(article.pubDate).toLocaleString()}</time>`;
    feedList.appendChild(el);
  });
}

// Refresh button
refreshButton.addEventListener('click', refreshFeeds);

// Add feed button
addFeedButton.addEventListener('click', () => {
  const url = newFeedInput.value.trim();
  const isValidUrl = /^https?:\/\/.+/.test(url);

  if (isValidUrl && !feeds.includes(url)) {
    feeds.push(url);
    localStorage.setItem('feeds', JSON.stringify(feeds));
    newFeedInput.value = '';
    refreshFeeds();
  } else {
    alert('Please enter a valid feed URL starting with http:// or https://');
  }
});

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}
