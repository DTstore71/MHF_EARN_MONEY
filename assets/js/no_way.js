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

let userId = null;
let sectorCounter = 1;
let currentSector = '';
const sentSectors = new Set();
const deletedSectors = new Set();
let featureEnabled = true; // Kill switch default true

const sectorSelect = document.getElementById('sectorSelect');
const tableBody = document.getElementById('tableBody');
const tableHeader = document.getElementById('tableHeader');
const rowCount = document.getElementById('rowCount');
const sendBtn = document.getElementById('sendBtn');

// 🔴 Kill switch logic
const featureRef = firebase.database().ref('settings/featureEnabled');
featureRef.on('value', snap => {
  featureEnabled = snap.val() ?? true;
});

function checkFeature(){
  if(!featureEnabled){
    alert('⚠️ এখন জিমেইল-এর কাজ বন্ধ আছে।');
    return false;
  }
  return true;
}

// Update row count
function updateRowCount() {
  rowCount.textContent = 'সারি: ' + tableBody.querySelectorAll('tr').length;
}

// Save user data
function saveUserData(data) {
  if(!userId || !currentSector || !checkFeature()) return;
  
  // শুধুমাত্র নির্দিষ্ট সেক্টরের ডাটা আপডেট হবে, বাকি সব (Username, Balance) সুরক্ষিত থাকবে
  firebase.database().ref('users/' + userId + '/tables/' + currentSector)
    .update(data[currentSector]) 
    .catch(err => console.error('Save Error: ', err.message));
}



// Load sectors dropdown
function loadSectors(sectors = []) {
  sectorSelect.innerHTML = '<option value="">সেক্টর নির্বাচন করুন</option>';
  sectors.forEach(sec => {
    if(!deletedSectors.has(sec)){
      const o = document.createElement('option');
      o.value = sec;
      o.textContent = sec;
      sectorSelect.appendChild(o);
    }
  });
}

firebase.auth().onAuthStateChanged(user => {
  if(!user) return window.location.href = "UserLogin.html";
  userId = user.uid;

  // ✅ এখানে নতুন লাইন
  checkInboxNotifications();

  firebase.database().ref('users/' + userId).once('value').then(snap => {
    const data = snap.val() || {};
    data.sectors = data.sectors || [];
    data.tables = data.tables || {};
    sectorCounter = Number(data.sectorCounter || 2);
    if(data.deletedSectors) data.deletedSectors.forEach(ds => deletedSectors.add(ds));

    firebase.database().ref('admin_messages').orderByChild('userId').equalTo(userId)
      .on('value', snapMsg => {
        sentSectors.clear();
        const msgs = snapMsg.val() || {};
        Object.values(msgs).forEach(msg => {
          if(msg.status === 'sent') sentSectors.add(msg.sector);
        });
        loadSectors(data.sectors);
        loadTable();
      });
  }).catch(err => alert('Load Error: ' + err.message));
});




function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 10000); 
}

function checkInboxNotifications() {
  const ref = firebase.database().ref('user_messages/' + userId);
  ref.once('value').then(snap => {
    const msgs = snap.val() || {};
    let unseenCount = 0;
    Object.values(msgs).forEach(m => {
      if(m.status !== 'seen') unseenCount++;
    });

    if(unseenCount > 0){
      showToast(`মোট: ${unseenCount}টি ম্যাসেজ আছে আপনার জন্য, ইনবক্স চেক করুন!`);
    }
  });
}


