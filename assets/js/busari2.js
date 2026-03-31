const config = {
  apiKey: "AIzaSyB77ruQ-FxUvMAYHsUOipYB4lAQKaavCN0",
  authDomain: "ludooclubofficial.firebaseapp.com",
  databaseURL: "https://ludooclubofficial-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ludooclubofficial",
  storageBucket: "ludooclubofficial.firebasestorage.app",
  messagingSenderId: "141984102700",
  appId: "1:141984102700:web:37f719e81ae32df69ed489",
  measurementId: "G-PHTVR2KP9E"
};


firebase.initializeApp(config);
const auth = firebase.auth();
const db = firebase.database();

db.ref(".info/serverTimeOffset").on("value", snap => {
    const offset = snap.val() || 0;
    window.serverNow = Date.now() + offset;
});

let isVerified = false;
let isProcessing = false;
let verifyInterval = null;

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "UserLogin.html";
        return;
    }

    const userRef = db.ref("users/" + user.uid);

    // Realtime listener → instant ban detect
    userRef.on("value", snapshot => {
        const data = snapshot.val();
        if (!data) return;

        // ✅ Boolean field check
        if (data.banned) {
            alert("আপনার অ্যাকাউন্ট ব্যান করা হয়েছে!");
            auth.signOut().then(() => {
                window.location.href = "UserLogin.html";
            });
            return; // stop further execution
        }

        // Normal user init
        initAppData(user);
    });
});

function initAppData(user) {
    const userRef = db.ref("users/" + user.uid);

    userRef.on("value", snapshot => {
        const data = snapshot.val();
        if (!data) return;

        isVerified = data.verified || false;

        const nameEl = document.getElementById("pUsername");
        if (nameEl) nameEl.childNodes[0].nodeValue = (data.username || "User") + " ";

        document.getElementById("pUid").innerText = "UID: " + user.uid;
        document.getElementById("profilePic").src = data.profilePic || "assets/images/logo.png";

        const balEl = document.getElementById("pBalance");
        const currentBal = data.MainBalance || 0;
        balEl.dataset.val = currentBal;

        if (balEl.innerText !== "**** TK") balEl.innerText = currentBal + " TK";

        document.getElementById("pPoints").innerText = (data.GmtpPoints || 0) + " Points";
        document.getElementById("pTwitterBalance").innerText = (data.TwitterBalance || 0) + " TK";
        document.getElementById("blueTick").style.display = isVerified ? "inline-block" : "none";

        checkVerificationStatus(user.uid, data);

      
        
    });

    db.ref("users")
        .orderByChild("referredBy")
        .equalTo(user.uid)
        .on("value", s => {
            document.getElementById("TotalRef").innerText = Object.keys(s.val() || {}).length;
        });

    loadLeaderboard(user.uid);
}

function loadReferrals() {
    const listDiv = document.getElementById("referralList");
    const user = auth.currentUser;
    if (!user) return;
    listDiv.innerHTML = '<p style="text-align:center; padding:20px; color:var(--dim)">Loading...</p>';

    db.ref("users").orderByChild("referredBy").equalTo(user.uid).on("value", s => {
        const users = s.val();
        if (!users) {
            listDiv.innerHTML = '<p style="text-align:center; padding:20px; color:var(--dim)">No referrals found.</p>';
            return;
        }

        let html = '';
        Object.keys(users).forEach(uid => {
            const u = users[uid];
            const isVerified = u.verified || false;

            html += `<div class="ref-item">
                <div class="ref-user-info">
                    <img src="${u.profilePic || 'assets/images/logo.png'}" class="ref-img">
                    <div>
                        <span class="ref-name">
                            ${u.username || 'User'} 
                            <i class="fa-solid fa-circle-check" style="color:var(--secondary); ${isVerified ? '' : 'display:none;'}"></i>
                        </span>
                        <span class="ref-uid">ID: ${uid.substring(0, 10)}...</span>
                    </div>
                </div>
                <div class="ref-earn"><b class="en">${u.TwitterBalance || 0} TK</b></div>
            </div>`;
        });

        listDiv.innerHTML = html;
    });
}
function checkVerificationStatus(uid, data) {
    const msgEl = document.getElementById("verifyMsg");
    const btnEl = document.getElementById("verifyBtn");

    const now = window.serverNow || Date.now();

    const lastVerifiedAt = data.lastVerifiedAt || 0;
    const duration = data.duration || 0;

    const isExpired = duration > 0 && (now - lastVerifiedAt >= duration);

    if (!data.verified || isExpired) {

        if (data.verified && isExpired) {
            db.ref("users/" + uid).update({ verified: false });
        }

        if (duration > 0) {
            msgEl.innerText = "আপনার ভেরিফিকেশনের মেয়াদ শেষ! ১৫ টাকা দিয়ে রিনিউ করুন।";
            btnEl.innerText = "Renew Now (15 TK)";
        } else {
            msgEl.innerText = "আপনি ভেরিফাইড নন! ভেরিফাই করতে ৩০ টাকা লাগবে।";
            btnEl.innerText = "Verify Now (30 TK)";
        }

        showVerifyUI(false);
        isVerified = false;

    } else {
        showVerifyUI(true);
        isVerified = true;

        const expireTime = lastVerifiedAt + duration;
        startTimer(expireTime);
    }
}

