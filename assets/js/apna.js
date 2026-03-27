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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();


const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const regEmail = document.getElementById('regEmail');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regConfirmPassword = document.getElementById('regConfirmPassword');
const phoneInput = document.querySelector('.phone-group input:last-child');
const termsCheckbox = registerForm.querySelector('.terms input');

function toggleForm() {
  loginForm.classList.toggle("hidden");
  registerForm.classList.toggle("hidden");
}

function togglePassword(icon,inputId){
  const input=document.getElementById(inputId);
  if(input.type==="password"){
    input.type="text";
    icon.classList.replace("fa-eye","fa-eye-slash");
  }else{
    input.type="password";
    icon.classList.replace("fa-eye-slash","fa-eye");
  }
}

function checkPasswordStrength(){
  const pwd=regPassword.value;
  const checkEl=document.getElementById('passwordCheck');
  if(!pwd){checkEl.value='';checkEl.className='password-check-input';return;}
  const lengthReq=pwd.length>=8;
  const upperReq=/[A-Z]/.test(pwd);
  const lowerReq=/[a-z]/.test(pwd);
  const numberReq=/[0-9]/.test(pwd);
  const specialReq=/[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  if(lengthReq&&upperReq&&lowerReq&&numberReq&&specialReq){
    checkEl.value='Password Check: Strong';
    checkEl.className='password-check-input strong';
  }
  else if(lengthReq&&((upperReq&&lowerReq&&numberReq)||(lowerReq&&numberReq&&specialReq))){
    checkEl.value='Password Check: Medium';
    checkEl.className='password-check-input medium';
  }
  else{
    checkEl.value='Password Check: Weak';
    checkEl.className='password-check-input weak';
  }
}


registerForm.querySelector('button').addEventListener('click', async () => {
  const email = regEmail.value.trim();
  const username = regUsername.value.trim();
  const password = regPassword.value;
  const confirmPassword = regConfirmPassword.value;
  const phone = document.getElementById('regPhone').value.trim();
  const dob = document.getElementById('dob').value.trim();
  const gender = document.getElementById('gender').value;
  const terms = document.getElementById('termsCheckbox');

  if (!email || !username || !password || !confirmPassword || !phone || !dob || !gender) {
    alert('সব ফিল্ড পূরণ করুন!');
    return;
  }

  if (!terms.checked) {
    alert('Terms & Conditions মেনে নিন!');
    return;
  }

  if (/\s/.test(username) || /\s/.test(password)) {
    alert('Username বা Password-এ স্পেস দেয়া যাবে না!');
    return;
  }

  if (password !== confirmPassword) {
    alert('Password mismatch!');
    return;
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    alert('Phone ১০ অংকের হতে হবে!');
    return;
  }

  try {
    const usernameKey = username.toLowerCase();

    // Check username uniqueness
    const unameSnap = await db.ref("usernames/" + usernameKey).once("value");
    if (unameSnap.exists()) {
      alert("Username ইতিমধ্যে ব্যবহার করা হয়েছে!");
      return;
    }

    // Check phone uniqueness
    const phoneSnap = await db.ref("phones/" + phone).once("value");
    if (phoneSnap.exists()) {
      alert("Phone ইতিমধ্যে ব্যবহার করা হয়েছে!");
      return;
    }

    // Create user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    const refCode = document.getElementById("comBook")?.value?.trim() || null;
    if (refCode && refCode === uid) {
      alert("Self referral not allowed");
      await userCredential.user.delete();
      return;
    }

    // Save user data
    const userData = {
      email,
      username,
      phone,
      dob,
      gender,
      referredBy: refCode || null,
      referralApprovedPaid: false,
      balance: 0
    };

    await db.ref("users/" + uid).set(userData);
    await db.ref("usernames/" + usernameKey).set(uid);
    await db.ref("phones/" + phone).set(uid);

    alert("রেজিস্ট্রেশন সফল!");
    window.location.href = "UserProfileDashboard.html";

  } catch (err) {
    alert(err.message);
  }
});


 const termsModal = document.getElementById('termsModal');

function openModal() {
  termsModal.style.display = 'flex';
}

function closeModal() {
  termsModal.style.display = 'none';
}

window.addEventListener('click', (e) => {
  if (e.target === termsModal) {
    closeModal();
  }
});

document.getElementById("loginBtn").onclick = async () => {
  const loginInput = document.getElementById("loginInput").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!loginInput || !password) {
    alert("সব ফিল্ড পূরণ করুন!");
    return;
  }

  try {
    // ইউজারনেম চেক বাদ, সরাসরি ইমেইল লগইন
    await auth.signInWithEmailAndPassword(loginInput, password);
    window.location.href = "UserProfileDashboard.html";

  } catch (err) {
    if (err.code === "auth/wrong-password") {
      alert("ভুল পাসওয়ার্ড!");
    } else if (err.code === "auth/user-not-found") {
      alert("অ্যাকাউন্ট পাওয়া যায়নি!");
    } else {
      alert("লগইন ব্যর্থ: " + err.message);
    }
  }
};



var link = document.getElementById('forgotLink');
var modal = document.getElementById('forgotModal');
var closeBtn = document.getElementById('closeBtn');
var submitBtn = document.getElementById('submitForgot');
var emailInput = document.getElementById('forgotEmail');
var showVideoBtn = document.getElementById('showVideoBtn');
var videoBox = document.getElementById('videoBox');

link.onclick = function() {
  modal.style.display = 'flex';
}

closeBtn.onclick = function() {
  modal.style.display = 'none';
  videoBox.style.display = 'none';
  showVideoBtn.innerHTML = '<i class="fas fa-video"></i> মেইল না পেলে ভিডিও দেখুন!';
}

showVideoBtn.onclick = function() {
  if (videoBox.style.display === '' || videoBox.style.display === 'none') {
    videoBox.style.display = 'block';
    showVideoBtn.innerHTML = '<i class="fas fa-video"></i> ভিডিও লুকান!';
  } else {
    videoBox.style.display = 'none';
    showVideoBtn.innerHTML = '<i class="fas fa-video"></i> মেইল না পেলে ভিডিও দেখুন!';
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref");

  if (refCode) {
    const refInput = document.getElementById("comBook");
    if (refInput) {
      refInput.value = refCode;
    }
  }
});


submitBtn.onclick = function() {
  var email = emailInput.value.trim();
  if(email){
    auth.sendPasswordResetEmail(email)
      .then(function() {
        alert('পাসওয়ার্ড রিসেট করার জন্য আপনার ইমেইলে একটি মেইল পাঠানো হয়েছে!');
        modal.style.display = 'none';
        videoBox.style.display = 'none';
        showVideoBtn.innerHTML = '<i class="fas fa-video"></i> মেইল না পেলে ভিডিও দেখুন!';
      })
      .catch(function(error) {
        alert(error.message);
      });
  } else {
    alert('আগে আপনার GMAIL দেন!');
  }
}
