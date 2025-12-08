/* eslint-env node */
/**
 * Twitter/X Search Integration
 * Searches X for real-time insights and viral dev tweets
 */

import axios from 'axios';

const X_API_BASE = process.env.X_API_BASE_URL || 'https://api.twitter.com/2';
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

/**
 * Search X/Twitter using API v2
 * Falls back to snscrape if API unavailable
 */
export async function searchTwitter(query, options = {}) {
  const {
    maxResults = 10,
    minRetweets = 0,
    minFollowers = 0,
    verifiedOnly = false,
    hoursAgo = 72,
  } = options;

  // Try official X API first
  if (X_BEARER_TOKEN) {
    try {
      const sinceDate = new Date();
      sinceDate.setHours(sinceDate.getHours() - hoursAgo);
      const since = sinceDate.toISOString();

      const response = await axios.get(`${X_API_BASE}/tweets/search/recent`, {
        params: {
          query: `${query} -is:retweet lang:en`,
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'created_at,public_metrics,author_id,text',
          'user.fields': 'verified,public_metrics',
          start_time: since,
        },
        headers: {
          Authorization: `Bearer ${X_BEARER_TOKEN}`,
        },
      });

      const tweets = response.data.data || [];
      const users = response.data.includes?.users || [];

      // Filter and enrich tweets
      const enriched = tweets
        .filter(tweet => {
          const user = users.find(u => u.id === tweet.author_id);
          if (!user) return false;
          
          if (verifiedOnly && !user.verified) return false;
          if (minFollowers > 0 && (user.public_metrics?.followers_count || 0) < minFollowers) return false;
          if (minRetweets > 0 && (tweet.public_metrics?.retweet_count || 0) < minRetweets) return false;
          
          return true;
        })
        .map(tweet => {
          const user = users.find(u => u.id === tweet.author_id);
          return {
            id: tweet.id,
            text: tweet.text,
            url: `https://twitter.com/${user?.username || 'unknown'}/status/${tweet.id}`,
            author: user?.username || 'unknown',
            authorName: user?.name || 'Unknown',
            verified: user?.verified || false,
            followers: user?.public_metrics?.followers_count || 0,
            retweets: tweet.public_metrics?.retweet_count || 0,
            likes: tweet.public_metrics?.like_count || 0,
            createdAt: tweet.created_at,
            source: 'twitter-api',
          };
        })
        .sort((a, b) => b.retweets - a.retweets)
        .slice(0, maxResults);

      return enriched;
    } catch (error) {
      console.warn('[TwitterSearch] X API failed, trying fallback:', error.message);
    }
  }

  // Fallback: Use snscrape (if available) or return mock
  try {
    // If snscrape is installed, use it
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const command = `snscrape --jsonl --max-results ${maxResults} twitter-search "${query} min_retweets:${minRetweets}"`;
    const { stdout } = await execAsync(command, { timeout: 10000 });
    
    const tweets = stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          const tweet = JSON.parse(line);
          return {
            id: tweet.id,
            text: tweet.rawContent || tweet.content,
            url: tweet.url,
            author: tweet.user?.username || 'unknown',
            authorName: tweet.user?.displayname || 'Unknown',
            verified: tweet.user?.verified || false,
            followers: tweet.user?.followersCount || 0,
            retweets: tweet.retweetCount || 0,
            likes: tweet.likeCount || 0,
            createdAt: tweet.date,
            source: 'snscrape',
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return tweets;
  } catch (error) {
    console.warn('[TwitterSearch] Snscrape fallback failed:', error.message);
    // Return empty - Twitter search is optional
    return [];
  }
}

/**
 * Search for viral dev tweets on a topic
 */
export async function searchViralDevTweets(topic, options = {}) {
  const queries = [
    `${topic} (from:github OR from:vercel OR from:openai) min_retweets:50`,
    `${topic} filter:verified min_followers:10000`,
    `${topic} lang:en -filter:retweets min_replies:10`,
  ];

  const results = await Promise.all(
    queries.map(q => searchTwitter(q, { ...options, maxResults: 5 }))
  );

  // Combine and deduplicate
  const seen = new Set();
  const unique = [];
  for (const tweets of results) {
    for (const tweet of tweets) {
      if (!seen.has(tweet.id)) {
        seen.add(tweet.id);
        unique.push(tweet);
      }
    }
  }

  // Sort by engagement
  return unique
    .sort((a, b) => (b.retweets + b.likes) - (a.retweets + a.likes))
    .slice(0, options.maxResults || 10);
}







