/**
 * 《洄瀾風語：花蓮奇境探索之旅》核心遊戲控制器
 * 具備隱藏條件分析與動態結局結算引擎
 */

class HualienAdventure {
  constructor() {
    this.currentMode = null; // 'first_time' | 'returning'
    this.currentNodeId = null;
    this.history = []; // 歷史軌跡 [nodeId, ...]
    this.inventory = []; // 收集到的名產與線索 [{ name, desc, icon, foundAt }]
    this.visitedNodes = new Set();
    this.visitedLocations = new Set();
    this.isTyping = false;
    this.typewriterTimer = null;
    this.currentText = '';

    // 隱藏屬性計分器
    this.stats = {
      nature: 0,
      gourmet: 0,
      culture: 0
    };

    // 地理鄉鎮定義
    this.allRegions = [
      { name: "秀林鄉", tag: "峽谷奇絕", icon: "⛰️" },
      { name: "新城鄉", tag: "月牙浪淘", icon: "🌊" },
      { name: "花蓮市", tag: "老街市井", icon: "🏮" },
      { name: "吉安鄉", tag: "日式清幽", icon: "🏯" },
      { name: "壽豐鄉", tag: "翠玉湧泉", icon: "💎" },
      { name: "鳳林鎮", tag: "客家慢城", icon: "🌿" },
      { name: "光復鄉", tag: "林場糖香", icon: "🚂" },
      { name: "豐濱鄉", tag: "原鄉潮聲", icon: "🐚" },
      { name: "瑞穗鄉", tag: "綠野茶乳", icon: "🍵" },
      { name: "玉里鎮", tag: "老鎮溫泉", icon: "♨️" }
    ];

    this.initDOMElements();
    this.bindEvents();
    this.loadSavedGame();
  }