function openRenewalModal() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = db.ref("users/" + user.uid);
    userRef.once("value").then(snapshot => {
        const data = snapshot.val();
        if (!data) return;

        const now = window.serverNow || Date.now();
        const lastVerifiedAt = data.lastVerifiedAt || 0;
        const duration = data.duration || 0;
        const isExpired = duration > 0 && (now - lastVerifiedAt >= duration);

        if (!data.verified || isExpired) {
            // এখন মডাল ওপেন করতে পারো
            mO('manualRenewalModal'); // Example: modal id
        } else {
            sT("আপনি ইতিমধ্যেই Verified!");
        }
    });
}
function showVerifyUI(verified) {
    document.getElementById("verifyAlert").style.display = verified ? "none" : "block";
    document.getElementById("timerBox").style.display = verified ? "block" : "none";
}

async function manualRenewal() {
    if (isProcessing) return;
    const user = auth.currentUser;
    if (!user) return;

    isProcessing = true;
    const userRef = db.ref("users/" + user.uid);
    const cost = 15; // Manual renewal cost

    try {
        await userRef.transaction(currentData => {
            if (!currentData) {
                // নতুন ইউজারের জন্য default ডাটা
                return {
                    email: user.email,
                    uid: user.uid,
                    MainBalance: 0,
                    verified: false,
                    lastVerifiedAt: 0,
                    duration: 0,
                    username: "User",
                    profilePic: "assets/images/logo.png"
                };
            }

            const balance = currentData.MainBalance || 0;
            if (balance < cost) {
                throw "Insufficient balance";
            }

            currentData.MainBalance -= cost;
            currentData.verified = true;
            currentData.lastVerifiedAt = firebase.database.ServerValue.TIMESTAMP;
            currentData.duration = 30 * 24 * 60 * 60 * 1000; // 30 days

            return currentData;
        });

        sT(`রিনিউয়াল সফল হয়েছে (${cost} TK কাটা হয়েছে)`);

    } catch (e) {
        sT(e === "Insufficient balance" ? "ব্যালেন্স পর্যাপ্ত নয়!" : "ত্রুটি হয়েছে, আবার চেষ্টা করুন");
        console.error(e);
    } finally {
        isProcessing = false;
    }
}
async function startVerification() {
    if (isProcessing) return;
    const user = auth.currentUser;
    if (!user) return;

    isProcessing = true;
    const userRef = db.ref("users/" + user.uid);
    const cost = 30;

    try {
        // 1️⃣ ইউজারের ভেরিফিকেশন ও ব্যালেন্স ডেডাকশন
        await userRef.transaction(currentData => {
            if (!currentData) {
                return {
                    email: user.email,
                    uid: user.uid,
                    MainBalance: 0,
                    verified: false,
                    lastVerifiedAt: 0,
                    duration: 0,
                    username: "User",
                    profilePic: "assets/images/logo.png",
                    referralBonusGiven: false
                };
            }

            const balance = currentData.MainBalance || 0;
            if (balance < cost) throw "Insufficient balance";

            currentData.MainBalance -= cost;
            currentData.verified = true;
            currentData.lastVerifiedAt = firebase.database.ServerValue.TIMESTAMP;
            currentData.duration = 30 * 24 * 60 * 60 * 1000; // 30 দিন

            return currentData;
        });

        // 2️⃣ রেফারার বোনাস চেক
        const snapshot = await userRef.once("value");
        const data = snapshot.val();

        if (data && data.referredBy && !data.referralBonusGiven) {
            const referrerRef = db.ref("users/" + data.referredBy);

            // 3️⃣ বোনাস অ্যাড
            await referrerRef.transaction(refData => {
                if (!refData) return refData;
                refData.MainBalance = (refData.MainBalance || 0) + 20;
                refData.TwitterBalance = (refData.TwitterBalance || 0) + 20;
                return refData;
            });

            // 4️⃣ ট্রানজেকশন লগ তৈরি
            await db.ref("withdrawals").push({
                uid: data.referredBy,       // কে পেয়েছে
                method: "Referral Bonus",   // বোনাস টাইপ
                from: user.uid,             // কার রেফারেল
                amount: 20,
                status: "credited",
                time: new Date().toLocaleString()
            });

            // 5️⃣ ফ্ল্যাগ আপডেট
            await userRef.update({ referralBonusGiven: true });
        }

        sT("ভেরিফিকেশন সফল!");
    } catch (e) {
        sT(e === "Insufficient balance" ? "ব্যালেন্স নূন্যতম ৩০ টাকা প্রয়োজন" : "ত্রুটি হয়েছে, আবার চেষ্টা করুন");
        console.error(e);
    } finally {
        isProcessing = false;
    }
}
function startTimer(target) {
    if (verifyInterval) clearInterval(verifyInterval);

    const update = () => {
        const now = window.serverNow || Date.now();
        const diff = target - now;

        if (diff <= 0) {
            clearInterval(verifyInterval);
            document.getElementById("countdown").innerText = "Expired";
            return;
        }

        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        document.getElementById("countdown").innerText = `${d}d ${h}h ${m}m ${s}s`;
    };

    update();
    verifyInterval = setInterval(update, 1000);
}
async function redeemPoints() {
    const amount = parseInt(document.getElementById("pRedeemAmount").value);
    if (!amount || amount < 100 || isProcessing) {
        sT(isProcessing ? "অপেক্ষা করুন..." : "নূন্যতম ১০০ পয়েন্ট প্রয়োজন");
        return;
    }

    const user = auth.currentUser;
    if (!user) return;

    isProcessing = true;
    const userRef = db.ref("users/" + user.uid);

    try {
        await userRef.transaction(currentData => {
            if (!currentData) return currentData;

            const points = currentData.GmtpPoints || 0;
            if (points < amount) throw "Low Points";

            currentData.GmtpPoints -= amount;
            currentData.MainBalance = (currentData.MainBalance || 0) + amount;
            currentData.TwitterBalance = (currentData.TwitterBalance || 0) + amount;

            return currentData;
        });

        await db.ref("withdrawals").push({
            uid: user.uid,
            method: "Points Redeem",
            account: "Self Wallet",
            amount: amount,
            status: "approved",
            time: new Date().toLocaleString()
        });

        sT("রিডিম সফল হয়েছে!");
        mH('pWithdrawModal');

    } catch (e) {
        sT(e === "Low Points" ? "পর্যাপ্ত পয়েন্ট নেই" : "ত্রুটি হয়েছে!");
        console.error(e);
    } finally {
        isProcessing = false;
    }
}