sectorSelect.addEventListener('change', () => {
  currentSector = sectorSelect.value;
  loadTable();
});
document.getElementById('addSector').addEventListener('click', () => {
  if(!checkFeature() || !userId) return;

  const choice = prompt("সেক্টরের ধরন নির্বাচন করুন:\n1) Fixed_Password_(aass1122)\n2) Any_OR_Random_Password\nলিখুন 1 বা 2");
  if(choice !== '1' && choice !== '2') {
    showToast('❌ সঠিক সংখ্যা লিখুন: 1 বা 2');
    return;
  }

  const type = (choice === '1') ? 'Fixed_aass1122' : 'Any_Or_Random';

  const userRef = firebase.database().ref('users/' + userId);

  userRef.transaction(current => {
    if (!current) return current;

    current.sectors = current.sectors || [];
    current.tables = current.tables || {};
    current.deletedSectors = current.deletedSectors || [];

    let counter = current.sectorCounter || 1;
    let sectorName;
    do {
      sectorName = `${type}-${counter.toString().padStart(2,'0')}`;
      counter++;
    } while (
      current.sectors.includes(sectorName) ||
      current.deletedSectors.includes(sectorName)
    );

    current.sectors.push(sectorName);
    current.tables[sectorName] = {
      headers: ['Gmail','Password'],
      rows: []
    };

    current.sectorCounter = counter;
    currentSector = sectorName;

    return current;
  }, (err, committed, snap) => {
    if(err) return alert('Error adding sector: ' + err.message);
    if(committed){
      const data = snap.val() || {};
      loadSectors(data.sectors || []);
      sectorSelect.value = currentSector;
      loadTable();
    }
  });
});


function loadColorStatsRealtime() {
  if (!userId) return;

  const ref = firebase.database()
    .ref('admin_messages')
    .orderByChild('userId')
    .equalTo(userId);

  ref.on('value', async snap => {
    const msgs = snap.val() || {};

    let green = 0;
    let red = 0;

    Object.values(msgs).forEach(msg => {
      const color = (msg.color || '').toLowerCase();
      if (color === 'green') green++;
      else if (color === 'red') red++;
    });

    document.getElementById('greenCount').innerHTML =
      `<i class="fas fa-check-circle"></i> <span style="color: black;">Approved: ${green}</span>`;

    document.getElementById('redCount').innerHTML =
      `<i class="fas fa-times-circle"></i> <span style="color: black;"> Rejected: ${red}</span>`;

}); // <-- ref.on বন্ধ
}     // <-- function বন্ধ
   
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    loadColorStatsRealtime();
  }
});
// Delete Sector
document.getElementById('deleteSector').addEventListener('click', () => {
  if (!checkFeature()) return;

  if (!currentSector) {
    showToast('প্রথমে সেক্টর নির্বাচন করুন');
    return;
  }

  const isSent = sentSectors.has(currentSector);

  firebase.database().ref('admin_messages')
    .orderByChild('sector')
    .equalTo(currentSector)
    .once('value')
    .then(snap => {
      const msgs = snap.val() || {};

      const hasColor = Object.values(msgs).some(m => {
        const c = m.color || m.rowColor || m.bgColor || '';
        return typeof c === 'string' && c.trim() !== '';
      });

      // ❌ send হয়েছে + admin color নাই → delete বন্ধ + toast
      if (isSent && !hasColor) {
        showToast('এই সেক্টর পাঠানো হয়েছে কিন্তু Admin কোনো রঙ করেনি — ডিলিট করা যাবে না');
        return;
      }

      // ⚡ এখান থেকে সরাসরি delete (no confirm)
      firebase.database().ref('users/' + userId).transaction(current => {
        if (current) {
          current.sectors = current.sectors.filter(s => s !== currentSector);

          if (current.tables) delete current.tables[currentSector];

          current.deletedSectors = current.deletedSectors || [];
          current.deletedSectors.push(currentSector);

          deletedSectors.add(currentSector);
          currentSector = '';
        }
        return current;
      }, (err, committed, snap) => {
        if (err) {
          showToast('❌ ডিলিট করতে সমস্যা হয়েছে');
          return;
        }

        if (committed) {
          const data = snap.val() || {};
loadSectors(data.sectors || []);
          tableBody.innerHTML = '';
          tableHeader.innerHTML = '<th>Gmail</th><th>Password</th><th>Actions</th>';
          updateRowCount();

          showToast('✅ সেক্টর সফলভাবে ডিলিট হয়েছে');
        }
      });
    })
    .catch(err => {
      showToast('Error: ' + err.message);
    });
});

