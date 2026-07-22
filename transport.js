/* Browser-safe transport for Google Apps Script ContentService.
 * Apps Script redirects ContentService responses to script.googleusercontent.com,
 * which can make cross-origin fetch() fail in browsers. GET/read requests and
 * small CRUD writes are transported with JSONP. Large bulk imports continue to
 * use a no-cors POST and are verified by subsequent read requests.
 */
(function(){
  const nativeFetch=window.fetch.bind(window);
  let sequence=0;

  function isAppsScriptUrl(url){
    return /^https:\/\/script\.google\.com\/macros\/s\//i.test(String(url||''));
  }

  function fakeResponse(payload){
    return {
      ok:true,
      status:200,
      redirected:false,
      type:'basic',
      json:async()=>payload,
      text:async()=>JSON.stringify(payload)
    };
  }

  function jsonpRequest(url,timeoutMs=45000){
    return new Promise((resolve,reject)=>{
      const callback=`__uo_jsonp_${Date.now()}_${sequence++}`;
      const target=new URL(url,window.location.href);
      target.searchParams.set('callback',callback);
      const script=document.createElement('script');
      let finished=false;
      const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);delete window[callback];script.remove()};
      window[callback]=payload=>{cleanup();resolve(payload)};
      script.onerror=()=>{cleanup();reject(new TypeError('Failed to reach Apps Script backend'))};
      const timer=setTimeout(()=>{cleanup();reject(new TypeError('Apps Script request timed out'))},timeoutMs);
      script.src=target.toString();
      script.async=true;
      document.head.appendChild(script);
    });
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!isAppsScriptUrl(url))return nativeFetch(input,init);

    const method=String(init.method||(input&&input.method)||'GET').toUpperCase();

    if(method==='GET'){
      const payload=await jsonpRequest(url);
      return fakeResponse(payload);
    }

    if(method==='POST'){
      let body={};
      try{body=typeof init.body==='string'?JSON.parse(init.body):{}}catch(e){body={}}

      // Bulk imports can exceed practical URL limits. Submit them as an opaque
      // no-cors POST; import-fix.js confirms the records afterward via JSONP GET.
      if(body.action==='bulkImportUniversities'){
        await nativeFetch(input,{...init,mode:'no-cors',redirect:'follow'});
        return fakeResponse({success:true,data:{submitted:true}});
      }

      // All normal CRUD payloads are small enough for JSONP. The Apps Script
      // router already routes by action regardless of GET/POST method.
      const target=new URL(url,window.location.href);
      Object.entries(body).forEach(([key,value])=>{
        if(value===undefined||value===null)return;
        target.searchParams.set(key,typeof value==='string'?value:JSON.stringify(value));
      });
      const payload=await jsonpRequest(target.toString());
      return fakeResponse(payload);
    }

    return nativeFetch(input,init);
  };
})();
