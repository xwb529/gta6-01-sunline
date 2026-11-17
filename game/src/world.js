'use strict';
(function(S) {
  const C=S.C;
  class City {
    constructor() {
      this.random=S.rng(80623); this.buildings=[];this.parks=[];this.palms=[];this.decor=[];
      this.makeBlocks(); this.makeNavigation();
      this.canvas=document.createElement('canvas'); this.canvas.width=C.W;this.canvas.height=C.H;
      this.paint(this.canvas.getContext('2d'));
      this.mini=document.createElement('canvas');this.mini.width=320;this.mini.height=300;
      const m=this.mini.getContext('2d');m.fillStyle='#214f58';m.fillRect(0,0,320,300);
      m.fillStyle='#54756b';m.fillRect(13,10,285,279);m.fillStyle='#dbbf8a';m.fillRect(294,10,10,279);
      m.strokeStyle='#91a093';m.lineWidth=11;
      for(const x of C.xs){m.beginPath();m.moveTo(x/10,10);m.lineTo(x/10,289);m.stroke();}
      for(const y of C.ys){m.beginPath();m.moveTo(13,y/10);m.lineTo(298,y/10);m.stroke();}
      m.fillStyle='#203c3d';for(const b of this.buildings)m.fillRect(b.x/10,b.y/10,b.w/10,b.h/10);
    }
    makeBlocks() {
      const names=['PALM COURT','CASA LUMA','SUNDIAL','ELIO HOTEL','THE MERIDIAN','SOLENNE FM','OASIS MARKET','CALDER MOTORS','GOLDEN HOUR','STUDIO 08','TERRACE CLUB','LIDO HOUSE'];
      for(let row=0;row<6;row++)for(let col=0;col<6;col++){
        const x=C.xs[col]+83,y=C.ys[row]+83,w=254,h=254;
        if(col===1&&row===5){
          // Calder's forecourt stays open; its separate workshop is added below.
          this.decor.push({x:x+150,y:y+170,w:80,h:48,type:'pool'});
        }else if((col===3&&row===1)||(col===0&&row===2)||(col===4&&row===4)){
          this.parks.push({x,y,w,h,kind:col===3?'plaza':'park'});
        }else{
          const layout=(col+row*2)%4;
          const add=(bx,by,bw,bh,i)=>this.buildings.push({x:bx,y:by,w:bw,h:bh,color:['#ddad8c','#e0c49c','#b2c9bb','#d7a29a','#b7c1bd','#e8d4ae'][(col+row+i)%6],name:names[(col*3+row+i)%names.length],roof:layout,detail:Math.floor(this.random()*3)});
          if(layout===0){add(x+12,y+12,230,100,0);add(x+12,y+152,104,90,1);add(x+148,y+152,94,90,2);}
          else if(layout===1){add(x+12,y+12,96,230,0);add(x+154,y+12,88,100,1);add(x+154,y+158,88,84,2);}
          else if(layout===2){add(x+14,y+12,226,140,0);this.decor.push({x:x+42,y:y+181,w:170,h:55,type:'pool'});}
          else {add(x+12,y+12,230,230,0);}
        }
        for(let k=0;k<3;k++){
          this.palms.push({x:C.xs[col]+77,y:y+20+k*94,s:.72+this.random()*.27,a:this.random()*6});
          this.palms.push({x:x+60+k*89,y:C.ys[row]+343,s:.7+this.random()*.3,a:this.random()*6});
        }
      }
      // The workshop, radio courtyard and mission locations sit in open sidewalk space.
      this.buildings.push({x:790,y:2420,w:170,h:110,color:'#d4a884',name:'CALDER • AUTO',roof:0,detail:1});
      for(let y=210;y<2870;y+=150)this.palms.push({x:2962,y,s:1.05,a:this.random()*6});
      for(let y=320;y<2700;y+=330)this.decor.push({x:3008,y,w:0,h:0,type:'umbrella',color:y%2?'#df795f':'#e7c16f'});
    }
    solid(x,y,r=10) {
      if(x-r<138||x+r>3030||y-r<110||y+r>2885)return true;
      return this.buildings.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);
    }
    move(e,dx,dy,r) {
      let hit=false;
      if(!this.solid(e.x+dx,e.y,r))e.x+=dx;else hit=true;
      if(!this.solid(e.x,e.y+dy,r))e.y+=dy;else hit=true;
      return hit;
    }
    clear(a,b) {
      const dx=b.x-a.x,dy=b.y-a.y;
      for(const r of this.buildings){
        let low=0,high=1;
        for(const [p,q] of [[-dx,a.x-r.x],[dx,r.x+r.w-a.x],[-dy,a.y-r.y],[dy,r.y+r.h-a.y]]){
          if(p===0){if(q<0){low=2;break;}}else if(p<0)low=Math.max(low,q/p);else high=Math.min(high,q/p);
        }
        if(low<=high&&low<=1&&high>=0)return false;
      }
      return true;
    }
    road(x,y) {return C.xs.some(n=>Math.abs(x-n)<54)||C.ys.some(n=>Math.abs(y-n)<54);}
    nearestRoad(x,y) {
      let best=null,dd=Infinity;
      for(let i=0;i<C.xs.length;i++)for(let j=0;j<C.ys.length;j++){
        const d=Math.hypot(x-C.xs[i],y-C.ys[j]);if(d<dd){dd=d;best={i,j,x:C.xs[i],y:C.ys[j]};}
      }return best;
    }
    makeNavigation() {
      this.nw=C.W/C.CELL;this.nh=C.H/C.CELL;this.nav=new Uint8Array(this.nw*this.nh);
      for(let y=0;y<this.nh;y++)for(let x=0;x<this.nw;x++){
        const wx=x*40+20,wy=y*40+20;this.nav[y*this.nw+x]=this.solid(wx,wy,22)?0:this.road(wx,wy)?1:2;
      }
    }
    route(a,b) {
      const nw=this.nw,nav=this.nav;
      const nearest=p=>{
        const gx=S.clamp(Math.floor(p.x/40),0,nw-1),gy=S.clamp(Math.floor(p.y/40),0,this.nh-1);
        for(let r=0;r<5;r++)for(let y=gy-r;y<=gy+r;y++)for(let x=gx-r;x<=gx+r;x++)if(x>=0&&x<nw&&y>=0&&y<this.nh&&nav[y*nw+x])return y*nw+x;
        return -1;
      };
      const start=nearest(a),end=nearest(b);if(start<0||end<0)return [];
      const cost=new Float32Array(nav.length).fill(Infinity),prev=new Int32Array(nav.length).fill(-1),closed=new Uint8Array(nav.length),heap=[];
      const heuristic=i=>Math.abs(i%nw-end%nw)+Math.abs(Math.floor(i/nw)-Math.floor(end/nw));
      const push=(id,f)=>{let i=heap.length;heap.push({id,f});while(i>0){const p=(i-1)>>1;if(heap[p].f<=f)break;heap[i]=heap[p];i=p;}heap[i]={id,f};};
      const pop=()=>{const out=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return out.id;};
      cost[start]=0;push(start,heuristic(start));let found=false,limit=4500;
      while(heap.length&&limit--){const n=pop();if(closed[n])continue;closed[n]=1;if(n===end){found=true;break;}
        for(const d of [-1,1,-nw,nw]){const next=n+d;if(next<0||next>=nav.length||!nav[next]||closed[next]||((d===1||d===-1)&&Math.floor(n/nw)!==Math.floor(next/nw)))continue;
          const v=cost[n]+(nav[next]===1?1:1.25);if(v<cost[next]){cost[next]=v;prev[next]=n;push(next,v+heuristic(next));}
        }
      }
      if(!found)return [];
      const path=[];for(let i=end;i!==start&&i>=0;i=prev[i])path.push({x:(i%nw)*40+20,y:Math.floor(i/nw)*40+20});return path.reverse();
    }
    paint(c) {
      const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
      rect(0,0,C.W,C.H,'#388d98');
      for(let y=0;y<C.H;y+=24){c.strokeStyle=y%48?'#77b9b129':'#b8d5b82b';c.lineWidth=2;c.beginPath();for(let x=0;x<=C.W;x+=12){const yy=y+Math.sin(x*.017+y)*4;if(x===0)c.moveTo(x,yy);else c.lineTo(x,yy);}c.stroke();}
      rect(119,95,2934,2800,'#b9c5a1');rect(2937,95,117,2800,'#ead0a0');rect(3030,95,24,2800,'#dce0b2');
      rect(128,100,20,2785,'#e1c69b');
      // Paved street network with raised sidewalks, medians and crosswalks.
      for(const x of C.xs){rect(x-79,105,158,2780,'#e4d7b8');rect(x-58,105,116,2780,'#beae93');rect(x-55,105,110,2780,'#40585a');}
      for(const y of C.ys){rect(138,y-79,2848,158,'#e4d7b8');rect(138,y-58,2848,116,'#beae93');rect(138,y-55,2848,110,'#40585a');}
      c.lineWidth=1;c.strokeStyle='#c3b99e';
      for(const x of C.xs)for(let y=120;y<2880;y+=34){c.beginPath();c.moveTo(x-77,y);c.lineTo(x-58,y);c.moveTo(x+58,y);c.lineTo(x+77,y);c.stroke();}
      for(const y of C.ys)for(let x=145;x<2980;x+=34){c.beginPath();c.moveTo(x,y-77);c.lineTo(x,y-58);c.moveTo(x,y+58);c.lineTo(x,y+77);c.stroke();}
      c.strokeStyle='#e9d39b';c.lineWidth=2;c.setLineDash([18,18]);
      for(const x of C.xs){c.beginPath();c.moveTo(x-3,110);c.lineTo(x-3,2885);c.moveTo(x+3,110);c.lineTo(x+3,2885);c.stroke();}
      for(const y of C.ys){c.beginPath();c.moveTo(138,y-3);c.lineTo(2985,y-3);c.moveTo(138,y+3);c.lineTo(2985,y+3);c.stroke();}c.setLineDash([]);
      for(const x of C.xs)for(const y of C.ys){
        rect(x-55,y-55,110,110,'#40585a');
        for(let k=-43;k<50;k+=13){rect(x+k,y-73,7,16,'#e9e3c9');rect(x+k,y+57,7,16,'#e9e3c9');rect(x-73,y+k,16,7,'#e9e3c9');rect(x+57,y+k,16,7,'#e9e3c9');}
        for(const [sx,sy] of [[-70,-82],[70,82]]){rect(x+sx,y+sy,4,13,'#30514b');rect(x+sx-2,y+sy,8,5,'#dfb969');}
      }
      c.textAlign='center';c.textBaseline='middle';c.font='bold 10px Arial';c.fillStyle='#d6d7bc';
      for(let j=0;j<6;j++)for(let i=0;i<6;i++){c.fillText(['SOLAR AVENUE','PALMETTO WAY','LIDO BOULEVARD','SUNDIAL AVENUE','CANAL STREET','HARBOR DRIVE'][j],C.xs[i]+210,C.ys[j]-42);}
      // Neighbourhood ground textures and small gardens.
      for(let row=0;row<6;row++)for(let col=0;col<6;col++){
        const x=C.xs[col]+84,y=C.ys[row]+84;
        rect(x,y,252,252,'#c3c2a2');
        c.strokeStyle='#aab28e';c.lineWidth=1;for(let k=0;k<250;k+=24){c.beginPath();c.moveTo(x+k,y);c.lineTo(x+k,y+252);c.stroke();}
      }
      for(const p of this.parks){
        rect(p.x,p.y,p.w,p.h,'#7eac8a');rect(p.x+106,p.y,42,254,'#e5d3af');rect(p.x,p.y+106,254,42,'#e5d3af');
        for(const dx of [48,205])for(const dy of [48,205]){c.fillStyle='#53876a';c.beginPath();c.arc(p.x+dx,p.y+dy,28,0,Math.PI*2);c.fill();}
        c.fillStyle='#b9c6b0';c.beginPath();c.arc(p.x+127,p.y+127,47,0,Math.PI*2);c.fill();c.fillStyle='#5ca7a7';c.beginPath();c.arc(p.x+127,p.y+127,36,0,Math.PI*2);c.fill();c.strokeStyle='#a0d0be';c.lineWidth=3;c.beginPath();c.arc(p.x+127,p.y+127,23,0,Math.PI*2);c.stroke();
        rect(p.x+122,p.y+122,10,10,'#e7dec0');
        for(const dx of [68,166]){rect(p.x+dx,p.y+88,25,7,'#a8714f');rect(p.x+dx,p.y+160,25,7,'#a8714f');}
      }
      // Specific courtyards and the working waterfront.
      rect(1158,1340,48,104,'#dec9a5');rect(1170,1350,28,9,'#e18165');
      rect(710,2395,77,170,'#c1bd9e');
      for(let i=0;i<5;i++){rect(715+i*14,2450,7,45,'#e2d4ab');}
      c.save();c.translate(747,2519);c.rotate(-Math.PI/2);c.font='bold 12px Arial';c.fillStyle='#496459';c.fillText('REPAIR / $100',0,0);c.restore();
      for(let i=0;i<4;i++){rect(2845,2490+i*72,175,31,'#b49972');for(let n=0;n<12;n++)rect(2845+n*14,2490+i*72,1,31,'#8f805f');}
      for(const d of this.decor){
        if(d.type==='pool'){rect(d.x-6,d.y-6,d.w+12,d.h+12,'#e4d8ba');rect(d.x,d.y,d.w,d.h,'#5fbbba');c.strokeStyle='#9dd4c5';c.lineWidth=2;for(let n=10;n<d.h;n+=12){c.beginPath();c.moveTo(d.x+5,d.y+n);c.lineTo(d.x+d.w-5,d.y+n);c.stroke();}}
        else {c.fillStyle='#76654c22';c.beginPath();c.ellipse(d.x+7,d.y+9,24,18,0,0,Math.PI*2);c.fill();for(let k=0;k<8;k++){c.fillStyle=k%2?'#f6e3b7':d.color;c.beginPath();c.moveTo(d.x,d.y);c.arc(d.x,d.y,22,k*Math.PI/4,(k+1)*Math.PI/4);c.closePath();c.fill();}rect(d.x-7,d.y+31,14,26,'#e6d2ac');}
      }
      for(const b of this.buildings)this.paintBuilding(c,b);
      for(const p of this.palms)this.paintPalm(c,p);
      // Seafront lettering and beach amenities belong to the world, not the interface.
      c.save();c.translate(2919,1700);c.rotate(-Math.PI/2);c.fillStyle='#8f997e';c.font='bold 25px Arial';c.letterSpacing='8px';c.fillText('S O L E N N E   B O A R D W A L K',0,0);c.restore();
      c.fillStyle='#e4d0a8';c.font='bold 15px Arial';c.fillText('MARA’S RADIO',1254,1378);
    }
    paintBuilding(c,b) {
      const {x,y,w,h}=b;
      c.fillStyle='#384d403d';c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.lineTo(x+w+19,y+h+23);c.lineTo(x+19,y+h+23);c.lineTo(x,y+h);c.fill();
      c.fillStyle='#8f8b70';c.fillRect(x,y+7,w,h);
      c.fillStyle=b.color;c.fillRect(x,y,w,h-5);
      c.fillStyle='#f4dfb87a';c.fillRect(x,y,w,5);c.fillRect(x,y,5,h-5);
      c.fillStyle='#8c8c722c';c.fillRect(x+9,y+9,w-18,h-23);
      c.strokeStyle='#fff1cc66';c.lineWidth=2;c.strokeRect(x+8,y+8,w-16,h-24);
      // Rooftop plant rooms, skylights and condensers give each block its own silhouette.
      if(w>140){c.fillStyle='#7d9897';c.fillRect(x+22,y+22,Math.min(75,w-44),25);c.fillStyle='#b7c3b0';c.fillRect(x+24,y+24,Math.min(71,w-48),3);c.strokeStyle='#c8d5be';for(let k=35;k<90&&k<w-24;k+=16){c.beginPath();c.moveTo(x+k,y+23);c.lineTo(x+k,y+46);c.stroke();}}
      for(let k=0;k<(w>140?2:1);k++){const ax=x+w-38-k*31,ay=y+24;c.fillStyle='#6f8174';c.fillRect(ax+3,ay+4,23,24);c.fillStyle='#c6c7ad';c.fillRect(ax,ay,23,24);c.strokeStyle='#859a8a';c.lineWidth=1;c.beginPath();c.arc(ax+11,ay+12,7,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(ax+5,ay+6);c.lineTo(ax+17,ay+18);c.moveTo(ax+17,ay+6);c.lineTo(ax+5,ay+18);c.stroke();}
      if(h>180){c.fillStyle='#52726b';c.fillRect(x+23,y+h-76,w-46,32);c.fillStyle='#72978b';for(let k=28;k<w-26;k+=22)c.fillRect(x+k,y+h-73,16,26);}
      c.fillStyle='#5b827b';c.fillRect(x+12,y+h-13,w-24,8);c.fillStyle='#efcc95';for(let k=15;k<w-18;k+=20)c.fillRect(x+k,y+h-13,9,8);
      c.textAlign='center';c.textBaseline='middle';c.font='bold '+(w>150?'11':'8')+'px Arial';c.fillStyle='#536658';
      c.fillText(b.name,x+w/2,y+h*.62,w-18);
    }
    paintPalm(c,p) {
      c.save();c.translate(p.x,p.y);c.scale(p.s,p.s);
      c.fillStyle='#304c3b20';c.beginPath();c.ellipse(17,20,30,16,.6,0,7);c.fill();
      c.strokeStyle='#8f7650';c.lineWidth=6;c.beginPath();c.moveTo(1,8);c.quadraticCurveTo(7,-3,0,-17);c.stroke();
      c.translate(0,-17);c.rotate(p.a);
      for(let k=0;k<7;k++){c.rotate(Math.PI*2/7);c.fillStyle=k%2?'#477c5a':'#588f62';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(7,-20,34,-12);c.quadraticCurveTo(17,-8,5,4);c.closePath();c.fill();c.strokeStyle='#83a76b';c.lineWidth=1;c.beginPath();c.moveTo(2,0);c.lineTo(26,-11);c.stroke();}
      c.fillStyle='#b6ac6c';c.beginPath();c.arc(0,0,4,0,7);c.fill();c.restore();
    }
    district(x,y) {if(x>2870)return 'SOLENNE BEACH';if(y>2240)return 'SALT HARBOR';if(x>2130)return 'GOLD COAST';if(y<950)return 'SUNDIAL GARDENS';if(x<900)return 'OLD PALMETTO';return 'RADIO QUARTER';}
  }
  S.City=City;
})(window.Sunline);