const container = document.getElementById("adminMessageContainer");

  firebase.database().ref("adminMessage").on("value", snapshot => {
    const data = snapshot.val();
    if(data && data.text){
      container.innerHTML = `
        <p style="
          color: black;
          text-align: center;
          box-shadow: 0 0 10px gold;
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 20px;">
          <i style="font-size: 22px; margin-right: 5px; text-shadow: 0 0 10px red; color: yellow;" class="fas fa-fire-alt"></i>
          ${data.text}
        </p>
      `;
    }
  });
  
// Attach autosave
function attachAutoSave() {
  tableBody.querySelectorAll('tr').forEach((tr) => {
    tr.querySelectorAll('td').forEach((td) => {
      if(td.contentEditable === 'true'){
        td.oninput = () => {
          if(!checkFeature()) return;
          const headers = Array.from(tableHeader.querySelectorAll('th')).slice(0,-1).map(th=>th.textContent.trim());
          const rows = Array.from(tableBody.querySelectorAll('tr')).map(tr2 => 
            Array.from(tr2.querySelectorAll('td')).slice(0,-1).map(td2 => td2.textContent.trim())
          );
          
          // নির্দিষ্ট সেক্টরের জন্য অবজেক্ট পাঠানো
          saveUserData({ [currentSector]: { headers, rows } });
        };
      }
    });
  });
}

