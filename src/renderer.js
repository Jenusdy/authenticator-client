// State variables
let accounts = [];
let editId = null;

// Circumference of timer circle: 2 * PI * r = 2 * 3.14159 * 11 = ~69.1
const CIRCUMFERENCE = 69.115;

// Generate token using window.OTPAuth loaded in renderer
function generateToken(secret) {
  try {
    const cleanedSecret = secret.replace(/\s+/g, '').toUpperCase();
    const totp = new window.OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: window.OTPAuth.Secret.fromBase32(cleanedSecret)
    });
    return totp.generate();
  } catch (err) {
    return '------';
  }
}

// Validate base32 secret locally
function validateSecret(secret) {
  try {
    const cleanedSecret = secret.replace(/\s+/g, '').toUpperCase();
    window.OTPAuth.Secret.fromBase32(cleanedSecret);
    return true;
  } catch (err) {
    return false;
  }
}

// DOM Elements
const noAccountsEl = document.getElementById('no-accounts');
const accountsListEl = document.getElementById('accounts-list');
const searchInput = document.getElementById('search-input');
const addAccountBtn = document.getElementById('add-account-btn');
const addAccountEmptyBtn = document.getElementById('add-account-empty-btn');
const accountModal = document.getElementById('account-modal');
const modalTitle = document.getElementById('modal-title');
const accountForm = document.getElementById('account-form');
const accountIdInput = document.getElementById('account-id');
const accountIssuerInput = document.getElementById('account-issuer');
const accountNameInput = document.getElementById('account-name');
const accountSecretInput = document.getElementById('account-secret');
const secretError = document.getElementById('secret-error');
const closeModalBtn = document.getElementById('close-modal-btn');

// Backup Elements
const backupBtn = document.getElementById('backup-btn');
const backupModal = document.getElementById('backup-modal');
const closeBackupBtn = document.getElementById('close-backup-btn');
const saveQrBtn = document.getElementById('save-qr-btn');
const restoreSelectBtn = document.getElementById('restore-select-btn');
const restoreQrInput = document.getElementById('restore-qr-input');
const restoreError = document.getElementById('restore-error');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Multi-Option Add Account Views
const addOptionsView = document.getElementById('add-options-view');
const addCameraView = document.getElementById('add-camera-view');
const optionCameraBtn = document.getElementById('option-camera-btn');
const optionUploadBtn = document.getElementById('option-upload-btn');
const addQrFileInput = document.getElementById('add-qr-file-input');
const optionManualBtn = document.getElementById('option-manual-btn');
const addOptionError = document.getElementById('add-option-error');
const webcamPreview = document.getElementById('webcam-preview');
const cameraBackBtn = document.getElementById('camera-back-btn');
const manualBackBtn = document.getElementById('manual-back-btn');

let webcamStream = null;
let webcamAnimationId = null;
async function init() {
  accounts = await window.api.getAccounts();
  renderAccounts();
  
  // Start the tick loop
  updateTick();
  setInterval(updateTick, 500); // 500ms for smoother progress circle updates
}

// Show Toast Notification
function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Render Accounts UI
function renderAccounts() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const filteredAccounts = accounts.filter(acc => {
    const issuer = (acc.issuer || '').toLowerCase();
    const name = (acc.name || '').toLowerCase();
    return issuer.includes(searchTerm) || name.includes(searchTerm);
  });

  if (filteredAccounts.length === 0) {
    accountsListEl.style.display = 'none';
    noAccountsEl.style.display = 'flex';
  } else {
    noAccountsEl.style.display = 'none';
    accountsListEl.style.display = 'block';
    
    // Clear and build list
    accountsListEl.innerHTML = '';
    filteredAccounts.forEach(acc => {
      const card = createAccountCard(acc);
      accountsListEl.appendChild(card);
    });
  }
}

// Format Token with Space in Middle (e.g. 123 456)
function formatToken(token) {
  if (token.length === 6) {
    return `${token.substring(0, 3)} ${token.substring(3, 6)}`;
  }
  return token;
}