function loadLeaderboard(myUid) {

    const usersRef = db.ref("users");

    // Top 5 users
    usersRef
        .orderByChild("TwitterBalance")
        .limitToLast(5)
        .once("value", topSnap => {

            const topData = topSnap.val() || {};

            const topArray = Object.entries(topData).map(([id, val]) => ({
                id,
                name: val.username || "User",
                balance: val.TwitterBalance || 0
            }));

            topArray.sort((a, b) => b.balance - a.balance);

            document.getElementById("leaderboardList").innerHTML = topArray
                .map((u, i) => `
                    <div class="lb-row">
                        <span class="en" style="font-weight:600; color:${i < 3 ? 'var(--primary)' : 'var(--dim)'}">
                            ${i + 1}. ${u.name}
                        </span>
                        <b class="en">${u.balance} TK</b>
                    </div>
                `).join('');
        });

    // My rank calculate separately (efficient way)
    usersRef
        .orderByChild("TwitterBalance")
        .startAt(0)
        .once("value", snap => {

            const data = snap.val() || {};

            const arr = Object.entries(data).map(([id, val]) => ({
                id,
                balance: val.TwitterBalance || 0
            }));

            arr.sort((a, b) => b.balance - a.balance);

            const myIndex = arr.findIndex(u => u.id === myUid);

            document.getElementById("myRank").innerText =
                myIndex !== -1 ? myIndex + 1 : "0";
        });
}

