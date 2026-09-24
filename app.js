(async function(){
  try{
    const parts=["app.min.0.js", "app.min.1.js", "app.min.2.js"];
    const texts=await Promise.all(parts.map(p=>fetch(p+"?v=20260924f").then(r=>{if(!r.ok)throw new Error(p+":"+r.status);return r.text()})));
    (0,eval)(texts.join(""));
  }catch(e){console.error(e);const el=document.createElement("div");el.className="load-error-banner";el.textContent="应用脚本加载失败："+(e&&e.message?e.message:String(e));document.body.prepend(el);}
})();