// Create Account Card element
function createAccountCard(acc) {
  const card = document.createElement('div');
  card.className = 'account-card';
  card.dataset.id = acc.id;

  const displayIssuer = acc.issuer || '2FA';
  const displayName = acc.name || 'Account';

  // First letter of Issuer for badge
  const initial = displayIssuer.charAt(0);
  
  // Calculate current token
  const token = generateToken(acc.secret);
  const formatted = formatToken(token);

  card.innerHTML = `
    <div class="account-badge">${initial}</div>
    <div class="account-info">
      <div class="issuer">${displayIssuer}</div>
      <div class="name">${displayName}</div>
    </div>
    <div class="code-wrapper">
      <div class="code-display" id="code-${acc.id}">${formatted}</div>
      <div class="timer-container">
        <svg class="timer-svg" viewBox="0 0 28 28">
          <circle class="timer-circle-bg" cx="14" cy="14" r="11"></circle>
          <circle class="timer-circle" id="timer-${acc.id}" cx="14" cy="14" r="11" 
                  stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0"></circle>
        </svg>
      </div>
    </div>
    <div class="card-actions">
      <button class="action-btn edit-btn" title="Edit">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
      <button class="action-btn delete-btn" title="Delete">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    </div>
  `;

  // Copy to clipboard on card click (excluding action buttons)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-actions') || e.target.closest('.action-btn')) {
      return;
    }
    const currentToken = generateToken(acc.secret);
    window.api.copyToClipboard(currentToken);
    showToast(`Copied: ${formatToken(currentToken)}`);
  });

  // Edit Action
  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(acc);
  });

  // Delete Action
  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${acc.issuer} (${acc.name})?`)) {
      deleteAccount(acc.id);
    }
  });

  // Drag and Drop sorting events
  card.draggable = true;

  card.addEventListener('dragstart', (e) => {
    if (e.target.closest('.card-actions') || e.target.closest('.action-btn')) {
      e.preventDefault();
      return;
    }
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingCard = document.querySelector('.account-card.dragging');
    if (draggingCard && draggingCard !== card) {
      const rect = card.getBoundingClientRect();
      const middleY = (rect.top + rect.bottom) / 2;
      
      if (e.clientY < middleY) {
        accountsListEl.insertBefore(draggingCard, card);
      } else {
        accountsListEl.insertBefore(draggingCard, card.nextSibling);
      }
    }
  });

  card.addEventListener('drop', async (e) => {
    e.preventDefault();
    
    const cardElements = Array.from(accountsListEl.querySelectorAll('.account-card'));
    const reorderedAccounts = cardElements.map(el => {
      return accounts.find(accItem => accItem.id === el.dataset.id);
    }).filter(Boolean);
    
    accounts = reorderedAccounts;
    await window.api.saveAccounts(accounts);
    renderAccounts();
  });

  return card;
}

// Update loop (ticking progress circle & refreshing code values)
function updateTick() {
  const now = Date.now();
  const epoch = Math.floor(now / 1000);
  const remaining = 30 - (epoch % 30);
  
  // Update progress circles
  const percent = remaining / 30;
  const offset = CIRCUMFERENCE * (1 - percent);

  accounts.forEach(acc => {
    // Update code if visible
    const codeEl = document.getElementById(`code-${acc.id}`);
    if (codeEl) {
      const token = generateToken(acc.secret);
      codeEl.textContent = formatToken(token);
    }

    // Update circular progress bar
    const timerEl = document.getElementById(`timer-${acc.id}`);
    if (timerEl) {
      timerEl.style.strokeDashoffset = offset;
      
      // Warning styling in last 5 seconds
      if (remaining <= 5) {
        timerEl.classList.add('warning');
      } else {
        timerEl.classList.remove('warning');
      }
    }
  });
}

// Modal open/close actions
// Stop webcam stream
function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
  if (webcamAnimationId) {
    cancelAnimationFrame(webcamAnimationId);
    webcamAnimationId = null;
  }
  webcamPreview.srcObject = null;
}

// Start webcam stream and scanning loop
async function startWebcam() {
  addOptionError.textContent = "";
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
    });
    webcamPreview.srcObject = webcamStream;
    webcamPreview.setAttribute("playsinline", true);
    webcamPreview.play();
    
    webcamAnimationId = requestAnimationFrame(scanWebcamFrame);
  } catch (err) {
    console.error("Camera access error:", err);
    addOptionError.textContent = "Error accessing camera. Make sure webcam is connected and allowed.";
    addCameraView.style.display = 'none';
    addOptionsView.style.display = 'flex';
  }
}

// Webcam frame scanner
function scanWebcamFrame() {
  if (webcamPreview.readyState === webcamPreview.HAVE_ENOUGH_DATA) {
    const canvas = document.createElement("canvas");
    canvas.width = webcamPreview.videoWidth;
    canvas.height = webcamPreview.videoHeight;
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(webcamPreview, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (typeof window.jsQR === 'function') {
      const code = window.jsQR(imgData.data, canvas.width, canvas.height);
      if (code && code.data) {
        const imported = decodeMigrationUrl(code.data);
        if (imported && imported.length > 0) {
          let addedCount = 0;
          imported.forEach(newAcc => {
            const exists = accounts.some(existing => 
              existing.secret === newAcc.secret && 
              existing.name.toLowerCase() === newAcc.name.toLowerCase()
            );
            if (!exists) {
              accounts.push({
                id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                issuer: newAcc.issuer,
                name: newAcc.name,
                secret: newAcc.secret
              });
              addedCount++;
            }
          });
          
          if (addedCount > 0) {
            window.api.saveAccounts(accounts).then(() => {
              renderAccounts();
              stopWebcam();
              closeModal();
              showToast(`Imported ${addedCount} code(s) successfully!`);
            });
          } else {
            stopWebcam();
            closeModal();
            showToast("Code(s) already exist in list.");
          }
          return;
        }
      }
    }
  }
  
  if (webcamStream) {
    webcamAnimationId = requestAnimationFrame(scanWebcamFrame);
  }
}

// Modal open/close actions
function openAddModal() {
  editId = null;
  modalTitle.textContent = "Add Account";
  
  addOptionsView.style.display = 'flex';
  addCameraView.style.display = 'none';
  accountForm.style.display = 'none';
  addOptionError.textContent = "";
  
  accountIdInput.value = "";
  accountIssuerInput.value = "";
  accountNameInput.value = "";
  accountSecretInput.value = "";
  secretError.style.display = "none";
  accountModal.classList.add('active');
}

function openEditModal(acc) {
  editId = acc.id;
  modalTitle.textContent = "Edit Account";
  
  addOptionsView.style.display = 'none';
  addCameraView.style.display = 'none';
  accountForm.style.display = 'block';
  
  accountIdInput.value = acc.id;
  accountIssuerInput.value = acc.issuer;
  accountNameInput.value = acc.name;
  accountSecretInput.value = acc.secret;
  secretError.style.display = "none";
  accountModal.classList.add('active');
}

function closeModal() {
  stopWebcam();
  accountModal.classList.remove('active');
}

// Delete Account Function
async function deleteAccount(id) {
  accounts = accounts.filter(acc => acc.id !== id);
  await window.api.saveAccounts(accounts);
  renderAccounts();
  showToast("Account deleted");
}

// Form Submit Handling
accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = accountIdInput.value;
  const issuer = accountIssuerInput.value.trim();
  const name = accountNameInput.value.trim();
  const secret = accountSecretInput.value.replace(/\s+/g, '').toUpperCase();

  // Validate base32 secret
  const isValid = validateSecret(secret);
  if (!isValid) {
    secretError.style.display = "block";
    return;
  }

  secretError.style.display = "none";

  if (editId) {
    // Edit existing account
    accounts = accounts.map(acc => {
      if (acc.id === editId) {
        return { ...acc, issuer, name, secret };
      }
      return acc;
    });
    showToast("Account updated");
  } else {
    // Create new account
    const newAcc = {
      id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      issuer,
      name,
      secret
    };
    accounts.push(newAcc);
    showToast("Account added successfully");
  }

  await window.api.saveAccounts(accounts);
  closeModal();
  renderAccounts();
});

// Event Listeners
addAccountBtn.addEventListener('click', openAddModal);
addAccountEmptyBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click', closeModal);

optionManualBtn.addEventListener('click', () => {
  addOptionsView.style.display = 'none';
  accountForm.style.display = 'block';
});

optionUploadBtn.addEventListener('click', () => {
  addQrFileInput.click();
});

optionCameraBtn.addEventListener('click', () => {
  addOptionsView.style.display = 'none';
  addCameraView.style.display = 'flex';
  startWebcam();
});

cameraBackBtn.addEventListener('click', () => {
  stopWebcam();
  addCameraView.style.display = 'none';
  addOptionsView.style.display = 'flex';
});

manualBackBtn.addEventListener('click', () => {
  if (editId) {
    closeModal();
  } else {
    accountForm.style.display = 'none';
    addOptionsView.style.display = 'flex';
  }
});

// File upload QR detection inside Add Account modal
addQrFileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        if (typeof window.jsQR !== 'function') {
          addOptionError.textContent = "Error: QR reader library not loaded yet.";
          return;
        }
        
        const qrResult = window.jsQR(imgData.data, img.width, img.height);
        if (qrResult && qrResult.data) {
          const imported = decodeMigrationUrl(qrResult.data);
          if (imported && imported.length > 0) {
            let addedCount = 0;
            imported.forEach(newAcc => {
              const exists = accounts.some(existing => 
                existing.secret === newAcc.secret && 
                existing.name.toLowerCase() === newAcc.name.toLowerCase()
              );
              if (!exists) {
                accounts.push({
                  id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                  issuer: newAcc.issuer,
                  name: newAcc.name,
                  secret: newAcc.secret
                });
                addedCount++;
              }
            });
            
            if (addedCount > 0) {
              window.api.saveAccounts(accounts).then(() => {
                renderAccounts();
                closeModal();
                showToast(`Imported ${addedCount} code(s) successfully!`);
              });
            } else {
              closeModal();
              showToast("Code(s) already exist in list.");
            }
          } else {
            addOptionError.textContent = "Failed to parse accounts from this QR code.";
          }
        } else {
          addOptionError.textContent = "No QR code found in the image. Try another photo.";
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset
  }
});

searchInput.addEventListener('input', () => {
  renderAccounts();
});

// Backup & Restore handlers (Transfer accounts)
backupBtn.addEventListener('click', async () => {
  restoreError.style.display = "none";
  
  const qrContent = document.getElementById('export-qr-content');
  const emptyMsg = document.getElementById('export-empty-msg');
  
  if (accounts.length > 0) {
    const migrationUrl = generateMigrationUrl(accounts);
    try {
      const qrDataUrl = await window.api.generateQRCode(migrationUrl);
      document.getElementById('backup-qr-img').src = qrDataUrl;
      saveQrBtn.href = qrDataUrl; // Set download link target
      qrContent.style.display = 'flex';
      emptyMsg.style.display = 'none';
    } catch (err) {
      console.error(err);
      showToast("Failed to generate transfer QR code.");
    }
  } else {
    document.getElementById('backup-qr-img').src = '';
    qrContent.style.display = 'none';
    emptyMsg.style.display = 'block';
  }
  
  backupModal.classList.add('active');
});

closeBackupBtn.addEventListener('click', () => {
  backupModal.classList.remove('active');
});

// Trigger file selector for restore
restoreSelectBtn.addEventListener('click', () => {
  restoreQrInput.click();
});

// Process restore image
restoreQrInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        
        if (typeof window.jsQR !== 'function') {
          restoreError.textContent = "Error: QR reader library not loaded yet.";
          restoreError.style.display = "block";
          return;
        }
        
        const qrResult = window.jsQR(imgData.data, img.width, img.height);
        if (qrResult && qrResult.data) {
          const imported = decodeMigrationUrl(qrResult.data);
          if (imported && imported.length > 0) {
            let addedCount = 0;
            imported.forEach(newAcc => {
              const exists = accounts.some(existing => 
                existing.secret === newAcc.secret && 
                existing.name.toLowerCase() === newAcc.name.toLowerCase()
              );
              if (!exists) {
                accounts.push({
                  id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                  issuer: newAcc.issuer,
                  name: newAcc.name,
                  secret: newAcc.secret
                });
                addedCount++;
              }
            });

            if (addedCount > 0) {
              window.api.saveAccounts(accounts).then(() => {
                renderAccounts();
                backupModal.classList.remove('active');
                showToast(`Imported ${addedCount} code(s) successfully!`);
              });
            } else {
              showToast("Code(s) already exist in list.");
              backupModal.classList.remove('active');
            }
          } else {
            restoreError.textContent = "Failed to import codes from this QR code.";
            restoreError.style.display = "block";
          }
        } else {
          restoreError.textContent = "No QR code found in the image. Try another photo.";
          restoreError.style.display = "block";
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset to trigger change again if same file selected
  }
});

// Helper to convert Uint8Array to Base32 string
function uint8ArrayToBase32(arr) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < arr.length; i++) {
    value = (value << 8) | arr[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

// Protobuf sub-message decoding
function decodeOtpParameters(buffer) {
  let offset = 0;
  
  function readVarint() {
    let result = 0;
    let shift = 0;
    while (true) {
      if (offset >= buffer.length) throw new Error("Malformed varint");
      const byte = buffer[offset++];
      result |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) break;
      shift += 7;
    }
    return result;
  }

  function readBytes() {
    const length = readVarint();
    if (offset + length > buffer.length) throw new Error("Malformed bytes length");
    const result = buffer.slice(offset, offset + length);
    offset += length;
    return result;
  }

  const param = {};
  
  while (offset < buffer.length) {
    const tag = readVarint();
    const wireType = tag & 0x7;
    const fieldNum = tag >> 3;
    
    if (fieldNum === 1 && wireType === 2) {
      param.secret = readBytes();
    } else if (fieldNum === 2 && wireType === 2) {
      param.name = new TextDecoder().decode(readBytes());
    } else if (fieldNum === 3 && wireType === 2) {
      param.issuer = new TextDecoder().decode(readBytes());
    } else {
      if (wireType === 0) {
        readVarint();
      } else if (wireType === 2) {
        readBytes();
      } else {
        throw new Error("Unsupported wire type " + wireType);
      }
    }
  }
  return param;
}

// Protobuf main message decoding
function decodeProtobuf(buffer) {
  let offset = 0;
  
  function readVarint() {
    let result = 0;
    let shift = 0;
    while (true) {
      if (offset >= buffer.length) throw new Error("Malformed varint");
      const byte = buffer[offset++];
      result |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) break;
      shift += 7;
    }
    return result;
  }

  function readBytes() {
    const length = readVarint();
    if (offset + length > buffer.length) throw new Error("Malformed bytes length");
    const result = buffer.slice(offset, offset + length);
    offset += length;
    return result;
  }

  const otpParameters = [];
  
  while (offset < buffer.length) {
    const tag = readVarint();
    const wireType = tag & 0x7;
    const fieldNum = tag >> 3;
    
    if (fieldNum === 1 && wireType === 2) {
      const paramBytes = readBytes();
      try {
        const param = decodeOtpParameters(paramBytes);
        if (param) otpParameters.push(param);
      } catch (e) {
        console.error("Failed to decode parameter", e);
      }
    } else {
      if (wireType === 0) {
        readVarint();
      } else if (wireType === 1) {
        offset += 8;
      } else if (wireType === 2) {
        readBytes();
      } else if (wireType === 5) {
        offset += 4;
      } else {
        throw new Error("Unsupported wire type " + wireType);
      }
    }
  }
  
  return otpParameters;
}

// Decode migration URI
function decodeMigrationUrl(url) {
  try {
    if (!url.startsWith('otpauth-migration://offline?data=')) {
      if (url.startsWith('otpauth://totp/')) {
        const parsed = new URL(url);
        const secret = parsed.searchParams.get('secret');
        if (!secret) return null;
        
        let label = decodeURIComponent(parsed.pathname.replace(/^\/\/totp\//, ''));
        let issuer = parsed.searchParams.get('issuer') || '';
        let name = label;
        
        if (label.includes(':')) {
          const parts = label.split(':');
          if (!issuer) issuer = parts[0].trim();
          name = parts[1].trim();
        }
        
        return [{
          issuer: issuer || 'Unknown',
          name: name || 'Account',
          secret: secret.toUpperCase()
        }];
      }
      return null;
    }
    
    // Robust query param extraction avoiding URLSearchParams "+" space conversion
    const match = url.match(/[?&]data=([^&]+)/);
    if (!match) return null;
    const dataBase64Encoded = match[1];
    const dataBase64 = decodeURIComponent(dataBase64Encoded);
    
    // Normalize and add padding if missing
    let base64 = dataBase64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Base64 decode to Uint8Array using browser native window.atob
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const params = decodeProtobuf(bytes);
    
    return params.map(p => ({
      issuer: p.issuer || 'Google Authenticator',
      name: p.name || 'Account',
      secret: uint8ArrayToBase32(p.secret)
    }));
  } catch (err) {
    console.error('Failed to decode migration/otpauth payload', err);
    return null;
  }
}

// Base32 string to Uint8Array conversion
function base32ToUint8Array(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = str.replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

// Protobuf serialization helpers
function writeVarint(value) {
  const bytes = [];
  while (value >= 0x80) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return new Uint8Array(bytes);
}

function writeBytes(fieldNum, valueBytes) {
  const tag = (fieldNum << 3) | 2;
  const tagBytes = writeVarint(tag);
  const lenBytes = writeVarint(valueBytes.length);
  const result = new Uint8Array(tagBytes.length + lenBytes.length + valueBytes.length);
  result.set(tagBytes, 0);
  result.set(lenBytes, tagBytes.length);
  result.set(valueBytes, tagBytes.length + lenBytes.length);
  return result;
}

function writeString(fieldNum, str) {
  const encoder = new TextEncoder();
  return writeBytes(fieldNum, encoder.encode(str));
}

function writeVarintField(fieldNum, value) {
  const tag = (fieldNum << 3) | 0;
  const tagBytes = writeVarint(tag);
  const valBytes = writeVarint(value);
  const result = new Uint8Array(tagBytes.length + valBytes.length);
  result.set(tagBytes, 0);
  result.set(valBytes, tagBytes.length);
  return result;
}

function encodeOtpParameters(acc) {
  const secretBytes = base32ToUint8Array(acc.secret);
  const secretField = writeBytes(1, secretBytes);
  const nameField = writeString(2, acc.name || 'Account');
  const issuerField = writeString(3, acc.issuer || '2FA');
  const algoField = writeVarintField(4, 1); // SHA1
  const digitsField = writeVarintField(5, 1); // 6 digits
  const typeField = writeVarintField(6, 2); // TOTP
  
  const totalLength = secretField.length + nameField.length + issuerField.length + algoField.length + digitsField.length + typeField.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  result.set(secretField, pos); pos += secretField.length;
  result.set(nameField, pos); pos += nameField.length;
  result.set(issuerField, pos); pos += issuerField.length;
  result.set(algoField, pos); pos += algoField.length;
  result.set(digitsField, pos); pos += digitsField.length;
  result.set(typeField, pos); pos += typeField.length;
  return result;
}

function encodeMigrationPayload(accountsList) {
  const paramFields = [];
  let totalParamsLength = 0;
  
  accountsList.forEach(acc => {
    const bytes = encodeOtpParameters(acc);
    const field = writeBytes(1, bytes);
    paramFields.push(field);
    totalParamsLength += field.length;
  });
  
  const versionField = writeVarintField(2, 1);
  const batchSizeField = writeVarintField(3, 1);
  const batchIndexField = writeVarintField(4, 0);
  
  const totalLength = totalParamsLength + versionField.length + batchSizeField.length + batchIndexField.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  
  paramFields.forEach(field => {
    result.set(field, pos);
    pos += field.length;
  });
  
  result.set(versionField, pos); pos += versionField.length;
  result.set(batchSizeField, pos); pos += batchSizeField.length;
  result.set(batchIndexField, pos); pos += batchIndexField.length;
  
  return result;
}

function uint8ArrayToBase64(arr) {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return window.btoa(binary);
}

function generateMigrationUrl(accountsList) {
  const payloadBytes = encodeMigrationPayload(accountsList);
  const base64 = uint8ArrayToBase64(payloadBytes);
  return 'otpauth-migration://offline?data=' + encodeURIComponent(base64);
}

// Run app init
init();
