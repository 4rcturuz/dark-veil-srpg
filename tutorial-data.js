import {createElevation} from './elevation.js';
export {TUTORIAL_ITEMS,TUTORIAL_ENEMIES} from './database.js';
export const MAP_BLUEPRINTS = [
  {
    "name": "廃墟の聖堂・1/3",
    "width": 12,
    "height": 12,
    "terrain": [
      "############",
      "#FF#########",
      "#FFFFFFFFFF#",
      "#FF###F#####",
      "######%#####",
      "######F#####",
      "######F#####",
      "######F#####",
      "#FF%FFF%FFF#",
      "#FFFFFFF%FF#",
      "#FFF%FFFFF&#",
      "############"
    ],
    "heights": [
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111"
    ],
    "markers": [
      "............",
      "............",
      ".P........I.",
      "............",
      "............",
      "............",
      "............",
      "............",
      "............",
      "......E.....",
      "..........T.",
      "............"
    ],
    "items": [
      {
        "x": 10,
        "y": 9,
        "type": "brokenStaff"
      }
    ],
    "enemies": [
      {
        "x": 6,
        "y": 2,
        "type": "pilgrim",
        "movementBounds": {
          "minX": 6,
          "maxX": 6,
          "minY": 2,
          "maxY": 5
        }
      }
    ]
  },
  {
    "name": "廃墟の聖堂・ 2/3",
    "width": 12,
    "height": 16,
    "terrain": [
      "############",
      "#FFF####FFF#",
      "##FF####FF##",
      "#FFF####FFF#",
      "##FF####FF##",
      "#FFF####FFF#",
      "##FF####FF##",
      "#FFFFFFFFFF#",
      "#FFFFFFFFFF#",
      "##FF####FF##",
      "#FFF####FFF#",
      "##FF####FF##",
      "FFFF####FFF#",
      "##FF####FF##",
      "#F&F####F$F#",
      "############"
    ],
    "heights": [
      "111111111111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111111111111",
      "111111111111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111100001111",
      "111111111111"
    ],
    "markers": [
      "............",
      "..I......I..",
      "............",
      "..........E.",
      "............",
      "............",
      "............",
      "............",
      "....E.......",
      "............",
      "..........E.",
      "............",
      "IE..........",
      "............",
      "..T......P..",
      "............"
    ],
    "items": [
      {
        "x": 2,
        "y": 14,
        "type": "moonClear"
      },
      {
        "x": 9,
        "y": 14,
        "type": "moonDrop"
      },
      {
        "x": 0,
        "y": 3,
        "type": "feral"
      }
    ],
    "enemies": [
      {
        "x": 10,
        "y": 5,
        "type": "pilgrim"
      },
      {
        "x": 4,
        "y": 7,
        "type": "nun"
      },
      {
        "x": 10,
        "y": 12,
        "type": "weed"
      },
      {
        "x": 1,
        "y": 3,
        "type": "weed"
      }
    ]
  },
  {
    "name": "廃墟の聖堂・ 3/3",
    "width": 12,
    "height": 16,
    "terrain": [
      "############",
      "#FFFFFFF%FF#",
      "##FF%FFFFF##",
      "#FFFF%F%FFF#",
      "##%%%FF%%%##",
      "#FFFFFFFFFF#",
      "##%%%FF%%%##",
      "#FFFFFFFFFF#",
      "##%%%FF%%%##",
      "#FFFFFFFFFF#",
      "#FFFFFFFFFF#",
      "##%%%FF%%%##",
      "#FFFFFFFFFF#",
      "##$FFFFFFF##",
      "#FFFFFFFFFF#",
      "#####@@#####"
    ],
    "heights": [
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111",
      "111111111111"
    ],
    "markers": [
      "............",
      ".....BB.....",
      "............",
      ".........E..",
      "......E.....",
      ".........I..",
      "............",
      "..E.........",
      ".....E......",
      ".I..........",
      "............",
      "...E........",
      "............",
      "..P.........",
      ".........E..",
      "............"
    ],
    "items": [
      {
        "x": 1,
        "y": 6,
        "type": "moonClear"
      },
      {
        "x": 9,
        "y": 10,
        "type": "powder"
      }
    ],
    "enemies": [
      {
        "x": 2,
        "y": 8,
        "type": "pilgrim"
      },
      {
        "x": 3,
        "y": 4,
        "type": "pilgrim"
      },
      {
        "x": 5,
        "y": 7,
        "type": "nun"
      },
      {
        "x": 6,
        "y": 11,
        "type": "nun"
      },
      {
        "x": 9,
        "y": 12,
        "type": "citizen"
      },
      {
        "x": 9,
        "y": 1,
        "type": "citizen"
      },
      {
        "x": 5,
        "y": 14,
        "type": "gregor"
      }
    ]
  }
];

