# Haislip Lab: 10 static products

Open `lab.html` for the hub. Everything is plain HTML/JS: no build step, no backend, no keys. Shared pieces live in `shared/` (Primer-dark theme, `lab.js`, WebAudio juice, and a small bloom pass). Three.js, PeerJS, and the QR library load from jsDelivr. Pages use relative paths so they work on raw.githack.com serving `main`.

| Folder | Product | Status |
|---|---|---|
| `weekly-game-drop/` (+ `neon-drift/`) | Weekly Game Drop: daily-seeded 3D racer with ghost replay | public MVP |
| `live-arcade/` | Big-screen party game, phones as controllers (PeerJS P2P + QR) | public MVP |
| `infinite-jam/` | Audio-reactive 3D stage driven by crowd prompts | public MVP |
| `arcade-kit/` | Drop-in script: scores, challenge links, tip + sponsor slot | public MVP |
| `podcast-to-playable/` | Transcript → quote cards, chapters, 3D quiz in a link | public MVP |
| `chairside-ai/` | 3D procedure explainer, voice, EN/ES, kid mode | private prototype |
| `smile-preview/` | On-device whitening simulation | private prototype |
| `dental-jobs/` | Pay-range-required job board (sample data) | private prototype |
| `tooth-defender/` | 2-minute 3D brushing game | private prototype |
| `dental-jam/` | Build-jam concept page | private prototype |

Money rules: dashboards show hand-entered real numbers ($0 today). There is no checkout anywhere. Sponsor slots say "DM first, then Venmo @alexnaughtonjr", and nothing is charged by the page.
Sold sponsor hooks: `window.DRIFT_SPONSORS` (neon-drift), `SPONSOR` (live-arcade/host.html), `SPONSORS` (infinite-jam/stage.html), `data-sponsor` (arcade-kit).
Private prototypes are personal side projects: sample data, no employer or brand affiliation, not marketed.
