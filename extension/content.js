// Applicord Content Script: runs on job boards
(function() {
  console.log('[Applicord] Content script initialized on job board.');

  function extractPageInfo() {
    let company = '';
    let title = '';

    // LinkedIn
    if (window.location.hostname.includes('linkedin.com')) {
      const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title');
      const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name');
      if (titleEl) title = titleEl.innerText.trim();
      if (companyEl) company = companyEl.innerText.trim();
    }
    // Greenhouse
    else if (window.location.hostname.includes('greenhouse.io')) {
      const titleEl = document.querySelector('.app-title, h1.job-title');
      const companyEl = document.querySelector('.company-name');
      if (titleEl) title = titleEl.innerText.trim();
      if (companyEl) company = companyEl.innerText.trim();
    }
    // Lever
    else if (window.location.hostname.includes('lever.co')) {
      const titleEl = document.querySelector('.posting-headline h2');
      if (titleEl) title = titleEl.innerText.trim();
    }

    return { company, title, url: window.location.href };
  }

  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'GET_PAGE_INFO') {
      sendResponse(extractPageInfo());
    }
  });
})();
