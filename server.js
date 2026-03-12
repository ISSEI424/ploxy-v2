// GeForce NOW向けに軽量・依存なしで動作するように最適化
(function(){
  'use strict';

  var form = document.getElementById('searchForm');
  var input = document.getElementById('urlInput');

  // 高速なURL正規化：スキーマがなければ https を追加
  function normalizeUrl(value){
    if(!value) return '';
    value = value.trim();
    // 既にスキーマがあるかチェック
    if(!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)){
      value = 'https://' + value;
    }
    try {
      // URL コンストラクタで最低限の検証
      return new URL(value).href;
    } catch (e) {
      return '';
    }
  }

  // フォーム送信処理：viewer.html にクエリで target を渡して遷移
  function onSubmit(e){
    e && e.preventDefault();
    var raw = input.value || '';
    var url = normalizeUrl(raw);
    if(!url){
      // シンプルなフォールバックエラー表示（GeForce NOW の制約を考慮）
      try { alert('有効なURLを入力してください'); }
      catch (ex) { /* ignore */ }
      return;
    }
    // 規模を小さくするため相対パスで遷移（viewer.html は同一フォルダに置く）
    location.href = './viewer.html?target=' + encodeURIComponent(url);
  }

  // Enter 抑制と submit の安定化
  form.addEventListener('submit', onSubmit, false);
  input.addEventListener('keydown', function(ev){
    if(ev.key === 'Enter'){ ev.preventDefault(); onSubmit(); }
  }, false);

  // パフォーマンス小技：不要なレンダーブロッキングを避けるため
  // イベントリスナは必要最小限に留める
})();
