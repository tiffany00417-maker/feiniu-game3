/* =========================================================
   farm-models.js：多關共用的簡易 3D 模型（用 A-Frame 基本形狀拼）
   之後有 .glb 模型時，在各關把 innerHTML 換成 gltf-model 即可
   ========================================================= */
(function(){
  /**
   * 乳牛（3D 模型 models/cow.glb，已壓縮）
   * 模型原本面向 +Z，這裡轉 90 度讓頭朝 +X、側身面對玩家（+Z）
   * class="udder"：乳房位置的隱形標記（給擠奶關瞄準、噴奶用）
   */
  function makeCow(){
    const c=document.createElement('a-entity');
    c.innerHTML=`
      <a-entity class="cow-model" gltf-model="url(../models/cow.glb)" rotation="0 90 0" scale="1 1 1" position="0 0.86 0"></a-entity>
      <a-entity class="udder" position="-0.15 0.38 0.45"></a-entity>`;
    return c;
  }

  /** 牛奶桶：內層 class="milk" 可調高度表示裝了多少 */
  function makeBucket(){
    const b=document.createElement('a-entity');
    b.innerHTML=`
      <a-cylinder radius="0.17" height="0.3" position="0 0.15 0" color="#9aa7b0" open-ended="true" side="double"></a-cylinder>
      <a-circle radius="0.17" rotation="-90 0 0" position="0 0.005 0" color="#7d8a93"></a-circle>
      <a-torus radius="0.17" radius-tubular="0.012" rotation="90 0 0" position="0 0.3 0" color="#c6d0d6"></a-torus>
      <a-cylinder class="milk" radius="0.16" height="0.01" position="0 0.01 0" color="#ffffff"></a-cylinder>`;
    return b;
  }

  /** 一堆牛糞 */
  function makePoop(){
    const p=document.createElement('a-entity');
    p.innerHTML=`
      <a-cone radius-bottom="0.32" radius-top="0.2" height="0.12" position="0 0.06 0" color="#5b3a1e"></a-cone>
      <a-cone radius-bottom="0.22" radius-top="0.12" height="0.1" position="0 0.17 0" color="#4e3118"></a-cone>
      <a-cone radius-bottom="0.13" radius-top="0.02" height="0.12" position="0 0.27 0" color="#5b3a1e"></a-cone>`;
    return p;
  }

  /** 黑水虻幼蟲（白白胖胖的小蟲） */
  function makeLarva(){
    const l=document.createElement('a-entity');
    l.innerHTML=`<a-cylinder radius="0.025" height="0.1" rotation="0 0 90" color="#e9dcb8"></a-cylinder>
                 <a-sphere radius="0.022" position="0.055 0 0" color="#3a2a1a"></a-sphere>`;
    return l;
  }

  /** 有機肥料袋 */
  function makeFertilizer(){
    const f=document.createElement('a-entity');
    f.innerHTML=`
      <a-box width="0.36" height="0.42" depth="0.18" position="0 0.21 0" color="#8a5a2b"></a-box>
      <a-box width="0.37" height="0.12" depth="0.19" position="0 0.26 0" color="#5fae4a"></a-box>
      <a-cone radius-bottom="0.05" radius-top="0" height="0.14" position="0 0.5 0" color="#5fae4a"></a-cone>
      <a-cone radius-bottom="0.04" radius-top="0" height="0.1" position="0.06 0.47 0" rotation="0 0 -35" color="#7cc06a"></a-cone>`;
    return f;
  }

  window.FarmModels = { makeCow, makeBucket, makePoop, makeLarva, makeFertilizer };
})();