async function sW() {
    if (isProcessing) return;

    const method = document.getElementById("wMe").value;
const account = document.getElementById("wA").value;
const amount = parseFloat(document.getElementById("wAm").value);
const pass = document.getElementById("wP").value;

if (amount <= 0 || isNaN(amount)) {
    sT("Invalid amount!");
    return;
}

if (!account || amount < 200 || !pass) {
    sT("সবগুলো ঘর পূরণ করুন!");
    return;
}

    isProcessing = true;
    const user = auth.currentUser;

    try {
        await auth.signInWithEmailAndPassword(user.email, pass);

        const userRef = db.ref("users/" + user.uid);

        let success = false;

        await userRef.transaction(currentData => {
            if (!currentData) return currentData;

            const balance = currentData.MainBalance || 0;

            if (balance < amount) {
                success = false;
                return; // ❌ abort
            }

            currentData.MainBalance = balance - amount;
            success = true;
            return currentData;
        });

        if (!success) {
            sT("ব্যালেন্স পর্যাপ্ত নয়!");
            return;
        }

        // ✅ Only if success
        await db.ref("withdrawals").push({
            uid: user.uid,
            method: method,
            account: account,
            amount: amount,
            status: "pending",
            time: new Date().toLocaleString()
        });

        sT("উইথড্র রিকোয়েস্ট পাঠানো হয়েছে!");
        mH('wM');

    } catch (e) {
        sT("পাসওয়ার্ড ভুল!");
    } finally {
        isProcessing = false;
    }
}
function toggleBalance(icon) {
    const el = document.getElementById("pBalance");
    const isHidden = icon.classList.contains("fa-eye-slash");
    el.innerText = isHidden ? "**** TK" : el.dataset.val + " TK";
    icon.classList.toggle("fa-eye-slash");
    icon.classList.toggle("fa-eye");
}

function mO(id) { document.getElementById(id).style.display = "flex"; }
function mH(id) { document.getElementById(id).style.display = "none"; }
function mC(e, id) { if (e.target.id === id) mH(id); }
function sT(m) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}
function logoutUser() { auth.signOut().then(() => window.location.href = "UserLogin.html"); }
function copyUids() {
    const uid = document.getElementById("pUid").innerText.replace("UID: ", "");
    const link = window.location.origin + "/UserLogin.html?ref=" + encodeURIComponent(uid);
    navigator.clipboard.writeText(link).then(() => sT("লিঙ্ক কপি হয়েছে!"));
}
function openLockedModal(id) {
    if (!isVerified) { sT("ভেরিফাই করুন!"); return; }
    mO(id);
}

