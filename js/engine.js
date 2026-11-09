// Portfolio engine: pure functions over month-end total returns. No DOM.
(function(root){
  function idxToYM(D,i){const [y,m]=D.t0.split('-').map(Number);const t=y*12+(m-1)+i;return {y:Math.floor(t/12),m:t%12+1};}
  function label(D,i){const a=idxToYM(D,i);return a.y+'-'+String(a.m).padStart(2,'0');}
  // First return month available for an id: returns start after the base month s.
  function firstIdx(D,id){return D.a[id].s;}
  function ret(D,id,i){const A=D.a[id];const k=i-A.s;return (k>=0&&k<A.r.length)?A.r[k]/1e5:null;}
  // earliest possible base index for a set of holdings and currency
  function window_(D,ids,cur,fromYear){
    let s=0,lim=null;
    ids.forEach(id=>{if(D.a[id].s>=s){if(D.a[id].s>s||lim===null){lim=id;}s=D.a[id].s;}});
    if(cur==='EUR'&&D.fx0>s){s=D.fx0;lim='__fx';}
    if(fromYear){const y0=Number(D.t0.slice(0,4));const c=(fromYear-y0)*12-(Number(D.t0.slice(5))-1)-1;if(c>s){s=c;lim='__user';}}
    return {s,e:D.n,lim};
  }
  function rateAt(D,i){return D.fx[i-D.fx0];}
  /* simulate: weights is {id:fraction} summing to 1. Returns month-end values V[0..N], base 1 at index s. */
  function simulate(D,weights,opt){
    const ids=Object.keys(weights).filter(k=>weights[k]>0);
    const cur=opt.cur||'USD',reb=opt.rebalance||'year';
    const w=window_(D,ids,cur,opt.fromYear);
    const s=w.s,e=w.e,N=e-s;
    const h={};ids.forEach(id=>h[id]=weights[id]);
    const V=new Array(N+1);V[0]=1;
    let usd=1;
    for(let n=1;n<=N;n++){
      const i=s+n-1;   // return r[k] for month s+n, stored at offset (i - A.s) = index of the month it ends
      let tot=0;
      for(const id of ids){h[id]*=1+ret(D,id,i);tot+=h[id];}
      usd=tot;
      const ym=idxToYM(D,s+n);
      const due=reb==='month'||(reb==='year'&&ym.m===12);
      if(due)for(const id of ids)h[id]=weights[id]*tot;
      V[n]=cur==='EUR'?usd*rateAt(D,s+n)/rateAt(D,s):usd;
    }
    return {s,e,N,V,ids,lim:w.lim};
  }
  function drawdowns(V){
    const dd=new Array(V.length);let peak=V[0],pk=0;
    const eps=[];let cur=null;
    for(let i=0;i<V.length;i++){
      if(V[i]>=peak){
        if(cur){cur.rec=i;eps.push(cur);cur=null;}
        peak=V[i];pk=i;dd[i]=0;
      }else{
        const d=V[i]/peak-1;dd[i]=d;
        if(!cur)cur={pk,tr:i,depth:d,rec:null};
        if(d<cur.depth){cur.depth=d;cur.tr=i;}
      }
    }
    if(cur)eps.push(cur);
    eps.sort((a,b)=>a.depth-b.depth);
    return {dd,eps};
  }
  function stats(D,res,opt){
    const {V,N,s}=res,yrs=N/12;
    const cagr=N>0?Math.pow(V[N],1/yrs)-1:0;
    const {dd,eps}=drawdowns(V);
    const worst=eps[0]||null;
    let maxUnder=0;eps.forEach(e=>{const end=e.rec===null?N:e.rec;maxUnder=Math.max(maxUnder,end-e.pk);});
    // calendar years, complete years only
    const years=[];let prev=0;
    for(let n=1;n<=N;n++){
      const a=idxToYM(D,s+n);
      if(a.m===12){
        const first=prev===0;
        const b0=idxToYM(D,s);
        const full=!first||b0.m===12;
        years.push({y:a.y,r:V[n]/V[prev]-1,full});
        prev=n;
      }
    }
    if(prev<N){years.push({y:idxToYM(D,s+N).y,r:V[N]/V[prev]-1,full:false,ytd:true});}
    const fy=years.filter(y=>y.full);
    let wy=null,by=null;fy.forEach(y=>{if(!wy||y.r<wy.r)wy=y;if(!by||y.r>by.r)by=y;});
    // volatility of monthly returns, annualised
    let m=0,q=0;for(let n=1;n<=N;n++){const r=V[n]/V[n-1]-1;m+=r;q+=r*r;}m/=N;q=q/N-m*m;
    const vol=Math.sqrt(Math.max(q,0))*Math.sqrt(12);
    // real return (US CPI, USD only)
    let real=null;
    if((opt.cur||'USD')==='USD'&&D.cpi[s]&&D.cpi[res.e]){const inf=Math.pow(D.cpi[res.e]/D.cpi[s],1/yrs)-1;real=(1+cagr)/(1+inf)-1;}
    return {cagr,dd,eps,worst,maxUnder,years,wy,by,vol,real,yrs};
  }
  function correlation(D,a,b,s,e){
    let n=0,sa=0,sb=0,sab=0,saa=0,sbb=0;
    for(let i=s;i<e;i++){const x=ret(D,a,i),y=ret(D,b,i);if(x===null||y===null)continue;n++;sa+=x;sb+=y;sab+=x*y;saa+=x*x;sbb+=y*y;}
    if(n<12)return null;
    const c=sab-sa*sb/n,va=saa-sa*sa/n,vb=sbb-sb*sb/n;
    return (va>0&&vb>0)?c/Math.sqrt(va*vb):null;
  }

  /* Account with money going in: start at n=0, contribution c at each later month-end. */
  function account(V,start,c){
    const N=V.length-1,A=new Array(N+1),paid=new Array(N+1);A[0]=start;paid[0]=start;
    let pk=start,drop=0,dropAt=0;
    for(let n=1;n<=N;n++){A[n]=A[n-1]*V[n]/V[n-1]+c;paid[n]=start+c*n;if(A[n]>pk)pk=A[n];if(pk-A[n]>drop){drop=pk-A[n];dropAt=n;}}
    // money-weighted annual return by bisection on monthly growth g
    const end=A[N];const fv=g=>{let v=start;for(let i=1;i<=N;i++)v=v*g+c;return v;};
    let lo=0.8,hi=1.2;for(let i=0;i<70;i++){const m=(lo+hi)/2;if(fv(m)<end)lo=m;else hi=m;}
    return {A,paid,drop,dropAt,irr:Math.pow((lo+hi)/2,12)-1};
  }
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
  /* Resample 12-month blocks of the portfolio's own past monthly returns. Values are nominal; contributions rise with inflation. */
  function project(V,cagr,o){
    const L=V.length-1,rets=new Float64Array(L);for(let n=0;n<L;n++)rets[n]=V[n+1]/V[n]-1;
    const months=Math.round(o.years*12),paths=o.paths||2000,block=Math.min(12,L);
    const f=Math.pow((1+cagr-(o.haircut||0))/(1+cagr),1/12);
    const im=Math.pow(1+(o.inflation||0),1/12);
    const step=3,steps=Math.floor(months/step)+1;
    const grid=new Float64Array(paths*steps),depth=new Float64Array(paths),end=new Float64Array(paths);
    const rand=rng(20261109);
    for(let p=0;p<paths;p++){
      let a=o.start,idx=0,left=0,tw=1,peak=1,worst=0,cc=o.c;
      grid[p*steps]=a;
      for(let m=1;m<=months;m++){
        if(left===0){idx=Math.floor(rand()*L);left=block;}
        const g=(1+rets[idx])*f;idx=(idx+1)%L;left--;
        a=a*g+cc;cc*=im;
        tw*=g;if(tw>peak)peak=tw;const d=tw/peak-1;if(d<worst)worst=d;
        if(m%step===0)grid[p*steps+m/step]=a;
      }
      end[p]=a;depth[p]=worst;
    }
    const qs=[.1,.25,.5,.75,.9],bands=qs.map(()=>new Array(steps));
    const col=new Float64Array(paths);
    for(let s=0;s<steps;s++){for(let p=0;p<paths;p++)col[p]=grid[p*steps+s];col.sort();qs.forEach((q,i)=>{bands[i][s]=col[Math.min(paths-1,Math.floor(q*paths))];});}
    let paid=o.start,cc=o.c;for(let m=1;m<=months;m++){paid+=cc;cc*=im;}
    const deflEnd=Math.pow(1+(o.inflation||0),o.years);
    const paidReal=o.start+o.c*months;
    let below=0;for(let p=0;p<paths;p++)if(end[p]/deflEnd<paidReal)below++;
    depth.sort();
    return {steps,step,months,bands,paid,paidReal,below:below/paths,crashTypical:depth[Math.floor(paths*.5)],crashBad:depth[Math.floor(paths*.1)],inflation:o.inflation||0};
  }
  root.Engine={account,project,label,idxToYM,window:window_,simulate,drawdowns,stats,correlation,ret};
})(typeof globalThis!=='undefined'?globalThis:this);
