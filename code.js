figma.showUI(__html__, { width: 300, height: 200 });

// 感情単語リスト
const EMOTION_WORDS = {
  positive: ["嬉しい", "安心", "楽"],
  negative: ["大変", "めんどくさい", "手間", "煩雑", "不安", "心配"]
};

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'analyze-emotions') {
    // 選択されたテキストノードを取得
    const selection = figma.currentPage.selection;
    const textNodes = selection.filter(node => 
      node.type === 'TEXT' || 
      (node.type === 'STICKY' && node.text !== undefined));
    
    if (textNodes.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'テキストを選択してください。' });
      return;
    }
    
    // 検出結果を格納する配列
    let detectedEmotions = [];
    
    // 各テキストノードを分析
    for (const node of textNodes) {
      await figma.loadFontAsync(node.fontName);
      
      const text = node.type === 'TEXT' ? node.characters : node.text.characters;
      
      // 感情単語の検出
      for (const word of EMOTION_WORDS.positive) {
        let startIndex = 0;
        let index;
        while ((index = text.indexOf(word, startIndex)) !== -1) {
          detectedEmotions.push({
            word,
            type: 'positive',
            position: {
              nodeId: node.id,
              startIndex: index,
              endIndex: index + word.length
            }
          });
          startIndex = index + 1;
        }
      }
      
      for (const word of EMOTION_WORDS.negative) {
        let startIndex = 0;
        let index;
        while ((index = text.indexOf(word, startIndex)) !== -1) {
          detectedEmotions.push({
            word,
            type: 'negative',
            position: {
              nodeId: node.id,
              startIndex: index,
              endIndex: index + word.length
            }
          });
          startIndex = index + 1;
        }
      }
      
      // 絵文字の配置
      for (const emotion of detectedEmotions) {
        const targetNode = figma.getNodeById(emotion.position.nodeId);
        if (!targetNode) continue;
        
        const emoji = figma.createText();
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        emoji.characters = emotion.type === 'positive' ? '😊' : '😣';
        emoji.fontSize = 24;
        
        // 位置調整
        const nodeBounds = targetNode.absoluteBoundingBox;
        if (!nodeBounds) continue;
        
        // テキスト内の位置から絶対位置を計算
        // 簡易的な実装（実際にはテキストの行や文字の位置から計算する必要がある）
        emoji.x = nodeBounds.x + 10;
        emoji.y = nodeBounds.y - 30;
        
        figma.currentPage.appendChild(emoji);
      }
    }
    
    // 結果を返す
    figma.ui.postMessage({ 
      type: 'analysis-complete', 
      count: {
        positive: detectedEmotions.filter(e => e.type === 'positive').length,
        negative: detectedEmotions.filter(e => e.type === 'negative').length
      }
    });
  }
};