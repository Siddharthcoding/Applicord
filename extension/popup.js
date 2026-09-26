document.addEventListener('DOMContentLoaded', async () => {
  const authSection = document.getElementById('auth-section');
  const trackSection = document.getElementById('track-section');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const trackForm = document.getElementById('track-form');
  const authError = document.getElementById('auth-error');
  const successMsg = document.getElementById('success-msg');
  const dupWarning = document.getElementById('dup-warning');
  const dupCompany = document.getElementById('dup-company');

  // Load stored state
  const storage = await chrome.storage.local.get(['token', 'apiUrl', 'user']);
  const apiUrl = storage.apiUrl || 'http://localhost:5000';
  document.getElementById('api-url').value = apiUrl;

  if (storage.token) {
    showTrackView(storage.token, apiUrl);
  } else {
    showAuthView();
  }

  // Handle Login
  btnLogin.addEventListener('click', async () => {
    authError.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const url = document.getElementById('api-url').value.trim() || 'http://localhost:5000';

    try {
      const res = await fetch(`${url}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        authError.textContent = data.error || 'Login failed';
        return;
      }

      await chrome.storage.local.set({
        token: data.data.accessToken,
        apiUrl: url,
        user: data.data.user,
      });

      showTrackView(data.data.accessToken, url);
    } catch (e) {
      authError.textContent = 'Could not connect to Applicord server';
    }
  });

  // Handle Logout
  btnLogout.addEventListener('click', async () => {
    await chrome.storage.local.clear();
    showAuthView();
  });

  function showAuthView() {
    authSection.classList.remove('hidden');
    trackSection.classList.add('hidden');
  }

  async function showTrackView(token, currentApiUrl) {
    authSection.classList.add('hidden');
    trackSection.classList.remove('hidden');

    // Query active tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    try {
      const res = await fetch(`${currentApiUrl}/api/v1/extension/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: tab.url,
          pageTitle: tab.title,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        document.getElementById('company').value = d.detectedCompany || '';
        document.getElementById('jobTitle').value = d.detectedRole || '';
        
        if (d.isAlreadyTracked) {
          dupWarning.classList.remove('hidden');
          dupCompany.textContent = `${d.existingApplication.companyName} (${d.existingApplication.currentStatus})`;
        }
      }
    } catch (err) {
      console.warn('Could not auto-detect job from tab', err);
    }

    // Handle submission
    trackForm.onsubmit = async (e) => {
      e.preventDefault();
      successMsg.classList.add('hidden');

      const payload = {
        company: document.getElementById('company').value.trim(),
        jobTitle: document.getElementById('jobTitle').value.trim(),
        location: document.getElementById('location').value.trim() || undefined,
        workMode: document.getElementById('workMode').value,
        currentStatus: document.getElementById('currentStatus').value,
        jobUrl: tab.url,
        source: 'BROWSER_EXTENSION',
      };

      try {
        const res = await fetch(`${currentApiUrl}/api/v1/extension/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const resJson = await res.json();
        if (resJson.success) {
          successMsg.classList.remove('hidden');
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          alert(resJson.error || 'Failed to track application');
        }
      } catch (err) {
        alert('Failed to connect to Applicord');
      }
    };
  }
});
