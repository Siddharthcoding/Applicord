export interface ExtractedJobMetadata {
  company?: string;
  jobTitle?: string;
  jobId?: string;
  location?: string;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  source: string;
}

export const extractMetadataFromJobUrl = (rawUrl: string): ExtractedJobMetadata => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { source: 'OTHER' };
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { source: 'OTHER' };
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  // 1. LinkedIn: linkedin.com/jobs/view/12345678 or linkedin.com/jobs/collections/...
  if (hostname.includes('linkedin.com')) {
    let jobId: string | undefined;
    const viewMatch = pathname.match(/\/jobs\/view\/([0-9]+)/i);
    if (viewMatch) {
      jobId = viewMatch[1];
    } else if (searchParams.get('currentJobId')) {
      jobId = searchParams.get('currentJobId') || undefined;
    }

    return {
      source: 'LINKEDIN',
      jobId,
    };
  }

  // 2. Greenhouse: boards.greenhouse.io/{company}/jobs/{jobId} or boards.eu.greenhouse.io/{company}/jobs/{jobId}
  if (hostname.includes('greenhouse.io')) {
    const parts = pathname.split('/').filter(Boolean);
    const companyIndex = parts.findIndex(p => p.toLowerCase() === 'boards' || p.toLowerCase() === 'embed') !== -1 ? 1 : 0;
    const companySlug = parts[companyIndex] || '';
    const jobId = parts[parts.indexOf('jobs') + 1] || searchParams.get('gh_jid') || undefined;
    
    const companyFormatted = companySlug
      ? companySlug.charAt(0).toUpperCase() + companySlug.slice(1).replace(/[-_]/g, ' ')
      : undefined;

    return {
      source: 'COMPANY_WEBSITE',
      company: companyFormatted,
      jobId,
    };
  }

  // 3. Lever: jobs.lever.co/{company}/{jobId}
  if (hostname.includes('lever.co')) {
    const parts = pathname.split('/').filter(Boolean);
    const companySlug = parts[0] || '';
    const jobId = parts[1] || undefined;
    
    const companyFormatted = companySlug
      ? companySlug.charAt(0).toUpperCase() + companySlug.slice(1).replace(/[-_]/g, ' ')
      : undefined;

    return {
      source: 'COMPANY_WEBSITE',
      company: companyFormatted,
      jobId,
    };
  }

  // 4. Indeed: indeed.com/viewjob?jk=123456 or indeed.com/jobs?q=...&vjk=123456
  if (hostname.includes('indeed.com')) {
    const jobId = searchParams.get('jk') || searchParams.get('vjk') || undefined;
    return {
      source: 'INDEED',
      jobId,
    };
  }

  // 5. Workday: {company}.wd1.myworkdayjobs.com/{jobPath}
  if (hostname.includes('myworkdayjobs.com')) {
    const subdomains = hostname.split('.');
    const companySlug = subdomains[0] || '';
    const companyFormatted = companySlug
      ? companySlug.charAt(0).toUpperCase() + companySlug.slice(1).replace(/[-_]/g, ' ')
      : undefined;

    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const jobId = lastPart && lastPart.includes('_') ? lastPart.split('_')[1] : lastPart;

    return {
      source: 'COMPANY_WEBSITE',
      company: companyFormatted,
      jobId,
    };
  }

  // 6. Generic Company Career Page: e.g. careers.microsoft.com/us/en/job/12345/Software-Engineer
  const domainParts = hostname.replace('www.', '').split('.');
  const baseCompany = domainParts.length >= 2 ? domainParts[0] : undefined;
  let detectedCompany = baseCompany && baseCompany !== 'careers' && baseCompany !== 'jobs'
    ? baseCompany.charAt(0).toUpperCase() + baseCompany.slice(1)
    : undefined;

  if (domainParts[0] === 'careers' || domainParts[0] === 'jobs') {
    detectedCompany = domainParts[1] ? domainParts[1].charAt(0).toUpperCase() + domainParts[1].slice(1) : undefined;
  }

  // Try extracting title from slug if present (e.g. /jobs/software-engineer-senior)
  let detectedTitle: string | undefined;
  const pathSegments = pathname.split('/').filter(Boolean);
  for (const seg of pathSegments) {
    if (seg.includes('-') && (seg.toLowerCase().includes('engineer') || seg.toLowerCase().includes('developer') || seg.toLowerCase().includes('manager') || seg.toLowerCase().includes('designer') || seg.toLowerCase().includes('analyst') || seg.toLowerCase().includes('lead') || seg.toLowerCase().includes('specialist'))) {
      detectedTitle = seg
        .split('-')
        .filter(word => !/^\d+$/.test(word))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      break;
    }
  }

  return {
    source: 'COMPANY_WEBSITE',
    company: detectedCompany,
    jobTitle: detectedTitle,
  };
};
