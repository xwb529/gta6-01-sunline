'use strict';
window.Sunline = {};
(function(S) {
  S.C = {
    W: 3200, H: 3000, CELL: 40, ROAD: 112, SIDE: 22,
    xs: [260,680,1100,1520,1940,2360,2780],
    ys: [240,660,1080,1500,1920,2340,2760],
    saveKey: 'sunline.solenne.v1',
    colors: ['#ef805f','#55aeaa','#f0cd77','#c6cbb2','#718ca4','#c89199','#f2deaa'],
    contact: {x:1180,y:1400}, garage: {x:760,y:2430},
    package: {x:2015,y:1160}, dock: {x:2855,y:2430},
    coupe: {x:2445,y:1951}, broadcast: {x:1596,y:742}
  };
  S.clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  S.dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  S.lerp = (a,b,t) => a+(b-a)*t;
  S.angle = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
  S.rng = function(seed) { let n=seed|0; return () => {n=(n+0x6d2b79f5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;}; };
  S.money = n => '$'+Math.floor(n).toLocaleString('en-US');
  S.starCount = g => Math.min(5,Math.ceil(Math.max(0,g.heat)));
  S.target = g => g.player.car || g.player;
  S.roundRect = function(c,x,y,w,h,r=8) {c.beginPath();c.roundRect(x,y,w,h,r);};
})(window.Sunline);