export const TUTORIAL_MISSION={id:'tutorial',name:'廃墟の聖堂',subtitle:'THE RUINED SANCTUARY',place:'廃墟の聖堂・鐘楼 → 廃墟の聖堂・マトロネウム → 廃墟の聖堂・地上階',objective:'聖堂から脱出せよ',turns:Infinity,stages:3};
export const LESSONS={
  "1": {
    "title": "移動",
    "text": "移動：キャラクターをクリックし、青くハイライトされたスクエアを選択"
  },
  "2": {
    "title": "視界",
    "text": "視界：ユニットは固有の視界範囲をもつ。視認範囲を越えた地形・ユニットは『帳(ダークヴェール)』の奥に隠れ、見通すことはできない"
  },
  "3": {
    "title": "パッシブスキル",
    "text": "パッシブスキル：キャラクターは固有のパッシブスキルを持つ。\nアスターテは半径8マス以内・戦場の霧に包まれた不可視エリアに居る敵の位置を判別可能。"
  },
  "4": {
    "title": "戦闘",
    "text": "戦闘：キャラクターをクリックし、赤くハイライトされたスクエアを選択。\n通常攻撃：武器を持たない今は、己の拳を頼るほかにない。射程・隣接1スクエア、物理攻撃力を参照した攻撃。"
  },
  "5": {
    "title": "戦闘報酬",
    "text": "戦闘報酬：敵ユニットは戦闘不能時に確率でアイテムをドロップする。"
  },
  "6": {
    "title": "地形",
    "text": "地形：フィールドの地形は、その種類に応じて固有の移動コストをもつ。\n地形・瓦礫：乗り越えることはできるが、足を取られないよう、進行には注意を要する。時には遠間からの攻撃を防ぐ助けにもなるだろう。"
  },
  "7": {
    "title": "エリア遷移",
    "text": "エリア遷移：ユニットをエリア遷移点に移動させると、このエリアでの探索を終了する。エリア遷移点は、一度視認すればミニマップ上に常時表示される。\n一度通過したエリアに戻ることはできない。やり残したことがなければ、先に進め。"
  },
  "8": {
    "title": "出撃準備・1",
    "text": "出撃準備・1：ユニットの装備を変更し、次の出撃に備えよ。"
  },
  "9": {
    "title": "敵",
    "text": "敵：帳の中には数多の獣と異形が棲む。活発に動き回るもの。一定範囲を巡るもの。静かに息を潜めるもの。不用意な突出は時として命取りになりうる。"
  },
  "10": {
    "title": "アイテム",
    "text": "アイテム：消費アイテムは1ターンに1つだけ使用可能。使用時は1ターン分のアクションを消費する。"
  },
  "11": {
    "title": "出撃準備・2",
    "text": "出撃準備・2：ユニットの負傷・戦闘不能を回復し、次の出撃に備えよ。"
  },
  "12": {
    "title": "アクティブスキル",
    "text": "アクティブスキル：スキルを使用し、戦闘を有利に運べ。\n月相の円舞曲：使用時、周囲2スクエアに居る味方ユニットの迅速を10％上げる(効果持続3ターン)　(1シナリオ中3回まで使用可)"
  }
};
export function makeTutorialMap(stage){return buildTutorialMap(MAP_BLUEPRINTS[stage]);}
export function buildTutorialMap(d){
 const legend={F:'plain','%':'rubble','#':'wall','&':'stairsDown','$':'stairsUp','@':'door','.':'pit'};
 const grid=d.terrain.map((row,i)=>[...row].map((c,x)=>!d.elevation&&d.heights?.[i]?.[x]==='0'?'pit':legend[c])).reverse();
 const find=(symbol)=>d.markers.flatMap((row,rowIndex)=>[...row].flatMap((c,x)=>c===symbol?[{x,y:d.height-1-rowIndex}]:[]));
 const terrainFind=(symbol)=>d.terrain.flatMap((row,rowIndex)=>[...row].flatMap((c,x)=>c===symbol?[{x,y:d.height-1-rowIndex}]:[]));
 const start=find('P')[0],exit=find('T');
 // Types and positions are bound by the specification's [units] coordinates.
 // Do not infer identities from marker scan order or silently relocate invalid spawns.
 const enemies=d.enemies.map(e=>({...e,...(e.movementBounds?{movementBounds:{...e.movementBounds}}:{})}));
 const items=d.items.map(p=>({...p,taken:false}));
 const elevation=createElevation(d.width,d.height,d.elevation?.slice().reverse()??d.heights?.map(r=>[...r].map(Number)).reverse());
 return {width:d.width,height:d.height,grid,elevation,heights:d.heights?.map(r=>[...r].map(Number)).reverse(),invertY:true,starts:[[start.x,start.y]],exit:exit.filter((p,i)=>exit.findIndex(q=>p.x===q.x&&p.y===q.y)===i).map(p=>[p.x,p.y]),doors:terrainFind('@'),items,enemies};
}
