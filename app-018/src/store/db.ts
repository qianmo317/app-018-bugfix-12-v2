// 方案持久化：IndexedDB（md §8）
import type { PlanRecord } from '../types';

const DB_NAME = 'slp-db';
const DB_VERSION = 1;
const STORE = 'plans';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB 打开失败'));
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'));
      }),
  );
}

export async function listPlans(): Promise<PlanRecord[]> {
  const all = await tx<PlanRecord[]>('readonly', (s) => s.getAll() as IDBRequest<PlanRecord[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPlan(id: string): Promise<PlanRecord | undefined> {
  return tx<PlanRecord | undefined>('readonly', (s) => s.get(id) as IDBRequest<PlanRecord | undefined>);
}

export async function putPlan(rec: PlanRecord): Promise<void> {
  await tx('readwrite', (s) => s.put(rec));
}

export async function deletePlan(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}
