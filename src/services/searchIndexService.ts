import { FileSystemNode, SearchResultNode } from '../types';

/**
 * High-performance Bloom Filter implementation.
 * Space-efficient probabilistic data structure for set membership testing.
 * Provides 0% false negatives: if has() returns false, the term is definitely not present.
 */
export class BloomFilter {
  private bitArray: Uint32Array;
  readonly sizeInBits: number;
  readonly hashCount: number;

  constructor(sizeInBits: number = 2048, hashCount: number = 4) {
    this.sizeInBits = sizeInBits;
    this.hashCount = hashCount;
    this.bitArray = new Uint32Array(Math.ceil(sizeInBits / 32));
  }

  /**
   * 32-bit FNV-1a hash with seed variation
   */
  private hashFnv1a(str: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /**
   * Generates k distinct hash positions using Kirsch-Mitzenmacher optimization:
   * h_i(x) = (h1(x) + i * h2(x)) % m
   */
  private getBitPositions(term: string): number[] {
    const h1 = this.hashFnv1a(term, 0x811c9dc5);
    const h2 = this.hashFnv1a(term, 0x9747b28c) || 1;
    const positions: number[] = [];
    for (let i = 0; i < this.hashCount; i++) {
      const combined = (h1 + Math.imul(i, h2)) >>> 0;
      positions.push(combined % this.sizeInBits);
    }
    return positions;
  }

  /**
   * Add a token/word to the Bloom filter
   */
  add(term: string): void {
    if (!term) return;
    const normalized = term.toLowerCase().trim();
    if (!normalized) return;

    const positions = this.getBitPositions(normalized);
    for (const pos of positions) {
      const arrayIndex = pos >> 5; // pos / 32
      const bitIndex = pos & 31;   // pos % 32
      this.bitArray[arrayIndex] |= 1 << bitIndex;
    }
  }

  /**
   * Tests whether a token may be present.
   * If false, the token is DEFINITELY NOT in the set.
   * If true, the token is LIKELY in the set (subject to small false positive rate).
   */
  has(term: string): boolean {
    if (!term) return true;
    const normalized = term.toLowerCase().trim();
    if (!normalized) return true;

    const positions = this.getBitPositions(normalized);
    for (const pos of positions) {
      const arrayIndex = pos >> 5;
      const bitIndex = pos & 31;
      if ((this.bitArray[arrayIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns false if ANY of the terms are definitely not present
   */
  hasAll(terms: string[]): boolean {
    for (const term of terms) {
      if (!this.has(term)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Creates a new Bloom filter that is the bitwise union of this and another filter.
   * Useful for aggregating folder/subtree memberships.
   */
  bitwiseOr(other: BloomFilter): BloomFilter {
    const union = new BloomFilter(this.sizeInBits, this.hashCount);
    const len = Math.min(this.bitArray.length, other.bitArray.length);
    for (let i = 0; i < len; i++) {
      union.bitArray[i] = this.bitArray[i] | other.bitArray[i];
    }
    return union;
  }

  /**
   * Returns the count of set bits (Hamming weight / popcount)
   */
  countSetBits(): number {
    let count = 0;
    for (let i = 0; i < this.bitArray.length; i++) {
      let v = this.bitArray[i];
      // Brian Kernighan bit-counting algorithm
      while (v) {
        v &= v - 1;
        count++;
      }
    }
    return count;
  }

  /**
   * Theoretical false positive probability given n inserted items:
   * p ≈ (1 - e^(-k * n / m))^k
   */
  estimateFalsePositiveRate(itemCount: number): number {
    if (itemCount <= 0) return 0;
    const exponent = (-this.hashCount * itemCount) / this.sizeInBits;
    return Math.pow(1 - Math.exp(exponent), this.hashCount);
  }
}

/**
 * Tokenizer utilities for file names, tags, paths, and document content.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  const tokens = new Set<string>();

  // Extract alphanumeric sequences with dashes and dots
  const matches = text.match(/[a-zA-Z0-9_\-\.]+/g);
  if (!matches) return [];

  for (const raw of matches) {
    const lower = raw.toLowerCase();
    if (lower.length >= 1) {
      tokens.add(lower);
    }

    // Split compound words (e.g. "project-brief.docx" -> "project", "brief", "docx")
    const subParts = raw.split(/[-_\.\s\/\\:]+/);
    if (subParts.length > 1) {
      for (const part of subParts) {
        const subLower = part.toLowerCase();
        if (subLower.length >= 1) {
          tokens.add(subLower);
        }
      }
    }

    // CamelCase splitting (e.g. "projectBrief" -> "project", "brief")
    const camelParts = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/\s+/);
    if (camelParts.length > 1) {
      for (const part of camelParts) {
        const cLower = part.toLowerCase();
        if (cLower.length >= 1) {
          tokens.add(cLower);
        }
      }
    }
  }

  return Array.from(tokens);
}

/**
 * Metadata record for each indexed file or folder.
 */
export interface IndexedDocument {
  id: string; // Canonical path string: "Local Session/Documents/README.md"
  path: string[]; // Segment array
  name: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  tags: string[];
  content?: string;
  tokens: Set<string>;
  bloomFilter: BloomFilter;
  node: FileSystemNode;
}

export interface SearchOptions {
  scopePath?: string[]; // Optional root folder constraint
  filterType?: 'all' | 'file' | 'folder';
  tags?: string[];
  searchContent?: boolean; // Default true
  maxResults?: number; // Default 50
  minScore?: number;
}

export interface SearchIndexResult extends SearchResultNode {
  score: number;
  snippet?: string;
  matchField: 'name' | 'content' | 'tags' | 'path';
  matchedTerms: string[];
}

export interface IndexStats {
  totalDocuments: number;
  totalFiles: number;
  totalFolders: number;
  totalTokens: number;
  bloomFilterBits: number;
  bloomHashCount: number;
  buildTimeMs: number;
  lastUpdated: string;
}

/**
 * Full-Text Search Index for Virtual File System.
 * Combines an Inverted Index Map (term -> Set<docId>) with per-document Bloom Filters
 * for instantaneous token lookup and zero-false-negative candidate pruning.
 */
export class VfsSearchIndex {
  private docs: Map<string, IndexedDocument> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private prefixIndex: Map<string, Set<string>> = new Map(); // 2-3 char prefix -> Set<fullToken>
  private folderBloomFilters: Map<string, BloomFilter> = new Map();
  private stats: IndexStats = {
    totalDocuments: 0,
    totalFiles: 0,
    totalFolders: 0,
    totalTokens: 0,
    bloomFilterBits: 2048,
    bloomHashCount: 4,
    buildTimeMs: 0,
    lastUpdated: new Date().toISOString(),
  };

  constructor() {}

  /**
   * Recursively indexes the entire VFS tree from a root node.
   */
  indexTree(root: FileSystemNode): void {
    const startTime = performance.now();
    this.clear();

    const traverse = (node: FileSystemNode, currentPath: string[]) => {
      this.indexNode(node, currentPath);
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverse(child, [...currentPath, node.name]);
        }
      }
    };

    if (root) {
      if (root.children && root.children.length > 0) {
        for (const child of root.children) {
          traverse(child, [root.name]);
        }
      } else {
        traverse(root, []);
      }
    }

    const elapsed = performance.now() - startTime;
    this.updateStats(elapsed);
  }

  /**
   * Clears all indexed documents and structures.
   */
  clear(): void {
    this.docs.clear();
    this.invertedIndex.clear();
    this.prefixIndex.clear();
    this.folderBloomFilters.clear();
  }

  /**
   * Indexes or updates a single node at a given parent path.
   */
  indexNode(node: FileSystemNode, parentPath: string[]): void {
    const fullPath = [...parentPath, node.name];
    const docId = fullPath.join('/');

    // Remove old entry if updating
    if (this.docs.has(docId)) {
      this.removeDocument(docId);
    }

    const bloom = new BloomFilter(2048, 4);
    const docTokens = new Set<string>();

    // 1. Index Name & subtokens
    const nameTokens = tokenizeText(node.name);
    for (const t of nameTokens) {
      docTokens.add(t);
      bloom.add(t);
    }

    // 2. Index Path segments
    for (const seg of parentPath) {
      const segTokens = tokenizeText(seg);
      for (const t of segTokens) {
        docTokens.add(t);
        bloom.add(t);
      }
    }

    // 3. Index Tags
    if (node.tags && node.tags.length > 0) {
      for (const tag of node.tags) {
        const tagTokens = tokenizeText(tag);
        for (const t of tagTokens) {
          docTokens.add(t);
          bloom.add(t);
        }
      }
    }

    // 4. Index Content for files (e.g. text, markdown, json, code)
    if (node.type === 'file' && node.content) {
      const contentTokens = tokenizeText(node.content);
      for (const t of contentTokens) {
        docTokens.add(t);
        bloom.add(t);
      }
    }

    // Store indexed document
    const doc: IndexedDocument = {
      id: docId,
      path: fullPath,
      name: node.name,
      type: node.type,
      size: node.size || (node.content ? node.content.length : 0),
      modified: node.modified || new Date().toISOString(),
      tags: node.tags ? [...node.tags] : [],
      content: node.content,
      tokens: docTokens,
      bloomFilter: bloom,
      node,
    };
    this.docs.set(docId, doc);

    // Update inverted index and prefix index
    for (const token of docTokens) {
      let docSet = this.invertedIndex.get(token);
      if (!docSet) {
        docSet = new Set<string>();
        this.invertedIndex.set(token, docSet);
      }
      docSet.add(docId);

      // Prefix index for 2 and 3 character prefixes
      if (token.length >= 2) {
        const p2 = token.substring(0, 2);
        let p2Set = this.prefixIndex.get(p2);
        if (!p2Set) {
          p2Set = new Set<string>();
          this.prefixIndex.set(p2, p2Set);
        }
        p2Set.add(token);
      }
      if (token.length >= 3) {
        const p3 = token.substring(0, 3);
        let p3Set = this.prefixIndex.get(p3);
        if (!p3Set) {
          p3Set = new Set<string>();
          this.prefixIndex.set(p3, p3Set);
        }
        p3Set.add(token);
      }
    }

    // Update folder Bloom filter aggregation
    const folderKey = parentPath.join('/');
    let folderBloom = this.folderBloomFilters.get(folderKey);
    if (!folderBloom) {
      folderBloom = new BloomFilter(2048, 4);
      this.folderBloomFilters.set(folderKey, folderBloom);
    }
    folderBloom = folderBloom.bitwiseOr(bloom);
    this.folderBloomFilters.set(folderKey, folderBloom);
  }

  /**
   * Removes a document by path string
   */
  removeDocument(docId: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;

    for (const token of doc.tokens) {
      const docSet = this.invertedIndex.get(token);
      if (docSet) {
        docSet.delete(docId);
        if (docSet.size === 0) {
          this.invertedIndex.delete(token);
        }
      }
    }
    this.docs.delete(docId);
  }

  /**
   * Removes all documents matching a path prefix (e.g. folder deletion)
   */
  removePathPrefix(path: string[]): void {
    const prefix = path.join('/') + '/';
    const exact = path.join('/');
    const toDelete: string[] = [];

    for (const docId of this.docs.keys()) {
      if (docId === exact || docId.startsWith(prefix)) {
        toDelete.push(docId);
      }
    }

    for (const id of toDelete) {
      this.removeDocument(id);
    }
  }

  /**
   * Fast full-text search using inverted index map and Bloom filter candidate testing.
   */
  search(query: string, options?: SearchOptions): SearchIndexResult[] {
    const startTime = performance.now();
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const scopePrefix = options?.scopePath && options.scopePath.length > 0 ? options.scopePath.join('/') : '';
    const filterType = options?.filterType || 'all';
    const searchContent = options?.searchContent !== false;
    const maxResults = options?.maxResults || 100;
    const minScore = options?.minScore || 1;

    // Tokenize query
    const queryTokens = tokenizeText(cleanQuery);
    const lowerQuery = cleanQuery.toLowerCase();

    // Find candidate documents using inverted index and prefix index
    const candidateDocIds = new Set<string>();

    if (queryTokens.length > 0) {
      for (const qToken of queryTokens) {
        // 1. Exact token match
        const exactDocs = this.invertedIndex.get(qToken);
        if (exactDocs) {
          for (const id of exactDocs) {
            candidateDocIds.add(id);
          }
        }

        // 2. Prefix matching via prefix index
        if (qToken.length >= 2) {
          const p = qToken.length >= 3 ? qToken.substring(0, 3) : qToken.substring(0, 2);
          const candidateTokens = this.prefixIndex.get(p);
          if (candidateTokens) {
            for (const t of candidateTokens) {
              if (t.startsWith(qToken) || t.includes(qToken)) {
                const pDocs = this.invertedIndex.get(t);
                if (pDocs) {
                  for (const id of pDocs) {
                    candidateDocIds.add(id);
                  }
                }
              }
            }
          }
        }
      }
    } else {
      // Substring fallback if query consists of punctuation or special characters
      for (const [id, doc] of this.docs.entries()) {
        if (doc.name.toLowerCase().includes(lowerQuery) || (searchContent && doc.content?.toLowerCase().includes(lowerQuery))) {
          candidateDocIds.add(id);
        }
      }
    }

    const results: SearchIndexResult[] = [];

    // Evaluate candidates
    for (const docId of candidateDocIds) {
      const doc = this.docs.get(docId);
      if (!doc) continue;

      // Check scope constraint
      if (scopePrefix && docId !== scopePrefix && !docId.startsWith(scopePrefix + '/')) {
        continue;
      }

      // Check type filter
      if (filterType !== 'all' && doc.type !== filterType) {
        continue;
      }

      // Check tag filter
      if (options?.tags && options.tags.length > 0) {
        const hasTag = options.tags.some((reqTag) =>
          doc.tags.some((t) => t.toLowerCase() === reqTag.toLowerCase())
        );
        if (!hasTag) continue;
      }

      // BLOOM FILTER CHECK:
      // If query has tokens, fast verification with Bloom filter
      if (queryTokens.length > 0) {
        // If query has multiple tokens, check if at least one or all match
        const hasAny = queryTokens.some((t) => doc.bloomFilter.has(t));
        if (!hasAny) {
          // Definitely not in this document!
          continue;
        }
      }

      // Detailed scoring and snippet extraction
      let score = 0;
      let primaryMatchField: 'name' | 'content' | 'tags' | 'path' = 'name';
      let snippet: string | undefined = undefined;
      const matchedTerms: string[] = [];

      const docNameLower = doc.name.toLowerCase();

      // Check exact / substring name match
      if (docNameLower === lowerQuery) {
        score += 150;
        primaryMatchField = 'name';
        matchedTerms.push(doc.name);
      } else if (docNameLower.startsWith(lowerQuery)) {
        score += 90;
        primaryMatchField = 'name';
        matchedTerms.push(lowerQuery);
      } else if (docNameLower.includes(lowerQuery)) {
        score += 60;
        primaryMatchField = 'name';
        matchedTerms.push(lowerQuery);
      } else {
        // Individual token matching in name
        let nameTokenMatches = 0;
        for (const qToken of queryTokens) {
          if (docNameLower.includes(qToken)) {
            nameTokenMatches++;
            matchedTerms.push(qToken);
          }
        }
        if (nameTokenMatches > 0) {
          score += 40 * nameTokenMatches;
          primaryMatchField = 'name';
        }
      }

      // Check tags
      if (doc.tags.length > 0) {
        for (const tag of doc.tags) {
          const lowerTag = tag.toLowerCase();
          if (lowerTag === lowerQuery || queryTokens.some((qt) => lowerTag.includes(qt))) {
            score += 45;
            if (primaryMatchField !== 'name') primaryMatchField = 'tags';
            matchedTerms.push(tag);
          }
        }
      }

      // Check path segments
      const pathString = doc.path.join('/').toLowerCase();
      if (pathString.includes(lowerQuery)) {
        score += 20;
      }

      // Check Content for files
      if (searchContent && doc.type === 'file' && doc.content) {
        const contentLower = doc.content.toLowerCase();
        const matchIdx = contentLower.indexOf(lowerQuery);

        if (matchIdx !== -1) {
          score += 70;
          if (primaryMatchField !== 'name') primaryMatchField = 'content';
          snippet = this.extractSnippet(doc.content, matchIdx, lowerQuery.length);
          matchedTerms.push(lowerQuery);
        } else {
          // Token search in content
          let contentTokenMatches = 0;
          let firstMatchIdx = -1;
          let firstTokenLen = 0;

          for (const qToken of queryTokens) {
            const idx = contentLower.indexOf(qToken);
            if (idx !== -1) {
              contentTokenMatches++;
              matchedTerms.push(qToken);
              if (firstMatchIdx === -1 || idx < firstMatchIdx) {
                firstMatchIdx = idx;
                firstTokenLen = qToken.length;
              }
            }
          }

          if (contentTokenMatches > 0) {
            score += 25 * contentTokenMatches;
            if (primaryMatchField !== 'name') primaryMatchField = 'content';
            if (firstMatchIdx !== -1) {
              snippet = this.extractSnippet(doc.content, firstMatchIdx, firstTokenLen);
            }
          }
        }
      }

      if (score >= minScore) {
        results.push({
          ...doc.node,
          path: doc.path,
          score,
          snippet,
          matchField: primaryMatchField,
          matchedTerms: Array.from(new Set(matchedTerms)),
        });
      }
    }

    // Sort descending by score, then files before folders, then alphabetical
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.type !== b.type) return a.type === 'file' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return results.slice(0, maxResults);
  }

  /**
   * Contextual snippet extraction around a match index
   */
  private extractSnippet(content: string, index: number, matchLength: number, contextRadius: number = 45): string {
    const start = Math.max(0, index - contextRadius);
    const end = Math.min(content.length, index + matchLength + contextRadius);

    let snippet = content.substring(start, end).replace(/[\r\n\t]+/g, ' ');
    if (start > 0) snippet = '…' + snippet;
    if (end < content.length) snippet = snippet + '…';

    return snippet;
  }

  /**
   * Generates summary statistics about the search index
   */
  private updateStats(buildTimeMs: number): void {
    let totalFiles = 0;
    let totalFolders = 0;
    for (const doc of this.docs.values()) {
      if (doc.type === 'file') totalFiles++;
      else totalFolders++;
    }

    this.stats = {
      totalDocuments: this.docs.size,
      totalFiles,
      totalFolders,
      totalTokens: this.invertedIndex.size,
      bloomFilterBits: 2048,
      bloomHashCount: 4,
      buildTimeMs: Math.round(buildTimeMs * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  }

  getStats(): IndexStats {
    return { ...this.stats };
  }

  /**
   * Diagnostic test of Bloom filter false-positive rate and index health
   */
  diagnose(): {
    docCount: number;
    tokenCount: number;
    avgTokensPerDoc: number;
    estimatedBloomFpRate: number;
  } {
    const docCount = this.docs.size;
    let totalTokens = 0;
    for (const doc of this.docs.values()) {
      totalTokens += doc.tokens.size;
    }
    const avg = docCount > 0 ? Math.round(totalTokens / docCount) : 0;
    const dummyFilter = new BloomFilter(2048, 4);
    const fpRate = dummyFilter.estimateFalsePositiveRate(avg);

    return {
      docCount,
      tokenCount: this.invertedIndex.size,
      avgTokensPerDoc: avg,
      estimatedBloomFpRate: Math.round(fpRate * 10000) / 100, // percentage e.g. 0.05%
    };
  }
}
