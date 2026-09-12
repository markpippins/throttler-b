import { BookmarkType } from '../types';

export interface StreamResultItem {
  id: string;
  type: BookmarkType;
  title: string;
  link: string;
  snippet?: string;
  thumbnailUrl?: string;
  source: string;
  publishedAt?: string;
  authors?: string[];
  publication?: string;
  channelTitle?: string;
}

export async function searchIdeaStream(query: string, sourceFilters: Set<BookmarkType>): Promise<StreamResultItem[]> {
  const cleanQuery = query.trim() || 'Throttler File System';
  const results: StreamResultItem[] = [];

  // 1. Web search results
  if (sourceFilters.has('web')) {
    results.push(
      {
        id: `web-1-${cleanQuery}`,
        type: 'web',
        title: `What is ${cleanQuery}? - Tech Architecture Overview`,
        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanQuery)}`,
        snippet: `An article explaining the definition, history, and architectural significance of ${cleanQuery}. Covers virtual file hierarchies and distributed synchronization.`,
        source: 'wikipedia.org',
        publishedAt: '2024-05-20T10:00:00Z',
      },
      {
        id: `web-2-${cleanQuery}`,
        type: 'web',
        title: `The Ultimate Guide to ${cleanQuery} in 2024`,
        link: 'https://tech-guide.com/virtual-filesystems',
        snippet: `Everything you need to know about ${cleanQuery}. Modern engineering practices, reactive pipelines, and cloud-assisted storage.`,
        source: 'tech-guide.com',
        publishedAt: '2024-05-28T12:30:00Z',
      },
      {
        id: `web-3-${cleanQuery}`,
        type: 'web',
        title: `Official Documentation for ${cleanQuery}`,
        link: 'https://developer.mozilla.org/en-US/docs/Web/API/FileSystem',
        snippet: `Complete reference, API tutorials, security boundaries, and integration examples for working with ${cleanQuery}.`,
        source: 'official-docs.io',
        publishedAt: '2024-01-15T09:00:00Z',
      }
    );
  }

  // 2. Image search results
  if (sourceFilters.has('image')) {
    results.push(
      {
        id: `img-1-${cleanQuery}`,
        type: 'image',
        title: `${cleanQuery} - High Resolution Visual`,
        link: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}-1/800/600`,
        thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}-1/400/300`,
        source: 'unsplash.com',
        publishedAt: '2024-04-10T08:00:00Z',
      },
      {
        id: `img-2-${cleanQuery}`,
        type: 'image',
        title: `${cleanQuery} Diagram & Schematics`,
        link: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}-2/800/600`,
        thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}-2/400/300`,
        source: 'diagrams.net',
        publishedAt: '2024-03-22T14:15:00Z',
      },
      {
        id: `img-3-${cleanQuery}`,
        type: 'image',
        title: `${cleanQuery} Cloud Topology`,
        link: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}-3/800/600`,
        thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}-3/400/300`,
        source: 'cloud-assets.io',
        publishedAt: '2024-02-18T19:40:00Z',
      }
    );
  }

  // 3. YouTube search results
  if (sourceFilters.has('youtube')) {
    results.push(
      {
        id: `yt-1-${cleanQuery}`,
        type: 'youtube',
        title: `Comprehensive Deep Dive: ${cleanQuery}`,
        link: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        snippet: `Complete masterclass tutorial explaining the fundamentals and advanced operations of ${cleanQuery}.`,
        thumbnailUrl: 'https://picsum.photos/seed/yt1/320/180',
        channelTitle: 'Tech Tutorials',
        source: 'YouTube',
        publishedAt: '2023-11-10T14:00:00Z',
      },
      {
        id: `yt-2-${cleanQuery}`,
        type: 'youtube',
        title: `Top Misconceptions and Architecture Pitfalls in ${cleanQuery}`,
        link: 'https://youtube.com/watch?v=oHg5SJYRHA0',
        snippet: `We debunk common misconceptions and review performance bottlenecks when managing ${cleanQuery}.`,
        thumbnailUrl: 'https://picsum.photos/seed/yt2/320/180',
        channelTitle: 'Engineering Decoded',
        source: 'YouTube',
        publishedAt: '2024-03-22T18:00:00Z',
      }
    );
  }

  // 4. Academic search results
  if (sourceFilters.has('academic')) {
    results.push(
      {
        id: `acad-1-${cleanQuery}`,
        type: 'academic',
        title: `A Comprehensive Review on Scalable Implementations of ${cleanQuery}`,
        link: 'https://arxiv.org/abs/2301.00001',
        snippet: `This paper presents a systematic review of distributed metadata storage and indexing algorithms in ${cleanQuery}.`,
        source: 'Journal of Advanced Systems',
        authors: ['Dr. Jane Doe', 'Prof. John Smith'],
        publication: 'IEEE Trans. Software Eng. 2023',
        publishedAt: '2023-08-15T00:00:00Z',
      },
      {
        id: `acad-2-${cleanQuery}`,
        type: 'academic',
        title: `Formal Verification and Security Guarantees in ${cleanQuery}`,
        link: 'https://arxiv.org/abs/2302.00002',
        snippet: `We formulate cryptographic access delegation and transactional guarantees across virtual file nodes.`,
        source: 'ACM Computing Surveys',
        authors: ['Maria Garcia', 'David Green'],
        publication: 'ACM Computing Surveys 2024',
        publishedAt: '2024-02-20T00:00:00Z',
      }
    );
  }

  // 5. Gemini AI summary
  if (sourceFilters.has('gemini')) {
    results.push({
      id: `gem-1-${cleanQuery}`,
      type: 'gemini',
      title: `Gemini AI Synthesis: ${cleanQuery}`,
      link: '#',
      snippet: `AI synthesis for "${cleanQuery}": A critical concept in modern data management and user productivity. Key benefits include unified indexing, instant metadata search, and cross-broker remote folder mounting.`,
      source: 'Google Gemini AI',
      publishedAt: new Date().toISOString(),
    });
  }

  return results;
}
