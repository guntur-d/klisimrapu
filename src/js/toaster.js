// toaster.js

 
var createEl = (tag) => document.createElement(tag);

// Keep track of toast positions for stacking (only for regular toasts)
let toastStack = [];

// Keep track of all active toast elements for cleanup
let activeToasts = new Set();

const showToast = (message, type = 'info', duration = 5000) => {
  const t = createEl('div');
  
  // Define Tailwind classes based on toast type with custom colors
  const typeClasses = {
    success: 'bg-[#93DA97] border border-[#93DA97] text-green-900',
    warning: 'bg-[#E3DE61] border border-[#E3DE61] text-yellow-900',
    error: 'bg-[#C51605] border border-[#C51605] text-white',
    info: 'bg-[#3876BF] border border-[#3876BF] text-white',
    notification: 'bg-[#C7BCA1] border border-[#C7BCA1] text-gray-900',
    prompt: 'bg-[#495371] border border-[#495371] text-white'
  };
  
  // Default to info if type is not found
  const classes = typeClasses[type] || typeClasses.info;
  
  t.className = `toast ${type} fixed px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform ${classes} max-w-md z-50`;
  
  t.textContent = message;
  
  // Add the toast directly to the body
  document.body.appendChild(t);
  
  // Add to tracking sets
  toastStack.push(t);
  activeToasts.add(t);
  
  // Position the toast
  updateToastPositions();
  
  // Apply a small delay before showing to allow for smooth transition
  setTimeout(() => {
    t.style.transform = 'translateX(0)';
    t.style.opacity = '1';
  }, 10);
  
  // Remove the toast after the duration
  const removeToast = () => {
    // Animate out
    t.style.transform = 'translateX(100%)';
    t.style.opacity = '0';
    
    // Remove the element after the transition is complete
    setTimeout(() => {
      if (t.parentNode) {
        // Remove from stacks
        const index = toastStack.indexOf(t);
        if (index > -1) {
          toastStack.splice(index, 1);
        }
        activeToasts.delete(t);
        
        t.parentNode.removeChild(t);
        // Update positions of remaining toasts
        updateToastPositions();
      }
    }, 300);
  };
  
  setTimeout(removeToast, duration);
  
  // Store the remove function on the toast element for manual cleanup
  t.removeToast = removeToast;
  
  return t; // Return the toast element
}

// Update positions of all toasts in the stack
function updateToastPositions() {
  const TOAST_SPACING = 10; // pixels between toasts
  let offset = 0;
  
  // Process toasts from newest to oldest (bottom to top)
  for (let i = toastStack.length - 1; i >= 0; i--) {
    const toast = toastStack[i];
    toast.style.bottom = `${20 + offset}px`;
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    offset += toast.offsetHeight + TOAST_SPACING;
  }
}

const showConfirmation = (message, onConfirm, onCancel) => {
  const t = createEl('div');
  t.className = 'toast toast-confirmation fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#FF6B35] border-2 border-[#FF6B35] rounded-lg shadow-lg p-4 max-w-md z-50';
  
  const messageEl = createEl('div');
  messageEl.className = 'toast-message mb-4 text-white text-lg';
  messageEl.textContent = message;
  
  const buttonsEl = createEl('div');
  buttonsEl.className = 'toast-buttons flex justify-end space-x-2';
  
  const yesButton = createEl('button');
  yesButton.className = 'toast-button toast-button-yes px-4 py-2 bg-white text-[#FF6B35] rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-colors';
  yesButton.textContent = 'Ya';
  yesButton.onclick = () => {
    if (t.parentNode) {
      t.parentNode.removeChild(t);
    }
    if (onConfirm) onConfirm();
  };
  
  const noButton = createEl('button');
  noButton.className = 'toast-button toast-button-no px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors';
  noButton.textContent = 'Tidak';
  noButton.onclick = () => {
    if (t.parentNode) {
      t.parentNode.removeChild(t);
    }
    if (onCancel) onCancel();
  };
  
  buttonsEl.append(yesButton, noButton);
  t.append(messageEl, buttonsEl);
  document.body.appendChild(t);
}

