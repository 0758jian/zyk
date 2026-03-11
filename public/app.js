import Hls from 'hls.js';
import { navConfig, categoryNames } from './config.js';

const API_URL = '/api';
let currentPage = 1;
let currentType = 0;
let currentVideo = null;
let allTypes = [];
let subCategories = {};

const parentTypes = navConfig.parentTypes.filter(id => !navConfig.hiddenParentTypes.includes(id));
const noDropdownTypes = navConfig.noDropdownTypes.filter(id => !navConfig.hiddenNoDropdownTypes.includes(id));
const categoryChildren = navConfig.categoryChildren;

async function init() {
  await loadTypes();
  await loadVideos();
}

async function loadTypes() {
  try {
    const res = await fetch(`${API_URL}/types`);
    const result = await res.json();
    
    if (result.success && result.data.class) {
      allTypes = result.data.class;
      
      const nav = document.getElementById('typeNav');
      const filter = document.getElementById('typeFilter');
      
      nav.innerHTML = `<a href="#" onclick="filterByType(0); return false;" class="active">首页</a>`;
      
      allTypes.forEach(type => {
        const typeId = parseInt(type.type_id);
        
        if (noDropdownTypes.includes(typeId)) {
          nav.innerHTML += `<a href="#" onclick="filterByType(${typeId}); return false;">${type.type_name}</a>`;
          filter.innerHTML += `<option value="${typeId}">${type.type_name}</option>`;
        } else if (parentTypes.includes(typeId)) {
          nav.innerHTML += `
            <div class="nav-dropdown">
              <a href="#" onclick="filterByType(${typeId}); return false;">${type.type_name}</a>
              <div class="dropdown-content" id="dropdown-${typeId}"></div>
            </div>
          `;
          filter.innerHTML += `<option value="${typeId}">${type.type_name}</option>`;
          renderSubCategories(typeId);
        }
      });
    }
  } catch (error) {
    console.error('加载分类失败:', error);
  }
}

function renderSubCategories(parentId) {
  const childIds = categoryChildren[parentId];
  if (!childIds) {
    return;
  }
  
  const hiddenSubs = navConfig.hiddenSubCategories || [];
  const children = allTypes.filter(type => {
    const typeId = parseInt(type.type_id);
    return childIds.includes(typeId) && !hiddenSubs.includes(typeId);
  });
  
  const dropdown = document.getElementById(`dropdown-${parentId}`);
  if (dropdown && children.length > 0) {
    dropdown.innerHTML = children.map(sub => {
      const customName = categoryNames[sub.type_id] || sub.type_name;
      return `<a href="#" onclick="filterByType(${sub.type_id}); return false;">${customName}</a>`;
    }).join('');
  }
}

