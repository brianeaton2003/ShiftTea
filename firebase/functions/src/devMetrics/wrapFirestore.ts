import type {
  CollectionReference,
  DocumentData,
  DocumentReference,
  Firestore,
  Query,
  Transaction,
} from 'firebase-admin/firestore';
import { bumpReads, bumpWrites } from './context.js';

const QUERY_CHAIN = new Set([
  'where',
  'orderBy',
  'limit',
  'offset',
  'startAt',
  'endAt',
  'startAfter',
  'endBefore',
]);

function wrapQuery<T extends Query<DocumentData>>(q: T): T {
  return new Proxy(q, {
    get(target, prop, receiver) {
      if (prop === 'get') {
        return async () => {
          const snap = await target.get();
          bumpReads(snap.size);
          return snap;
        };
      }
      if (typeof prop === 'string' && QUERY_CHAIN.has(prop)) {
        return (...args: unknown[]) => {
          const fn = (target as unknown as Record<string, (...a: unknown[]) => Query<DocumentData>>)[prop];
          return wrapQuery(fn.apply(target, args));
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as T;
}

function wrapDocRef(ref: DocumentReference<DocumentData>): DocumentReference<DocumentData> {
  return new Proxy(ref, {
    get(target, prop, receiver) {
      if (prop === 'get') {
        return async () => {
          bumpReads(1);
          return target.get();
        };
      }
      if (prop === 'collection') {
        return (sub: string) => wrapCollection(target.collection(sub));
      }
      if (prop === 'set' || prop === 'update' || prop === 'delete' || prop === 'create') {
        return (...args: unknown[]) => {
          bumpWrites(1);
          return (target as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...args);
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as DocumentReference<DocumentData>;
}

function wrapCollection(col: CollectionReference<DocumentData>): CollectionReference<DocumentData> {
  return new Proxy(col, {
    get(target, prop, receiver) {
      if (prop === 'doc') {
        return (documentPath?: string) =>
          wrapDocRef(
            documentPath !== undefined && documentPath !== ''
              ? target.doc(documentPath)
              : target.doc(),
          );
      }
      if (prop === 'get') {
        return async () => {
          const snap = await target.get();
          bumpReads(snap.size);
          return snap;
        };
      }
      if (typeof prop === 'string' && QUERY_CHAIN.has(prop)) {
        return (...args: unknown[]) => {
          const fn = (target as unknown as Record<string, (...a: unknown[]) => Query<DocumentData>>)[prop];
          return wrapQuery(fn.apply(target, args));
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as CollectionReference<DocumentData>;
}

function wrapTransaction(tx: Transaction): Transaction {
  return new Proxy(tx, {
    get(target, prop, receiver) {
      if (prop === 'get') {
        return async (ref: DocumentReference<DocumentData>) => {
          bumpReads(1);
          return target.get(ref);
        };
      }
      if (prop === 'getAll') {
        return (...refs: DocumentReference<DocumentData>[]) => {
          bumpReads(refs.length);
          return target.getAll(...refs);
        };
      }
      if (prop === 'set' || prop === 'update' || prop === 'delete' || prop === 'create') {
        return (...args: unknown[]) => {
          bumpWrites(1);
          return (target as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...args);
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as Transaction;
}

/**
 * Approximates Firestore billing: 1 read per doc get / getAll ref / query doc returned;
 * 1 write per set, update, delete, create (including inside transactions).
 */
export function wrapFirestore(db: Firestore): Firestore {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'collection') {
        return (collectionPath: string) => wrapCollection(target.collection(collectionPath));
      }
      if (prop === 'collectionGroup') {
        return (groupId: string) => wrapQuery(target.collectionGroup(groupId));
      }
      if (prop === 'runTransaction') {
        return (updateFn: (t: Transaction) => Promise<unknown>) =>
          target.runTransaction((t) => updateFn(wrapTransaction(t)));
      }
      if (prop === 'getAll') {
        return (...documentRefs: DocumentReference<DocumentData>[]) => {
          bumpReads(documentRefs.length);
          return target.getAll(...documentRefs);
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as Firestore;
}
