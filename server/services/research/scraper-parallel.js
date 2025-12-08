/* eslint-env node */
/**
 * Parallel Scraper for X + arXiv + GitHub
 * Returns structured JSON in <1.8s
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Scrape arXiv paper
 */
async function scrapeArxiv(arxivId) {
  try {
    const response = await axios.get(`https://arxiv.org/api/query`, {
      params: {
        id_list: arxivId,
        max_results: 1,
      },
    });

    const entry = response.data.feed?.entry?.[0];
    if (!entry) return null;

    return {
      type: 'arxiv',
      id: arxivId,
      title: entry.title,
      authors: entry.author?.map(a => a.name) || [],
      abstract: entry.summary,
      published: entry.published,
      pdfUrl: entry.link?.find(l => l.type === 'application/pdf')?.href,
      url: `https://arxiv.org/abs/${arxivId}`,
    };
  } catch (error) {
    console.warn('[ParallelScraper] arXiv scrape failed:', error.message);
    return null;
  }
}

/**
 * Scrape GitHub repository
 */
async function scrapeGitHub(repoUrl) {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const [repoData, readmeData] = await Promise.all([
      axios.get(apiUrl, {
        headers: {
          Authorization: process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined,
        },
      }).catch(() => null),
      axios.get(`${apiUrl}/readme`, {
        headers: {
          Accept: 'application/vnd.github.v3.html',
          Authorization: process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined,
        },
      }).catch(() => null),
    ]);

    if (!repoData) return null;

    return {
      type: 'github',
      url: repoUrl,
      name: repoData.data.full_name,
      description: repoData.data.description,
      stars: repoData.data.stargazers_count,
      forks: repoData.data.forks_count,
      language: repoData.data.language,
      readme: readmeData?.data || null,
      createdAt: repoData.data.created_at,
      updatedAt: repoData.data.updated_at,
    };
  } catch (error) {
    console.warn('[ParallelScraper] GitHub scrape failed:', error.message);
    return null;
  }
}

/**
 * Scrape X/Twitter tweet
 */
async function scrapeTwitter(tweetUrl) {
  try {
    const match = tweetUrl.match(/twitter\.com\/(\w+)\/status\/(\d+)/) ||
                  tweetUrl.match(/x\.com\/(\w+)\/status\/(\d+)/);
    if (!match) return null;

    const [, username, tweetId] = match;

    // Try official API first
    if (process.env.X_BEARER_TOKEN) {
      try {
        const response = await axios.get(`https://api.twitter.com/2/tweets/${tweetId}`, {
          params: {
            'tweet.fields': 'created_at,public_metrics,author_id,text',
            'user.fields': 'verified,public_metrics,username',
            expansions: 'author_id',
          },
          headers: {
            Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
          },
        });

        const tweet = response.data.data;
        const users = response.data.includes?.users || [];
        const user = users.find(u => u.id === tweet.author_id);

        return {
          type: 'twitter',
          id: tweetId,
          url: tweetUrl,
          text: tweet.text,
          author: user?.username || username,
          authorName: user?.name || username,
          verified: user?.verified || false,
          followers: user?.public_metrics?.followers_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          likes: tweet.public_metrics?.like_count || 0,
          createdAt: tweet.created_at,
        };
      } catch (apiError) {
        console.warn('[ParallelScraper] X API failed, trying fallback:', apiError.message);
      }
    }

    // Fallback: Use snscrape or return basic info
    try {
      const { stdout } = await execAsync(`snscrape --jsonl twitter-tweet ${tweetUrl}`, {
        timeout: 5000,
      });
      const tweet = JSON.parse(stdout.trim());
      return {
        type: 'twitter',
        id: tweetId,
        url: tweetUrl,
        text: tweet.rawContent || tweet.content,
        author: tweet.user?.username || username,
        authorName: tweet.user?.displayname || username,
        verified: tweet.user?.verified || false,
        followers: tweet.user?.followersCount || 0,
        retweets: tweet.retweetCount || 0,
        likes: tweet.likeCount || 0,
        createdAt: tweet.date,
      };
    } catch {
      // Return minimal info if all methods fail
      return {
        type: 'twitter',
        id: tweetId,
        url: tweetUrl,
        text: null,
        author: username,
        error: 'Could not scrape tweet content',
      };
    }
  } catch (error) {
    console.warn('[ParallelScraper] Twitter scrape failed:', error.message);
    return null;
  }
}

/**
 * Parallel scrape multiple URLs
 * Returns structured JSON in <1.8s
 */
export async function parallelScrape(urls) {
  const startTime = Date.now();
  const results = [];

  // Categorize URLs
  const arxivUrls = urls.filter(u => u.includes('arxiv.org'));
  const githubUrls = urls.filter(u => u.includes('github.com'));
  const twitterUrls = urls.filter(u => u.includes('twitter.com') || u.includes('x.com'));
  const _otherUrls = urls.filter(u => 
    !u.includes('arxiv.org') && 
    !u.includes('github.com') && 
    !u.includes('twitter.com') && 
    !u.includes('x.com')
  );

  // Extract IDs/URLs
  const arxivIds = arxivUrls.map(u => {
    const match = u.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  // Execute all scrapes in parallel
  const promises = [
    ...arxivIds.map(id => scrapeArxiv(id).then(r => ({ type: 'arxiv', result: r }))),
    ...githubUrls.map(url => scrapeGitHub(url).then(r => ({ type: 'github', result: r }))),
    ...twitterUrls.map(url => scrapeTwitter(url).then(r => ({ type: 'twitter', result: r }))),
  ];

  const scraped = await Promise.allSettled(promises);

  // Process results
  for (const item of scraped) {
    if (item.status === 'fulfilled' && item.value.result) {
      results.push(item.value.result);
    }
  }

  const latency = Date.now() - startTime;

  return {
    results,
    total: results.length,
    latency_ms: latency,
    success: latency < 1800, // Target: <1.8s
  };
}