async function filterByType(typeId) {
  currentType = typeId;
  currentPage = 1;
  
  document.querySelectorAll('.nav a, .dropdown-content a').forEach(a => a.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  await loadVideos();
}

async function loadVideos() {
  const grid = document.getElementById('videoGrid');
  const sortFilter = document.getElementById('sortFilter');
  const sort = sortFilter.value;
  
  grid.innerHTML = '<div class="loading">加载中...</div>';
  
  try {
    const params = new URLSearchParams({
      ac: 'detail',
      pg: currentPage
    });
    
    if (currentType > 0) {
      params.append('t', currentType);
    }
    
    const res = await fetch(`${API_URL}/detail?${params}`);
    const result = await res.json();
    
    if (result.success && result.data.list) {
      renderVideos(result.data.list);
      renderPagination(result.data.page, result.data.pagecount);
    } else {
      grid.innerHTML = '<div class="error">暂无数据</div>';
    }
  } catch (error) {
    grid.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
    console.error('加载视频失败:', error);
  }
}

function renderVideos(videos) {
  const grid = document.getElementById('videoGrid');
  
  if (videos.length === 0) {
    grid.innerHTML = '<div class="error">暂无数据</div>';
    return;
  }
  
  grid.innerHTML = videos.map(video => `
    <div class="video-card" data-id="${video.vod_id}">
      <img src="${video.vod_pic || 'https://via.placeholder.com/200x300?text=无图片'}" 
           alt="${video.vod_name}"
           onerror="this.src='https://via.placeholder.com/200x300?text=无图片'">
      <div class="video-card-info">
        <div class="video-card-title">${video.vod_name}</div>
        <div class="video-card-meta">
          <span>${video.vod_year || '未知'}</span>
          <span class="video-card-score">⭐ ${video.vod_score || 'N/A'}</span>
        </div>
        <div class="video-card-meta" style="margin-top: 5px;">
          <span>${video.vod_remarks || video.type_name}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', function() {
      const videoId = this.dataset.id;
      openPlayer(parseInt(videoId));
    });
  });
}

function renderPagination(current, total) {
  const pagination = document.getElementById('pagination');
  
  let html = '';
  html += `<button onclick="goToPage(${current - 1})" ${current <= 1 ? 'disabled' : ''}>上一页</button>`;
  
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  
  for (let i = start; i <= end; i++) {
    html += `<button onclick="goToPage(${i})" ${i === current ? 'class="active"' : ''}>${i}</button>`;
  }
  
  html += `<button onclick="goToPage(${current + 1})" ${current >= total ? 'disabled' : ''}>下一页</button>`;
  html += `<button onclick="goToPage(${total})" ${current >= total ? 'disabled' : ''}>尾页 (${total})</button>`;
  
  pagination.innerHTML = html;
}

async function goToPage(page) {
  if (page < 1) return;
  currentPage = page;
  await loadVideos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function search() {
  const input = document.getElementById('searchInput');
  const keyword = input.value.trim();
  
  if (!keyword) return;
  
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = '<div class="loading">搜索中...</div>';
  
  try {
    const res = await fetch(`${API_URL}/search?wd=${encodeURIComponent(keyword)}`);
    const result = await res.json();
    
    if (result.success && result.data.list) {
      renderVideos(result.data.list);
      document.getElementById('pagination').innerHTML = '';
    } else {
      grid.innerHTML = '<div class="error">未找到相关内容</div>';
    }
  } catch (error) {
    grid.innerHTML = '<div class="error">搜索失败</div>';
  }
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') search();
});

async function openPlayer(videoId) {
  try {
    const res = await fetch(`${API_URL}/detail?ids=${videoId}`);
    const result = await res.json();
    
    if (result.success && result.data.list && result.data.list[0]) {
      currentVideo = result.data.list[0];
      showPlayer(currentVideo);
    }
  } catch (error) {
    console.error('获取视频详情失败:', error);
  }
}

function showPlayer(video) {
  const modal = document.getElementById('playerModal');
  const videoInfo = document.getElementById('videoInfo');
  const episodeList = document.getElementById('episodeList');
  
  videoInfo.innerHTML = `
    <h2>${video.vod_name}</h2>
    <p><strong>年份:</strong> ${video.vod_year || '未知'} | 
       <strong>地区:</strong> ${video.vod_area || '未知'} | 
       <strong>类型:</strong> ${video.type_name || '未知'}</p>
    <p><strong>主演:</strong> ${video.vod_actor || '未知'}</p>
    <p><strong>导演:</strong> ${video.vod_director || '未知'}</p>
    <p><strong>简介:</strong> ${video.vod_content || '暂无简介'}</p>
    <p><strong>播放源:</strong> ${video.vod_play_from || '默认'}</p>
  `;
  
  const episodes = parseEpisodes(video.vod_play_url);
  
  if (episodes.length > 0) {
    episodeList.innerHTML = episodes.map((ep, index) => `
      <button class="episode-btn" onclick="playEpisode(${index})" data-url="${ep.url}">
        ${ep.name}
      </button>
    `).join('');
    
    playEpisode(0);
  } else {
    episodeList.innerHTML = '<div class="error">暂无可播放剧集</div>';
  }
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function parseEpisodes(playUrlString) {
  if (!playUrlString) return [];
  
  const episodes = [];
  const parts = playUrlString.split('#');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const dollarIndex = trimmed.indexOf('$');
    if (dollarIndex > 0) {
      const name = trimmed.substring(0, dollarIndex);
      const url = trimmed.substring(dollarIndex + 1);
      episodes.push({ name, url });
    }
  }
  
  return episodes;
}

let hls = null;

function playEpisode(index) {
  const buttons = document.querySelectorAll('.episode-btn');
  buttons.forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
  
  const currentBtn = buttons[index];
  if (!currentBtn) return;
  
  let url = currentBtn.dataset.url;
  const video = document.getElementById('videoPlayer');
  
  if (hls) {
    hls.destroy();
    hls = null;
  }
  
  if (url.includes('.m3u8')) {
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: function(xhr, url) {
          xhr.withCredentials = false;
        }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('自动播放被阻止'));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS 错误:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('网络错误，尝试恢复...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('媒体错误，尝试恢复...');
              hls.recoverMediaError();
              break;
            default:
              console.error('无法恢复的错误');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play();
      });
    }
  } else {
    video.src = url;
    video.play();
  }
}

function closePlayer() {
  const modal = document.getElementById('playerModal');
  const video = document.getElementById('videoPlayer');
  
  video.pause();
  video.src = '';
  
  if (hls) {
    hls.destroy();
    hls = null;
  }
  
  modal.classList.remove('show');
  document.body.style.overflow = '';
  currentVideo = null;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePlayer();
  }
});

window.filterByType = filterByType;
window.loadVideos = loadVideos;
window.goToPage = goToPage;
window.search = search;
window.openPlayer = openPlayer;
window.playEpisode = playEpisode;
window.closePlayer = closePlayer;

console.log('Functions exposed to window:', {
  openPlayer: typeof window.openPlayer,
  showPlayer: typeof window.showPlayer
});

init();