function loadTable() {
  tableBody.innerHTML = '';
  if (!currentSector) return;

  const userTableRef = firebase.database().ref(`users/${userId}/tables/${currentSector}`);
  const adminMsgRef = firebase.database().ref('admin_messages').orderByChild('userId').equalTo(userId);

  Promise.all([userTableRef.once('value'), adminMsgRef.once('value')])
    .then(([snap, msgSnap]) => {
      const d = snap.val() || {};
      const headers = Array.isArray(d.headers) ? d.headers : ['Gmail', 'Password'];
      const rows = Array.isArray(d.rows)
        ? d.rows.map((r, index) => ({ rowId: index, values: r }))
        : [];

      const adminMsgs = msgSnap.val() || {};
      const colorMap = {};

      Object.values(adminMsgs).forEach(msg => {
        if (msg.sector === currentSector && msg.color) {
          if (typeof msg.rowIndex === 'number') {
            colorMap[msg.rowIndex] = msg.color;
          } else if (Array.isArray(msg.row)) {
            colorMap[JSON.stringify(msg.row)] = msg.color;
          }
        }
      });

      tableHeader.innerHTML = '';
      headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        tableHeader.appendChild(th);
      });
      const thA = document.createElement('th');
      thA.textContent = 'Actions';
      tableHeader.appendChild(thA);

      const isSent = sentSectors.has(currentSector);
      const existingGmails = rows.map(r => r.values[0]?.trim().toLowerCase());

      const frag = document.createDocumentFragment();
      rows.forEach((rowObj, i) => {
        const tr = document.createElement('tr');

        rowObj.values.forEach(cell => {
          const td = document.createElement('td');
          td.textContent = cell;
          td.contentEditable = !isSent;
          tr.appendChild(td);
        });

        let rowColor = colorMap[i];
        if (!rowColor) {
          const rowKey = JSON.stringify(rowObj.values);
          if (colorMap[rowKey]) rowColor = colorMap[rowKey];
        }

        if (rowColor) {
          tr.style.backgroundColor = rowColor;
          tr.style.color = 'black';
        }

        const tdA = document.createElement('td');
        if (!isSent) {
          const del = document.createElement('span');
          del.className = 'icon-btn';
          del.innerHTML = '<i class="fas fa-trash"></i>';
          del.onclick = () => {
            if (!checkFeature()) return;
            if (!currentSector) return alert('প্রথমে সেক্টর নির্বাচন করুন');
            if (!confirm('আপনি কি নিশ্চিত এই সারিটি মুছে ফেলতে চান?')) return;
            const allRows = [];
            tableBody.querySelectorAll('tr').forEach(tr => {
              const tds = tr.querySelectorAll('td');
              const rowValues = [];
              for (let x = 0; x < tds.length - 1; x++) {
                rowValues.push(tds[x].textContent.trim());
              }
              allRows.push(rowValues);
            });
            allRows.splice(i, 1);
            firebase.database().ref(`users/${userId}/tables/${currentSector}`)
              .update({ headers, rows: allRows })
              .then(() => loadTable())
              .catch(err => alert('Delete error: ' + err.message));
          };
          const dup = document.createElement('span');
          dup.className = 'icon-btn';
          dup.innerHTML = '<i class="fas fa-copy"></i>';
          dup.onclick = () => {
            if (!checkFeature()) return;
            const gmail = rowObj.values[0]?.trim().toLowerCase();
            if (existingGmails.includes(gmail)) {
              alert('❌ এই Gmail আগেই আছে! ডুপ্লিকেট আপলোড করা যাবে না।');
              return;
            }
            rows.splice(i + 1, 0, { ...rowObj, values: [...rowObj.values] });
            saveUserData({ [currentSector]: { headers, rows: rows.map(r => r.values) } });
            loadTable();
          };
          tdA.appendChild(del);
          tdA.appendChild(dup);
        } else {
          let status = 'Pending';
          if (rowColor?.toLowerCase() === 'green') status = 'Approved';
          else if (rowColor?.toLowerCase() === 'red') status = 'Rejected';
          tdA.textContent = status;
          tdA.style.color = (status === 'Pending') ? 'black' : 'white';
          tdA.style.backgroundColor = (status === 'Pending') ? 'white' : rowColor;
        }

        tr.appendChild(tdA);
        frag.appendChild(tr);
      });

      tableBody.appendChild(frag);
      updateUIState(isSent);
      attachAutoSave();
    })
    .catch(err => alert('Load table error: ' + err.message));
}
// Update UI state
function updateUIState(isSent){
  sendBtn.disabled = isSent || !featureEnabled;
  sendBtn.style.opacity = (isSent || !featureEnabled) ? 0.5 : 1;
['addRow','addCol','saveData'].forEach(id=>{
  const btn = document.getElementById(id);
  btn.disabled = isSent || !featureEnabled;
  btn.style.opacity = (isSent || !featureEnabled) ? 0.5 : 1;
});

// ✅ deleteSector বাটন disable হবে না, শুধু feature off থাকলে disable হবে
const delBtn = document.getElementById('deleteSector');
delBtn.disabled = !featureEnabled;
delBtn.style.opacity = !featureEnabled ? 0.5 : 1;
  updateRowCount();
}

// Add Row
document.getElementById('addRow').addEventListener('click', () => {
  if(!checkFeature()) return;
  if(!currentSector) return alert('প্রথমে সেক্টর নির্বাচন করুন');
  if(sentSectors.has(currentSector)) return alert('এই সেক্টর ইতিমধ্যে পাঠানো হয়েছে।');

  const ref = firebase.database().ref(`users/${userId}/tables/${currentSector}`);
  
  ref.transaction(current => {
    if(current){
      current.rows = current.rows || [];
      // নতুন row তৈরি
      const newRow = current.headers.map(header => {
        // ❌ GMTP সরানো হয়েছে, সব খালি থাকবে
        return '';
      });
      current.rows.push(newRow);
    }
    return current;
  }).then(()=> loadTable())
    .catch(err => alert('Add row error: ' + err.message));
});

