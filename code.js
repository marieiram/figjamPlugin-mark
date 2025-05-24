figma.showUI(__html__, { width: 300, height: 400 });

// 感情単語リスト
const EMOTION_WORDS = {
  positive: ["嬉しい", "安心", "楽"],
  negative: ["大変", "めんどくさい", "手間", "煩雑", "不安", "心配"]
};

//文字を抽出するロジック
const extractTextNodes = (nodes) => {
  let textNodes = [];
  for (const node of nodes) {
    if (node.type === 'TEXT') {
      textNodes.push(node);
    } else if (node.type === 'STICKY' && node.text) {
      textNodes.push(node); // STICKYノードもテキストノードとして扱う
    } else if (node.type === 'FRAME' || node.type === 'GROUP') {
      // 子ノードを再帰的に探索
      textNodes = textNodes.concat(extractTextNodes(node.children));
    }
  }
  return textNodes;
};

//感情単語リストに基づいて一致する単語を検出する
const detectEmotions = (text, nodeId) => {
  let detectedEmotions = [];

  // ポジティブな単語を検出
  for (const word of EMOTION_WORDS.positive) {
    let startIndex = 0;
    let index;
    while ((index = text.indexOf(word, startIndex)) !== -1) {
      detectedEmotions.push({
        word,
        type: 'positive',
        position: {
          nodeId: nodeId,
          startIndex: index,
          endIndex: index + word.length
        }
      });
      startIndex = index + 1;
    }
  }

  // ネガティブな単語を検出
  for (const word of EMOTION_WORDS.negative) {
    let startIndex = 0;
    let index;
    while ((index = text.indexOf(word, startIndex)) !== -1) {
      detectedEmotions.push({
        word,
        type: 'negative',
        position: {
          nodeId: nodeId,
          startIndex: index,
          endIndex: index + word.length
        }
      });
      startIndex = index + 1;
    }
  }

  return detectedEmotions;
};


//絵文字を配置するための関数
const placeEmojis = async (detectedEmotions) => {
  for (const emotion of detectedEmotions) {
    const targetNode = figma.getNodeById(emotion.position.nodeId);
    if (!targetNode) continue;

    const emoji = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    emoji.characters = emotion.type === 'positive' ? '😊' : '😣';
    emoji.fontSize = 28;

    // 位置調整
    const nodeBounds = targetNode.absoluteBoundingBox;
    if (!nodeBounds) continue;

    // テキスト内の位置から絶対位置を計算
    emoji.x = nodeBounds.x + 10;
    emoji.y = nodeBounds.y - 30;

    figma.currentPage.appendChild(emoji);
  }
};

//結果をUIに送信するための関数
const sendResults = (detectedEmotions) => {
  const positiveCount = detectedEmotions.filter(e => e.type === 'positive').length;
  const negativeCount = detectedEmotions.filter(e => e.type === 'negative').length;

  figma.ui.postMessage({
    type: 'analysis-complete',
    count: {
      positive: positiveCount,
      negative: negativeCount
    }
  });
};

//キャンセルするための関数
const handleCancel = () => {
  isCanceled = true; // キャンセルフラグを有効化
  figma.ui.postMessage({ type: 'canceled' }); // UIにキャンセル通知を送信
};



// 感情の語句を検出し、絵文字を配置する関数      
async function analyzeEmotions() {
  // キャンセルフラグを初期化
  let isCanceled = false

    // 選択されたノードからテキストノードを取得
    const selection = figma.currentPage.selection;
    const textNodes = extractTextNodes(selection);


    // テキストノードが選択されていない場合
    if (textNodes.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'テキストを選択してください。' });
      return;
    }


    // 検出結果を格納する配列
    let detectedEmotions = [];
    
    // 各テキストノードを分析
    for (const node of textNodes) {
// キャンセルされた場合、ループを中断
      if (isCanceled) {
        break; 
      }
    
   // フォントをロード（TEXTノードのみ）
   if (node.type === 'TEXT') {
    await figma.loadFontAsync(node.fontName);
  }
      // テキストを取得
      const text = node.type === 'TEXT' ? node.characters : node.text.characters;
      if (!text) continue; // テキストが空の場合はスキップ


    // 感情単語を検出
    const emotions = detectEmotions(text, node.id);
    detectedEmotions = detectedEmotions.concat(emotions);

    }
    
    //emojisを配置
    await placeEmojis(detectedEmotions);

  // 結果を送信
  sendResults(detectedEmotions);

    if (msg.type === 'cancel-analysis') {
      isCanceled = true; // キャンセルフラグを有効化
      figma.ui.postMessage({ type: 'canceled' }); // UIにキャンセル通知を送信
    }
  }

function clearEmojis() {
  const emojis = figma.currentPage.findAll(node => node.type === 'TEXT' && (node.characters === '😊' || node.characters === '😣'));
  for (const emoji of emojis) {
    emoji.remove();
  }
}


// UIからのメッセージを受信して処理
figma.ui.onmessage =async (msg) => {
if (msg.type === 'analyze-emotions') {
  analyzeEmotions();
}else if (msg.type === 'cancel-analysis') {
  handleCancel();
}else if (msg.type === 'clear-emojis') {
  clearEmojis();
  figma.ui.postMessage({ type: 'emojis-cleared' }); // UIに絵文字削除通知を送信 
}
};