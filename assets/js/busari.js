import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getDatabase, ref, get, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB77ruQ-FxUvMAYHsUOipYB4lAQKaavCN0",
  authDomain: "ludooclubofficial.firebaseapp.com",
  databaseURL: "https://ludooclubofficial-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ludooclubofficial",
  storageBucket: "ludooclubofficial.firebasestorage.app",
  messagingSenderId: "141984102700",
  appId: "1:141984102700:web:37f719e81ae32df69ed489",
  measurementId: "G-PHTVR2KP9E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const tbody = document.getElementById("leaderboardBody");
const openSound = document.getElementById("openSound");
const closeSound = document.getElementById("closeSound");
const clickSound = document.getElementById("clickSound");

[openSound, closeSound, clickSound].forEach(s => s.load());

const pointsEl = document.getElementById("GmtpPoints");
const rateEl = document.getElementById("todayRate");
const timerEl = document.getElementById("realTime");

let serverOffset = 0;
onValue(ref(db, ".info/serverTimeOffset"), s => serverOffset = s.val() || 0);
const getServerTime = () => Date.now() + serverOffset;

function getRankIcon(i){
    if(i===0) return '<i class="fa-solid fa-crown rank-icon rank-1"></i>';
    if(i===1) return '<i class="fa-solid fa-medal rank-icon rank-2"></i>';
    if(i===2) return '<i class="fa-solid fa-medal rank-icon rank-3"></i>';
    return "";
}

function getInitial(n){
    return n?.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2) || "U";
}

function render(users, refCount){
    let html="";
    users.forEach((u,i)=>{
        html+=`
        <tr>
            <td>${getRankIcon(i)}</td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar-mini">${getInitial(u.username)}</div>
                    ${u.username}
                </div>
            </td>
            <td>${refCount[u.uid]||0}</td>
            <td class="earnings">৳${u.twitter}</td>
        </tr>`;
    });
    tbody.innerHTML=html;
}

onAuthStateChanged(auth, user=>{
    if(!user) return;
    onValue(ref(db,"users/"+user.uid+"/GmtpPoints"), s=>{
        pointsEl.textContent=(s.val()||0)+" MP";
    });
});

const q = query(ref(db,"users"), orderByChild("TwitterBalance"), limitToLast(3));

onValue(q, snap=>{
    const data=snap.val();
    if(!data){tbody.innerHTML="";return;}
    let users=Object.entries(data).map(([uid,u])=>({
        uid,
        username:u.username||"User",
        twitter:u.TwitterBalance||0
    }));
    users.sort((a,b)=>b.twitter-a.twitter);

    const refCount={};
    Object.values(data).forEach(u=>{
        if(u.referredBy) refCount[u.referredBy]=(refCount[u.referredBy]||0)+1;
    });

    render(users,refCount);
});

get(ref(db,"admin_settings/globalPrice")).then(s=>{
    const p=s.val();
    rateEl.textContent=p?"৳ "+parseFloat(p).toFixed(2):"৳ 0.00";
});

let endTime=null;

async function loadTime(){
    try{
        const s=await get(ref(db,"settings/countdown"));
        const d=s.val();
        if(!d){timerEl.textContent="Timer Ended, Now All File Will Receive...";return;}
        endTime=d.start_time+(d.duration_hours*3600000);
        startTimer();
    }catch{
        timerEl.textContent="Error";
    }
}

function startTimer(){
    setInterval(()=>{
        if(!endTime){timerEl.textContent="Timer Ended, Now All File Will Receive...";return;}
        const diff=endTime-getServerTime();
        if(diff<=0){
            timerEl.textContent="Timer Ended, Now All File Will Receive...";
            return;
        }
        const h=Math.floor(diff/3600000);
        const m=Math.floor((diff%3600000)/60000);
        const s=Math.floor((diff%60000)/1000);
        timerEl.textContent=
            String(h).padStart(2,'0')+":"+
            String(m).padStart(2,'0')+":"+
            String(s).padStart(2,'0');
    },1000);
}

loadTime();

const fabBtn=document.getElementById('fabBtn');
const fabList=document.getElementById('fabList');

fabBtn.onclick=e=>{
    e.stopPropagation();
    fabBtn.classList.toggle('active');
    fabList.classList.toggle('show');
};

