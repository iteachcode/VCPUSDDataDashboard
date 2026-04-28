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
});

async function fetchFeed(url) {
  const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
  return response.json();
}

async function refreshFeeds() {
  feedList.innerHTML = `<p>Loading...</p>`;
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
    } catch (e) {
      console.error(`Error fetching ${feedUrl}`, e);
    }
  }

  articles.sort((a, b) => b.pubDate - a.pubDate);
  feedList.innerHTML = '';

  if (articles.length === 0) {
    feedList.innerHTML = '<p>No new articles.</p>';
  } else {
    articles.forEach(article => {
      const el = document.createElement('article');
      el.innerHTML = `<h2><a href="${article.link}" target="_blank">${article.title}</a></h2>
                      <time>${new Date(article.pubDate).toLocaleString()}</time>`;
      feedList.appendChild(el);
    });
  }

  // Update fetch timestamps
  lastFetchTime = Date.now();
  localStorage.setItem('lastFetchTime', lastFetchTime);

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

// Attach event listeners
refreshButton.addEventListener('click', refreshFeeds);

addFeedButton.addEventListener('click', () => {
  const url = newFeedInput.value.trim();
  if (url && !feeds.includes(url)) {
    feeds.push(url);
    localStorage.setItem('feeds', JSON.stringify(feeds));
    newFeedInput.value = '';
    refreshFeeds();
  }
});

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
  refreshFeeds();
});
