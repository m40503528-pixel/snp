import { openDB, IDBPDatabase } from 'idb';

export interface KnowledgeEntry {
  id?: number;
  topic: string;
  content: string;
  source: string;
  timestamp: number;
  category: string;
  tags: string[];
  embedding?: number[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  model: string;
}

const DB_NAME = 'neuromind-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('knowledge')) {
        const knowledgeStore = db.createObjectStore('knowledge', { keyPath: 'id', autoIncrement: true });
        knowledgeStore.createIndex('topic', 'topic');
        knowledgeStore.createIndex('category', 'category');
        knowledgeStore.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });
  
  return dbInstance;
}

// Knowledge Base Operations
export async function addKnowledge(entry: Omit<KnowledgeEntry, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add('knowledge', entry) as Promise<number>;
}

export async function getAllKnowledge(): Promise<KnowledgeEntry[]> {
  const db = await getDB();
  return db.getAll('knowledge');
}

export async function searchKnowledge(query: string): Promise<KnowledgeEntry[]> {
  const all = await getAllKnowledge();
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  return all
    .map(entry => {
      let score = 0;
      const text = `${entry.topic} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();
      
      for (const word of words) {
        const regex = new RegExp(word, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
          if (entry.topic.toLowerCase().includes(word)) score += 3;
          if (entry.tags.some(t => t.toLowerCase().includes(word))) score += 2;
        }
      }
      
      return { entry, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.entry);
}

export async function deleteKnowledge(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('knowledge', id);
}

// Chat Sessions
export async function saveSession(session: ChatSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getAllSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
}

// Settings
export async function saveSetting(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getSetting(key: string): Promise<any> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value;
}

// TF-IDF based simple embedding for offline AI
export function simpleEmbed(text: string, vocab: Map<string, number>): number[] {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const vector = new Array(vocab.size).fill(0);
  
  for (const word of words) {
    const idx = vocab.get(word);
    if (idx !== undefined) {
      vector[idx]++;
    }
  }
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}
