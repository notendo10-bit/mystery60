# MYSTERY 60

60秒の謎。解けたら、もう一問。

短編ホラー映画を体験するように読む、ミステリー・サスペンス・ホラーの短編集です。

公開サイト: https://notendo10-bit.github.io/mystery60/

## 構成

| パス | 内容 |
| --- | --- |
| `index.html` | 入口 |
| `css/style.css` | デザイン |
| `js/cases.js` | シナリオデータ（問題の追加・修正はここ） |
| `js/app.js` | ゲームの進行、進捗保存（LocalStorage） |
| `images/` | 各問題の画像（WebP）と一覧用サムネイル |
| `archive/v1/` | 改良前の初代サイト（Git タグ `v1-original` にも保存） |

サーバー、ログイン、AI API、課金機能、外部ライブラリはいずれも使っていません。

## 問題を追加するとき

`js/cases.js` に1件追加し、`images/<id>.webp`（横1200px程度）と `images/<id>-thumb.webp`（224×168）を置きます。

守ること:

- 推理に必要な情報は `story` と `clues` に全部出す。`after`（余韻）だけで解ける形にしない
- 間違いの選択肢には、なぜ違うかを `rebut` に書く
- 画像は内容と一致させる。合う画像がなければ流用しない

## ローカルで確認

```bash
python -m http.server 8765
```

## 画像について

画像はすべてAI生成で、公開後に外部サービスへの通信は発生しません。
