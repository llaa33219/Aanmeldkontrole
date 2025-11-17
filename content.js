let hasCbXSS = false;

try {
  const search = new URLSearchParams(window.location.search);
  const cbURL = search.get('cb');
  hasCbXSS = cbURL ? ['javascript:', 'data:', 'vbscript:'].includes(new URL(cbURL).protocol) : false;
} catch(e) {
  console.error(e);
}

// Check if current domain is playentry.org
const isOfficialSite = window.location.hostname.includes('playentry.org');

// If not official site or it is XSS, disable login buttons
if (!isOfficialSite || hasCbXSS) {
  // Keep track of already disabled buttons and shown alert
  const disabledButtons = new Set();
  let alertShown = false;

  // Function to check if this is a login page by DOM structure
  function isLoginPage() {
    // Key structural elements to check
    const structuralChecks = [
      // h2 with "로그인"
      () => {
        const h2 = document.querySelector('h2');
        return h2 && h2.textContent.trim() === '로그인';
      },
      // form with fieldset containing legend with blind span "로그인 폼"
      () => {
        const legend = document.querySelector('form fieldset legend');
        if (!legend) return false;
        const blindSpan = legend.querySelector('span.blind');
        return blindSpan && blindSpan.textContent.trim() === '로그인 폼';
      },
      // Username input field
      () => {
        const usernameInput = document.querySelector('input[name="username"], input#username');
        return !!usernameInput;
      },
      // Password input field
      () => {
        const passwordInput = document.querySelector('input[type="password"][name="password"], input[type="password"]#password');
        return !!passwordInput;
      },
      // SaveId checkbox
      () => {
        return !!document.querySelector('input#SaveId[type="checkbox"], label[for="SaveId"]');
      },
      // AutoLogin checkbox
      () => {
        return !!document.querySelector('input#AutoLogin[type="checkbox"], label[for="AutoLogin"]');
      },
      // Password visibility toggle button
      () => {
        const buttons = document.querySelectorAll('button[type="button"]');
        for (const btn of buttons) {
          const blind = btn.querySelector('span.blind');
          if (blind && blind.textContent.includes('비밀번호 보이기')) {
            return true;
          }
        }
        return false;
      },
      // Forgot password link
      () => {
        const links = document.querySelectorAll('a[href*="forgot_password"], a[href*="찾기"]');
        return links.length > 0;
      },
      // Signup link
      () => {
        const links = document.querySelectorAll('a[href*="signup"], a[data-testid*="Signup"]');
        return links.length > 0;
      }
    ];
    
    // Count how many structural elements match
    const matchCount = structuralChecks.filter(check => check()).length;
    
    // If 80% or more match (7 out of 9), consider it a login page
    return matchCount >= 7;
  }

  // Function to disable a button
  function disableLoginButton(button) {
    if (button && !disabledButtons.has(button)) {
      button.disabled = true;
      button.style.background = 'red';
      button.style.cursor = 'not-allowed';
      button.style.pointerEvents = 'none';
      button.textContent = '공식 사이트 아님. 로그인 불가';
      
      // Prevent all click events
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, { capture: true });
      
      disabledButtons.add(button);
    }
  }

  // Function to check and disable buttons
  function checkAndDisableButtons() {
    // Find buttons by data-testid attributes
    const signinButton = document.querySelector('[data-testid="signin"]');
    const naverSigninButton = document.querySelector('[data-testid="naver_signin"]');
    const whalespaceSigninButton = document.querySelector('[data-testid="whalespace_signin"]');

    const foundAnyButton = signinButton || naverSigninButton || whalespaceSigninButton;

    // Disable each button if found
    disableLoginButton(signinButton);
    disableLoginButton(naverSigninButton);
    disableLoginButton(whalespaceSigninButton);

    // Disable input control
    if (isLoginPage()) {
      const inputs = document.querySelectorAll('form input');
      for (const input of inputs) {
        input.disabled = true;
      }

      // Check if this looks like a login page but no buttons were found
      if (!foundAnyButton && !alertShown) {
        alertShown = true;
        alert('공식 사이트 로그인 페이지가 아닌 것으로 판단되었지만 로그인 버튼을 찾을 수 없습니다. 주의해 주세요.');
      }
    }
  }

  // Run initially when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndDisableButtons);
  } else {
    checkAndDisableButtons();
  }

  // Check every 5 seconds for SPA navigation (client-side routing)
  setInterval(() => {
    checkAndDisableButtons();
  }, 5000);

  // Also observe DOM changes in case buttons are added dynamically
  const observer = new MutationObserver((mutations) => {
    // Only check if relevant nodes were added
    const shouldCheck = mutations.some(mutation => 
      mutation.addedNodes.length > 0
    );
    
    if (shouldCheck) {
      checkAndDisableButtons();
    }
  });

  // Wait for body to be available
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
}