document.onclick=()=>{
    fabBtn.classList.remove('active');
    fabList.classList.remove('show');
};

const menuBtn=document.getElementById('openMenu');
const sidebar=document.getElementById('sidebar');
const overlay=document.getElementById('overlay');
const modal=document.getElementById('newsModal');
const closeM=document.getElementById('closeModal');
const laterM=document.getElementById('laterBtn');

const toggle = (s) => {
    sidebar.classList.toggle('active', s);
    overlay.classList.toggle('active', s);

    if (s) {
        openSound.currentTime = 0;
        openSound.play();
    } else {
        closeSound.currentTime = 0;
        closeSound.play();
    }
};

menuBtn.onclick=()=>toggle(true);
overlay.onclick=()=>toggle(false);

window.onload=()=>{
    setTimeout(()=>modal.classList.add('active'),0);
    closeM.onclick=laterM.onclick=()=>modal.classList.remove('active');
};

const slider=document.getElementById('slider');
const slides=document.querySelectorAll('.slide');
const dotsContainer=document.getElementById('dotsContainer');

let i=0,drag=false,startX=0;

slides.forEach((_,x)=>{
    const d=document.createElement('div');
    d.className='dot'+(x===0?' active':'');
    d.onclick=()=>go(x);
    dotsContainer.appendChild(d);
});

const dots=document.querySelectorAll('.dot');

function upd(){dots.forEach((d,x)=>d.classList.toggle('active',x===i));}

function go(x){
    i=x;
    slider.style.transform=`translateX(-${i*100}%)`;
    upd();
}

setInterval(()=>{
    requestAnimationFrame(()=>{
        i=(i+1)%slides.length;
        go(i);
    });
},4000);

slider.addEventListener("mousedown", e => {
    drag = true;
    startX = e.pageX;
});

slider.addEventListener("touchstart", e => {
    drag = true;
    startX = e.touches[0].clientX;
}, { passive: true });

slider.addEventListener("mousemove", e => {
    if (!drag) return;
    handleMove(e.pageX);
});

slider.addEventListener("touchmove", e => {
    if (!drag) return;
    handleMove(e.touches[0].clientX);
}, { passive: true });

function handleMove(x) {
    const diff = x - startX;

    if (Math.abs(diff) > 50) {
        i = diff > 0 ? (i > 0 ? i - 1 : slides.length - 1) : (i + 1) % slides.length;
        go(i);
        drag = false;
    }
}

slider.addEventListener("mouseup", () => drag = false);
slider.addEventListener("mouseleave", () => drag = false);
slider.addEventListener("touchend", () => drag = false);

window.openSecureLink=url=>{
    const c=document.getElementById('iframe-container');
    const f=document.getElementById('secure-iframe');
    const o=document.getElementById('offline-screen');
    c.style.display='block';
    const t=setTimeout(()=>{
        if(f.contentWindow.length===0){
            o.style.display='flex';
            f.style.display='none';
        }
    },5000);
    if(!navigator.onLine){
        o.style.display='flex';
        f.style.display='none';
    }else{
        o.style.display='none';
        f.style.display='block';
        f.src=url;
        f.onload=()=>clearTimeout(t);
    }
};

window.closeIframe=()=>{
    const c=document.getElementById('iframe-container');
    const f=document.getElementById('secure-iframe');
    c.style.display='none';
    f.src='';
};

window.addEventListener('offline',()=>{
    const c=document.getElementById('iframe-container');
    if(c.style.display==='block'){
        document.getElementById('offline-screen').style.display='flex';
        document.getElementById('secure-iframe').style.display='none';
    }
});

document.addEventListener("click", (e) => {


    if (e.target.closest("#openMenu")) return;
    if (e.target.closest("#overlay")) return;

    clickSound.currentTime = 0;
    clickSound.play();
});


// Popup links কে iframe এ লোড করানো
const popupLinks = document.querySelectorAll("#popupButtons a.game-btn");

popupLinks.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault(); // default লিঙ্ক ভিজিট বন্ধ
        const url = link.getAttribute("href");
        window.openSecureLink(url); // তোমার আগের ফাংশন ব্যবহার করে iframe এ লোড
    });
});

function closePopup() {
    document.getElementById("popupButtons").style.display = "none";
}
    