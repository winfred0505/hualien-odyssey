const STORY_DATA = require('./js/storyData.js');

function simulateJourney(mode, pathNodeIds) {
  const branch = STORY_DATA[mode];
  let inventory = [];
  let visitedLocations = new Set();
  let stats = { nature: 0, gourmet: 0, culture: 0 };

  for (const nodeId of pathNodeIds) {
    const node = branch.nodes[nodeId];
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    
    if (node.item && !inventory.some(it => it.name === node.item.name)) {
      inventory.push(node.item);
    }
    if (node.location) {
      visitedLocations.add(node.location.split('·')[0].trim());
    }
    if (node.attr) {
      stats.nature += (node.attr.nature || 0);
      stats.gourmet += (node.attr.gourmet || 0);
      stats.culture += (node.attr.culture || 0);
    }
  }

  // 模擬 evaluateHiddenEnding
  const itemCount = inventory.length;
  const regionCount = visitedLocations.size;
  const { nature, gourmet, culture } = stats;

  let targetEndingId = '';
  if (mode === 'first_time') {
    if (itemCount >= 5 && regionCount >= 4) {
      targetEndingId = 'ft_end_master';
    } else if (nature >= gourmet && nature >= culture) {
      targetEndingId = 'ft_end_magnificent';
    } else if (gourmet >= nature && gourmet >= culture) {
      targetEndingId = 'ft_end_gourmet';
    } else {
      targetEndingId = 'ft_end_slowwalk';
    }
  } else {
    if (itemCount >= 5 && culture >= 4) {
      targetEndingId = 'rt_end_master';
    } else if (culture >= nature && culture >= gourmet) {
      targetEndingId = 'rt_end_cultural';
    } else if (nature >= gourmet) {
      targetEndingId = 'rt_end_solitude';
    } else {
      targetEndingId = 'rt_end_deepheart';
    }
  }

  return { targetEndingId, stats, itemCount, regionCount };
}

console.log("=== 測試初次到訪路徑結算 ===");
// 1. 純自然路線：起點 -> 太魯閣 -> 清水斷崖 -> 七星潭 -> 決算
const r1 = simulateJourney('first_time', ['ft_start', 'ft_taroko', 'ft_qingshui_cliff', 'ft_qixingtan']);
console.log("自然路線結算:", r1.targetEndingId, "(預期 ft_end_magnificent)");
if (r1.targetEndingId !== 'ft_end_magnificent') process.exit(1);

// 2. 純美食路線：起點 -> 市區美食 -> 名產街 -> 東大門夜市 -> 決算
const r2 = simulateJourney('first_time', ['ft_start', 'ft_city_food', 'ft_city_sweets', 'ft_night_market']);
console.log("美食路線結算:", r2.targetEndingId, "(預期 ft_end_gourmet)");
if (r2.targetEndingId !== 'ft_end_gourmet') process.exit(1);

// 3. 大滿貫路線：太魯閣(秀林) -> 新城檸檬(新城) -> 市區美食(花蓮市) -> 瑞穗牧場(瑞穗)
const r3 = simulateJourney('first_time', ['ft_start', 'ft_taroko', 'ft_xincheng_lemon', 'ft_city_food', 'ft_ruisui_ranch']);
console.log("大滿貫路線結算:", r3.targetEndingId, `(特產:${r3.itemCount}, 鄉鎮:${r3.regionCount}) (預期 ft_end_master)`);
if (r3.targetEndingId !== 'ft_end_master') process.exit(1);

console.log("\n=== 測試曾經到訪路徑結算 ===");
// 4. 重遊文化工藝路線：起點 -> 松園別館 -> 白鮑溪 -> 豐田琢玉 -> 決算
const r4 = simulateJourney('returning', ['rt_start', 'rt_pine_garden', 'rt_baibao_creek', 'rt_toyoda_jade']);
console.log("文化工藝路線結算:", r4.targetEndingId, "(預期 rt_end_cultural)");
if (r4.targetEndingId !== 'rt_end_cultural') process.exit(1);

// 5. 重遊真結局路線：起點 -> 松園別館 -> 鳳林菸樓 -> 林田山 -> 新社香蕉絲
const r5 = simulateJourney('returning', ['rt_start', 'rt_pine_garden', 'rt_fenglin_tobacco', 'rt_lintianshan', 'rt_banana_fiber']);
console.log("重遊真結局結算:", r5.targetEndingId, `(特產:${r5.itemCount}, 文化:${r5.stats.culture}) (預期 rt_end_master)`);
if (r5.targetEndingId !== 'rt_end_master') process.exit(1);

console.log("\n🎉 所有隱藏條件觸發模擬測試 100% 通過！");