  initDOMElements() {
    // 畫面容器
    this.welcomeScreen = document.getElementById('welcome-screen');
    this.gameScreen = document.getElementById('game-screen');
    
    // 頂部與狀態欄
    this.modeBadge = document.getElementById('mode-badge');
    this.locationBadge = document.getElementById('location-badge');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.bagBtn = document.getElementById('bag-btn');
    this.bagCountBadge = document.getElementById('bag-count-badge');
    this.mapBtn = document.getElementById('map-btn');
    this.backBtn = document.getElementById('back-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // 故事展示區
    this.sceneTitle = document.getElementById('scene-title');
    this.storyText = document.getElementById('story-text');
    this.rewardNotification = document.getElementById('reward-notification');
    this.choicesContainer = document.getElementById('choices-container');

    // 彈窗
    this.inventoryModal = document.getElementById('inventory-modal');
    this.inventoryList = document.getElementById('inventory-list');
    this.mapModal = document.getElementById('map-modal');
    this.mapGrid = document.getElementById('map-grid');
    this.modalCloseBtns = document.querySelectorAll('.modal-close-btn');
  }

  bindEvents() {
    // 模式選擇
    document.querySelectorAll('.role-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        this.startNewGame(mode);
      });
    });

    // 音效開關
    this.soundToggleBtn.addEventListener('click', () => {
      const isSoundOn = window.soundEngine.toggleMute();
      this.soundToggleBtn.innerHTML = isSoundOn 
        ? `<span class="icon">🔊</span><span class="btn-text">山海浪濤 (開)</span>` 
        : `<span class="icon">🔇</span><span class="btn-text">音效 (靜音)</span>`;
      this.soundToggleBtn.classList.toggle('active', isSoundOn);
    });

    // 行囊彈窗
    this.bagBtn.addEventListener('click', () => this.openInventory());

    // 足跡地圖
    this.mapBtn.addEventListener('click', () => this.openMap());

    // 彈窗關閉按鈕
    this.modalCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventoryModal.classList.remove('active');
        this.mapModal.classList.remove('active');
      });
    });

    // 點擊遮罩關閉彈窗
    [this.inventoryModal, this.mapModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // 回溯上一頁 (Undo)
    this.backBtn.addEventListener('click', () => this.goBack());

    // 重新開始
    this.restartBtn.addEventListener('click', () => {
      if (confirm('確定要回到起點，重新選擇旅程主軸嗎？當前進度將重置。')) {
        this.resetGame();
      }
    });
  }

  startNewGame(mode) {
    if (!STORY_DATA[mode]) return;
    this.currentMode = mode;
    this.inventory = [];
    this.history = [];
    this.visitedNodes = new Set();
    this.visitedLocations = new Set();
    this.stats = { nature: 0, gourmet: 0, culture: 0 };
    
    const startNodeId = STORY_DATA[mode].meta.startNode;
    this.welcomeScreen.classList.remove('active');
    this.gameScreen.classList.add('active');

    window.soundEngine.playChime(659.25); // E5
    this.goToNode(startNodeId);
  }

  // 隱藏條件動態結算結局
  evaluateHiddenEnding() {
    const itemCount = this.inventory.length;
    const regionCount = this.visitedLocations.size;
    const { nature, gourmet, culture } = this.stats;

    let targetEndingId = '';
    let conditionReason = '';

    if (this.currentMode === 'first_time') {
      // 判斷是否達成「大滿貫隱藏真結局」
      if (itemCount >= 5 && regionCount >= 4) {
        targetEndingId = 'ft_end_master';
        conditionReason = `🏆 達成初探極限隱藏條件：收集特產達 ${itemCount} 件，踏足 ${regionCount} 個鄉鎮！解鎖大滿貫真結局！`;
      } else if (nature >= gourmet && nature >= culture) {
        targetEndingId = 'ft_end_magnificent';
        conditionReason = `🌊 達成隱藏條件：山海自然傾向最高 (自然指數 ${nature} 點)，深受峽谷海灣震撼！`;
      } else if (gourmet >= nature && gourmet >= culture) {
        targetEndingId = 'ft_end_gourmet';
        conditionReason = `🍲 達成隱藏條件：風土美食傾向最高 (美食指數 ${gourmet} 點)，舌尖記憶深刻！`;
      } else {
        targetEndingId = 'ft_end_slowwalk';
        conditionReason = `✨ 達成隱藏條件：心靈慢活傾向最高 (縱谷探訪與清幽探索)，找回從容呼吸！`;
      }
    } else {
      // 曾經到訪模式
      if (itemCount >= 5 && culture >= 4) {
        targetEndingId = 'rt_end_master';
        conditionReason = `👑 達成重遊極致隱藏條件：深度工藝與人文滿載 (文化指數 ${culture} 點)，收集達 ${itemCount} 件風土信物！解鎖共鳴真結局！`;
      } else if (culture >= nature && culture >= gourmet) {
        targetEndingId = 'rt_end_cultural';
        conditionReason = `🏛️ 達成隱藏條件：人文工藝傾向最高 (文化指數 ${culture} 點)，銘刻土地多元靈魂！`;
      } else if (nature >= gourmet) {
        targetEndingId = 'rt_end_solitude';
        conditionReason = `🍃 達成隱藏條件：山海避世幽居傾向最高 (自然指數 ${nature} 點)，身心獲得徹底留白！`;
      } else {
        targetEndingId = 'rt_end_deepheart';
        conditionReason = `💖 達成隱藏條件：在地常民深情傾向最高 (走訪慢城老市鎮)，與土地脈動同頻！`;
      }
    }

    return { targetEndingId, conditionReason };
  }

  goToNode(nodeId) {
    // 特殊動作處理
    if (nodeId === 'action_show_inventory') {
      this.openInventory();
      return;
    }
    if (nodeId === 'action_restart_returning') {
      this.startNewGame('returning');
      return;
    }
    if (nodeId === 'action_restart_first') {
      this.startNewGame('first_time');
      return;
    }

    // 觸發「隱藏條件結算」
    let endingNotice = null;
    if (nodeId === 'action_evaluate_ending') {
      const evaluation = this.evaluateHiddenEnding();
      nodeId = evaluation.targetEndingId;
      endingNotice = evaluation.conditionReason;
    }

    const currentBranch = STORY_DATA[this.currentMode];
    if (!currentBranch || !currentBranch.nodes[nodeId]) {
      console.error(`找不到節點: ${nodeId}`);
      return;
    }

    const node = currentBranch.nodes[nodeId];

    // 記錄歷史
    if (this.currentNodeId && this.currentNodeId !== nodeId) {
      this.history.push(this.currentNodeId);
    }
    this.currentNodeId = nodeId;
    this.visitedNodes.add(nodeId);

    // 累計隱藏屬性數值
    if (node.attr) {
      this.stats.nature += (node.attr.nature || 0);
      this.stats.gourmet += (node.attr.gourmet || 0);
      this.stats.culture += (node.attr.culture || 0);
    }

    // 記錄地理鄉鎮
    if (node.location) {
      this.allRegions.forEach(reg => {
        if (node.location.includes(reg.name)) {
          this.visitedLocations.add(reg.name);
        }
      });
    }

    this.renderNode(node, endingNotice);
    this.saveGame();
  }

  renderNode(node, endingNotice = null) {
    // 更新頂部標籤
    const modeMeta = STORY_DATA[this.currentMode].meta;
    this.modeBadge.textContent = modeMeta.title;
    this.locationBadge.textContent = node.location || '花蓮境內';

    // 歷史返回按鈕可用狀態 (結局節點不可回溯，避免狀態混淆)
    const isEndingNode = node.id.includes('_end_');
    this.backBtn.disabled = this.history.length === 0 || isEndingNode;

    // 場景標題
    this.sceneTitle.textContent = node.title;

    // 檢查是否有獲得新道具/名產
    let hasNewItem = false;
    if (node.item) {
      const alreadyHas = this.inventory.some(it => it.name === node.item.name);
      if (!alreadyHas) {
        hasNewItem = true;
        this.inventory.push({
          ...node.item,
          foundAt: node.location || node.title,
          foundTime: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        });
        this.updateBagBadge();
        this.showRewardNotification(node.item, endingNotice);
        window.soundEngine.playItemReward();
      }
    }

    if (!hasNewItem && !endingNotice) {
      this.rewardNotification.classList.remove('show');
    } else if (endingNotice && !hasNewItem) {
      this.showEndingNoticeBanner(endingNotice);
    }

    // 每次載入新段落將捲軸平滑歸零
    const scrollArea = document.querySelector('.story-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTop = 0;
    }

    // 文字區塊直接呈現，無逐一產字過程
    this.storyText.textContent = node.text;
    this.renderChoices(node.choices);
  }

  renderChoices(choices) {
    this.choicesContainer.innerHTML = '';
    const letters = ['甲、', '乙、', '丙、'];

    choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `
        <span class="choice-prefix">${letters[index] || (index + 1) + '、'}</span>
        <span class="choice-text">${choice.text}</span>
        <span class="choice-arrow">➔</span>
      `;
      btn.addEventListener('click', () => {
        window.soundEngine.playChoice();
        this.goToNode(choice.targetId);
      });
      this.choicesContainer.appendChild(btn);
    });

    // 平滑淡入選項
    this.choicesContainer.style.transition = 'opacity 0.4s ease';
    this.choicesContainer.style.opacity = '1';

    // 在行動裝置上平滑微捲，引導讀者視線自然移至三個選項
    setTimeout(() => {
      if (window.innerWidth <= 768 && this.choicesContainer) {
        this.choicesContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 120);
  }

  showRewardNotification(item, endingNotice = null) {
    let extraNoticeHtml = '';
    if (endingNotice) {
      extraNoticeHtml = `<div class="ending-condition-tag">${endingNotice}</div>`;
    }

    this.rewardNotification.innerHTML = `
      <span class="reward-icon">${item.icon || '🎁'}</span>
      <div class="reward-content">
        ${extraNoticeHtml}
        <div class="reward-title">獲得風土收藏：${item.name}</div>
        <div class="reward-desc">${item.desc}</div>
      </div>
    `;
    this.rewardNotification.classList.add('show');
  }

  showEndingNoticeBanner(endingNotice) {
    this.rewardNotification.innerHTML = `
      <span class="reward-icon">🔮</span>
      <div class="reward-content">
        <div class="reward-title">【隱藏條件自動達成】</div>
        <div class="reward-desc">${endingNotice}</div>
      </div>
    `;
    this.rewardNotification.classList.add('show');
  }

  updateBagBadge() {
    const count = this.inventory.length;
    this.bagCountBadge.textContent = count;
    this.bagCountBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  goBack() {
    if (this.history.length === 0) return;
    const previousNodeId = this.history.pop();
    this.currentNodeId = null; // 重置以便正常記錄
    window.soundEngine.playChoice();
    this.goToNode(previousNodeId);
  }

  resetGame() {
    localStorage.removeItem('hualien_game_save');
    this.currentMode = null;
    this.currentNodeId = null;
    this.history = [];
    this.inventory = [];
    this.stats = { nature: 0, gourmet: 0, culture: 0 };
    this.visitedNodes.clear();
    this.visitedLocations.clear();
    this.updateBagBadge();
    
    this.gameScreen.classList.remove('active');
    this.welcomeScreen.classList.add('active');
  }

  openInventory() {
    this.inventoryList.innerHTML = '';
    
    // 頂部統計指標
    const statsBar = document.createElement('div');
    statsBar.className = 'inventory-stats-bar';
    statsBar.innerHTML = `
      <div class="stat-item"><span>🌲 山海自然：</span><strong>${this.stats.nature}</strong></div>
      <div class="stat-item"><span>🍲 風土美食：</span><strong>${this.stats.gourmet}</strong></div>
      <div class="stat-item"><span>🏛️ 人文深度：</span><strong>${this.stats.culture}</strong></div>
      <div class="stat-item"><span>🗺️ 走訪鄉鎮：</span><strong>${this.visitedLocations.size} / ${this.allRegions.length}</strong></div>
    `;
    this.inventoryList.appendChild(statsBar);

    if (this.inventory.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <span class="empty-icon">🎒</span>
        <p>行囊目前還是空的，隨著你在花蓮各地的探索，將會收集到名產、手作紀念與風土結晶！</p>
      `;
      this.inventoryList.appendChild(emptyState);
    } else {
      this.inventory.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'inventory-card';
        itemCard.innerHTML = `
          <div class="item-icon-box">${item.icon}</div>
          <div class="item-details">
            <h4 class="item-name">${item.name}</h4>
            <p class="item-desc">${item.desc}</p>
            <div class="item-meta">
              <span class="item-loc">📍 拾獲於：${item.foundAt}</span>
              <span class="item-time">⏱️ ${item.foundTime}</span>
            </div>
          </div>
        `;
        this.inventoryList.appendChild(itemCard);
      });
    }
    this.inventoryModal.classList.add('active');
  }

  openMap() {
    this.mapGrid.innerHTML = '';
    this.allRegions.forEach(reg => {
      const isVisited = this.visitedLocations.has(reg.name);
      const cell = document.createElement('div');
      cell.className = `region-card ${isVisited ? 'visited' : 'locked'}`;
      cell.innerHTML = `
        <div class="region-icon">${isVisited ? reg.icon : '🔒'}</div>
        <div class="region-info">
          <div class="region-name">${reg.name}</div>
          <div class="region-tag">${reg.tag}</div>
          <div class="region-status">${isVisited ? '✨ 已造訪足跡' : '🌫️ 尚未涉足'}</div>
        </div>
      `;
      this.mapGrid.appendChild(cell);
    });
    this.mapModal.classList.add('active');
  }

  saveGame() {
    const saveData = {
      currentMode: this.currentMode,
      currentNodeId: this.currentNodeId,
      history: this.history,
      inventory: this.inventory,
      stats: this.stats,
      visitedNodes: Array.from(this.visitedNodes),
      visitedLocations: Array.from(this.visitedLocations)
    };
    try {
      localStorage.setItem('hualien_game_save', JSON.stringify(saveData));
    } catch (e) {
      console.warn('無法儲存遊戲進度:', e);
    }
  }

  loadSavedGame() {
    try {
      const raw = localStorage.getItem('hualien_game_save');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.currentMode && data.currentNodeId) {
        // 提供繼續遊戲的提示按鈕
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'resume-btn';
        resumeBtn.innerHTML = `<span>🧭 偵測到上次旅程存檔，點擊直接繼續（${data.currentMode === 'first_time' ? '初次到訪' : '曾經到訪'}）</span>`;
        resumeBtn.addEventListener('click', () => {
          this.currentMode = data.currentMode;
          this.history = data.history || [];
          this.inventory = data.inventory || [];
          this.stats = data.stats || { nature: 0, gourmet: 0, culture: 0 };
          this.visitedNodes = new Set(data.visitedNodes || []);
          this.visitedLocations = new Set(data.visitedLocations || []);
          this.updateBagBadge();
          this.welcomeScreen.classList.remove('active');
          this.gameScreen.classList.add('active');
          this.goToNode(data.currentNodeId);
        });
        const welcomeOptions = document.querySelector('.welcome-content');
        if (welcomeOptions) {
          welcomeOptions.appendChild(resumeBtn);
        }
      }
    } catch (e) {
      console.warn('讀取存檔失敗:', e);
    }
  }
}

// 頁面載入後啟動遊戲
document.addEventListener('DOMContentLoaded', () => {
  window.game = new HualienAdventure();
});