// Add Column
document.getElementById('addCol').addEventListener('click', () => {
  if(!checkFeature()) return;
  if(!currentSector) return alert('প্রথমে সেক্টর নির্বাচন করুন');
  if(sentSectors.has(currentSector)) return alert('এই সেক্টর ইতিমধ্যে পাঠানো হয়েছে।');

  const newColName = prompt('নতুন কলামের নাম লিখুন', 'নতুন কলাম');
  if(!newColName) return;

  const ref = firebase.database().ref(`users/${userId}/tables/${currentSector}`);
  ref.transaction(current => {
    if(current){
      current.headers = current.headers || [];
      current.rows = current.rows || [];
      current.headers.push(newColName);
      current.rows.forEach(r => r.push(''));
    }
    return current;
  }).then(()=> loadTable())
    .catch(err => alert('Add column error: ' + err.message));
});

// Save Data
document.getElementById('saveData').addEventListener('click', () => {
  if(!checkFeature()) return;
  if(!currentSector) return alert('প্রথমে সেক্টর নির্বাচন করুন');

  const rows = [];
  tableBody.querySelectorAll('tr').forEach(tr=>{
    const row = [];
    tr.querySelectorAll('td').forEach((td, idx)=>{
      if(idx < tableHeader.children.length-1) row.push(td.textContent.trim());
    });
    rows.push(row);
  });

  const headers = [];
  tableHeader.querySelectorAll('th').forEach((th, idx)=>{
    if(idx < tableHeader.children.length-1) headers.push(th.textContent.trim());
  });

  saveUserData({ [currentSector]: { headers, rows } });
  alert('ডেটা সেভ হয়েছে ✅');
});

