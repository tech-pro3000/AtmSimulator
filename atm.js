// Default settings used if no external config is provided
const defaultConfig = {
      bank_name: 'NEXUS BANK',
      welcome_message: 'Welcome to Nexus Bank ATM',
      atm_id: 'ATM-001'
    };

    let config = { ...defaultConfig };

    // Sample accounts for transfer validation (shorter account numbers)
    // Demo accounts (10 digits) to validate transfer input
    const validAccounts = [
      { accountNumber: '1234567890', name: 'John Smith', bank: 'NEXUS BANK' },
      { accountNumber: '9876543210', name: 'Sarah Johnson', bank: 'NEXUS BANK' },
      { accountNumber: '5555444433', name: 'Michael Brown', bank: 'NEXUS BANK' },
      { accountNumber: '1111222233', name: 'Emma Davis', bank: 'NEXUS BANK' }
    ];

    // Nigerian bank groups (A–G, H–L, M–O, P–S, T–V, W–Z)
    const bankGroups = {
      'A - G': [
        'Access Bank PLC',
        'Alpha Morgan Bank Limited',
        'Citibank Nigeria Limited',
        'Ecobank Nigeria PLC',
        'Fidelity Bank PLC',
        'First Bank of Nigeria Limited',
        'First City Monument Bank (FCMB) PLC',
        'Globus Bank Limited',
        'Guaranty Trust Bank (GTBank) PLC'
      ],
      'H - L': [
        'Jaiz Bank PLC',
        'Keystone Bank Limited',
        'Lotus Bank Limited'
      ],
      'M - O': [
        'Nova Bank Limited (Formerly Nova Merchant Bank)',
        'Optimus Bank Limited'
      ],
      'P - S': [
        'Parallex Bank Limited',
        'Polaris Bank PLC',
        'PremiumTrust Bank',
        'Providus Bank PLC',
        'Signature Bank Limited',
        'Stanbic IBTC Bank PLC',
        'Standard Chartered Bank Nigeria Limited',
        'Sterling Bank PLC',
        'Summit Bank Limited',
        'SunTrust Bank Nigeria Limited'
      ],
      'T - V': [
        'Taj Bank Limited',
        'Tatum Bank Limited',
        'Titan Trust Bank Limited',
        'Union Bank of Nigeria PLC',
        'United Bank for Africa (UBA) PLC',
        'Unity Bank PLC'
      ],
      'W - Z': [
        'Wema Bank PLC',
        'Zenith Bank PLC'
      ]
    };

    // Generate random card
    function generateRandomCard() {
      const cards = [
        { bgColor: '#d4af37', borderColor: '#b8941e', textColor: '#333333', name: 'Gold', cardNumber: '****5678' },
        { bgColor: '#c0c0c0', borderColor: '#808080', textColor: '#333333', name: 'Silver', cardNumber: '****9012' },
        { bgColor: '#cd7f32', borderColor: '#8b4513', textColor: '#ffffff', name: 'Bronze', cardNumber: '****3456' },
        { bgColor: '#00d9ff', borderColor: '#0088cc', textColor: '#000033', name: 'Platinum', cardNumber: '****7890' },
        { bgColor: '#ff1493', borderColor: '#c71585', textColor: '#ffffff', name: 'Titanium', cardNumber: '****2341' }
      ];
      return cards[Math.floor(Math.random() * cards.length)];
    }

    // Generate random PIN
    function generateRandomPIN() {
      return String(Math.floor(Math.random() * 9000) + 1000);
    }

    const randomCard = generateRandomCard();
    const randomPIN = generateRandomPIN();

    // Main application state (controls screen flow and data)
    let state = {
      screen: 'welcome',
      cardInserted: false,
      pin: randomPIN,
      cardType: randomCard,
      enteredPin: '',
      inputValue: '',
      // Demo balance set to ₦100,000
      balance: 100000,
      transactions: [
        { type: 'Withdrawal', amount: 5000, date: '2024-01-15', time: '14:30' },
        { type: 'Deposit', amount: 20000, date: '2024-01-14', time: '10:15' },
        { type: 'Transfer', amount: 3500, date: '2024-01-12', time: '16:45' }
      ],
      attemptsPIN: 0,
      attemptsOldPin: 0,
      newPinCandidate: '',
      statementDays: null,
      statementRange: { from: '', to: '' },
          transferData: { account: '', name: '', amount: '', charges: 0, bankGroup: '', bankName: '' },
          bankPage: 0,
      lastReceipt: null,
      navIndex: 0
    };

    // Optional: integrate with the editor SDK if available
    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange: async (newConfig) => {
          config = { ...defaultConfig, ...newConfig };
          document.getElementById('bank-name').textContent = config.bank_name || defaultConfig.bank_name;
          render();
        },
        mapToCapabilities: () => ({
          recolorables: [],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: () => new Map([
          ['bank_name', config.bank_name || defaultConfig.bank_name],
          ['welcome_message', config.welcome_message || defaultConfig.welcome_message],
          ['atm_id', config.atm_id || defaultConfig.atm_id]
        ])
      });
    }

    // Apply card styling
    // Apply the selected card style to the DOM
    function applyCardStyle() {
      const card = document.getElementById('physical-card');
      const typeLabel = document.getElementById('card-type-label');
      const cardNumber = document.getElementById('card-number');
      const pinDisplay = document.getElementById('card-pin-display');
      
      card.style.background = `linear-gradient(135deg, ${state.cardType.bgColor} 0%, ${state.cardType.bgColor}dd 50%, ${state.cardType.bgColor} 100%)`;
      card.style.borderColor = state.cardType.borderColor;
      typeLabel.style.color = state.cardType.textColor;
      cardNumber.style.color = state.cardType.textColor;
      pinDisplay.style.color = state.cardType.textColor;
      
      const labels = document.querySelectorAll('.text-xs.font-semibold');
      labels.forEach(label => {
        label.style.color = state.cardType.textColor;
      });
    }

    // Format money consistently for display
    // Format amounts in Nigerian Naira
    function formatMoney(amount) {
      return '₦' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    let errorRedirectTimer = null;

    function showError(message, nextScreen = null, delayMs = null) {
      state.errorMsg = message;
      state.screen = 'error';
      render();

      if (errorRedirectTimer) {
        clearTimeout(errorRedirectTimer);
        errorRedirectTimer = null;
      }

      if (nextScreen && delayMs) {
        errorRedirectTimer = setTimeout(() => {
          state.screen = nextScreen;
          render();
          errorRedirectTimer = null;
        }, delayMs);
      }
    }

    function submitStatementRange() {
      const fromInput = document.getElementById('statement-from');
      const toInput = document.getElementById('statement-to');
      const from = fromInput ? fromInput.value : '';
      const to = toInput ? toInput.value : '';

      if (!from || !to) {
        showError('Select both start and end dates.', 'another-transaction', 1500);
        return;
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        showError('Enter a valid date range.', 'another-transaction', 1500);
        return;
      }

      if (fromDate > toDate) {
        showError('Start date must be before end date.', 'another-transaction', 1500);
        return;
      }

      state.statementRange = { from, to };
      state.screen = 'statement';
      render();
    }

    // Handle quick withdrawal option selection
    function selectWithdrawAmount(amount) {
      if (amount === 'other') {
        state.inputValue = '';
        state.screen = 'input-withdraw';
        render();
        return;
      }

      if (amount > 50000) {
        showError('You can only withdraw ₦50,000 at a time.', 'another-transaction', 1800);
        return;
      }

      if (amount <= state.balance) {
        processTransaction('withdraw', amount);
        return;
      }

      showError('Insufficient funds. Please perform another transaction.', 'another-transaction', 1800);
    }

    // Store selected bank group and move to amount input
    function selectBankGroup(groupLabel) {
      state.transferData.bankGroup = groupLabel;
      state.transferData.bankName = '';
      state.bankPage = 0;
      state.screen = 'input-transfer-bank-list';
      render();
    }

    function changeBankPage(delta) {
      const list = bankGroups[state.transferData.bankGroup] || [];
      // Show 5 banks per page and reserve the 6th tile for Next (when available)
      const pageCount = Math.max(1, Math.ceil(list.length / 5));
      const nextPage = Math.min(pageCount - 1, Math.max(0, state.bankPage + delta));
      state.bankPage = nextPage;
      render();
    }

    // Store selected bank name and move to amount input
    function selectBankName(bankName) {
      state.transferData.bankName = bankName;
      state.inputValue = '';
      state.screen = 'input-transfer-amount';
      render();
    }

    function getNavigableElements() {
      return Array.from(document.querySelectorAll('#screen-content .nav-option, #screen-content .menu-item'));
    }

    function setupNavigation() {
      const items = getNavigableElements();
      if (items.length === 0) {
        state.navIndex = 0;
        return;
      }

      if (state.navIndex >= items.length || state.navIndex < 0) {
        state.navIndex = 0;
      }

      items.forEach(el => el.classList.remove('active'));
      items[state.navIndex].classList.add('active');
    }

    function moveNavigation(direction) {
      const items = getNavigableElements();
      if (items.length === 0) return;

      const active = items[state.navIndex];
      const inMenuGrid = active && active.closest && active.closest('.menu-grid');
      const step = inMenuGrid ? 2 : 1;
      let nextIndex = state.navIndex;

      if (direction === 'ArrowLeft') nextIndex -= 1;
      if (direction === 'ArrowRight') nextIndex += 1;
      if (direction === 'ArrowUp') nextIndex -= step;
      if (direction === 'ArrowDown') nextIndex += step;

      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex >= items.length) nextIndex = items.length - 1;

      items.forEach(el => el.classList.remove('active'));
      items[nextIndex].classList.add('active');
      state.navIndex = nextIndex;
    }

    function activateNavigation() {
      const items = getNavigableElements();
      if (items.length === 0) return false;
      const active = items[state.navIndex];
      if (!active) return false;
      active.click();
      return true;
    }

    function syncPanelSizes() {
      const screen = document.querySelector('.atm-screen');
      const keypadPanel = document.querySelector('.keypad-panel');
      const card = document.getElementById('physical-card');
      const cardStack = document.querySelector('.card-stack');
      const slot = document.querySelector('.card-slot');
      if (!screen || !keypadPanel || !card || !cardStack) return;

      const rect = screen.getBoundingClientRect();
      const totalHeight = rect.height;
      const keypadHeight = Math.max(180, Math.floor(totalHeight * 0.6));
      const cardAreaHeight = Math.max(120, totalHeight - keypadHeight);

      keypadPanel.style.height = keypadHeight + 'px';
      keypadPanel.style.width = rect.width + 'px';
      cardStack.style.height = cardAreaHeight + 'px';
      cardStack.style.width = rect.width + 'px';
      card.style.width = rect.width + 'px';
      card.style.height = Math.max(0, cardAreaHeight - 28) + 'px';
      if (slot) {
        slot.style.width = rect.width + 'px';
      }
    }

    // Handle the physical card being inserted
    function insertCard() {
      if (state.screen === 'welcome' && !state.cardInserted) {
        state.cardInserted = true;
        state.screen = 'card-reading';
        
        // Fade out card
        const card = document.getElementById('physical-card');
        card.classList.add('card-fade-out');

        const indicator = document.getElementById('card-indicator');
        indicator.classList.add('card-indicator-loading');
        
        render();
        setTimeout(() => {
          state.screen = 'pin-entry';
          indicator.classList.remove('card-indicator-loading');
          render();
        }, 1500);
      }
    }

    // Handle keypad input
    // Capture numeric keypad input for PIN and amount entry screens
    function keyPress(key) {
      if (state.screen === 'pin-entry' && state.enteredPin.length < 4) {
        state.enteredPin += key;
        render();
      } else if (state.screen.includes('input-') && state.inputValue.length < 15) {
        state.inputValue += key;
        render();
      }
    }

    // Clear current input
    // Clear the full input field (like the CLEAR key on the keypad)
    function handleClear() {
      if (state.screen === 'pin-entry') {
        state.enteredPin = '';
      } else if (state.screen.includes('input-')) {
        state.inputValue = '';
      }
      render();
    }

    // Delete a single digit (mapped to Shift key)
    function handleDeleteOne() {
      if (state.screen === 'pin-entry') {
        state.enteredPin = state.enteredPin.slice(0, -1);
        render();
        return;
      }
      if (state.screen.includes('input-')) {
        state.inputValue = state.inputValue.slice(0, -1);
        render();
      }
    }

    // Advance the flow based on the current screen
    function handleEnter() {
      if (state.screen === 'pin-entry') {
        if (state.enteredPin === state.pin) {
          state.attemptsPIN = 0;
          state.enteredPin = '';
          state.screen = 'verifying';
          render();
          setTimeout(() => {
            state.screen = 'menu';
            render();
          }, 1200);
        } else {
          state.attemptsPIN++;
          if (state.attemptsPIN >= 3) {
            state.screen = 'card-blocked';
          } else {
            state.enteredPin = '';
          }
          render();
        }
      } else if (state.screen === 'input-withdraw') {
        const amount = parseInt(state.inputValue);
        if (amount > 0) {
          if (amount > 50000) {
            // Enforce ATM withdrawal limit per transaction
            showError('You can only withdraw ₦50,000 at a time.', 'another-transaction', 1800);
          } else if (amount <= state.balance) {
            processTransaction('withdraw', amount);
          } else {
            showError('Insufficient funds. Please perform another transaction.', 'another-transaction', 1800);
          }
        } else {
          showError('Enter a valid amount.', 'another-transaction', 1500);
        }
      } else if (state.screen === 'input-deposit') {
        const amount = parseInt(state.inputValue);
        if (amount > 0 && amount <= 50000) {
          processTransaction('deposit', amount);
        } else {
          state.screen = 'error';
          state.errorMsg = 'Invalid deposit amount.';
        }
        render();
      } else if (state.screen === 'input-transfer-account') {
        const account = validAccounts.find(a => a.accountNumber === state.inputValue);
        if (account) {
          state.transferData.account = account.accountNumber;
          state.transferData.name = account.name;
          state.inputValue = '';
          state.screen = 'input-transfer-bank';
          render();
        } else {
          state.screen = 'error';
          state.errorMsg = 'Invalid account number. Try: 1234567890, 9876543210, 5555444433, or 1111222233';
        }
        render();
      } else if (state.screen === 'input-transfer-amount') {
        const amount = parseInt(state.inputValue);
        if (amount > 0 && amount <= state.balance) {
          state.transferData.amount = amount;
          state.transferData.charges = Math.ceil(amount * 0.01);
          state.screen = 'transfer-confirm';
          render();
        } else {
          state.screen = 'error';
          state.errorMsg = 'Invalid transfer amount.';
        }
        render();
      } else if (state.screen === 'input-old-pin') {
        if (state.inputValue.length === 4) {
          if (state.inputValue === state.pin) {
            state.attemptsOldPin = 0;
            state.inputValue = '';
            state.screen = 'input-new-pin';
          } else {
            state.attemptsOldPin++;
            state.inputValue = '';
            if (state.attemptsOldPin >= 3) {
              state.screen = 'error';
              state.errorMsg = 'Old PIN verification failed. Transaction canceled.';
              state.attemptsOldPin = 0;
            }
          }
        }
        render();
      } else if (state.screen === 'input-new-pin') {
        if (state.inputValue.length === 4 && /^\d+$/.test(state.inputValue)) {
          state.newPinCandidate = state.inputValue;
          state.inputValue = '';
          state.screen = 'input-confirm-pin';
          render();
        } else {
          state.screen = 'error';
          state.errorMsg = 'PIN must be 4 digits.';
          render();
        }
      } else if (state.screen === 'input-confirm-pin') {
        if (state.inputValue.length === 4 && /^\d+$/.test(state.inputValue)) {
          if (state.inputValue === state.newPinCandidate) {
            state.pin = state.newPinCandidate;
            document.getElementById('card-pin-display').textContent = state.pin;
            state.newPinCandidate = '';
            state.inputValue = '';
            state.screen = 'pin-change-success';
            render();
            setTimeout(() => {
              state.screen = 'another-transaction';
              render();
            }, 1400);
          } else {
            state.newPinCandidate = '';
            state.inputValue = '';
            state.screen = 'input-new-pin';
            render();
          }
        } else {
          state.screen = 'error';
          state.errorMsg = 'PIN must be 4 digits.';
          render();
        }
      } else if (state.screen === 'input-statement-duration') {
        submitStatementRange();
      }
    }

    // Cancel current flow and return to a safe screen
    function handleCancel() {
      if (state.screen === 'menu') {
        removeCard();
        return;
      }
      if (state.screen === 'pin-entry') {
        removeCard();
        return;
      }
      if (state.screen.includes('input-') || state.screen === 'balance' || state.screen === 'statement' || state.screen === 'transfer-confirm' || state.screen === 'withdraw-menu' || state.screen === 'input-transfer-bank-list' || state.screen === 'error' || state.screen === 'pin-change-success') {
        state.inputValue = '';
        state.screen = 'another-transaction';
        render();
        return;
      }
      state.screen = 'menu';
      state.inputValue = '';
      render();
    }

    // Apply transaction effects and generate a receipt
    function processTransaction(type, amount) {
      state.screen = 'processing';
      render();
      
      setTimeout(() => {
        if (type === 'withdraw') {
          state.balance -= amount;
          state.lastReceipt = {
            type: 'Withdrawal',
            amount: amount,
            balance: state.balance,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          };
          state.transactions.unshift(state.lastReceipt);
        } else if (type === 'deposit') {
          state.balance += amount;
          state.lastReceipt = {
            type: 'Deposit',
            amount: amount,
            balance: state.balance,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          };
          state.transactions.unshift(state.lastReceipt);
        } else if (type === 'transfer') {
          const total = state.transferData.amount + state.transferData.charges;
          state.balance -= total;
          state.lastReceipt = {
            type: 'Transfer',
            toAccount: state.transferData.account,
            toName: state.transferData.name,
            bankGroup: state.transferData.bankGroup,
            bankName: state.transferData.bankName,
            amount: state.transferData.amount,
            charges: state.transferData.charges,
            total: total,
            balance: state.balance,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          };
          state.transactions.unshift(state.lastReceipt);
        }
        
        state.inputValue = '';
        state.screen = 'success';
        render();
      }, 2000);
    }

    // Confirm transfer flow
    function confirmTransfer() {
      processTransaction('transfer', state.transferData.amount);
    }

    // Reject transfer flow
    function rejectTransfer() {
      state.transferData = { account: '', name: '', amount: '', charges: 0, bankGroup: '', bankName: '' };
      state.inputValue = '';
      state.screen = 'another-transaction';
      render();
    }

    // Return to PIN entry for another session step
    function continueTransaction() {
      state.enteredPin = '';
      state.screen = 'pin-entry';
      render();
    }

    // End the session and reset card state
    function endSession() {
      removeCard();
    }

    // Reset to a clean welcome state and generate a new demo card
    function removeCard() {
      const card = document.getElementById('physical-card');
      const indicator = document.getElementById('card-indicator');
      
      // Fade out card
      card.classList.add('card-fade-out');
      indicator.classList.remove('card-indicator-loading');
      indicator.style.transform = 'translateX(-100%)';
      
      setTimeout(() => {
        const newCard = generateRandomCard();
        const newPIN = generateRandomPIN();
        
        state = {
          screen: 'welcome',
          cardInserted: false,
          pin: newPIN,
          cardType: newCard,
          enteredPin: '',
          inputValue: '',
          balance: state.balance,
          transactions: state.transactions,
          attemptsPIN: 0,
          attemptsOldPin: 0,
          newPinCandidate: '',
          statementDays: null,
          statementRange: { from: '', to: '' },
      transferData: { account: '', name: '', amount: '', charges: 0, bankGroup: '', bankName: '' },
      bankPage: 0,
          lastReceipt: null,
          navIndex: 0
        };
        
        render();
        
        // Fade in new card
        setTimeout(() => {
          card.classList.remove('card-fade-out');
          card.classList.add('card-fade-in');
          applyCardStyle();
          
          setTimeout(() => {
            card.classList.remove('card-fade-in');
          }, 800);
        }, 100);
      }, 800);
    }

    // Build and show receipt modal
    function showReceipt() {
      if (!state.lastReceipt) return;
      
      let html = '<div class="receipt-title">' + config.bank_name + '</div>';
      html += '<div class="receipt-divider"></div>';
      
      if (state.lastReceipt.type === 'Withdrawal') {
        html += '<div class="receipt-line"><span>CASH WITHDRAWAL</span></div>';
        html += '<div class="receipt-line"><span>Amount:</span><span>' + formatMoney(state.lastReceipt.amount) + '</span></div>';
        html += '<div class="receipt-line"><span>Balance:</span><span>' + formatMoney(state.lastReceipt.balance) + '</span></div>';
      } else if (state.lastReceipt.type === 'Deposit') {
        html += '<div class="receipt-line"><span>DEPOSIT</span></div>';
        html += '<div class="receipt-line"><span>Amount:</span><span>' + formatMoney(state.lastReceipt.amount) + '</span></div>';
        html += '<div class="receipt-line"><span>Balance:</span><span>' + formatMoney(state.lastReceipt.balance) + '</span></div>';
      } else if (state.lastReceipt.type === 'Transfer') {
        html += '<div class="receipt-line"><span>FUNDS TRANSFER</span></div>';
        html += '<div class="receipt-line"><span>To:</span><span>' + state.lastReceipt.toName + '</span></div>';
        html += '<div class="receipt-line"><span>Account:</span><span>****' + state.lastReceipt.toAccount.slice(-4) + '</span></div>';
        html += '<div class="receipt-line"><span>Bank:</span><span>' + (state.lastReceipt.bankName || state.lastReceipt.bankGroup || '-') + '</span></div>';
        html += '<div class="receipt-line"><span>Amount:</span><span>' + formatMoney(state.lastReceipt.amount) + '</span></div>';
        html += '<div class="receipt-line"><span>Charges:</span><span>' + formatMoney(state.lastReceipt.charges) + '</span></div>';
        html += '<div class="receipt-line"><span>Total:</span><span><b>' + formatMoney(state.lastReceipt.total) + '</b></span></div>';
        html += '<div class="receipt-line"><span>Balance:</span><span>' + formatMoney(state.lastReceipt.balance) + '</span></div>';
      } else if (state.lastReceipt.type === 'PIN Change') {
        html += '<div class="receipt-line"><span>PIN CHANGED</span></div>';
        html += '<div class="receipt-line"><span>New PIN:</span><span>****</span></div>';
      }
      
      html += '<div class="receipt-divider"></div>';
      html += '<div class="receipt-line"><span>' + state.lastReceipt.date + '</span><span>' + state.lastReceipt.time + '</span></div>';
      html += '<div class="receipt-title">Thank You!</div>';
      
      document.getElementById('receipt-content').innerHTML = html;
      document.getElementById('receipt-modal').classList.remove('hidden');
    }

    // Hide receipt modal
    function closeReceipt() {
      document.getElementById('receipt-modal').classList.add('hidden');
    }

    // Print (browser) then close the receipt modal
    function printAndClose() {
      window.print();
      closeReceipt();
    }

    // Keyboard shortcuts map to keypad actions
    function handleKeydown(event) {
      const key = event.key;
      // Arrow keys move focus across menu / button options
      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        event.preventDefault();
        moveNavigation(key);
        return;
      }

      // Enter key triggers the highlighted option like clicking ENTER on the keypad
      if (key === 'Enter' && !state.screen.includes('input-')) {
        if (activateNavigation()) {
          event.preventDefault();
          return;
        }
      }

      if (key >= '0' && key <= '9') {
        event.preventDefault();
        keyPress(key);
        return;
      }

      // Backspace cancels the current flow (mapped to ATM CANCEL)
      if (key === 'Backspace') {
        event.preventDefault();
        handleCancel();
        return;
      }

      // Shift deletes one digit at a time (like a single-step backspace)
      if (key === 'Shift') {
        event.preventDefault();
        handleDeleteOne();
        return;
      }

      if (key === 'Enter') {
        event.preventDefault();
        handleEnter();
        return;
      }

      if (key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        handleClear();
      }
    }

    // Render the current screen state into the display area
    function render() {
      const content = document.getElementById('screen-content');
      
      switch(state.screen) {
        case 'welcome':
          content.innerHTML = `
            <div class="slide-in text-center pt-20">
              <div class="text-6xl mb-4">🏧</div>
              <h2 class="text-3xl glow-text mb-2">${config.welcome_message || defaultConfig.welcome_message}</h2>
              <div class="text-sm text-cyan-300 mt-8 mb-8">
                <p class="pulse-glow">↓ TAP CARD TO BEGIN ↓</p>
              </div>
              <div class="text-xs text-cyan-600 mt-12">
                <p>ATM ID: ${config.atm_id || defaultConfig.atm_id}</p>
                <p class="mt-2">Card Type: ${state.cardType.name}</p>
                <p class="mt-2">Demo PIN: ${state.pin}</p>
              </div>
            </div>
          `;
          break;
          
        case 'card-reading':
          content.innerHTML = `
            <div class="slide-in text-center pt-24">
              <div class="text-4xl mb-4">💳</div>
              <h2 class="text-2xl glow-text mb-4">Reading Card...</h2>
              <div class="flex justify-center gap-2 mt-8">
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              </div>
            </div>
          `;
          break;
          
        case 'pin-entry':
          const masked = '●'.repeat(state.enteredPin.length) + '○'.repeat(4 - state.enteredPin.length);
          content.innerHTML = `
            <div class="slide-in text-center pt-16">
              <h2 class="text-2xl glow-text mb-8">🔐 ENTER PIN</h2>
              <div class="bg-slate-900/50 rounded-lg p-8 mb-8 border-2 border-cyan-600">
                <div class="text-4xl tracking-widest font-bold text-emerald-400">${masked}</div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Use keypad to enter 4-digit PIN</div>
              <div class="text-xs text-cyan-600">Demo PIN: ${state.pin}</div>
              ${state.attemptsPIN > 0 ? `<div class="text-xs text-red-400 mt-2">Attempts: ${3 - state.attemptsPIN} remaining</div>` : ''}
            </div>
          `;
          break;
          
        case 'card-blocked':
          content.innerHTML = `
            <div class="slide-in text-center pt-24">
              <div class="text-5xl mb-4">🚫</div>
              <h2 class="text-2xl text-red-400 mb-4">CARD BLOCKED</h2>
              <p class="text-sm text-cyan-300">Too many incorrect PIN attempts.</p>
              <p class="text-xs text-cyan-600 mt-4">Please contact your bank.</p>
              <button onclick="removeCard()" class="mt-8 bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition">Remove Card</button>
            </div>
          `;
          break;
          
        case 'menu':
          content.innerHTML = `
            <div class="slide-in">
              <h2 class="text-2xl glow-text text-center mb-6">📋 SELECT SERVICE</h2>
              <div class="menu-grid">
                <div class="menu-item nav-option" onclick="state.screen='withdraw-menu'; state.inputValue=''; render();">
                  <div class="menu-icon">💵</div>
                  <div class="menu-label">Withdrawal</div>
                </div>
                <div class="menu-item nav-option" onclick="state.screen='input-deposit'; state.inputValue=''; render();">
                  <div class="menu-icon">📥</div>
                  <div class="menu-label">Deposit</div>
                </div>
                <div class="menu-item nav-option" onclick="state.screen='balance'; render();">
                  <div class="menu-icon">💰</div>
                  <div class="menu-label">Balance</div>
                </div>
                <div class="menu-item nav-option" onclick="state.screen='input-transfer-account'; state.inputValue=''; render();">
                  <div class="menu-icon">🏦</div>
                  <div class="menu-label">Transfer</div>
                </div>
                <div class="menu-item nav-option" onclick="state.screen='input-old-pin'; state.inputValue=''; render();">
                  <div class="menu-icon">🔑</div>
                  <div class="menu-label">Change PIN</div>
                </div>
                <div class="menu-item nav-option" onclick="state.screen='input-statement-duration'; state.inputValue=''; render();">
                  <div class="menu-icon">📜</div>
                  <div class="menu-label">Mini Statement</div>
                </div>
              </div>
            </div>
          `;
          break;
          
        case 'balance':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <div class="text-4xl mb-4">💰</div>
              <h2 class="text-2xl glow-text mb-8">AVAILABLE BALANCE</h2>
              <div class="bg-slate-900/50 rounded-lg p-8 mb-8 border-2 border-emerald-500">
                <div class="text-4xl font-bold text-emerald-400">${formatMoney(state.balance)}</div>
              </div>
              <button onclick="showReceipt()" class="nav-option bg-emerald-600 text-white px-6 py-2 rounded-lg mb-4 hover:bg-emerald-700 transition">🖨️ Print Receipt</button>
              <button onclick="state.screen='another-transaction'; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;
          
        case 'input-withdraw':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">💵 WITHDRAW AMOUNT</h2>
              <div class="text-xs text-cyan-600 mb-4">Balance: ${formatMoney(state.balance)}</div>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600">
                <div class="text-3xl font-bold text-emerald-400">${state.inputValue ? '₦' + state.inputValue : '₦0'}</div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Maximum per transaction: ₦50,000</div>
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;
        
        case 'withdraw-menu':
          content.innerHTML = `
            <div class="slide-in">
              <h2 class="text-2xl glow-text text-center mb-6">💵 WITHDRAWAL OPTIONS</h2>
              <div class="text-xs text-cyan-300 text-center mb-4">Select a quick amount or choose other</div>
              <div class="menu-grid">
                <div class="menu-item nav-option" onclick="selectWithdrawAmount(20000)">
                  <div class="menu-icon">₦</div>
                  <div class="menu-label">20,000</div>
                </div>
                <div class="menu-item nav-option" onclick="selectWithdrawAmount(10000)">
                  <div class="menu-icon">₦</div>
                  <div class="menu-label">10,000</div>
                </div>
                <div class="menu-item nav-option" onclick="selectWithdrawAmount(5000)">
                  <div class="menu-icon">₦</div>
                  <div class="menu-label">5,000</div>
                </div>
                <div class="menu-item nav-option" onclick="selectWithdrawAmount(1000)">
                  <div class="menu-icon">₦</div>
                  <div class="menu-label">1,000</div>
                </div>
                <div class="menu-item nav-option" onclick="selectWithdrawAmount(2000)">
                  <div class="menu-icon">₦</div>
                  <div class="menu-label">2,000</div>
                </div>
                <div class="menu-item nav-option" onclick="selectWithdrawAmount('other')">
                  <div class="menu-icon">✍️</div>
                  <div class="menu-label">Other Amount</div>
                </div>
              </div>
              <div class="text-xs text-cyan-600 text-center mt-4">Max per transaction: ₦50,000</div>
            </div>
          `;
          break;
          
        case 'input-deposit':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">📥 DEPOSIT AMOUNT</h2>
              <div class="text-xs text-cyan-600 mb-4">Current Balance: ${formatMoney(state.balance)}</div>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600">
                <div class="text-3xl font-bold text-emerald-400">${state.inputValue ? '₦' + state.inputValue : '₦0'}</div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Enter amount (max ₦50,000)</div>
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;
          
        case 'input-transfer-account':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">🏦 RECIPIENT ACCOUNT</h2>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600">
                <div class="text-2xl font-bold text-cyan-300">${state.inputValue || 'Enter account number'}</div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Enter 10-digit account number</div>
              <div class="text-xs text-cyan-600 bg-slate-900/30 p-3 rounded mb-4">
                <p>Test accounts:</p>
                <p>1234567890 - John Smith</p>
                <p>9876543210 - Sarah Johnson</p>
                <p>5555444433 - Michael Brown</p>
                <p>1111222233 - Emma Davis</p>
              </div>
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;

        case 'input-transfer-bank':
          content.innerHTML = `
            <div class="slide-in">
              <h2 class="text-2xl glow-text text-center mb-6">🏦 SELECT BANK</h2>
              <div class="text-xs text-cyan-300 text-center mb-4">Choose recipient bank group</div>
              <div class="menu-grid">
                <div class="menu-item nav-option" onclick="selectBankGroup('A - G')">
                  <div class="menu-icon">🏦</div>
                  <div class="menu-label">A - G</div>
                </div>
                <div class="menu-item nav-option" onclick="selectBankGroup('H - L')">
                  <div class="menu-icon">🏦</div>
                  <div class="menu-label">H - L</div>
                </div>
                <div class="menu-item nav-option" onclick="selectBankGroup('M - O')">
                  <div class="menu-icon">🏦</div>
                  <div class="menu-label">M - O</div>
                </div>
                <div class="menu-item nav-option" onclick="selectBankGroup('P - S')">
                  <div class="menu-icon">🏦</div>
                  <div class="menu-label">P - S</div>
                </div>
                <div class="menu-item nav-option" onclick="selectBankGroup('T - V')">
                  <div class="menu-icon">🏦</div>
                  <div class="menu-label">T - V</div>
                </div>
                <div class="menu-item nav-option" onclick="selectBankGroup('W - Z')">
                  <div class="menu-icon">🏦</div>
                  <div class="menu-label">W - Z</div>
                </div>
              </div>
              <div class="flex justify-center mt-4">
                <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
              </div>
            </div>
          `;
          break;

        case 'input-transfer-bank-list':
          const bankList = bankGroups[state.transferData.bankGroup] || [];
          const pageCount = Math.max(1, Math.ceil(bankList.length / 5));
          const currentPage = Math.min(pageCount - 1, Math.max(0, state.bankPage));
          const startIndex = currentPage * 5;
          const pageItems = bankList.slice(startIndex, startIndex + 5);
          const hasNextPage = currentPage < pageCount - 1;
          content.innerHTML = `
            <div class="slide-in">
              <h2 class="text-2xl glow-text text-center mb-4">🏦 SELECT BANK</h2>
              <div class="text-xs text-cyan-300 text-center mb-4">Group: ${state.transferData.bankGroup || '-'}</div>
              <div class="menu-grid">
                ${pageItems.map(bank => `
                  <div class="menu-item nav-option" onclick="selectBankName('${bank.replace(/'/g, "\\'")}')">
                    <div class="menu-icon">🏦</div>
                    <div class="menu-label">${bank}</div>
                  </div>
                `).join('')}
                ${hasNextPage ? `
                  <div class="menu-item nav-option" onclick="changeBankPage(1)">
                    <div class="menu-icon">➡️</div>
                    <div class="menu-label">Next Page</div>
                  </div>
                ` : ''}
              </div>
              <div class="flex gap-3 justify-center mt-4">
                <button onclick="state.screen='input-transfer-bank'; render();" class="nav-option bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-500 transition">Back</button>
                <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
              </div>
              <div class="text-xs text-cyan-500 text-center mt-2">Page ${currentPage + 1} of ${pageCount}</div>
            </div>
          `;
          break;
          
        case 'input-transfer-amount':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">💸 TRANSFER AMOUNT</h2>
              <div class="text-xs text-cyan-300 mb-1">To: ${state.transferData.name}</div>
              <div class="text-xs text-cyan-300 mb-4">Bank: ${state.transferData.bankName || state.transferData.bankGroup || '-'}</div>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600">
                <div class="text-3xl font-bold text-emerald-400">${state.inputValue ? '₦' + state.inputValue : '₦0'}</div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Max: ${formatMoney(state.balance)}</div>
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;
          
        case 'transfer-confirm':
          const totalTransfer = state.transferData.amount + state.transferData.charges;
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-6">📋 CONFIRM TRANSFER</h2>
              <div class="bg-slate-900/50 rounded-lg p-4 mb-6 text-left text-sm text-cyan-300 space-y-2">
                <div class="flex justify-between"><span>Recipient:</span><span class="font-bold">${state.transferData.name}</span></div>
                <div class="flex justify-between"><span>Account:</span><span>****${state.transferData.account.slice(-4)}</span></div>
                <div class="flex justify-between"><span>Bank:</span><span>${state.transferData.bankName || state.transferData.bankGroup || '-'}</span></div>
                <div class="border-t border-cyan-600 pt-2 mt-2"></div>
                <div class="flex justify-between"><span>Amount:</span><span>${formatMoney(state.transferData.amount)}</span></div>
                <div class="flex justify-between"><span>Charges:</span><span>${formatMoney(state.transferData.charges)}</span></div>
                <div class="border-t border-cyan-600 pt-2 mt-2"></div>
                <div class="flex justify-between text-lg font-bold text-emerald-400"><span>Total:</span><span>${formatMoney(totalTransfer)}</span></div>
              </div>
              <div class="flex gap-4">
                <button onclick="confirmTransfer()" class="nav-option flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition">✓ Confirm</button>
                <button onclick="rejectTransfer()" class="nav-option flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition">✗ Cancel</button>
              </div>
            </div>
          `;
          break;
          
        case 'input-old-pin':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">🔐 ENTER OLD PIN</h2>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600">
                <div class="text-3xl font-bold tracking-widest text-emerald-400">
                  ${'●'.repeat(state.inputValue.length)}${'○'.repeat(4 - state.inputValue.length)}
                </div>
              </div>
              <div class="text-xs text-cyan-300 mb-2">Enter your current 4-digit PIN</div>
              ${state.attemptsOldPin > 0 ? `<div class="text-xs text-red-400 mb-4">Attempts: ${3 - state.attemptsOldPin} remaining</div>` : `<div class="text-xs text-cyan-300 mb-4">You have 3 attempts</div>`}
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;

        case 'input-new-pin':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">🔑 ENTER NEW PIN</h2>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600">
                <div class="text-3xl font-bold tracking-widest text-emerald-400">
                  ${'●'.repeat(state.inputValue.length)}${'○'.repeat(4 - state.inputValue.length)}
                </div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Enter 4-digit PIN</div>
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;

        case 'input-confirm-pin':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">✅ CONFIRM NEW PIN</h2>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600">
                <div class="text-3xl font-bold tracking-widest text-emerald-400">
                  ${'●'.repeat(state.inputValue.length)}${'○'.repeat(4 - state.inputValue.length)}
                </div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Re-enter the new 4-digit PIN</div>
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;

        case 'pin-change-success':
          content.innerHTML = `
            <div class="slide-in text-center pt-24">
              <div class="text-5xl mb-4">✅</div>
              <h2 class="text-2xl text-emerald-400 mb-4">PIN CHANGED SUCCESSFULLY</h2>
              <p class="text-sm text-cyan-300">Redirecting...</p>
            </div>
          `;
          break;

        case 'input-statement-duration':
          content.innerHTML = `
            <div class="slide-in text-center pt-12">
              <h2 class="text-2xl glow-text mb-4">📜 STATEMENT PERIOD</h2>
              <div class="bg-slate-900/50 rounded-lg p-6 mb-6 border-2 border-cyan-600 text-left space-y-3">
                <div>
                  <div class="text-xs text-cyan-300 mb-1">From</div>
                  <input id="statement-from" class="date-input nav-option" type="date">
                </div>
                <div>
                  <div class="text-xs text-cyan-300 mb-1">To</div>
                  <input id="statement-to" class="date-input nav-option" type="date">
                </div>
              </div>
              <div class="text-xs text-cyan-300 mb-4">Select a date range</div>
              <div class="flex gap-3 justify-center">
                <button onclick="submitStatementRange()" class="nav-option bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition">Continue</button>
                <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
              </div>
            </div>
          `;
          break;
          
        case 'statement':
          const fromDateValue = state.statementRange.from;
          const toDateValue = state.statementRange.to;
          const fromDate = fromDateValue ? new Date(fromDateValue) : null;
          const toDate = toDateValue ? new Date(toDateValue) : null;
          const endOfDay = toDate ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999) : null;
          const filtered = state.transactions.filter(t => {
            if (!t.date) return false;
            const txDate = new Date(t.date);
            if (fromDate && txDate < fromDate) return false;
            if (endOfDay && txDate > endOfDay) return false;
            return true;
          });
          content.innerHTML = `
            <div class="slide-in">
              <h2 class="text-2xl glow-text text-center mb-4">📜 TRANSACTION HISTORY</h2>
              <div class="text-xs text-cyan-300 text-center mb-3">
                ${fromDateValue && toDateValue ? `${fromDateValue} → ${toDateValue}` : 'All time'}
              </div>
              <div class="bg-slate-900/50 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
                ${filtered.length === 0 ? `<div class="text-xs text-cyan-500 text-center py-6">No transactions in this period.</div>` : filtered.slice(0, 10).map((t, i) => `
                  <div class="flex justify-between text-xs py-2 border-b border-cyan-600/30 text-cyan-300">
                    <div>
                      <div class="font-bold">${t.type}</div>
                      <div class="text-cyan-600">${t.date} ${t.time}</div>
                    </div>
                    <div class="text-right">
                      <div class="font-bold ${t.type === 'Withdrawal' || t.type === 'Transfer' ? 'text-red-400' : 'text-emerald-400'}">
                        ${t.type === 'Withdrawal' || t.type === 'Transfer' ? '-' : '+'}${formatMoney(t.amount || 0)}
                      </div>
                      <div class="text-cyan-600">${formatMoney(t.balance || state.balance)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <button onclick="showReceipt()" class="nav-option bg-emerald-600 text-white px-6 py-2 rounded-lg mb-4 hover:bg-emerald-700 transition">🖨️ Receipt</button>
              <button onclick="state.screen='another-transaction'; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Cancel</button>
            </div>
          `;
          break;

        case 'verifying':
          content.innerHTML = `
            <div class="slide-in text-center pt-24">
              <div class="text-4xl mb-4">🔎</div>
              <h2 class="text-2xl glow-text mb-4">Verifying...</h2>
              <div class="flex justify-center gap-2 mt-8">
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              </div>
            </div>
          `;
          break;
          
        case 'processing':
          content.innerHTML = `
            <div class="slide-in text-center pt-24">
              <div class="text-4xl mb-4">⚙️</div>
              <h2 class="text-2xl glow-text mb-4">Processing...</h2>
              <div class="flex justify-center gap-2 mt-8">
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              </div>
              <p class="text-sm text-cyan-300 mt-8">Please wait...</p>
            </div>
          `;
          break;
          
        case 'success':
          content.innerHTML = `
            <div class="slide-in text-center pt-16">
              <div class="text-5xl mb-4">✅</div>
              <h2 class="text-2xl text-emerald-400 mb-4">TRANSACTION SUCCESSFUL</h2>
              <div class="text-sm text-cyan-300 mb-8">New Balance: ${formatMoney(state.balance)}</div>
              <div class="flex gap-4">
                <button onclick="showReceipt()" class="nav-option flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition">🖨️ Receipt</button>
                <button onclick="state.screen='another-transaction'; render();" class="nav-option flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold hover:bg-cyan-700 transition">Continue</button>
              </div>
            </div>
          `;
          break;
          
        case 'error':
          content.innerHTML = `
            <div class="slide-in text-center pt-24">
              <div class="text-5xl mb-4">❌</div>
              <h2 class="text-2xl text-red-400 mb-4">TRANSACTION FAILED</h2>
              <p class="text-sm text-cyan-300 mb-8">${state.errorMsg || 'Invalid input'}</p>
              <button onclick="state.screen='another-transaction'; state.inputValue=''; render();" class="nav-option bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">Return</button>
            </div>
          `;
          break;
          
        case 'another-transaction':
          content.innerHTML = `
            <div class="slide-in text-center pt-24">
              <div class="text-4xl mb-4">❓</div>
              <h2 class="text-2xl glow-text mb-8">ANOTHER TRANSACTION?</h2>
              <div class="flex gap-4">
                <button onclick="continueTransaction()" class="nav-option flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-emerald-700 transition">YES</button>
                <button onclick="endSession()" class="nav-option flex-1 bg-red-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition">NO</button>
              </div>
            </div>
          `;
          break;
      }

      setupNavigation();
      syncPanelSizes();
    }

    // Initial card styling
    applyCardStyle();
    
    // Update card PIN display
    document.getElementById('card-pin-display').textContent = state.pin;
    document.getElementById('card-number').textContent = state.cardType.cardNumber;
    
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', syncPanelSizes);

    render();