async function lT() {
    const list = document.getElementById("tL");
    list.innerHTML = "<p style='text-align:center;padding:20px;color:var(--dim)'>Loading...</p>";

    const user = auth.currentUser;
    if (!user) return;

    try {
        const snap = await db.ref("withdrawals")
            .orderByChild("uid")
            .equalTo(user.uid)
            .once("value");

        const data = snap.val();
        if (!data) {
            list.innerHTML = "<p style='text-align:center;color:var(--dim)'>No transactions</p>";
            return;
        }

        // latest first
        const arr = Object.entries(data).sort((a, b) => {
            const timeA = new Date(a[1].time).getTime();
            const timeB = new Date(b[1].time).getTime();
            return timeB - timeA;
        });

        let html = "";
        for (let [key, tx] of arr) {
            let fromHTML = "";

            // যদি রেফারেল বোনাস হয়
            if (tx.method === "Referral Bonus" && tx.from) {
                try {
                    const userSnap = await db.ref("users/" + tx.from).once("value");
                    const referrerName = (userSnap.val() && userSnap.val().username) || "Unknown";
                    fromHTML = `<span class="ref-from" style="font-size:10px;color:var(--dim)">From: ${referrerName}</span>`;
                } catch (e) {
                    fromHTML = `<span class="ref-from" style="font-size:10px;color:var(--dim)">From: Unknown</span>`;
                }
            }

            html += `
                <div class="ref-item">
                    <div>
                        <span class="ref-name">${tx.method}</span>
                        <span class="ref-uid">${tx.time}</span>
                        ${fromHTML}
                    </div>
                    <div class="ref-earn">
                        <b class="en">${tx.amount} TK</b>
                        <div style="font-size:10px;color:var(--dim)">${tx.status}</div>
                    </div>
                </div>
            `;
        }

        list.innerHTML = html;

    } catch (err) {
        console.error(err);
        list.innerHTML = "<p style='text-align:center;color:red'>Error loading transactions</p>";
    }
}



async function sC() {
    if (isProcessing) return;

    let u = document.getElementById("nU").value.trim();
    const p = document.getElementById("nP").value.trim();
    const i = document.getElementById("nI").value.trim();
    const pass = document.getElementById("oP").value;

    if (!pass) return sT("Password required");
    if (!u && !p && !i) return sT("Update at least one field");

    if (u) {
        if (u.length < 5) return sT("Username min 5 char");
        if (u.length > 8) u = u.substring(0, 8);
    }

    if (p && !/^\d{10}$/.test(p)) return sT("Phone must be 10 digits");

    if (i && !/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(i)) {
        return sT("Invalid image URL");
    }

    const user = auth.currentUser;
    if (!user) return;

    isProcessing = true;

    try {
        await user.reauthenticateWithCredential(
            firebase.auth.EmailAuthProvider.credential(user.email, pass)
        );

        const ref = db.ref("users");

        if (u) {
            const snap = await ref.orderByChild("username").equalTo(u).once("value");
            if (snap.exists()) {
                let taken = false;
                snap.forEach(child => {
                    if (child.key !== user.uid) taken = true;
                });
                if (taken) throw "UsernameTaken";
            }
        }

        if (i) {
            await new Promise((res, rej) => {
                const img = new Image();
                img.onload = () => res(true);
                img.onerror = () => rej("BadImage");
                img.src = i;
            });
        }

        const updateData = {};
        if (u) updateData.username = u;
        if (p) updateData.phone = p;
        if (i) updateData.profilePic = i;

        if (!Object.keys(updateData).length) throw "NoData";

        await ref.child(user.uid).update(updateData);

        document.getElementById("nU").value = "";
        document.getElementById("nP").value = "";
        document.getElementById("nI").value = "";
        document.getElementById("oP").value = "";

        mH('eM');
        sT("Updated");

    } catch (e) {
        if (e === "UsernameTaken") sT("Username already used");
        else if (e === "BadImage") sT("Image load failed");
        else sT("Auth failed");
    } finally {
        isProcessing = false;
    }
}

function handleVerification() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = db.ref("users/" + user.uid);
    userRef.once("value").then(snapshot => {
        const data = snapshot.val();
        if (!data) return;

        const now = Date.now(); // client timestamp fallback
        const lastVerifiedAt = data.lastVerifiedAt || 0;
        const duration = data.duration || 0;
        const isExpired = duration > 0 && (now - lastVerifiedAt >= duration);

        if (!data.verified || isExpired) {
            if (data.verified && isExpired) {
                manualRenewal(); // only deduct 15 TK
            } else {
                startVerification(); // new verification, deduct 30 TK
            }
        } else {
            sT("আপনি ইতিমধ্যেই Verified!");
        }
    });
}

