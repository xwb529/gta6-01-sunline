'use strict';
(function(S){
  S.Input=class {
    constructor(canvas){
      this.keys=new Set();this.pressed=new Set();this.mouse={x:innerWidth/2,y:innerHeight/2,down:false};
      const accepted=/^(Key[WASDEFRPMN]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space|Enter|Escape)$/;
      window.addEventListener('keydown',e=>{if(!accepted.test(e.code))return;if((e.code==='Space'||e.code==='Enter')&&e.target?.tagName==='BUTTON')return;e.preventDefault();if(!e.repeat)this.pressed.add(e.code);this.keys.add(e.code);});
      window.addEventListener('keyup',e=>this.keys.delete(e.code));
      window.addEventListener('blur',()=>this.clear());
      canvas.addEventListener('pointermove',e=>{this.mouse.x=e.clientX;this.mouse.y=e.clientY;});
      canvas.addEventListener('pointerdown',e=>{if(e.button===0)this.mouse.down=true;});
      window.addEventListener('pointerup',()=>this.mouse.down=false);
      window.addEventListener('pointercancel',()=>this.mouse.down=false);
      canvas.addEventListener('contextmenu',e=>e.preventDefault());
    }
    held(...codes){return codes.some(c=>this.keys.has(c));}
    take(...codes){let yes=false;for(const c of codes){if(this.pressed.has(c))yes=true;this.pressed.delete(c);}return yes;}
    flush(){this.pressed.clear();}
    clear(){this.keys.clear();this.pressed.clear();this.mouse.down=false;}
    axes(){return {x:Number(this.held('KeyD','ArrowRight'))-Number(this.held('KeyA','ArrowLeft')),y:Number(this.held('KeyS','ArrowDown'))-Number(this.held('KeyW','ArrowUp'))};}
  };
})(window.Sunline);
