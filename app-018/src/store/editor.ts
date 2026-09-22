// 编辑器集中状态：场景数据 + 选中元素 + IndexedDB 持久化（UI 组件只做展示与交互）
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lamp, LampRole, Prop, PropKind, Scene } from '../types';
import { getPlan, putPlan } from './db';
import { clampToRoom, newLamp, newProp } from '../core/factory';

export type Selection =
  | { type: 'lamp'; id: string }
  | { type: 'prop'; id: string }
  | { type: 'subject' }
  | { type: 'camera' };

export type EditorStatus = 'loading' | 'ready' | 'missing';

export function usePlanEditor(planId: string) {
  const [scene, setScene] = useState<Scene | null>(null);
  const [status, setStatus] = useState<EditorStatus>('loading');
  const [selected, setSelected] = useState<Selection | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const saveTimer = useRef<number | null>(null);
  const dirty = useRef(false);
  const planIdRef = useRef(planId);

  sceneRef.current = scene;

  // 首次加载
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setScene(null);
    setSelected(null);
    getPlan(planId).then((rec) => {
      if (!alive) return;
      if (!rec) {
        setStatus('missing');
        return;
      }
      setScene(rec.scene);
      setStatus('ready');
    });
    return () => {
      alive = false;
    };
  }, [planId]);

  // 防抖持久化
  useEffect(() => {
    if (!scene || status !== 'ready') return;
    if (!dirty.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const snap = scene;
    saveTimer.current = window.setTimeout(() => {
      putPlan({ id: snap.id, title: snap.title, scene: snap, createdAt: Date.now(), updatedAt: Date.now() });
    }, 350);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [scene, status]);

  const mutate = useCallback((fn: (s: Scene) => Scene) => {
    dirty.current = true;
    setScene((prev) => (prev ? fn(prev) : prev));
  }, []);

  const patchScene = useCallback((patch: Partial<Scene>) => {
    mutate((s) => {
      const next = { ...s, ...patch };
      if (patch.room) {
        // 调整房间尺寸后把所有元素夹回室内（按新房间的宽/高分别夹）
        const room = patch.room;
        next.lamps = next.lamps.map((l) => ({ ...l, ...clampToRoom(room, l.x, l.y) }));
        next.props = next.props.map((p) => ({ ...p, ...clampToRoom(room, p.x, p.y) }));
        next.subject = { ...next.subject, ...clampToRoom(room, next.subject.x, next.subject.y) };
        next.camera = { ...next.camera, ...clampToRoom(room, next.camera.x, next.camera.y) };
      }
      return next;
    });
  }, [mutate]);

  const moveElement = useCallback((sel: Selection, x: number, y: number) => {
    mutate((s) => {
      const p = clampToRoom(s.room, x, y);
      if (sel.type === 'lamp') {
        return { ...s, lamps: s.lamps.map((l) => (l.id === sel.id ? { ...l, x: p.x, y: p.y } : l)) };
      }
      if (sel.type === 'prop') {
        return { ...s, props: s.props.map((pr) => (pr.id === sel.id ? { ...pr, x: p.x, y: p.y } : pr)) };
      }
      if (sel.type === 'subject') return { ...s, subject: { ...s.subject, x: p.x, y: p.y } };
      return { ...s, camera: { ...s.camera, x: p.x, y: p.y } };
    });
  }, [mutate]);

  const nudgeElement = useCallback((sel: Selection, dx: number, dy: number) => {
    mutate((s) => {
      const cur =
        sel.type === 'lamp' ? s.lamps.find((l) => l.id === sel.id)
        : sel.type === 'prop' ? s.props.find((p) => p.id === sel.id)
        : sel.type === 'subject' ? s.subject
        : s.camera;
      if (!cur) return s;
      const p = clampToRoom(s.room, cur.x + dx, cur.y + dy);
      if (sel.type === 'lamp') return { ...s, lamps: s.lamps.map((l) => (l.id === sel.id ? { ...l, x: p.x, y: p.y } : l)) };
      if (sel.type === 'prop') return { ...s, props: s.props.map((pr) => (pr.id === sel.id ? { ...pr, x: p.x, y: p.y } : pr)) };
      if (sel.type === 'subject') return { ...s, subject: { ...s.subject, x: p.x, y: p.y } };
      return { ...s, camera: { ...s.camera, x: p.x, y: p.y } };
    });
  }, [mutate]);

  const rotateElement = useCallback((sel: Selection, rot: number) => {
    mutate((s) => {
      if (sel.type === 'lamp') return { ...s, lamps: s.lamps.map((l) => (l.id === sel.id ? { ...l, rot } : l)) };
      if (sel.type === 'prop') return { ...s, props: s.props.map((p) => (p.id === sel.id ? { ...p, rot } : p)) };
      if (sel.type === 'subject') return { ...s, subject: { ...s.subject, facing: rot } };
      return { ...s, camera: { ...s.camera, rot } };
    });
  }, [mutate]);

  const updateLamp = useCallback((id: string, patch: Partial<Lamp>) => {
    mutate((s) => ({ ...s, lamps: s.lamps.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }, [mutate]);

  const updateProp = useCallback((id: string, patch: Partial<Prop>) => {
    mutate((s) => ({ ...s, props: s.props.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, [mutate]);

  const addLamp = useCallback((role: LampRole, kind: 'strobe' | 'continuous' = 'strobe', defaultGN: number = 60) => {
    const lamp = newLamp(1.5, 1.5, { role, kind, gnAtFull: kind === 'strobe' ? defaultGN : undefined });
    dirty.current = true;
    setScene((s) => (s ? { ...s, lamps: [...s.lamps, lamp] } : s));
    setSelected({ type: 'lamp', id: lamp.id });
  }, []);

  const addProp = useCallback((kind: PropKind) => {
    const prop = newProp(kind, 3, kind === 'background' ? 4.6 : 2);
    dirty.current = true;
    setScene((s) => (s ? { ...s, props: [...s.props, prop] } : s));
    setSelected({ type: 'prop', id: prop.id });
  }, []);

  const removeElement = useCallback((sel: Selection) => {
    if (sel.type === 'subject' || sel.type === 'camera') return;
    mutate((s) =>
      sel.type === 'lamp'
        ? { ...s, lamps: s.lamps.filter((l) => l.id !== sel.id) }
        : { ...s, props: s.props.filter((p) => p.id !== sel.id) },
    );
    setSelected(null);
  }, [mutate]);

  /** 载入一个完整场景（模板/导入），保留原方案 id */
  const loadScene = useCallback((next: Scene) => {
    dirty.current = true;
    const merged = { ...next, id: planIdRef.current };
    setScene(merged);
    setSelected(null);
  }, [planId]);

  return {
    scene,
    status,
    selected,
    setSelected,
    patchScene,
    moveElement,
    nudgeElement,
    rotateElement,
    updateLamp,
    updateProp,
    addLamp,
    addProp,
    removeElement,
    loadScene,
  };
}

export type PlanEditor = ReturnType<typeof usePlanEditor>;