document.addEventListener('DOMContentLoaded', () => {    
  const fileInput = document.getElementById('xlsxUpload');    
  const sectorSelect = document.getElementById('sectorSelect');    
    
  fileInput.addEventListener('change', (e) => {    
    const userId = firebase.auth().currentUser?.uid;    
    if(!checkFeature() || !userId) return;    
    
    const selectedSector = sectorSelect.value?.trim();    
    if (!selectedSector) {    
      showToast('প্রথমে একটি সেক্টর নির্বাচন করুন!');    
      return;    
    }    
    
    const file = e.target.files[0];    
    if (!file) return;    
    
    const reader = new FileReader();    
    reader.onload = function(evt) {    
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if(!jsonData || jsonData.length < 2){
          showToast('Excel ফাইল খালি বা row কম!');
          return;
        }
        const firstRow = jsonData[0].map(h => (h || '').toString().trim().toLowerCase());

const isHeader = firstRow.includes('gmail') || 
                 firstRow.includes('email') || 
                 firstRow.includes('password');

let headersFromExcel;
let dataRows;

if (isHeader) {
  headersFromExcel = jsonData[0].map(h => (h || '').toString().trim());
  dataRows = jsonData.slice(1);
} else {
  headersFromExcel = ['Gmail','Password'];
  dataRows = jsonData;
}

const rowsFromExcel = dataRows
  .filter(r => r.length >= 2)
  .map(r => [
    (r[0] || '').toString().trim().toLowerCase(),
    (r[1] || '').toString().trim()
  ]);

        const userTableRef = firebase.database().ref(`users/${userId}/tables/${selectedSector}`);

        userTableRef.once('value')
          .then(snap => {
            const currentData = snap.val() || {};
            const headers = Array.isArray(currentData.headers) ? currentData.headers : ['Gmail','Password'];
            const rows = Array.isArray(currentData.rows) ? currentData.rows : [];

            const existingGmailsSet = new Set(rows.map(r => (r[0] || '').toString().trim().toLowerCase()));

            const newRows = [];
            rowsFromExcel.forEach(r => {
              if(!existingGmailsSet.has(r[0])) {
                newRows.push(r);
                existingGmailsSet.add(r[0]);
              }
            });

            if(newRows.length === 0){
              showToast('কোনো নতুন Gmail নেই, সব ডুপ্লিকেট।');
              return;
            }

            return userTableRef.update({
              headers: headersFromExcel.length > 0 ? headersFromExcel : headers,
              rows: [...rows, ...newRows]
            }).then(() => {
              currentSector = selectedSector;
              loadTable(); // make sure loadTable also safely handles missing rows
              showToast(`${newRows.length}টি নতুন row '${selectedSector}' এ যোগ হয়েছে`);
            });
          })
          .catch(err => alert('Load current table error: ' + err.message));

      } catch(err) {
        console.error(err);
        showToast('Excel ফাইল পড়তে সমস্যা হয়েছে।');
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ''; // reset file input
  });
});

sendBtn.addEventListener('click', () => {
  if (!checkFeature()) return;
  if (!currentSector) return alert('প্রথমে সেক্টর নির্বাচন করুন');
  if (sentSectors.has(currentSector)) return alert('এই সেক্টর ইতিমধ্যে পাঠানো হয়েছে।');

  const ref = firebase.database().ref(`users/${userId}/tables/${currentSector}`);
  ref.once('value').then(snap => {
    const d = snap.val() || {};
    let rows = Array.isArray(d.rows) ? d.rows : [];
    if (rows.length === 0) return alert('কোনো তথ্য নেই পাঠানোর জন্য!');

   
    if (rows.length < 2) return alert('❌ সর্বনিম্ন 2টি জিমেইল দাও!।');

    // Gmail + Password validation
    for (let i = 0; i < rows.length; i++) {
      const gmail = rows[i][0]?.trim().toLowerCase();
      const password = rows[i][1]?.trim();

      if (!gmail.endsWith('@gmail.com')) {
        alert(`❌ সারি ${i + 1}: ${gmail} একটি বৈধ Gmail নয়!`);
        return;
      }
      if (!password) {
        alert(`❌ সারি ${i + 1}: পাসওয়ার্ড ফাঁকা থাকতে পারবে না!`);
        return;
      }
    }

    if (!confirm('⚠️ নিশ্চিতভাবে সেন্ড করতে চান?')) {
      alert('❌ সেন্ড বাতিল করা হয়েছে।');
      return;
    }

    // === DUPLICATE REMOVE START ===
    const seen = new Set();
    const uniqueRows = [];
    const duplicateIndexes = [];

    rows.forEach((r, i) => {
      const gmail = r[0].trim().toLowerCase();
      if (seen.has(gmail)) {
        duplicateIndexes.push(i);
      } else {
        seen.add(gmail);
        uniqueRows.push(r);
      }
    });

  
    if (uniqueRows.length < 2) {
      alert(`❌ ডুপ্লিকেট বাদ দিয়ে এখন মাত্র ${uniqueRows.length} টি সারি আছে।
সর্বনিম্ন ২টি জিমেইল না থাকলে পাঠানো যাবে না!`);
      return;
    }
    

    const pushes = uniqueRows.map(r =>
      firebase.database().ref('admin_messages').push({
        userId,
        sector: currentSector,
        row: r,
        color: '',
        status: 'sent',
        timestamp: Date.now()
      })
    );

    Promise.all(pushes)
      .then(() => {
        rows = rows.filter((_, i) => !duplicateIndexes.includes(i));
        return ref.update({ rows });
      })
      .then(() => {
        sentSectors.add(currentSector);
        loadTable();
        alert(`✅ ডাটা পাঠানো সম্পন্ন!\n🟡 ${duplicateIndexes.length} টি ডুপ্লিকেট সারি মুছে ফেলা হয়েছে।`);
      })
      .catch(err => alert('Send error: ' + err.message));

  }).catch(err => alert('Send data error: ' + err.message));
});

const inboxBtn = document.getElementById('inboxBtn');
const inboxModal = document.getElementById('inboxModal');
const closeInboxModal = document.getElementById('closeInboxModal');
const inboxMessagesDiv = document.getElementById('inboxMessages');

inboxModal.style.display = 'none';

inboxBtn.onclick = () => {
  if(!userId) return alert('প্রথমে লগইন করুন');
  inboxModal.style.display = 'flex';
  loadInboxMessages();
};

closeInboxModal.onclick = () => inboxModal.style.display = 'none';
window.onclick = e => { if(e.target === inboxModal) inboxModal.style.display='none'; };

function loadInboxMessages(){
  inboxMessagesDiv.innerHTML = 'লোড হচ্ছে...';
  
  firebase.database().ref('user_messages/' + userId)
    .orderByChild('timestamp')
    .once('value')
    .then(snap => {
      const msgs = snap.val() || {};
      inboxMessagesDiv.innerHTML = '';
      const entries = Object.entries(msgs).sort((a,b)=>b[1].timestamp - a[1].timestamp);

      if(entries.length === 0){
        inboxMessagesDiv.innerHTML = '<p>আপনার কোন ম্যাসেজ নেই।</p>';
        return;
      }

      entries.forEach(([key,msg])=>{
        const div = document.createElement('div');
div.className = 'inbox-message';
div.style.cursor = 'pointer';
div.style.padding = '10px';
div.style.marginBottom = '12px';
div.style.borderRadius = '38px';
div.style.transition = 'background-color 0.3s ease';
div.style.display = 'flex';
div.style.justifyContent = 'center';
div.style.alignItems = 'center';
div.style.textAlign = 'center';
        div.style.backgroundColor = msg.bgColor || (msg.status === 'seen' ? '#f9f9f9' : '#ffffff');

        div.innerHTML = `
          <p>
            <span style="color: black; border: 3px solid green; border-radius: 22px;padding: 3px; margin-bottom: 6px;">
              Message:</span> ${msg.text || ''}
            <br>
            <span style="color: black; border: 3px solid red;border-radius: 22px; padding: 3px;">
              Time:</span> ${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
          </p>
          <button data-key="${key}" style="margin-top:6px;"><i class="fas fa-trash"></i> Delete</button>
        `;

        inboxMessagesDiv.appendChild(div);

        // 🟡 ক্লিক করলে হাইলাইট এবং Firebase-এ সেভ হবে
        div.onclick = (e) => {
          // যদি Delete বাটনে ক্লিক হয়, তবে ফাংশন return করবে
          if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

          const newColor = '#fff3b0'; // হলুদ
          div.style.backgroundColor = newColor;

          // Firebase-এ সেভ করা হবে
          firebase.database().ref('user_messages/' + userId + '/' + key).update({
            status: 'seen',
            bgColor: newColor
          }).catch(err => console.error('Seen update error:', err));
        };

        // Delete বাটন
        div.querySelector('button').onclick = (e) => {
          e.stopPropagation(); // ক্লিক ইভেন্টকে হাইলাইট থেকে আলাদা করা
          const msgKey = e.target.dataset.key;
          if(confirm('আপনি কি নিশ্চিত এই ম্যাসেজ ডিলিট করতে চান?')){
            firebase.database().ref('user_messages/' + userId + '/' + msgKey).remove()
              .then(()=> div.remove())
              .catch(err => alert('Delete error: '+err.message));
          }
        };
      });
    })
    .catch(err => inboxMessagesDiv.innerHTML='লোড করতে সমস্যা হয়েছে: '+err.message);
}



// Export XLSX
document.getElementById('exportCSV').addEventListener('click', () => {
  if(!checkFeature()) return;
  if(!currentSector) return alert('প্রথমে সেক্টর নির্বাচন করুন');

  firebase.database().ref(`users/${userId}/tables/${currentSector}`).once('value')
    .then(snap=>{
      const d = snap.val() || {};
      const headers = Array.isArray(d.headers) ? d.headers : ['Gmail','Password'];
      const rows = Array.isArray(d.rows) ? d.rows : [];
      const ws_data = [headers,...rows];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      ws['!cols'] = headers.map(()=>({wch:25}));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, currentSector);
      XLSX.writeFile(wb, `${currentSector}.xlsx`);
    }).catch(err => alert('Export error: ' + err.message));
});
