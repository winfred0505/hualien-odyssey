const STORY_DATA = require('./js/storyData.js');

let allPassed = true;
let totalNodes = 0;

for (const [mode, data] of Object.entries(STORY_DATA)) {
  console.log(`\n=== 檢查主軸：${mode} (${data.meta.title}) ===`);
  const nodes = data.nodes;
  for (const [nodeId, node] of Object.entries(nodes)) {
    totalNodes++;
    const textWithoutSpaces = node.text.replace(/\s+/g, '');
    const charLen = textWithoutSpaces.length;
    const choiceCount = node.choices ? node.choices.length : 0;
    
    let nodeOk = true;
    if (charLen < 200 || charLen > 300) {
      console.error(`❌ [字數不符] ${nodeId} (${node.title}): 字數為 ${charLen} 字 (需介於 200 - 300 字)`);
      nodeOk = false;
      allPassed = false;
    }
    if (choiceCount !== 3) {
      console.error(`❌ [選項數量不符] ${nodeId} (${node.title}): 選項數量為 ${choiceCount} (必須嚴格為 3 個)`);
      nodeOk = false;
      allPassed = false;
    }
    
    // 檢查目標節點是否存在
    for (let i = 0; i < node.choices.length; i++) {
      const c = node.choices[i];
      if (!c.targetId.startsWith('action_') && !nodes[c.targetId]) {
        console.error(`❌ [無效連結] ${nodeId} -> choice ${i+1}: 找不到 targetId '${c.targetId}'`);
        nodeOk = false;
        allPassed = false;
      }
    }
    
    if (nodeOk) {
      console.log(`✅ [OK] ${nodeId.padEnd(20)} (${node.title}) - 字數: ${charLen} 字, 選項: ${choiceCount} 個`);
    }
  }
}

console.log(`\n========================================`);
console.log(`總節點數: ${totalNodes}，測試結果: ${allPassed ? '🎉 全部通過！' : '❌ 有錯誤待修正！'}`);
if (!allPassed) {
  process.exit(1);
}