/**
 * Show a prompt with input field
 * @param {string} message - The message to display
 * @param {function} onConfirm - Callback with input value when user confirms
 * @param {function} [onCancel] - Optional callback when user cancels
 * @param {Object} [options] - Additional options:
 *   @param {string} [options.type='text'] - Input type (text, number, etc.)
 *   @param {string} [options.placeholder] - Input placeholder text
 *   @param {boolean} [options.required=false] - Whether input is required
 *   @param {string} [options.confirmText='Confirm'] - Text for confirm button
 *   @param {string} [options.cancelText='Cancel'] - Text for cancel button
 */
const showPrompt = (message, onConfirm, onCancel, options = {}) => {
  const t = createEl('div');
  t.className = 'toast toast-prompt-centered fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#DC143C] border border-[#DC143C] rounded-lg shadow-xl p-6 max-w-md z-50';
  
  const messageEl = createEl('div');
  messageEl.className = 'toast-message mb-4 text-white font-medium';
  messageEl.textContent = message;
  
  // Create a form element to wrap the input
  const formEl = createEl('form');
  formEl.className = 'toast-form';
  formEl.onsubmit = (e) => {
    e.preventDefault();
    confirmButton.click();
  };
  
  const inputEl = createEl('input');
  inputEl.className = 'toast-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 text-white bg-[#464E2E]';
  inputEl.type = options.type || 'text';
  inputEl.placeholder = options.placeholder || '';
  if (options.required) inputEl.required = true;
  
  const buttonsEl = createEl('div');
  buttonsEl.className = 'toast-buttons flex justify-end space-x-2';
  
  const confirmButton = createEl('button');
  confirmButton.className = 'toast-button toast-button-yes px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors';
  confirmButton.textContent = options.confirmText || 'Lanjut';
  confirmButton.type = 'button'; // Prevent default form submission
  confirmButton.onclick = () => {
    if (options.required && !inputEl.value.trim()) {
      inputEl.focus();
      // Add visual feedback for required field
      inputEl.classList.add('border-red-500');
      setTimeout(() => inputEl.classList.remove('border-red-500'), 2000);
      return;
    }
    if (t.parentNode) {
      t.parentNode.removeChild(t);
    }
    if (onConfirm) onConfirm(inputEl.value);
  };
  
  const cancelButton = createEl('button');
  cancelButton.className = 'toast-button toast-button-no px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors';
  cancelButton.textContent = options.cancelText || 'Batal';
  cancelButton.type = 'button'; // Prevent default form submission
  cancelButton.onclick = () => {
    if (t.parentNode) {
      t.parentNode.removeChild(t);
    }
    if (onCancel) onCancel();
  };
  
  // Allow pressing Enter to confirm
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmButton.click();
    }
  });
  
  // Append elements
  formEl.append(inputEl);
  buttonsEl.append(confirmButton, cancelButton);
  t.append(messageEl, formEl, buttonsEl);
  document.body.appendChild(t);
  inputEl.focus();
  
  return t; // Return the prompt element
};

// Create a toast object with method shortcuts for convenience
const toast = {
  show: (message, type = 'info', duration = 5000) => showToast(message, type, duration),
  success: (message, duration = 5000) => showToast(message, 'success', duration),
  error: (message, duration = 5000) => showToast(message, 'error', duration),
  warning: (message, duration = 4000) => showToast(message, 'warning', duration),
  info: (message, duration = 3000) => showToast(message, 'info', duration),
  notification: (message, duration = 5000) => showToast(message, 'notification', duration),
  
  /**
   * Clear all active toasts
   */
  clear: () => {
    activeToasts.forEach(toast => {
      if (toast.removeToast) {
        toast.removeToast();
      } else if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
    activeToasts.clear();
    toastStack = [];
  }
};

// Backward compatibility alias
const showToastAlias = toast.show;

export default toast;
export { showConfirmation, showPrompt, showToastAlias as showToast };