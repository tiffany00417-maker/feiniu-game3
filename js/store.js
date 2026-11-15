/* =========================================================
   store.js：飛牛幣與過關紀錄（全站共用）
   - 首頁、商城、背包、關卡都只透過 Store 存讀資料
   - 目前存在手機瀏覽器 localStorage；之後若改用 Firebase，只要改這個檔案
   ========================================================= */
(function(){
  const PREFIX = 'feiniu_';

  function get(k){ try{ return localStorage.getItem(PREFIX+k); }catch(e){ return null; } }
  function set(k,v){ try{ localStorage.setItem(PREFIX+k, v); return true; }catch(e){ return false; } }

  const Store = {
    LEVELS: 6,   // 關卡總數

    /* 飛牛幣 */
    getCoins(){ return parseInt(get('coins')) || 0; },
    setCoins(n){ set('coins', Math.max(0, Math.floor(n))); return Store.getCoins(); },
    addCoins(n){ return Store.setCoins(Store.getCoins() + n); },
    /** 扣幣（商城用）。餘額不足回傳 false */
    spendCoins(n){
      if(Store.getCoins() < n) return false;
      Store.setCoins(Store.getCoins() - n); return true;
    },

    /* 過關紀錄 */
    markDone(level){ set('level'+level+'_done', '1'); },
    isDone(level){ return !!get('level'+level+'_done'); },
    doneCount(){ let c=0; for(let i=1;i<=Store.LEVELS;i++) if(Store.isDone(i)) c++; return c; },

    /* 其他資料（角色、配件等），存成 JSON */
    getJSON(k, fallback=null){ try{ const v=get(k); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } },
    setJSON(k, obj){ return set(k, JSON.stringify(obj)); },

    /** 測試用：清除所有飛牛相關資料 */
    reset(){
      try{ Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>localStorage.removeItem(k)); }catch(e){}
    }
  };

  window.Store = Store;
})();
